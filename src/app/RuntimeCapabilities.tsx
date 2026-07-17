import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { RuntimeCapabilities, RuntimePlatform } from "../lib/types";
import { tauri } from "../lib/tauri";

function inferPlatform(): RuntimePlatform {
  if (typeof navigator === "undefined") return "desktop";
  const userAgent = navigator.userAgent;
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "desktop";
}

function fallbackCapabilities(): RuntimeCapabilities {
  const platform = inferPlatform();
  const isMobile = platform !== "desktop";
  return {
    platform,
    isMobile,
    isTouchPrimary: isMobile,
    prefersCompactLayout: isMobile,
    supportsWindowDrag: !isMobile,
    supportsUpdater: !isMobile,
    supportsProcessRestart: !isMobile,
    supportsCliInstall: !isMobile,
    supportsFileDrop: !isMobile,
    supportsExternalVault: !isMobile,
    usesAppPrivateVault: isMobile,
  };
}

const RuntimeCapabilitiesContext = createContext<RuntimeCapabilities>(fallbackCapabilities());

export function RuntimeCapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>(fallbackCapabilities);

  useEffect(() => {
    let cancelled = false;
    if (tauri.isAvailable) {
      void tauri.runtimeCapabilities()
        .then((value) => {
          if (!cancelled) setCapabilities(value);
        })
        .catch(() => {
          // Browser previews and older mocked runtimes keep the centralized,
          // conservative fallback instead of distributing platform checks.
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.jtypePlatform = capabilities.platform;
    document.documentElement.dataset.jtypeMobile = String(capabilities.isMobile);
  }, [capabilities]);

  return (
    <RuntimeCapabilitiesContext.Provider value={capabilities}>
      {children}
    </RuntimeCapabilitiesContext.Provider>
  );
}

export function useRuntimeCapabilities() {
  return useContext(RuntimeCapabilitiesContext);
}
