import { addPluginListener, invoke, type PluginListener } from "@tauri-apps/api/core";
import { httpRequest } from "@shared/lib/http";
import type { MobilePushRefreshEvent, MobilePushRegistration, MobilePushRouteEvent } from "./types";

const PLUGIN_NAME = "mobile-push";

export async function requestNativeMobilePushRegistration(): Promise<MobilePushRegistration> {
  return invoke<MobilePushRegistration>(`plugin:${PLUGIN_NAME}|registration`);
}

export async function takePendingMobilePushRoute(): Promise<string | null> {
  const result = await invoke<MobilePushRouteEvent>(`plugin:${PLUGIN_NAME}|takePendingRoute`);
  return typeof result.routeUrl === "string" ? result.routeUrl : null;
}

export async function takePendingMobilePushRefresh(): Promise<boolean> {
  const result = await invoke<MobilePushRefreshEvent>(`plugin:${PLUGIN_NAME}|takePendingRefresh`);
  return result.pending === true;
}

export async function onMobilePushRegistrationChanged(
  handler: (registration: MobilePushRegistration) => void,
): Promise<PluginListener> {
  return addPluginListener<MobilePushRegistration>(PLUGIN_NAME, "registrationChanged", handler);
}

export async function onMobilePushNotificationAction(
  handler: (routeUrl: string) => void,
): Promise<PluginListener> {
  return addPluginListener<MobilePushRouteEvent>(PLUGIN_NAME, "notificationAction", (event) => {
    if (typeof event.routeUrl === "string") handler(event.routeUrl);
  });
}

export async function onMobilePushRefreshRequested(
  handler: () => void,
): Promise<PluginListener> {
  return addPluginListener<MobilePushRefreshEvent>(PLUGIN_NAME, "refreshRequested", (event) => {
    if (event.pending === true) handler();
  });
}

export async function registerMobilePushWithServer(input: {
  serverUrl: string;
  authToken: string;
  deviceId: string;
  registration: MobilePushRegistration;
}): Promise<boolean> {
  const { registration } = input;
  if (!registration.available || !registration.identifier || !registration.identifierKind) return false;
  const response = await httpRequest(`${normalizedServerUrl(input.serverUrl)}/api/me/push-registrations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.authToken}`,
      "X-Client-Type": "mobile",
    },
    body: JSON.stringify({
      deviceId: input.deviceId,
      platform: registration.platform,
      provider: registration.provider,
      environment: registration.environment,
      identifierKind: registration.identifierKind,
      identifier: registration.identifier,
      locale: typeof navigator === "undefined" ? undefined : navigator.language,
    }),
  });
  if (!response.ok) throw new Error(`Push registration failed (${response.status}).`);
  return true;
}

export async function unregisterMobilePushFromServer(input: {
  serverUrl: string;
  authToken: string;
  deviceId: string;
  platform: "android" | "ios";
}): Promise<void> {
  const deviceId = encodeURIComponent(input.deviceId);
  const response = await httpRequest(
    `${normalizedServerUrl(input.serverUrl)}/api/me/push-registrations/${input.platform}/${deviceId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${input.authToken}`,
        "X-Client-Type": "mobile",
      },
    },
  );
  if (!response.ok) throw new Error(`Push unregistration failed (${response.status}).`);
}

function normalizedServerUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}
