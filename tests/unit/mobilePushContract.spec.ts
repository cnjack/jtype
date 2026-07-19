import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

test("native push adapters converge vendor callbacks on the canonical document route", () => {
  const androidPlugin = source(
    "plugins/mobile-push/android/src/main/java/net/jcode/jtype/mobilepush/MobilePushPlugin.kt",
  );
  const androidService = source(
    "plugins/mobile-push/android/src/main/java/net/jcode/jtype/mobilepush/JTypeFirebaseMessagingService.kt",
  );
  const iosPlugin = source("plugins/mobile-push/ios/Sources/MobilePushPlugin.swift");

  for (const nativeSource of [androidPlugin, iosPlugin]) {
    expect(nativeSource).toContain('"jtype.nightc.com"');
    expect(nativeSource).toContain('"/open/document"');
    expect(nativeSource).toContain('"workspaceId"');
    expect(nativeSource).toContain('"path"');
  }
  expect(androidService).toContain('message.data["routeUrl"]');
  expect(androidService).toContain("Intent.ACTION_VIEW");
  expect(androidPlugin).toContain("PENDING_ROUTE_KEY");
  expect(androidPlugin).toContain("getSharedPreferences");
  expect(iosPlugin).toContain('userInfo["jtypeRoute"]');
  expect(iosPlugin).toContain('trigger("notificationAction"');
});

test("Android uses current FCM SDK and fails closed without untracked Firebase config", () => {
  const pluginGradle = source("plugins/mobile-push/android/build.gradle.kts");
  const appGradle = source("src-tauri/gen/android/app/build.gradle.kts");
  const manifest = source("plugins/mobile-push/android/src/main/AndroidManifest.xml");
  const ignore = source("src-tauri/gen/android/.gitignore");

  expect(pluginGradle).toContain('firebase-bom:34.16.0');
  expect(pluginGradle).toContain('implementation("com.google.firebase:firebase-messaging")');
  expect(appGradle).toContain('if (file("google-services.json").isFile)');
  expect(ignore).toContain("/app/google-services.json");
  expect(manifest).toContain("com.google.firebase.MESSAGING_EVENT");
  expect(manifest).toContain("firebase_messaging_installation_id_enabled");
  expect(manifest).toContain("android.permission.POST_NOTIFICATIONS");
  expect(source("plugins/mobile-push/android/src/main/java/net/jcode/jtype/mobilepush/JTypeFirebaseMessagingService.kt"))
    .toContain("override fun onRegistered(installationId: String)");
});

test("iOS canonical project switches APNs environment by build configuration", () => {
  const project = source("src-tauri/gen/apple/project.yml");
  const entitlements = source("src-tauri/gen/apple/jtype_iOS/jtype_iOS.entitlements");
  expect(project).toContain("aps-environment: $(APS_ENVIRONMENT)");
  expect(project).toContain("debug:\n          APS_ENVIRONMENT: development");
  expect(project).toContain("release:\n          APS_ENVIRONMENT: production");
  expect(entitlements).toContain("<key>aps-environment</key>");
  expect(entitlements).toContain("<string>$(APS_ENVIRONMENT)</string>");
});

test("frontend adapter sends provider identifiers directly to the authenticated API without browser persistence", () => {
  const adapter = source("src/lib/mobilePush.ts");
  const hook = source("src/hooks/useMobilePushRegistration.ts");
  expect(adapter).toContain("/api/me/push-registrations");
  expect(adapter).toContain('"X-Client-Type": "mobile"');
  expect(adapter).not.toContain("localStorage");
  expect(adapter).not.toContain("sessionStorage");
  expect(hook).not.toContain("localStorage");
  expect(hook).not.toContain("sessionStorage");
});

test("native push hints converge on shared mobile sync recovery without owning document state", () => {
  const androidPlugin = source(
    "plugins/mobile-push/android/src/main/java/net/jcode/jtype/mobilepush/MobilePushPlugin.kt",
  );
  const androidService = source(
    "plugins/mobile-push/android/src/main/java/net/jcode/jtype/mobilepush/JTypeFirebaseMessagingService.kt",
  );
  const iosPlugin = source("plugins/mobile-push/ios/Sources/MobilePushPlugin.swift");
  const adapter = source("src/lib/mobilePush.ts");
  const recovery = source("src/hooks/useMobileSyncRecovery.ts");
  const project = source("src-tauri/gen/apple/project.yml");
  const apnsProvider = source("services/jtype-web/src/push.rs");

  expect(androidPlugin).toContain("PENDING_REFRESH_KEY");
  expect(androidPlugin).toContain("takePendingRefresh");
  expect(androidPlugin).toContain("synchronized(refreshLock)");
  expect(androidService).toContain("MobilePushPlugin.recordRefresh(this)");
  expect(androidService).toContain("override fun onDeletedMessages()");
  expect(iosPlugin).toContain("recordBackgroundRefresh");
  expect(iosPlugin).toContain('aps["content-available"]');
  expect(project).toContain("UIBackgroundModes:\n          - remote-notification");
  expect(apnsProvider).toContain('"content-available": 1');
  expect(adapter).toContain("takePendingMobilePushRefresh");
  expect(adapter).toContain('"refreshRequested"');
  expect(recovery).toContain('recover("push-hint")');

  for (const nativeSource of [androidPlugin, androidService, iosPlugin]) {
    expect(nativeSource).not.toContain("write_document");
    expect(nativeSource).not.toContain("sync_cloud_workspace");
  }
  expect(adapter).not.toContain("localStorage");
  expect(adapter).not.toContain("sessionStorage");
  expect(recovery).not.toContain("localStorage");
  expect(recovery).not.toContain("sessionStorage");
});
