import Foundation
import Tauri
import UIKit
import WebKit

private class ShareMarkdownArgs: Decodable {
  let fileName: String
  let content: String
}

class MobileSharePlugin: Plugin {
  @objc public func shareMarkdown(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ShareMarkdownArgs.self)

    DispatchQueue.global(qos: .userInitiated).async {
      var shareDirectory: URL?
      do {
        let fileManager = FileManager.default
        let cacheRoot = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first
          ?? fileManager.temporaryDirectory
        let shareRoot = cacheRoot.appendingPathComponent("jtype-shares", isDirectory: true)
        self.clearExpiredShares(in: shareRoot, fileManager: fileManager)
        shareDirectory = shareRoot.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try fileManager.createDirectory(
          at: shareDirectory!,
          withIntermediateDirectories: true,
          attributes: nil
        )
        let sharedFile = shareDirectory!.appendingPathComponent(
          self.safeMarkdownName(args.fileName),
          isDirectory: false
        )
        try args.content.write(to: sharedFile, atomically: true, encoding: .utf8)

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
        invoke.reject("Unable to share Markdown: \(error.localizedDescription)")
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

  private func safeMarkdownName(_ candidate: String) -> String {
    let leaf = (candidate as NSString).lastPathComponent
    let cleaned = leaf
      .components(separatedBy: CharacterSet.controlCharacters)
      .joined(separator: "_")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    let base = cleaned.isEmpty || cleaned == "." || cleaned == ".."
      ? "JType Note.md"
      : cleaned
    let extensions = ["md", "markdown", "mdown", "mkd"]
    return extensions.contains((base as NSString).pathExtension.lowercased())
      ? base
      : "\(base).md"
  }
}

@_cdecl("init_plugin_mobile_share")
func initPlugin() -> Plugin {
  MobileSharePlugin()
}
