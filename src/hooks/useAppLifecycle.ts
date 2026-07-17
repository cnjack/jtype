import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AppLifecycleState } from "../lib/types";
import { isTauriRuntime } from "../lib/utils";

type AppLifecycleOptions = {
  enabled: boolean;
  onResume: () => void;
  onBackground?: () => void;
};

/**
 * One lifecycle adapter for both mobile WebView visibility and Tauri resume
 * events. Consumers receive semantic transitions and stay platform-agnostic.
 */
export function useAppLifecycle({ enabled, onResume, onBackground }: AppLifecycleOptions) {
  const stateRef = useRef<AppLifecycleState>("active");
  const onResumeRef = useRef(onResume);
  const onBackgroundRef = useRef(onBackground);
  onResumeRef.current = onResume;
  onBackgroundRef.current = onBackground;

  useEffect(() => {
    if (!enabled) return;

    const transition = (next: AppLifecycleState) => {
      if (stateRef.current === next) return;
      stateRef.current = next;
      if (next === "active") onResumeRef.current();
      else onBackgroundRef.current?.();
    };

    const onVisibilityChange = () => {
      transition(document.visibilityState === "hidden" ? "background" : "active");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const unlisten = isTauriRuntime()
      ? listen<AppLifecycleState>("app:lifecycle", (event) => transition(event.payload))
      : Promise.resolve(() => undefined);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void unlisten.then((fn) => fn());
    };
  }, [enabled]);
}
