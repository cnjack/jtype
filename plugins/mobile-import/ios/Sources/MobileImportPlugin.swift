import Foundation
import CryptoKit
import Tauri
import UIKit
import UniformTypeIdentifiers
import WebKit

private class MaterializeArgs: Decodable {
  let source: String
}

private class DirectoryAccessArgs: Decodable {
  let sourceReference: String
}

private class MirrorDirectoryArgs: Decodable {
  let sourceReference: String
  let mirrorRootPath: String
}

private class DirectoryScanArgs: Decodable {
  let sourceReference: String
}

private class MaterializeDirectoryEntriesArgs: Decodable {
  let sourceReference: String
  let destinationRootPath: String
  let relativePaths: [String]
}

private class DirectoryChangeArgs: Decodable {
  let sourceReference: String
  let mirrorRootPath: String
  let relativePath: String
  let kind: String
}

private struct MirrorStats {
  var files: UInt64 = 0
  var directories: UInt64 = 0
  var bytes: UInt64 = 0
  var latestModified: UInt64 = 0
  var entries: UInt64 = 0
}

private struct ScopedDirectory {
  let url: URL
  let accessed: Bool
  let stale: Bool
}

private enum MobileImportError: LocalizedError {
  case unreadableSource
  case invalidBookmark
  case authorizationRequired
  case sourceUnavailable
  case unsafePath
  case readOnlySource

  var errorDescription: String? {
    switch self {
    case .unreadableSource:
      return "The selected file is unavailable or is a directory"
    case .invalidBookmark:
      return "The external vault bookmark is invalid"
    case .authorizationRequired:
      return "Authorization for the selected folder is no longer available"
    case .sourceUnavailable:
      return "The selected folder is unavailable"
    case .unsafePath:
      return "The external vault path is unsafe"
    case .readOnlySource:
      return "The selected folder is not writable"
    }
  }
}

class MobileImportPlugin: Plugin, UIDocumentPickerDelegate {
  private var pendingDirectoryInvoke: Invoke?
  private let shareLock = NSLock()
  private var claimedShareSources = Set<String>()

  @objc public func takePendingShares(_ invoke: Invoke) throws {
    // `run_mobile_plugin` waits synchronously for this startup response. On
    // iOS, resolving from a background queue needs to hop back to the main
    // plugin manager, which deadlocks when the Rust command itself is already
    // waiting on the main thread. This drain is bounded to the small share
    // inbox and must resolve before returning from the native command.
    do {
      try moveSharedRequestsIntoAppCache()
      let discovered = try localShareSources()
      shareLock.lock()
      let sources = discovered.filter { claimedShareSources.insert($0).inserted }
      shareLock.unlock()
      invoke.resolve(["sources": sources])
    } catch {
      invoke.reject("Unable to receive shared files: \(error.localizedDescription)")
    }
  }

  @objc public func materialize(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(MaterializeArgs.self)

    DispatchQueue.global(qos: .userInitiated).async {
      var importDirectory: URL?
      do {
        let sourceURL = self.fileURL(from: args.source)
        let accessed = sourceURL.startAccessingSecurityScopedResource()
        defer {
          if accessed {
            sourceURL.stopAccessingSecurityScopedResource()
          }
        }

        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: sourceURL.path, isDirectory: &isDirectory),
              !isDirectory.boolValue else {
          throw MobileImportError.unreadableSource
        }

        let fileName = self.safeFileName(sourceURL.lastPathComponent)
        let cacheRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
          ?? FileManager.default.temporaryDirectory
        importDirectory = cacheRoot
          .appendingPathComponent("jtype-imports", isDirectory: true)
          .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(
          at: importDirectory!,
          withIntermediateDirectories: true,
          attributes: nil
        )
        let target = importDirectory!.appendingPathComponent(fileName, isDirectory: false)
        try FileManager.default.copyItem(at: sourceURL, to: target)
        self.removeDisposableShareSource(sourceURL)
        self.releaseShareClaim(args.source)
        invoke.resolve(["path": target.path])
      } catch {
        if let directory = importDirectory {
          try? FileManager.default.removeItem(at: directory)
        }
        self.releaseShareClaim(args.source)
        invoke.reject("Unable to import external file: \(error.localizedDescription)")
      }
    }
  }

  @objc public func selectDirectory(_ invoke: Invoke) throws {
    DispatchQueue.main.async {
      guard self.pendingDirectoryInvoke == nil else {
        invoke.reject("A folder picker is already open")
        return
      }
      guard let presenter = self.manager.viewController else {
        invoke.reject("Unable to open the iOS folder picker: the app view is unavailable")
        return
      }

      self.pendingDirectoryInvoke = invoke
      let picker: UIDocumentPickerViewController
      if #available(iOS 14.0, *) {
        picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
      } else {
        picker = UIDocumentPickerViewController(documentTypes: ["public.folder"], in: .open)
      }
      picker.delegate = self
      picker.allowsMultipleSelection = false
      picker.modalPresentationStyle = .fullScreen
      presenter.present(picker, animated: true)
    }
  }

  public func documentPicker(
    _ controller: UIDocumentPickerViewController,
    didPickDocumentsAt urls: [URL]
  ) {
    guard let invoke = pendingDirectoryInvoke else { return }
    pendingDirectoryInvoke = nil
    guard let selectedURL = urls.first else {
      invoke.reject("Folder picker returned no directory")
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      let accessed = selectedURL.startAccessingSecurityScopedResource()
      defer {
        if accessed {
          selectedURL.stopAccessingSecurityScopedResource()
        }
      }
      do {
        try self.validateReadableDirectory(selectedURL)
        let bookmark = try self.bookmarkReference(for: selectedURL)
        invoke.resolve([
          "sourceReference": bookmark,
          "sourceIdentity": try self.sourceIdentity(for: selectedURL),
          "displayName": self.safeFileName(selectedURL.lastPathComponent),
          "readOnly": !self.isWritableDirectory(selectedURL),
        ])
      } catch {
        invoke.reject("Unable to retain access to the selected folder: \(error.localizedDescription)")
      }
    }
  }

  public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    guard let invoke = pendingDirectoryInvoke else { return }
    pendingDirectoryInvoke = nil
    invoke.reject("Folder picker cancelled")
  }

  @objc public func directoryAccess(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(DirectoryAccessArgs.self)
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let scoped = try self.resolveDirectory(args.sourceReference)
        defer { self.stopAccessing(scoped) }
        try self.validateReadableDirectory(scoped.url)
        var response: [String: Any] = [
          "state": "ready",
          "readOnly": !self.isWritableDirectory(scoped.url),
        ]
        if scoped.stale {
          response["refreshedSourceReference"] = try self.bookmarkReference(for: scoped.url)
        }
        invoke.resolve(response)
      } catch MobileImportError.authorizationRequired {
        invoke.resolve(["state": "authorizationRequired", "readOnly": true])
      } catch MobileImportError.sourceUnavailable {
        invoke.resolve(["state": "sourceUnavailable", "readOnly": true])
      } catch MobileImportError.invalidBookmark {
        invoke.resolve(["state": "error", "readOnly": true])
      } catch {
        if self.isAuthorizationError(error) {
          invoke.resolve(["state": "authorizationRequired", "readOnly": true])
        } else if self.isUnavailableError(error) {
          invoke.resolve(["state": "sourceUnavailable", "readOnly": true])
        } else {
          invoke.resolve(["state": "error", "readOnly": true])
        }
      }
    }
  }

  @objc public func releaseDirectoryAccess(_ invoke: Invoke) throws {
    _ = try invoke.parseArgs(DirectoryAccessArgs.self)
    // iOS security-scoped access is balanced around every operation. There is
    // no persistable OS grant to release separately from deleting the bookmark.
    invoke.resolve(["released": false])
  }

  @objc public func mirrorDirectory(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(MirrorDirectoryArgs.self)
    DispatchQueue.global(qos: .userInitiated).async {
      var stage: URL?
      do {
        let scoped = try self.resolveDirectory(args.sourceReference)
        defer { self.stopAccessing(scoped) }
        try self.validateReadableDirectory(scoped.url)

        let mirrorRoot = try self.validatedMirrorRoot(args.mirrorRootPath, mustExist: false)
        let fileManager = FileManager.default
        guard !fileManager.fileExists(atPath: mirrorRoot.path) else {
          throw NSError(
            domain: "MobileImportPlugin",
            code: 10,
            userInfo: [NSLocalizedDescriptionKey: "The external vault mirror already exists"]
          )
        }
        let parent = mirrorRoot.deletingLastPathComponent()
        try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
        stage = parent.appendingPathComponent(
          ".\(mirrorRoot.lastPathComponent).importing-\(UUID().uuidString)",
          isDirectory: true
        )
        try fileManager.createDirectory(at: stage!, withIntermediateDirectories: false)
        var stats = MirrorStats()
        try self.copyDirectoryChildren(
          from: scoped.url,
          to: stage!,
          stats: &stats,
          depth: 0
        )
        try fileManager.moveItem(at: stage!, to: mirrorRoot)
        stage = nil

        invoke.resolve([
          "files": stats.files,
          "directories": stats.directories,
          "bytes": stats.bytes,
          "sourceRevision": "\(stats.latestModified):\(stats.entries):\(stats.bytes)",
        ])
      } catch {
        if let stage {
          try? FileManager.default.removeItem(at: stage)
        }
        invoke.reject("Unable to import the selected vault: \(error.localizedDescription)")
      }
    }
  }

  @objc public func scanDirectory(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(DirectoryScanArgs.self)
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let startedAt = DispatchTime.now().uptimeNanoseconds
        let scoped = try self.resolveDirectory(args.sourceReference)
        defer { self.stopAccessing(scoped) }
        try self.validateReadableDirectory(scoped.url)

        var entries: [[String: Any]] = []
        var stats = MirrorStats()
        try self.scanDirectoryChildren(
          source: scoped.url,
          parentRelativePath: "",
          entries: &entries,
          stats: &stats,
          depth: 0
        )
        let elapsed = (DispatchTime.now().uptimeNanoseconds - startedAt) / 1_000_000
        invoke.resolve([
          "entries": entries,
          "files": stats.files,
          "directories": stats.directories,
          "bytes": stats.bytes,
          "elapsedMs": elapsed,
        ])
      } catch {
        invoke.reject("Unable to scan the external vault: \(error.localizedDescription)")
      }
    }
  }

  @objc public func materializeDirectoryEntries(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(MaterializeDirectoryEntriesArgs.self)
    DispatchQueue.global(qos: .userInitiated).async {
      var destinationRoot: URL?
      do {
        let scoped = try self.resolveDirectory(args.sourceReference)
        defer { self.stopAccessing(scoped) }
        try self.validateReadableDirectory(scoped.url)

        let destination = try self.validatedMirrorRoot(args.destinationRootPath, mustExist: false)
        destinationRoot = destination
        let fileManager = FileManager.default
        guard !fileManager.fileExists(atPath: destination.path) else {
          throw NSError(
            domain: "MobileImportPlugin",
            code: 17,
            userInfo: [NSLocalizedDescriptionKey: "The materialization destination already exists"]
          )
        }
        try fileManager.createDirectory(at: destination, withIntermediateDirectories: false)

        let relativePaths = Array(Set(args.relativePaths)).sorted { first, second in
          let firstDepth = first.split(separator: "/", omittingEmptySubsequences: false).count
          let secondDepth = second.split(separator: "/", omittingEmptySubsequences: false).count
          return firstDepth == secondDepth ? first < second : firstDepth < secondDepth
        }
        guard relativePaths.count <= 50_000 else {
          throw NSError(
            domain: "MobileImportPlugin",
            code: 18,
            userInfo: [NSLocalizedDescriptionKey: "Too many external vault paths were requested"]
          )
        }

        var files: UInt64 = 0
        var directories: UInt64 = 0
        var bytes: UInt64 = 0
        for relativePath in relativePaths {
          _ = try self.validatedRelativeSegments(relativePath)
          let source = scoped.url.appendingPathComponent(relativePath).standardizedFileURL
          guard self.isDescendant(source, of: scoped.url) else {
            throw MobileImportError.unsafePath
          }
          var isDirectory: ObjCBool = false
          guard fileManager.fileExists(atPath: source.path, isDirectory: &isDirectory) else {
            throw NSError(
              domain: "MobileImportPlugin",
              code: 19,
              userInfo: [NSLocalizedDescriptionKey: "External vault path changed during materialization: \(relativePath)"]
            )
          }
          let target = destination.appendingPathComponent(
            relativePath,
            isDirectory: isDirectory.boolValue
          ).standardizedFileURL
          guard self.isDescendant(target, of: destination) else {
            throw MobileImportError.unsafePath
          }
          if isDirectory.boolValue {
            try fileManager.createDirectory(at: target, withIntermediateDirectories: true)
            directories += 1
          } else {
            try fileManager.createDirectory(
              at: target.deletingLastPathComponent(),
              withIntermediateDirectories: true
            )
            bytes += try self.copyFileStream(from: source, to: target)
            files += 1
          }
        }
        invoke.resolve(["files": files, "directories": directories, "bytes": bytes])
      } catch {
        if let destinationRoot {
          try? FileManager.default.removeItem(at: destinationRoot)
        }
        invoke.reject("Unable to materialize external vault entries: \(error.localizedDescription)")
      }
    }
  }

  @objc public func applyDirectoryChange(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(DirectoryChangeArgs.self)
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let scoped = try self.resolveDirectory(args.sourceReference)
        defer { self.stopAccessing(scoped) }
        try self.validateReadableDirectory(scoped.url)
        guard self.isWritableDirectory(scoped.url) else {
          throw MobileImportError.readOnlySource
        }

        let mirrorRoot = try self.validatedMirrorRoot(args.mirrorRootPath, mustExist: true)
        let segments = try self.validatedRelativeSegments(args.relativePath)
        let result: (Bool, UInt64)
        switch args.kind {
        case "upsertDirectory":
          let (_, created) = try self.ensureDirectoryPath(root: scoped.url, segments: segments)
          result = (created, 0)
        case "upsertFile":
          let localFile = mirrorRoot.appendingPathComponent(args.relativePath).standardizedFileURL
          guard self.isDescendant(localFile, of: mirrorRoot),
                FileManager.default.fileExists(atPath: localFile.path) else {
            throw MobileImportError.unsafePath
          }
          let (parent, _) = try self.ensureDirectoryPath(
            root: scoped.url,
            segments: Array(segments.dropLast())
          )
          let target = parent.appendingPathComponent(segments.last!, isDirectory: false)
          var isDirectory: ObjCBool = false
          if FileManager.default.fileExists(atPath: target.path, isDirectory: &isDirectory),
             isDirectory.boolValue {
            throw NSError(
              domain: "MobileImportPlugin",
              code: 11,
              userInfo: [NSLocalizedDescriptionKey: "A source directory already exists at \(args.relativePath)"]
            )
          }
          let bytes = try self.copyFileStream(from: localFile, to: target)
          result = (true, bytes)
        case "delete":
          let target = scoped.url.appendingPathComponent(args.relativePath).standardizedFileURL
          guard self.isDescendant(target, of: scoped.url) else {
            throw MobileImportError.unsafePath
          }
          if FileManager.default.fileExists(atPath: target.path) {
            try FileManager.default.removeItem(at: target)
            result = (true, 0)
          } else {
            result = (false, 0)
          }
        default:
          throw NSError(
            domain: "MobileImportPlugin",
            code: 12,
            userInfo: [NSLocalizedDescriptionKey: "Unsupported external vault write-back operation"]
          )
        }

        invoke.resolve(["changed": result.0, "bytes": result.1])
      } catch {
        invoke.reject("Unable to write back the external vault: \(error.localizedDescription)")
      }
    }
  }

  private func fileURL(from source: String) -> URL {
    if let url = URL(string: source), url.isFileURL {
      return url
    }
    return URL(fileURLWithPath: source)
  }

  private func moveSharedRequestsIntoAppCache() throws {
    guard let groupRoot = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: Self.shareAppGroup
    ) else {
      return
    }
    let sharedInbox = groupRoot.appendingPathComponent(Self.shareInboxDirectory, isDirectory: true)
    guard FileManager.default.fileExists(atPath: sharedInbox.path) else { return }

    let localInbox = localShareInboxRoot()
    try FileManager.default.createDirectory(
      at: localInbox,
      withIntermediateDirectories: true,
      attributes: nil
    )
    let requests = try FileManager.default.contentsOfDirectory(
      at: sharedInbox,
      includingPropertiesForKeys: [.isDirectoryKey],
      options: [.skipsHiddenFiles]
    )
    for request in requests.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
      guard (try? request.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true else {
        continue
      }
      var target = localInbox.appendingPathComponent(request.lastPathComponent, isDirectory: true)
      if FileManager.default.fileExists(atPath: target.path) {
        target = localInbox.appendingPathComponent(UUID().uuidString, isDirectory: true)
      }
      do {
        try FileManager.default.moveItem(at: request, to: target)
      } catch {
        try FileManager.default.copyItem(at: request, to: target)
        try FileManager.default.removeItem(at: request)
      }
    }
  }

  private func localShareSources() throws -> [String] {
    let root = localShareInboxRoot()
    guard FileManager.default.fileExists(atPath: root.path) else { return [] }
    let requests = try FileManager.default.contentsOfDirectory(
      at: root,
      includingPropertiesForKeys: [.isDirectoryKey],
      options: [.skipsHiddenFiles]
    )
    var sources: [String] = []
    for request in requests.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
      guard (try? request.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true else {
        continue
      }
      let files = try FileManager.default.contentsOfDirectory(
        at: request,
        includingPropertiesForKeys: [.isDirectoryKey],
        options: [.skipsHiddenFiles]
      )
      for file in files.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
        guard (try? file.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) != true else {
          continue
        }
        sources.append(file.path)
      }
    }
    return Array(sources.prefix(Self.maximumShareSources))
  }

  private func localShareInboxRoot() -> URL {
    let cacheRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
      ?? FileManager.default.temporaryDirectory
    return cacheRoot.appendingPathComponent(Self.localShareInboxDirectory, isDirectory: true)
  }

  private func removeDisposableShareSource(_ sourceURL: URL) {
    let root = localShareInboxRoot().standardizedFileURL
    let source = sourceURL.standardizedFileURL
    guard isDescendant(source, of: root) else { return }
    try? FileManager.default.removeItem(at: source)
    let request = source.deletingLastPathComponent()
    if (try? FileManager.default.contentsOfDirectory(atPath: request.path).isEmpty) == true {
      try? FileManager.default.removeItem(at: request)
    }
  }

  private func releaseShareClaim(_ source: String) {
    shareLock.lock()
    claimedShareSources.remove(source)
    shareLock.unlock()
  }

  private func resolveDirectory(_ reference: String) throws -> ScopedDirectory {
    guard let data = Data(base64Encoded: reference) else {
      throw MobileImportError.invalidBookmark
    }
    var stale = false
    let url: URL
    do {
      url = try URL(
        resolvingBookmarkData: data,
        options: [.withoutUI],
        relativeTo: nil,
        bookmarkDataIsStale: &stale
      )
    } catch {
      if isAuthorizationError(error) {
        throw MobileImportError.authorizationRequired
      }
      if isUnavailableError(error) {
        throw MobileImportError.sourceUnavailable
      }
      throw error
    }
    return ScopedDirectory(
      url: url.standardizedFileURL,
      accessed: url.startAccessingSecurityScopedResource(),
      stale: stale
    )
  }

  private func stopAccessing(_ scoped: ScopedDirectory) {
    if scoped.accessed {
      scoped.url.stopAccessingSecurityScopedResource()
    }
  }

  private func bookmarkReference(for url: URL) throws -> String {
    let data = try url.bookmarkData(
      options: [.minimalBookmark],
      includingResourceValuesForKeys: [
        .fileResourceIdentifierKey,
        .volumeIdentifierKey,
        .isDirectoryKey,
      ],
      relativeTo: nil
    )
    return data.base64EncodedString()
  }

  private func sourceIdentity(for url: URL) throws -> String {
    let values = try url.resourceValues(forKeys: [
      .fileResourceIdentifierKey,
      .volumeIdentifierKey,
    ])
    let file = values.fileResourceIdentifier.map { String(describing: $0) }
    let volume = values.volumeIdentifier.map { String(describing: $0) }
    if let file, !file.isEmpty {
      return "\(volume ?? "volume"):file:\(file)"
    }
    return "path:\(url.standardizedFileURL.path)"
  }

  private func validateReadableDirectory(_ url: URL) throws {
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory) else {
      throw MobileImportError.sourceUnavailable
    }
    guard isDirectory.boolValue else {
      throw MobileImportError.unreadableSource
    }
    do {
      _ = try FileManager.default.contentsOfDirectory(
        at: url,
        includingPropertiesForKeys: [.isDirectoryKey],
        options: [.skipsSubdirectoryDescendants]
      )
    } catch {
      if isAuthorizationError(error) {
        throw MobileImportError.authorizationRequired
      }
      if isUnavailableError(error) {
        throw MobileImportError.sourceUnavailable
      }
      throw error
    }
  }

  private func isWritableDirectory(_ url: URL) -> Bool {
    FileManager.default.isWritableFile(atPath: url.path)
  }

  private func validatedMirrorRoot(_ path: String, mustExist: Bool) throws -> URL {
    let fileManager = FileManager.default
    guard let applicationSupport = fileManager.urls(
      for: .applicationSupportDirectory,
      in: .userDomainMask
    ).first else {
      throw MobileImportError.unsafePath
    }
    let bundleRoot = Bundle.main.bundleIdentifier.map {
      applicationSupport.appendingPathComponent($0, isDirectory: true)
    } ?? applicationSupport
    let externalRoot = bundleRoot
      .appendingPathComponent("vaults", isDirectory: true)
      .appendingPathComponent("external", isDirectory: true)
      .standardizedFileURL
    let mirrorRoot = URL(fileURLWithPath: path, isDirectory: true).standardizedFileURL
    guard isDescendant(mirrorRoot, of: externalRoot) else {
      throw MobileImportError.unsafePath
    }
    if mustExist {
      var isDirectory: ObjCBool = false
      guard fileManager.fileExists(atPath: mirrorRoot.path, isDirectory: &isDirectory),
            isDirectory.boolValue else {
        throw MobileImportError.sourceUnavailable
      }
    }
    return mirrorRoot
  }

  private func validatedRelativeSegments(_ relativePath: String) throws -> [String] {
    guard !relativePath.isEmpty,
          !relativePath.contains("\\"),
          !relativePath.hasPrefix("/") else {
      throw MobileImportError.unsafePath
    }
    let segments = relativePath.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
    guard segments.count <= 65 else {
      throw MobileImportError.unsafePath
    }
    for segment in segments {
      guard !segment.isEmpty,
            segment != ".",
            segment != "..",
            safeFileName(segment) == segment,
            !Self.reservedDirectories.contains(segment.lowercased()) else {
        throw MobileImportError.unsafePath
      }
    }
    return segments
  }

  private func ensureDirectoryPath(root: URL, segments: [String]) throws -> (URL, Bool) {
    var current = root.standardizedFileURL
    var created = false
    for segment in segments {
      let child = current.appendingPathComponent(segment, isDirectory: true).standardizedFileURL
      guard isDescendant(child, of: root) else {
        throw MobileImportError.unsafePath
      }
      var isDirectory: ObjCBool = false
      if FileManager.default.fileExists(atPath: child.path, isDirectory: &isDirectory) {
        guard isDirectory.boolValue else {
          throw NSError(
            domain: "MobileImportPlugin",
            code: 13,
            userInfo: [NSLocalizedDescriptionKey: "A source file blocks directory \(segment)"]
          )
        }
      } else {
        try FileManager.default.createDirectory(
          at: child,
          withIntermediateDirectories: false,
          attributes: nil
        )
        created = true
      }
      current = child
    }
    return (current, created)
  }

  private func copyDirectoryChildren(
    from source: URL,
    to target: URL,
    stats: inout MirrorStats,
    depth: Int
  ) throws {
    guard depth <= 64 else {
      throw NSError(
        domain: "MobileImportPlugin",
        code: 14,
        userInfo: [NSLocalizedDescriptionKey: "The selected vault exceeds the maximum folder depth"]
      )
    }
    let keys: Set<URLResourceKey> = [
      .isDirectoryKey,
      .isSymbolicLinkKey,
      .fileSizeKey,
      .contentModificationDateKey,
    ]
    let children = try FileManager.default.contentsOfDirectory(
      at: source,
      includingPropertiesForKeys: Array(keys),
      options: []
    )
    var names = Set<String>()
    for child in children {
      stats.entries += 1
      guard stats.entries <= 50_000 else {
        throw NSError(
          domain: "MobileImportPlugin",
          code: 15,
          userInfo: [NSLocalizedDescriptionKey: "The selected vault contains too many entries"]
        )
      }
      let name = safeFileName(child.lastPathComponent)
      guard name == child.lastPathComponent, names.insert(name).inserted else {
        throw MobileImportError.unsafePath
      }
      let values = try child.resourceValues(forKeys: keys)
      guard values.isSymbolicLink != true else {
        throw NSError(
          domain: "MobileImportPlugin",
          code: 16,
          userInfo: [NSLocalizedDescriptionKey: "Symbolic links can not be mirrored"]
        )
      }
      if let modified = values.contentModificationDate {
        stats.latestModified = max(stats.latestModified, UInt64(max(0, modified.timeIntervalSince1970 * 1000)))
      }

      let childTarget = target.appendingPathComponent(name, isDirectory: values.isDirectory == true)
      if values.isDirectory == true {
        if Self.reservedDirectories.contains(name.lowercased()) {
          continue
        }
        try FileManager.default.createDirectory(at: childTarget, withIntermediateDirectories: false)
        stats.directories += 1
        try copyDirectoryChildren(
          from: child,
          to: childTarget,
          stats: &stats,
          depth: depth + 1
        )
      } else {
        let bytes = try copyFileStream(from: child, to: childTarget)
        stats.files += 1
        stats.bytes += bytes
        if let modified = values.contentModificationDate {
          try? FileManager.default.setAttributes(
            [.modificationDate: modified],
            ofItemAtPath: childTarget.path
          )
        }
      }
    }
  }

  private func scanDirectoryChildren(
    source: URL,
    parentRelativePath: String,
    entries: inout [[String: Any]],
    stats: inout MirrorStats,
    depth: Int
  ) throws {
    guard depth <= 64 else {
      throw NSError(
        domain: "MobileImportPlugin",
        code: 20,
        userInfo: [NSLocalizedDescriptionKey: "The selected vault exceeds the maximum folder depth"]
      )
    }
    let keys: Set<URLResourceKey> = [.isDirectoryKey, .isSymbolicLinkKey]
    let children = try FileManager.default.contentsOfDirectory(
      at: source,
      includingPropertiesForKeys: Array(keys),
      options: []
    ).sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
    var names = Set<String>()
    for child in children {
      let name = safeFileName(child.lastPathComponent)
      guard name == child.lastPathComponent, names.insert(name).inserted else {
        throw MobileImportError.unsafePath
      }
      let values = try child.resourceValues(forKeys: keys)
      guard values.isSymbolicLink != true else {
        throw NSError(
          domain: "MobileImportPlugin",
          code: 21,
          userInfo: [NSLocalizedDescriptionKey: "Symbolic links can not enter the vault manifest"]
        )
      }
      if values.isDirectory == true, Self.reservedDirectories.contains(name.lowercased()) {
        continue
      }
      stats.entries += 1
      guard stats.entries <= 50_000 else {
        throw NSError(
          domain: "MobileImportPlugin",
          code: 22,
          userInfo: [NSLocalizedDescriptionKey: "The selected vault contains too many entries"]
        )
      }
      let relativePath = parentRelativePath.isEmpty ? name : "\(parentRelativePath)/\(name)"
      if values.isDirectory == true {
        entries.append([
          "relativePath": relativePath,
          "kind": "directory",
          "bytes": UInt64(0),
        ])
        stats.directories += 1
        try scanDirectoryChildren(
          source: child,
          parentRelativePath: relativePath,
          entries: &entries,
          stats: &stats,
          depth: depth + 1
        )
      } else {
        let result = try hashFileContent(child)
        entries.append([
          "relativePath": relativePath,
          "kind": "file",
          "bytes": result.bytes,
          "contentHash": result.hash,
        ])
        stats.files += 1
        stats.bytes += result.bytes
      }
    }
  }

  private func hashFileContent(_ source: URL) throws -> (bytes: UInt64, hash: String) {
    guard let input = InputStream(url: source) else {
      throw CocoaError(.fileReadUnknown)
    }
    input.open()
    defer { input.close() }
    var hasher = SHA256()
    var total: UInt64 = 0
    var buffer = [UInt8](repeating: 0, count: 64 * 1024)
    while true {
      let read = input.read(&buffer, maxLength: buffer.count)
      if read < 0 {
        throw input.streamError ?? CocoaError(.fileReadUnknown)
      }
      if read == 0 { break }
      hasher.update(data: Data(buffer[0..<read]))
      total += UInt64(read)
    }
    let hash = hasher.finalize().map { String(format: "%02x", $0) }.joined()
    return (total, hash)
  }

  private func copyFileStream(from source: URL, to target: URL) throws -> UInt64 {
    let fileManager = FileManager.default
    if !fileManager.fileExists(atPath: target.path) {
      guard fileManager.createFile(atPath: target.path, contents: nil) else {
        throw CocoaError(.fileWriteUnknown)
      }
    }
    guard let input = InputStream(url: source),
          let output = OutputStream(url: target, append: false) else {
      throw CocoaError(.fileReadUnknown)
    }
    input.open()
    output.open()
    defer {
      input.close()
      output.close()
    }

    var total: UInt64 = 0
    var buffer = [UInt8](repeating: 0, count: 64 * 1024)
    while true {
      let read = input.read(&buffer, maxLength: buffer.count)
      if read < 0 {
        throw input.streamError ?? CocoaError(.fileReadUnknown)
      }
      if read == 0 { break }
      var written = 0
      while written < read {
        let count = buffer.withUnsafeBytes { bytes in
          output.write(
            bytes.baseAddress!.advanced(by: written).assumingMemoryBound(to: UInt8.self),
            maxLength: read - written
          )
        }
        if count <= 0 {
          throw output.streamError ?? CocoaError(.fileWriteUnknown)
        }
        written += count
      }
      total += UInt64(read)
    }
    return total
  }

  private func isDescendant(_ child: URL, of root: URL) -> Bool {
    let childPath = child.standardizedFileURL.path
    let rootPath = root.standardizedFileURL.path
    return childPath.hasPrefix(rootPath.hasSuffix("/") ? rootPath : "\(rootPath)/")
  }

  private func safeFileName(_ candidate: String) -> String {
    let controls = CharacterSet.controlCharacters
    let cleaned = candidate
      .components(separatedBy: controls)
      .joined(separator: "_")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    if cleaned.isEmpty || cleaned == "." || cleaned == ".." || cleaned.contains("/") || cleaned.contains("\\") {
      return "imported-file"
    }
    return cleaned
  }

  private func isAuthorizationError(_ error: Error) -> Bool {
    let nsError = error as NSError
    return nsError.domain == NSCocoaErrorDomain
      && (nsError.code == NSFileReadNoPermissionError || nsError.code == NSFileWriteNoPermissionError)
  }

  private func isUnavailableError(_ error: Error) -> Bool {
    let nsError = error as NSError
    return nsError.domain == NSCocoaErrorDomain
      && (nsError.code == NSFileNoSuchFileError || nsError.code == NSFileReadNoSuchFileError)
  }

  private static let reservedDirectories = Set([".jtype", ".git", "node_modules", "target"])
  private static let shareAppGroup = "group.net.jcode.jtype"
  private static let shareInboxDirectory = "ShareInbox"
  private static let localShareInboxDirectory = "jtype-share-inbox"
  private static let maximumShareSources = 32
}

@_cdecl("init_plugin_mobile_import")
func initPlugin() -> Plugin {
  MobileImportPlugin()
}
