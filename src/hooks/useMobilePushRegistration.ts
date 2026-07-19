import { useEffect } from "react";
import { useAppState } from "../app/AppState";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";
import {
  onMobilePushRegistrationChanged,
  registerMobilePushWithServer,
  requestNativeMobilePushRegistration,
} from "../lib/mobilePush";
import type { MobilePushRegistration } from "../lib/types";
import { isTauriRuntime } from "../lib/utils";

/**
 * Keeps the native provider identifier associated with the authenticated cloud
 * user. It stays in native/vendor memory and the authenticated request; it is
 * never persisted in React state or browser storage.
 */
export function useMobilePushRegistration(): void {
  const capabilities = useRuntimeCapabilities();
  const state = useAppState();

  useEffect(() => {
    if (!capabilities.isMobile || !isTauriRuntime()) return;
    const authToken = state.cloudProfile?.token || state.syncToken;
    const serverUrl = state.cloudProfile?.serverUrl || state.serviceUrl;
    const deviceId = state.cloudProfile?.deviceId;
    if (!authToken || !serverUrl || !deviceId) return;

    let disposed = false;
    let listener: { unregister: () => Promise<void> } | null = null;
    const send = async (registration: MobilePushRegistration) => {
      if (disposed || !registration.available) return;
      await registerMobilePushWithServer({ serverUrl, authToken, deviceId, registration });
    };

    void onMobilePushRegistrationChanged((registration) => {
      void send(registration).catch(() => undefined);
    }).then((value) => {
      if (disposed) {
        void value.unregister();
      } else {
        listener = value;
      }
    }).catch(() => undefined);
    void requestNativeMobilePushRegistration()
      .then(send)
      .catch(() => undefined);

    return () => {
      disposed = true;
      void listener?.unregister();
    };
  }, [
    capabilities.isMobile,
    state.cloudProfile?.deviceId,
    state.cloudProfile?.serverUrl,
    state.cloudProfile?.token,
    state.serviceUrl,
    state.syncToken,
  ]);
}
