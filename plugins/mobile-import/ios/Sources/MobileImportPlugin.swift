import Foundation
import Tauri
import WebKit

private class MaterializeArgs: Decodable {
  let source: String
}

class MobileImportPlugin: Plugin {
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
        invoke.resolve(["path": target.path])
      } catch {
        if let directory = importDirectory {
          try? FileManager.default.removeItem(at: directory)
        }
        invoke.reject("Unable to import external file: \(error.localizedDescription)")
      }
    }
  }

  private func fileURL(from source: String) -> URL {
    if let url = URL(string: source), url.isFileURL {
      return url
    }
    return URL(fileURLWithPath: source)
  }

  private func safeFileName(_ candidate: String) -> String {
    let controls = CharacterSet.controlCharacters
    let cleaned = candidate
      .components(separatedBy: controls)
      .joined(separator: "_")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    if cleaned.isEmpty || cleaned == "." || cleaned == ".." {
      return "imported-file"
    }
    return cleaned
  }
}

private enum MobileImportError: LocalizedError {
  case unreadableSource

  var errorDescription: String? {
    "The selected file is unavailable or is a directory"
  }
}

@_cdecl("init_plugin_mobile_import")
func initPlugin() -> Plugin {
  MobileImportPlugin()
}
