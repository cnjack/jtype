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
    ...(notification.delayMs && notification.delayMs > 0
      ? { schedule: plugin.Schedule.at(new Date(Date.now() + notification.delayMs)) }
      : {}),
    extra: { [MOBILE_NOTIFICATION_ROUTE_KEY]: routeUrl },
    autoCancel: true,
  });
  localStorage.setItem(LATEST_COLLABORATION_ROUTE_KEY, routeUrl);
  return true;
}
