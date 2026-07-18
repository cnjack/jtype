export const MOBILE_DOCUMENT_ROUTE_HOST = "open";
export const MOBILE_DOCUMENT_ROUTE_PATH = "/document";
export const MOBILE_APP_LINK_ORIGIN = "https://jtype.nightc.com";
export const MOBILE_APP_LINK_PATH = "/open/document";
export const MOBILE_NOTIFICATION_ROUTE_KEY = "routeUrl";

const RESERVED_SEGMENTS = new Set([".jtype", ".git", "node_modules", "target"]);
const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export type MobileDocumentRoute = {
  workspaceId: string;
  relativePath: string;
};

export type MobileNotificationPreview = {
  route: MobileDocumentRoute;
  title: string;
  body: string;
};

function normalizeRelativePath(value: string): string | null {
  if (!value || value.includes("\0") || value.includes("\\")) return null;
  const normalized = value.replace(/^\.\//, "").replace(/\/{2,}/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.endsWith("/") || normalized.length > 1024) {
    return null;
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || RESERVED_SEGMENTS.has(segment))) {
    return null;
  }
  return normalized;
}

function createDocumentRouteUrl(route: MobileDocumentRoute, baseUrl: string): string | null {
  const workspaceId = route.workspaceId.trim();
  const relativePath = normalizeRelativePath(route.relativePath);
  if (!WORKSPACE_ID_PATTERN.test(workspaceId) || !relativePath) return null;
  const url = new URL(baseUrl);
  url.searchParams.set("workspaceId", workspaceId);
  url.searchParams.set("path", relativePath);
  return url.toString();
}

export function createMobileDocumentRouteUrl(route: MobileDocumentRoute): string | null {
  return createDocumentRouteUrl(
    route,
    `jtype://${MOBILE_DOCUMENT_ROUTE_HOST}${MOBILE_DOCUMENT_ROUTE_PATH}`,
  );
}

export function createMobileDocumentAppLinkUrl(route: MobileDocumentRoute): string | null {
  return createDocumentRouteUrl(route, `${MOBILE_APP_LINK_ORIGIN}${MOBILE_APP_LINK_PATH}`);
}

export function parseMobileDocumentRouteUrl(candidate: string): MobileDocumentRoute | null {
  try {
    const url = new URL(candidate);
    const isCustomSchemeRoute = url.protocol === "jtype:"
      && url.hostname === MOBILE_DOCUMENT_ROUTE_HOST
      && url.pathname === MOBILE_DOCUMENT_ROUTE_PATH;
    const isAppLinkRoute = url.protocol === "https:"
      && url.origin === MOBILE_APP_LINK_ORIGIN
      && url.pathname === MOBILE_APP_LINK_PATH;
    if (
      (!isCustomSchemeRoute && !isAppLinkRoute)
      || url.username
      || url.password
      || url.port
      || url.hash
    ) {
      return null;
    }
    const allowedKeys = new Set(["workspaceId", "path"]);
    if ([...url.searchParams.keys()].some((key) => !allowedKeys.has(key))) return null;
    if (url.searchParams.getAll("workspaceId").length !== 1 || url.searchParams.getAll("path").length !== 1) {
      return null;
    }
    const workspaceId = (url.searchParams.get("workspaceId") ?? "").trim();
    const relativePath = normalizeRelativePath(url.searchParams.get("path") ?? "");
    if (!WORKSPACE_ID_PATTERN.test(workspaceId) || !relativePath) return null;
    return { workspaceId, relativePath };
  } catch {
    return null;
  }
}

export function mobileDocumentRouteFromNotification(payload: unknown): MobileDocumentRoute | null {
  if (!payload || typeof payload !== "object") return null;
  const notification = (payload as { notification?: unknown }).notification;
  const extra = notification && typeof notification === "object"
    ? (notification as { extra?: unknown }).extra
    : (payload as { extra?: unknown }).extra;
  if (!extra || typeof extra !== "object") return null;
  const routeUrl = (extra as Record<string, unknown>)[MOBILE_NOTIFICATION_ROUTE_KEY];
  return typeof routeUrl === "string" ? parseMobileDocumentRouteUrl(routeUrl) : null;
}

export function isMobileNotificationTap(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const actionId = (payload as { actionId?: unknown }).actionId;
  return actionId == null || actionId === "tap" || actionId === "default";
}

/**
 * Test-only simulator entry. The corresponding native command returns false in
 * release builds, so production links can never manufacture notifications.
 */
export function parseMobileNotificationPreviewUrl(candidate: string): MobileNotificationPreview | null {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "jtype:" || url.hostname !== "debug" || url.pathname !== "/notification" || url.hash) {
      return null;
    }
    const allowedKeys = new Set(["route", "title", "body"]);
    if ([...url.searchParams.keys()].some((key) => !allowedKeys.has(key))) return null;
    const routeValues = url.searchParams.getAll("route");
    if (routeValues.length !== 1) return null;
    const route = parseMobileDocumentRouteUrl(routeValues[0]);
    if (!route) return null;
    const title = (url.searchParams.get("title") ?? "JType collaboration update").trim().slice(0, 120);
    const body = (url.searchParams.get("body") ?? route.relativePath).trim().slice(0, 240);
    if (!title || !body) return null;
    return { route, title, body };
  } catch {
    return null;
  }
}
