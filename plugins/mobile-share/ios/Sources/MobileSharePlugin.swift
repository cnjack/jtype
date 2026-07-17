import Foundation
import Tauri
import UIKit
import WebKit

private class ShareFileArgs: Decodable {
  let filePath: String
  let mimeType: String
}

class MobileSharePlugin: Plugin {
  @objc public func shareFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ShareFileArgs.self)

    DispatchQueue.global(qos: .userInitiated).async {
      var shareDirectory: URL?
      do {
        guard args.mimeType == "text/markdown" || args.mimeType == "application/pdf" else {
          throw NSError(
            domain: "MobileSharePlugin",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Unsupported shared file type"]
          )
        }
        let fileManager = FileManager.default
        let cacheRoot = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first
          ?? fileManager.temporaryDirectory
        let bundleCacheRoot = Bundle.main.bundleIdentifier.map {
          cacheRoot.appendingPathComponent($0, isDirectory: true)
        } ?? cacheRoot
        let shareRoot = bundleCacheRoot
          .appendingPathComponent("jtype-shares", isDirectory: true)
          .standardizedFileURL
        self.clearExpiredShares(in: shareRoot, fileManager: fileManager)
        let sharedFile = URL(fileURLWithPath: args.filePath).standardizedFileURL
        let sharePrefix = shareRoot.path.hasSuffix("/") ? shareRoot.path : "\(shareRoot.path)/"
        guard sharedFile.path.hasPrefix(sharePrefix), fileManager.fileExists(atPath: sharedFile.path) else {
          throw NSError(
            domain: "MobileSharePlugin",
            code: 2,
            userInfo: [NSLocalizedDescriptionKey: "Shared files must come from the JType share cache"]
          )
        }
        shareDirectory = sharedFile.deletingLastPathComponent()

        DispatchQueue.main.async {
          guard let root = self.manager.viewController else {
            try? fileManager.removeItem(at: shareDirectory!)
            invoke.reject("Unable to open system sharing: the app view is unavailable")
            return
          }
          let presenter = self.topViewController(from: root)
          let sheet = UIActivityViewController(activityItems: [sharedFile], applicationActivities: nil)
          if let popover = sheet.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(
              x: presenter.view.bounds.midX,
              y: presenter.view.bounds.midY,
              width: 0,
              height: 0
            )
          }
          presenter.present(sheet, animated: true) {
            invoke.resolve(["launched": true])
          }
        }
      } catch {
        if let directory = shareDirectory {
          try? FileManager.default.removeItem(at: directory)
        }
        invoke.reject("Unable to share file: \(error.localizedDescription)")
      }
    }
  }

  private func topViewController(from root: UIViewController) -> UIViewController {
    if let presented = root.presentedViewController {
      return topViewController(from: presented)
    }
    if let navigation = root as? UINavigationController,
       let visible = navigation.visibleViewController {
      return topViewController(from: visible)
    }
    if let tabs = root as? UITabBarController,
       let selected = tabs.selectedViewController {
      return topViewController(from: selected)
    }
    return root
  }

  private func clearExpiredShares(in root: URL, fileManager: FileManager) {
    let cutoff = Date().addingTimeInterval(-24 * 60 * 60)
    guard let children = try? fileManager.contentsOfDirectory(
      at: root,
      includingPropertiesForKeys: [.contentModificationDateKey],
      options: [.skipsHiddenFiles]
    ) else {
      return
    }
    for child in children {
      let values = try? child.resourceValues(forKeys: [.contentModificationDateKey])
      if values?.contentModificationDate.map({ $0 < cutoff }) ?? true {
        try? fileManager.removeItem(at: child)
      }
    }
  }

}

@_cdecl("init_plugin_mobile_share")
func initPlugin() -> Plugin {
  MobileSharePlugin()
}
