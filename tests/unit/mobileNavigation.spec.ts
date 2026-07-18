import { expect, test } from "@playwright/test";
import {
  createMobileDocumentAppLinkUrl,
  createMobileDocumentRouteUrl,
  isMobileNotificationTap,
  mobileDocumentRouteFromNotification,
  parseMobileDocumentRouteUrl,
  parseMobileNotificationPreviewUrl,
} from "../../src/lib/mobileNavigation";

const route = {
  workspaceId: "0fd2a07e-8efb-4d63-9a90-8bb721423e18",
  relativePath: "guides/mobile launch.md",
};

test("round-trips a credential-free workspace and document route", () => {
  const url = createMobileDocumentRouteUrl(route);
  expect(url).toBe(
    "jtype://open/document?workspaceId=0fd2a07e-8efb-4d63-9a90-8bb721423e18&path=guides%2Fmobile+launch.md",
  );
  expect(parseMobileDocumentRouteUrl(url!)).toEqual(route);
});

test("round-trips the same document route through the canonical HTTPS app link", () => {
  const url = createMobileDocumentAppLinkUrl(route);
  expect(url).toBe(
    "https://jtype.nightc.com/open/document?workspaceId=0fd2a07e-8efb-4d63-9a90-8bb721423e18&path=guides%2Fmobile+launch.md",
  );
  expect(parseMobileDocumentRouteUrl(url!)).toEqual(route);
});

test("rejects traversal, reserved metadata, credentials, fragments, and unknown data", () => {
  expect(parseMobileDocumentRouteUrl("jtype://open/document?workspaceId=ws-1&path=../secret.md")).toBeNull();
  expect(parseMobileDocumentRouteUrl("jtype://open/document?workspaceId=ws-1&path=.jtype/config.json")).toBeNull();
  expect(parseMobileDocumentRouteUrl("jtype://user:pass@open/document?workspaceId=ws-1&path=note.md")).toBeNull();
  expect(parseMobileDocumentRouteUrl("jtype://open/document?workspaceId=ws-1&path=note.md#token")).toBeNull();
  expect(parseMobileDocumentRouteUrl("jtype://open/document?workspaceId=ws-1&path=note.md&token=secret")).toBeNull();
  expect(parseMobileDocumentRouteUrl("http://jtype.nightc.com/open/document?workspaceId=ws-1&path=note.md")).toBeNull();
  expect(parseMobileDocumentRouteUrl("https://other.example/open/document?workspaceId=ws-1&path=note.md")).toBeNull();
  expect(parseMobileDocumentRouteUrl("https://jtype.nightc.com/open/other?workspaceId=ws-1&path=note.md")).toBeNull();
  expect(parseMobileDocumentRouteUrl("https://jtype.nightc.com/open/document?workspaceId=ws-1&path=note.md&token=secret")).toBeNull();
});

test("reads only the canonical route stored in notification extra", () => {
  const routeUrl = createMobileDocumentRouteUrl(route)!;
  expect(mobileDocumentRouteFromNotification({ extra: { routeUrl } })).toEqual(route);
  expect(mobileDocumentRouteFromNotification({ actionId: "tap", notification: { extra: { routeUrl } } })).toEqual(route);
  expect(mobileDocumentRouteFromNotification({ routeUrl })).toBeNull();
  expect(mobileDocumentRouteFromNotification({ extra: { workspaceId: route.workspaceId, path: route.relativePath } })).toBeNull();
  expect(isMobileNotificationTap({ actionId: "tap" })).toBe(true);
  expect(isMobileNotificationTap({ actionId: "dismiss" })).toBe(false);
});

test("parses the debug notification preview without relaxing the document route", () => {
  const routeUrl = createMobileDocumentRouteUrl(route)!;
  const preview = new URL("jtype://debug/notification");
  preview.searchParams.set("route", routeUrl);
  preview.searchParams.set("title", "A teammate changed a note");
  preview.searchParams.set("body", "Tap to open the shared workbench");
  expect(parseMobileNotificationPreviewUrl(preview.toString())).toEqual({
    route,
    title: "A teammate changed a note",
    body: "Tap to open the shared workbench",
  });
  preview.searchParams.set("token", "not-allowed");
  expect(parseMobileNotificationPreviewUrl(preview.toString())).toBeNull();
});
