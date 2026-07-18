import Foundation
import Tauri
import UIKit

private class HapticArgs: Decodable {
  let style: String
}

class MobileInteractionPlugin: Plugin {
  @objc public func perform(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(HapticArgs.self)

    DispatchQueue.main.async {
      switch args.style {
      case "selection":
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
      case "impact":
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred()
      case "success":
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
      case "warning":
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.warning)
      default:
        invoke.reject("Unsupported haptic style: \(args.style)")
        return
      }
      NSLog("JTypeHaptics style=%@ performed=true", args.style)
      invoke.resolve(["performed": true])
    }
  }
}

@_cdecl("init_plugin_mobile_interaction")
func initPlugin() -> Plugin {
  MobileInteractionPlugin()
}
