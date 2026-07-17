import { useEffect } from "react";
import { isMobileOAuthCallbackUrl } from "@shared/lib/mobileOAuth";
import { useAppDispatch } from "../app/AppState";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";
import { isTauriRuntime } from "../lib/utils";
import { notifyMobileOAuthReturn } from "../lib/mobileOAuthReturn";

/**
 * Listen only on mobile. Desktop keeps its existing device-flow polling and
 * never registers or consumes the JType custom URL scheme.
 */
export function useMobileOAuthDeepLink(): void {
  const capabilities = useRuntimeCapabilities();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!capabilities.isMobile || !isTauriRuntime()) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;
    const handleUrls = (urls: string[] | null) => {
      if (!urls?.some(isMobileOAuthCallbackUrl)) return;
      if (!notifyMobileOAuthReturn()) return;
      dispatch({ type: "SET_ACCOUNT_DIALOG", open: true, section: "account" });
      dispatch({ type: "SET_STATUS", message: "Authorization approved. Completing sign-in..." });
    };

    void import("@tauri-apps/plugin-deep-link")
      .then(async ({ getCurrent, onOpenUrl }) => {
        unlisten = await onOpenUrl(handleUrls);
        const current = await getCurrent().catch(() => null);
        if (!disposed) handleUrls(current);
        if (disposed) {
          unlisten();
          unlisten = null;
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [capabilities.isMobile, dispatch]);
}
