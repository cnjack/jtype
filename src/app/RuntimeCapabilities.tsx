import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
    clientType: isMobile ? "mobile" : "desktop",
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
const COMPACT_VIEWPORT_MEDIA = "(max-width: 767px), (max-height: 500px)";

function compactViewportQuery() {
  return typeof window === "undefined" ? true : window.matchMedia(COMPACT_VIEWPORT_MEDIA).matches;
}

export function RuntimeCapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>(fallbackCapabilities);
  const [compactViewport, setCompactViewport] = useState(compactViewportQuery);

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
    const media = window.matchMedia(COMPACT_VIEWPORT_MEDIA);
    const update = () => setCompactViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const adaptiveCapabilities = useMemo<RuntimeCapabilities>(
    () => ({
      ...capabilities,
      // Native mobile reports that compact UI is supported. The provider owns
      // the responsive policy so phone and tablet consumers still read one
      // capability contract instead of scattering viewport checks.
      prefersCompactLayout: capabilities.isMobile
        ? capabilities.prefersCompactLayout && compactViewport
        : capabilities.prefersCompactLayout,
    }),
    [capabilities, compactViewport],
  );

  useEffect(() => {
    document.documentElement.dataset.jtypePlatform = adaptiveCapabilities.platform;
    document.documentElement.dataset.jtypeMobile = String(adaptiveCapabilities.isMobile);
    document.documentElement.dataset.jtypeLayout = adaptiveCapabilities.prefersCompactLayout ? "compact" : "regular";
  }, [adaptiveCapabilities]);

  return (
    <RuntimeCapabilitiesContext.Provider value={adaptiveCapabilities}>
      {children}
    </RuntimeCapabilitiesContext.Provider>
  );
}

export function useRuntimeCapabilities() {
  return useContext(RuntimeCapabilitiesContext);
}
