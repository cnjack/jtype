import { useEffect, useRef } from "react";

export function usePeriodicSync(
  syncFn: () => Promise<void>,
  pullFn: (() => Promise<void>) | null,
  intervalMs: number,
  enabled: boolean,
) {
  const syncingRef = useRef(false);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const timer = window.setInterval(async () => {
      if (syncingRef.current) return;
      const now = Date.now();
      if (now - lastSyncRef.current < intervalMs * 0.8) return;
      syncingRef.current = true;
      try {
        await syncFn();
        lastSyncRef.current = Date.now();
      } catch {
        // silent — periodic sync failures are non-critical
      } finally {
        syncingRef.current = false;
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, intervalMs, syncFn]);

  useEffect(() => {
    if (!enabled) return;

    const onFocus = async () => {
      if (document.hidden) return;
      if (syncingRef.current) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 60_000) return;
      if (!pullFn) return;
      syncingRef.current = true;
      try {
        await pullFn();
        lastSyncRef.current = Date.now();
      } catch {
        // silent
      } finally {
        syncingRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [enabled, pullFn]);

  useEffect(() => {
    if (!enabled) return;

    const onOnline = async () => {
      if (syncingRef.current) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 30_000) return;
      if (!pullFn) return;
      syncingRef.current = true;
      try {
        await pullFn();
        lastSyncRef.current = Date.now();
      } catch {
        // silent
      } finally {
        syncingRef.current = false;
      }
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled, pullFn]);
}
