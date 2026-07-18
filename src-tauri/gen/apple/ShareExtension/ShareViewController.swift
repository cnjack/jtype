import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let statusLabel = UILabel()
  private let activityIndicator = UIActivityIndicatorView(style: .medium)
  private var started = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    statusLabel.text = "Saving to JType…"
    statusLabel.font = .preferredFont(forTextStyle: .body)
    statusLabel.textAlignment = .center
    statusLabel.numberOfLines = 0
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    activityIndicator.translatesAutoresizingMaskIntoConstraints = false
    activityIndicator.startAnimating()

    view.addSubview(activityIndicator)
    view.addSubview(statusLabel)
    NSLayoutConstraint.activate([
      activityIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      activityIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -18),
      statusLabel.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 16),
      statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
    ])
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard !started else { return }
    started = true
    receiveShare()
  }

  private func receiveShare() {
    let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? [])
      .flatMap { $0.attachments ?? [] }
      .prefix(Self.maximumSources)
    guard !providers.isEmpty else {
      finish(message: "Nothing was shared with JType.", error: ShareError.noSupportedItems)
      return
    }
    guard let groupRoot = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: Self.appGroup
    ) else {
      finish(message: "JType sharing is not available on this installation.", error: ShareError.missingAppGroup)
      return
    }

    let inbox = groupRoot.appendingPathComponent(Self.inboxDirectory, isDirectory: true)
    let requestID = UUID().uuidString
    let staging = inbox.appendingPathComponent(".\(requestID).tmp", isDirectory: true)
    let final = inbox.appendingPathComponent(requestID, isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: staging, withIntermediateDirectories: true)
    } catch {
      finish(message: "JType could not prepare the shared files.", error: error)
      return
    }

    store(Array(providers), index: 0, in: staging, stored: 0) { result in
      do {
        let stored = try result.get()
        guard stored > 0 else { throw ShareError.noSupportedItems }
        try FileManager.default.moveItem(at: staging, to: final)
        self.finish(
          message: stored == 1
            ? "Saved for JType. Open JType to finish importing."
            : "Saved \(stored) items for JType. Open JType to finish importing."
        )
      } catch {
        try? FileManager.default.removeItem(at: staging)
        self.finish(message: "JType could not save the shared content.", error: error)
      }
    }
  }

  private func store(
    _ providers: [NSItemProvider],
    index: Int,
    in directory: URL,
    stored: Int,
    completion: @escaping (Result<Int, Error>) -> Void
  ) {
    guard index < providers.count else {
      completion(.success(stored))
      return
    }
    store(providers[index], index: index, in: directory) { result in
      switch result {
      case .success:
        self.store(providers, index: index + 1, in: directory, stored: stored + 1, completion: completion)
      case .failure:
        // One unsupported attachment must not discard the other shared items.
        self.store(providers, index: index + 1, in: directory, stored: stored, completion: completion)
      }
    }
  }

  private func store(
    _ provider: NSItemProvider,
    index: Int,
    in directory: URL,
    completion: @escaping (Result<Void, Error>) -> Void
  ) {
    if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
      provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, error in
        do {
          if let error = error { throw error }
          let source: URL
          if let url = item as? URL {
            source = url
          } else if let data = item as? Data,
                    let url = URL(dataRepresentation: data, relativeTo: nil) {
            source = url
          } else {
            throw ShareError.unreadableItem
          }
          try self.copyFile(source, provider: provider, index: index, into: directory)
          completion(.success(()))
        } catch {
          completion(.failure(error))
        }
      }
      return
    }

    if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
      provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, error in
        do {
          if let error = error { throw error }
          let text: String
          if let value = item as? String {
            text = value
          } else if let value = item as? NSAttributedString {
            text = value.string
          } else if let data = item as? Data,
                    let value = String(data: data, encoding: .utf8) {
            text = value
          } else {
            throw ShareError.unreadableItem
          }
          let data = Data(text.utf8)
          guard data.count <= Self.maximumTextBytes else { throw ShareError.textTooLarge }
          let name = self.outputName(
            suggested: provider.suggestedName ?? "Shared text",
            typeIdentifier: Self.markdownTypeIdentifier,
            index: index
          )
          try data.write(to: directory.appendingPathComponent(name), options: .atomic)
          completion(.success(()))
        } catch {
          completion(.failure(error))
        }
      }
      return
    }

    if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
      provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, error in
        do {
          if let error = error { throw error }
          guard let url = item as? URL else { throw ShareError.unreadableItem }
          let data = Data("\(url.absoluteString)\n".utf8)
          let name = self.outputName(
            suggested: provider.suggestedName ?? "Shared link",
            typeIdentifier: Self.markdownTypeIdentifier,
            index: index
          )
          try data.write(to: directory.appendingPathComponent(name), options: .atomic)
          completion(.success(()))
        } catch {
          completion(.failure(error))
        }
      }
      return
    }

    guard let typeIdentifier = preferredTypeIdentifier(for: provider) else {
      completion(.failure(ShareError.noSupportedItems))
      return
    }
    provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { source, fileError in
      if let source = source {
        do {
          try self.copyFile(source, provider: provider, index: index, into: directory, typeIdentifier: typeIdentifier)
          completion(.success(()))
        } catch {
          completion(.failure(error))
        }
        return
      }
      provider.loadDataRepresentation(forTypeIdentifier: typeIdentifier) { data, dataError in
        do {
          if let data = data {
            let name = self.outputName(
              suggested: provider.suggestedName ?? "Shared item",
              typeIdentifier: typeIdentifier,
              index: index
            )
            try data.write(to: directory.appendingPathComponent(name), options: .atomic)
            completion(.success(()))
          } else {
            throw dataError ?? fileError ?? ShareError.unreadableItem
          }
        } catch {
          completion(.failure(error))
        }
      }
    }
  }

  private func preferredTypeIdentifier(for provider: NSItemProvider) -> String? {
    let preferred = [
      UTType.pdf.identifier,
      UTType.image.identifier,
      UTType.json.identifier,
      UTType.data.identifier,
      UTType.content.identifier,
    ]
    for candidate in preferred where provider.hasItemConformingToTypeIdentifier(candidate) {
      return provider.registeredTypeIdentifiers.first {
        UTType($0)?.conforms(to: UTType(candidate) ?? .data) == true
      } ?? candidate
    }
    return provider.registeredTypeIdentifiers.first
  }

  private func copyFile(
    _ source: URL,
    provider: NSItemProvider,
    index: Int,
    into directory: URL,
    typeIdentifier: String? = nil
  ) throws {
    let accessed = source.startAccessingSecurityScopedResource()
    defer {
      if accessed { source.stopAccessingSecurityScopedResource() }
    }
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: source.path, isDirectory: &isDirectory),
          !isDirectory.boolValue else {
      throw ShareError.unreadableItem
    }
    let name = outputName(
      suggested: provider.suggestedName ?? source.lastPathComponent,
      typeIdentifier: typeIdentifier,
      index: index
    )
    try FileManager.default.copyItem(at: source, to: directory.appendingPathComponent(name))
  }

  private func outputName(suggested: String, typeIdentifier: String?, index: Int) -> String {
    var candidate = safeFileName(suggested)
    if URL(fileURLWithPath: candidate).pathExtension.isEmpty,
       let identifier = typeIdentifier,
       let suffix = UTType(identifier)?.preferredFilenameExtension {
      candidate += ".\(suffix)"
    }
    return String(format: "%03d-%@", index + 1, candidate)
  }

  private func safeFileName(_ candidate: String) -> String {
    let cleaned = candidate
      .components(separatedBy: .controlCharacters)
      .joined(separator: "_")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleaned.isEmpty,
          cleaned != ".",
          cleaned != "..",
          !cleaned.contains("/"),
          !cleaned.contains("\\") else {
      return "Shared item"
    }
    return String(cleaned.prefix(180))
  }

  private func finish(message: String, error: Error? = nil) {
    DispatchQueue.main.async {
      self.activityIndicator.stopAnimating()
      self.statusLabel.text = message
      DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
        if let error = error {
          self.extensionContext?.cancelRequest(withError: error)
        } else {
          self.extensionContext?.completeRequest(returningItems: nil)
        }
      }
    }
  }

  private static let appGroup = "group.net.jcode.jtype"
  private static let inboxDirectory = "ShareInbox"
  private static let markdownTypeIdentifier = UTType(filenameExtension: "md")?.identifier
    ?? "net.daringfireball.markdown"
  private static let maximumSources = 32
  private static let maximumTextBytes = 10 * 1024 * 1024
}

private enum ShareError: LocalizedError {
  case missingAppGroup
  case noSupportedItems
  case unreadableItem
  case textTooLarge

  var errorDescription: String? {
    switch self {
    case .missingAppGroup:
      return "The JType app group is unavailable"
    case .noSupportedItems:
      return "No supported items were shared"
    case .unreadableItem:
      return "The shared item can not be read"
    case .textTooLarge:
      return "Shared text exceeds the 10 MB limit"
    }
  }
}
