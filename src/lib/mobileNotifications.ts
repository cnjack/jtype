import type { RuntimePlatform } from "./types";
import {
  MOBILE_NOTIFICATION_ROUTE_KEY,
  createMobileDocumentRouteUrl,
  parseMobileDocumentRouteUrl,
  type MobileDocumentRoute,
} from "./mobileNavigation";

export const COLLABORATION_NOTIFICATION_CHANNEL_ID = "jtype-collaboration";
export const COLLABORATION_NOTIFICATION_ID = 1_245_467_472;
const LATEST_COLLABORATION_ROUTE_KEY = "mobile.notification.latestRoute";

export type MobileCollaborationNotification = {
  route: MobileDocumentRoute;
  title: string;
  body: string;
  delayMs?: number;
};

export const MOBILE_COLLABORATION_PREVIEW_DELAY_MS = 2_500;

export type MobileNotificationDeliveryMode = "immediate" | "inProcessDelay" | "nativeSchedule";

export function mobileCollaborationPreviewDelayMs(platform: RuntimePlatform): number | undefined {
  return platform === "android" || platform === "ios"
    ? MOBILE_COLLABORATION_PREVIEW_DELAY_MS
    : undefined;
}

export function mobileNotificationDeliveryMode(
  platform: RuntimePlatform,
  delayMs?: number,
): MobileNotificationDeliveryMode {
  if (!delayMs || delayMs <= 0) return "immediate";
  // The plugin's iOS Schedule.at parser treats the ISO `Z` suffix as a local
  // wall-clock literal. More importantly, invoking foreground notification
  // delivery before WKWebView's first paint can leave the launch surface blank.
  // A JS delay yields first paint and then uses iOS foreground presentation.
  return platform === "ios" ? "inProcessDelay" : "nativeSchedule";
}

export function consumeLatestMobileCollaborationRoute(): MobileDocumentRoute | null {
  if (typeof localStorage === "undefined") return null;
  const routeUrl = localStorage.getItem(LATEST_COLLABORATION_ROUTE_KEY);
  localStorage.removeItem(LATEST_COLLABORATION_ROUTE_KEY);
  if (!routeUrl) return null;
  return parseMobileDocumentRouteUrl(routeUrl);
}

/**
 * Converts a collaboration event into one native notification payload. This is
 * deliberately platform-adapter code: the destination is still opened through
 * the shared desktop vault/document operations.
 */
export async function showMobileCollaborationNotification(
  platform: RuntimePlatform,
  notification: MobileCollaborationNotification,
): Promise<boolean> {
  if (platform === "desktop") return false;
  const routeUrl = createMobileDocumentRouteUrl(notification.route);
  if (!routeUrl) return false;

  const deliveryMode = mobileNotificationDeliveryMode(platform, notification.delayMs);
  if (deliveryMode === "inProcessDelay") {
    await new Promise((resolve) => window.setTimeout(resolve, notification.delayMs));
  }

  const plugin = await import("@tauri-apps/plugin-notification");
  let granted = await plugin.isPermissionGranted();
  if (!granted) granted = (await plugin.requestPermission()) === "granted";
  if (!granted) return false;

  if (platform === "android") {
    await plugin.createChannel({
      id: COLLABORATION_NOTIFICATION_CHANNEL_ID,
      name: "Collaboration updates",
      description: "Changes to documents in connected cloud workspaces",
      importance: plugin.Importance.Default,
      visibility: plugin.Visibility.Private,
      vibration: true,
    });
  }

  plugin.sendNotification({
    // The official Android action callback does not currently return the
    // notification object, while iOS omits `extra` from its active payload.
    // Replacing one collaboration notification gives both adapters a safe,
    // deterministic latest-route fallback without showing stale duplicates.
    id: COLLABORATION_NOTIFICATION_ID,
    title: notification.title,
    body: notification.body,
    ...(platform === "android" ? { channelId: COLLABORATION_NOTIFICATION_CHANNEL_ID } : {}),
    ...(deliveryMode === "nativeSchedule" && notification.delayMs
      ? {
          schedule: plugin.Schedule.at(new Date(Date.now() + notification.delayMs)),
        }
      : {}),
    extra: { [MOBILE_NOTIFICATION_ROUTE_KEY]: routeUrl },
    autoCancel: true,
  });
  localStorage.setItem(LATEST_COLLABORATION_ROUTE_KEY, routeUrl);
  return true;
}
