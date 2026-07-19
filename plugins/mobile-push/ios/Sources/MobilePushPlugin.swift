import Foundation
import ObjectiveC.runtime
import Tauri
import UIKit
import UserNotifications
import WebKit

private weak var activeMobilePushPlugin: MobilePushPlugin?
private var originalDidRegisterImplementation: IMP?
private var originalDidFailImplementation: IMP?
private var originalDidReceiveRemoteImplementation: IMP?
private var didReceiveRemoteHookBlock: AnyObject?
private var appDelegateHooksInstalled = false

private let didRegisterSelector = NSSelectorFromString("application:didRegisterForRemoteNotificationsWithDeviceToken:")
private let didFailSelector = NSSelectorFromString("application:didFailToRegisterForRemoteNotificationsWithError:")
private let didReceiveRemoteSelector = NSSelectorFromString(
  "application:didReceiveRemoteNotification:fetchCompletionHandler:"
)

private typealias DidRegisterFunction = @convention(c) (AnyObject, Selector, UIApplication, NSData) -> Void
private typealias DidFailFunction = @convention(c) (AnyObject, Selector, UIApplication, NSError) -> Void
private typealias BackgroundFetchCompletion = @convention(block) (UIBackgroundFetchResult) -> Void
private typealias DidReceiveRemoteFunction = @convention(c) (
  AnyObject,
  Selector,
  UIApplication,
  NSDictionary,
  AnyObject
) -> Void

private func jtypeDidRegister(
  _ delegate: AnyObject,
  _ selector: Selector,
  _ application: UIApplication,
  _ deviceToken: NSData
) {
  if let originalDidRegisterImplementation {
    let original = unsafeBitCast(originalDidRegisterImplementation, to: DidRegisterFunction.self)
    original(delegate, selector, application, deviceToken)
  }
  activeMobilePushPlugin?.completeRegistration(identifier: deviceToken as Data)
}

private func jtypeDidFail(
  _ delegate: AnyObject,
  _ selector: Selector,
  _ application: UIApplication,
  _ error: NSError
) {
  if let originalDidFailImplementation {
    let original = unsafeBitCast(originalDidFailImplementation, to: DidFailFunction.self)
    original(delegate, selector, application, error)
  }
  activeMobilePushPlugin?.failRegistration()
}

private func installAppDelegateHooks() {
  guard !appDelegateHooksInstalled,
        let delegate = UIApplication.shared.delegate,
        let delegateClass: AnyClass = object_getClass(delegate) else { return }

  let registerImplementation = unsafeBitCast(jtypeDidRegister as DidRegisterFunction, to: IMP.self)
  if let method = class_getInstanceMethod(delegateClass, didRegisterSelector) {
    originalDidRegisterImplementation = method_getImplementation(method)
    method_setImplementation(method, registerImplementation)
  } else {
    class_addMethod(delegateClass, didRegisterSelector, registerImplementation, "v@:@@")
  }

  let failImplementation = unsafeBitCast(jtypeDidFail as DidFailFunction, to: IMP.self)
  if let method = class_getInstanceMethod(delegateClass, didFailSelector) {
    originalDidFailImplementation = method_getImplementation(method)
    method_setImplementation(method, failImplementation)
  } else {
    class_addMethod(delegateClass, didFailSelector, failImplementation, "v@:@@")
  }

  let receiveBlock: @convention(block) (
    AnyObject,
    UIApplication,
    NSDictionary,
    BackgroundFetchCompletion
  ) -> Void = { delegate, application, userInfo, completion in
    let recorded = activeMobilePushPlugin?.recordBackgroundRefresh(userInfo: userInfo) ?? false
    if let originalDidReceiveRemoteImplementation {
      let original = unsafeBitCast(originalDidReceiveRemoteImplementation, to: DidReceiveRemoteFunction.self)
      original(delegate, didReceiveRemoteSelector, application, userInfo, completion as AnyObject)
    } else {
      completion(recorded ? .newData : .noData)
    }
  }
  let receiveBlockObject = receiveBlock as AnyObject
  didReceiveRemoteHookBlock = receiveBlockObject
  let receiveImplementation = imp_implementationWithBlock(receiveBlockObject)
  if let method = class_getInstanceMethod(delegateClass, didReceiveRemoteSelector) {
    originalDidReceiveRemoteImplementation = method_getImplementation(method)
    method_setImplementation(method, receiveImplementation)
  } else {
    class_addMethod(delegateClass, didReceiveRemoteSelector, receiveImplementation, "v@:@@@?")
  }
  appDelegateHooksInstalled = true
}

class MobilePushPlugin: Plugin, UNUserNotificationCenterDelegate {
  private let pendingRouteKey = "jtype.mobilePush.pendingRoute"
  private let pendingRefreshKey = "jtype.mobilePush.pendingRefresh"
  private let refreshLock = NSLock()
  private var pendingRegistration: Invoke?
  private weak var upstreamNotificationDelegate: UNUserNotificationCenterDelegate?

  @objc public override func load(webview: WKWebView) {
    activeMobilePushPlugin = self
    installAppDelegateHooks()
    let center = UNUserNotificationCenter.current()
    if center.delegate !== self {
      upstreamNotificationDelegate = center.delegate
      center.delegate = self
    }
  }

  @objc public func registration(_ invoke: Invoke) {
    DispatchQueue.main.async {
      guard self.pendingRegistration == nil else {
        invoke.resolve(self.unavailable(reason: "registrationInProgress"))
        return
      }
      activeMobilePushPlugin = self
      installAppDelegateHooks()
      self.pendingRegistration = invoke
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
        granted, _ in
        DispatchQueue.main.async {
          guard self.pendingRegistration != nil else { return }
          guard granted else {
            self.failRegistration(reason: "notificationPermissionDenied")
            return
          }
          UIApplication.shared.registerForRemoteNotifications()
          DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            guard let self, self.pendingRegistration != nil else { return }
            self.failRegistration(reason: "identifierUnavailable")
          }
        }
      }
    }
  }

  @objc public func takePendingRoute(_ invoke: Invoke) {
    let defaults = UserDefaults.standard
    let route = canonicalRoute(defaults.string(forKey: pendingRouteKey))
    defaults.removeObject(forKey: pendingRouteKey)
    if let route {
      invoke.resolve(["routeUrl": route])
    } else {
      invoke.resolve(["routeUrl": NSNull()])
    }
  }

  @objc public func takePendingRefresh(_ invoke: Invoke) {
    refreshLock.lock()
    let pending = UserDefaults.standard.bool(forKey: pendingRefreshKey)
    UserDefaults.standard.removeObject(forKey: pendingRefreshKey)
    refreshLock.unlock()
    invoke.resolve(["pending": pending])
  }

  private func recordRefresh() {
    refreshLock.lock()
    UserDefaults.standard.set(true, forKey: pendingRefreshKey)
    refreshLock.unlock()
    let emit: () -> Void = { [weak self] in
      guard let self else { return }
      self.trigger("refreshRequested", data: ["pending": true])
    }
    if Thread.isMainThread {
      emit()
    } else {
      DispatchQueue.main.async(execute: emit)
    }
  }

  fileprivate func recordBackgroundRefresh(userInfo: NSDictionary) -> Bool {
    guard canonicalRoute(userInfo["jtypeRoute"] as? String) != nil,
          let aps = userInfo["aps"] as? [String: Any],
          (aps["content-available"] as? NSNumber)?.intValue == 1 else { return false }
    recordRefresh()
    return true
  }

  fileprivate func completeRegistration(identifier: Data) {
    let identifierString = identifier.map { String(format: "%02x", $0) }.joined()
    let payload: JSObject = [
      "available": true,
      "platform": "ios",
      "provider": "apns",
      "environment": pushEnvironment(),
      "identifierKind": "deviceToken",
      "identifier": identifierString,
    ]
    pendingRegistration?.resolve(payload)
    pendingRegistration = nil
    trigger("registrationChanged", data: payload)
  }

  fileprivate func failRegistration(reason: String = "identifierUnavailable") {
    pendingRegistration?.resolve(unavailable(reason: reason))
    pendingRegistration = nil
  }

  private func unavailable(reason: String) -> JSObject {
    [
      "available": false,
      "platform": "ios",
      "provider": "apns",
      "environment": pushEnvironment(),
      "reason": reason,
    ]
  }

  private func pushEnvironment() -> String {
    #if DEBUG
      return "development"
    #else
      return "production"
    #endif
  }

  private func canonicalRoute(_ raw: String?) -> String? {
    guard let raw, raw.count <= 4096, let components = URLComponents(string: raw) else { return nil }
    let accepted = (components.scheme?.lowercased() == "jtype"
      && components.host == "open"
      && components.path == "/document")
      || (components.scheme?.lowercased() == "https"
        && components.host == "jtype.nightc.com"
        && components.path == "/open/document")
    guard accepted, components.user == nil, components.password == nil,
          components.port == nil, components.fragment == nil else { return nil }
    let items = components.queryItems ?? []
    guard items.count == 2,
          items.filter({ $0.name == "workspaceId" && !($0.value ?? "").isEmpty }).count == 1,
          items.filter({ $0.name == "path" && !($0.value ?? "").isEmpty }).count == 1 else { return nil }
    return raw
  }

  private func remoteRoute(_ notification: UNNotification) -> String? {
    canonicalRoute(notification.request.content.userInfo["jtypeRoute"] as? String)
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    guard notification.request.trigger is UNPushNotificationTrigger else {
      if let upstreamNotificationDelegate {
        upstreamNotificationDelegate.userNotificationCenter?(
          center,
          willPresent: notification,
          withCompletionHandler: completionHandler
        )
      } else {
        completionHandler([])
      }
      return
    }
    if remoteRoute(notification) != nil {
      recordRefresh()
    }
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    guard response.notification.request.trigger is UNPushNotificationTrigger else {
      if let upstreamNotificationDelegate {
        upstreamNotificationDelegate.userNotificationCenter?(
          center,
          didReceive: response,
          withCompletionHandler: completionHandler
        )
      } else {
        completionHandler()
      }
      return
    }
    if let route = remoteRoute(response.notification) {
      recordRefresh()
      UserDefaults.standard.set(route, forKey: pendingRouteKey)
      trigger("notificationAction", data: ["routeUrl": route])
    }
    completionHandler()
  }
}

@_cdecl("init_plugin_mobile_push")
func initPlugin() -> Plugin {
  MobilePushPlugin()
}
