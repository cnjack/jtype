import { useCallback, useEffect, useRef } from "react";
import { onMobilePushRefreshRequested, takePendingMobilePushRefresh } from "../lib/mobilePush";
import { useAppLifecycle } from "./useAppLifecycle";

export type MobileSyncRecoveryReason = "app-resume" | "network-online" | "push-hint";

type MobileSyncRecoveryOptions = {
  enabled: boolean;
  onRecover: (reason: MobileSyncRecoveryReason) => Promise<void>;
  onBackground: () => Promise<void> | void;
  cooldownMs?: number;
};

/**
 * Coalesces the mobile lifecycle and browser network signals that can arrive in
 * a burst when a suspended WebView becomes active. Platform-specific socket
 * work stays behind callbacks; this hook only owns event ordering.
 */
export function useMobileSyncRecovery({
  enabled,
  onRecover,
  onBackground,
  cooldownMs = 5_000,
}: MobileSyncRecoveryOptions) {
  const onRecoverRef = useRef(onRecover);
  const onBackgroundRef = useRef(onBackground);
  const enabledRef = useRef(enabled);
  const recoveryInFlightRef = useRef(false);
  const lastRecoveryStartedAtRef = useRef(0);
  const restartRequiredRef = useRef(false);
  const pendingRecoveryRef = useRef<MobileSyncRecoveryReason | null>(null);
  onRecoverRef.current = onRecover;
  onBackgroundRef.current = onBackground;
  enabledRef.current = enabled;

  const recover = useCallback((reason: MobileSyncRecoveryReason) => {
    if (!enabledRef.current) return;
    const isPushHint = reason === "push-hint";
    if (recoveryInFlightRef.current) {
      // A lifecycle transition that stopped the socket must not be lost behind
      // an older network recovery. A provider hint is also retained until that
      // recovery settles; plain lifecycle/network bursts remain coalesced.
      if (restartRequiredRef.current || isPushHint) pendingRecoveryRef.current = reason;
      return;
    }
    const now = Date.now();
    if (!restartRequiredRef.current && !isPushHint && now - lastRecoveryStartedAtRef.current < cooldownMs) return;

    restartRequiredRef.current = false;
    recoveryInFlightRef.current = true;
    lastRecoveryStartedAtRef.current = now;
    void onRecoverRef.current(reason)
      .catch(() => {
        // Cloud sync reports its own state; lifecycle recovery remains best-effort.
      })
      .finally(() => {
        recoveryInFlightRef.current = false;
        const pendingReason = pendingRecoveryRef.current;
        pendingRecoveryRef.current = null;
        if (pendingReason) {
          lastRecoveryStartedAtRef.current = 0;
          recover(pendingReason);
        }
      });
  }, [cooldownMs]);

  const background = useCallback(() => {
    // A stopped listener must always be restartable, even after a very short
    // background/foreground transition inside the normal cooldown window.
    restartRequiredRef.current = true;
    lastRecoveryStartedAtRef.current = 0;
    void Promise.resolve(onBackgroundRef.current()).catch(() => {
      // A later resume will retry the listener start.
    });
  }, []);

  const consumePushHint = useCallback((fallbackToResume: boolean) => {
    void takePendingMobilePushRefresh()
      .then((pending) => {
        if (pending) recover("push-hint");
        else if (fallbackToResume) recover("app-resume");
      })
      .catch(() => {
        if (fallbackToResume) recover("app-resume");
      });
  }, [recover]);

  const resume = useCallback(() => consumePushHint(true), [consumePushHint]);

  useAppLifecycle({
    enabled,
    onResume: resume,
    onBackground: background,
  });

  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => recover("network-online");
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled, recover]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let listener: { unregister: () => Promise<void> } | null = null;
    void onMobilePushRefreshRequested(() => consumePushHint(false))
      .then((value) => {
        if (disposed) void value.unregister();
        else {
          listener = value;
          // Register before draining the durable bit so a hint that arrives
          // during setup is observed either by the event or this read.
          consumePushHint(false);
        }
      })
      .catch(() => {
        if (!disposed) consumePushHint(false);
      });
    return () => {
      disposed = true;
      void listener?.unregister();
    };
  }, [consumePushHint, enabled]);
}
