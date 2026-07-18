import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MOBILE_APP_LINK_ORIGIN,
  MOBILE_APP_LINK_PATH,
} from "../../src/lib/mobileNavigation";

const root = process.cwd();

function tauriMobileDomains(platform: "android" | "ios") {
  const config = JSON.parse(readFileSync(
    resolve(root, `src-tauri/tauri.${platform}.conf.json`),
    "utf8",
  )) as {
    plugins: {
      "deep-link": {
        mobile: Array<Record<string, unknown>>;
      };
    };
  };
  return config.plugins["deep-link"].mobile;
}

test("Android and iOS declare the same exact HTTPS document route", () => {
  const expected = {
    scheme: ["https"],
    host: new URL(MOBILE_APP_LINK_ORIGIN).hostname,
    path: [MOBILE_APP_LINK_PATH],
    appLink: true,
  };
  expect(tauriMobileDomains("android")).toContainEqual(expected);
  expect(tauriMobileDomains("ios")).toContainEqual(expected);
});

test("generated platform artifacts stay aligned with the canonical mobile config", () => {
  const fallback = { scheme: ["jtype"], appLink: false };
  expect(tauriMobileDomains("android")).toContainEqual(fallback);
  expect(tauriMobileDomains("ios")).toContainEqual(fallback);

  const manifest = readFileSync(
    resolve(root, "src-tauri/gen/android/app/src/main/AndroidManifest.xml"),
    "utf8",
  );
  const project = readFileSync(resolve(root, "src-tauri/gen/apple/project.yml"), "utf8");
  const entitlements = readFileSync(
    resolve(root, "src-tauri/gen/apple/jtype_iOS/jtype_iOS.entitlements"),
    "utf8",
  );
  expect(manifest).toContain('<intent-filter android:autoVerify="true" >');
  expect(manifest).toContain('<data android:host="jtype.nightc.com" />');
  expect(manifest).toContain('<data android:path="/open/document" />');
  expect(project).toContain("com.apple.developer.associated-domains:\n          - applinks:jtype.nightc.com");
  expect(entitlements).toContain("<string>applinks:jtype.nightc.com</string>");
});
