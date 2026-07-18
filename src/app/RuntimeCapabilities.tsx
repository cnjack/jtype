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
    supportsExternalVault: true,
    usesAppPrivateVault: isMobile,
    usesPartialWorkspace: isMobile,
  };
}

const RuntimeCapabilitiesContext = createContext<RuntimeCapabilities>(fallbackCapabilities());
const COMPACT_VIEWPORT_MEDIA = "(max-width: 767px), (max-height: 500px)";
const IOS_BODY_TEXT_BASE_PX = 17;

function compactViewportQuery() {
  return typeof window === "undefined" ? true : window.matchMedia(COMPACT_VIEWPORT_MEDIA).matches;
}

function measureIosDynamicTypeScale() {
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "font:-apple-system-body",
    "-webkit-text-size-adjust:100%",
    "text-size-adjust:100%",
  ].join(";");
  document.body.appendChild(probe);
  const measured = Number.parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  if (!Number.isFinite(measured) || measured <= 0) return 1;
  return Math.min(1.6, Math.max(1, measured / IOS_BODY_TEXT_BASE_PX));
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

  useEffect(() => {
    const root = document.documentElement;
    const applyDynamicType = () => {
      const scale = adaptiveCapabilities.platform === "ios" ? measureIosDynamicTypeScale() : 1;
      root.style.setProperty("--jtype-font-scale", scale.toFixed(3));
      // Complex app chrome keeps fixed hit-target geometry and uses a bounded
      // text-only adjustment. Content surfaces receive the larger scale below.
      root.style.setProperty("--jtype-chrome-text-scale", `${Math.round(Math.min(scale, 1.35) * 100)}%`);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") applyDynamicType();
    };
    applyDynamicType();
    window.addEventListener("focus", applyDynamicType);
    window.addEventListener("pageshow", applyDynamicType);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", applyDynamicType);
      window.removeEventListener("pageshow", applyDynamicType);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [adaptiveCapabilities.platform]);

  useEffect(() => {
    const root = document.documentElement;
    if (!adaptiveCapabilities.isMobile) {
      root.style.setProperty("--jtype-keyboard-inset", "0px");
      return;
    }

    const viewport = window.visualViewport;
    const applyKeyboardInset = () => {
      // Android commonly resizes the layout viewport (yielding zero here), so
      // fixed UI already sits above the IME. WKWebView keeps a larger layout
      // viewport; its visual viewport delta is the obscured keyboard region.
      const visualBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const visualWidth = Math.round(viewport?.width ?? window.innerWidth);
      const inset = Math.max(0, Math.round(window.innerHeight - visualBottom));
      root.style.setProperty("--jtype-keyboard-inset", `${inset}px`);
      root.style.setProperty("--jtype-visual-viewport-width", `${visualWidth}px`);
      root.style.setProperty("--jtype-visual-viewport-height", `${Math.round(viewport?.height ?? window.innerHeight)}px`);
      root.style.setProperty("--jtype-mobile-panel-width", `${Math.round(Math.min(22 * 16, visualWidth * 0.9))}px`);
    };

    applyKeyboardInset();
    viewport?.addEventListener("resize", applyKeyboardInset);
    viewport?.addEventListener("scroll", applyKeyboardInset);
    window.addEventListener("resize", applyKeyboardInset);
    return () => {
      viewport?.removeEventListener("resize", applyKeyboardInset);
      viewport?.removeEventListener("scroll", applyKeyboardInset);
      window.removeEventListener("resize", applyKeyboardInset);
      root.style.setProperty("--jtype-keyboard-inset", "0px");
      root.style.removeProperty("--jtype-visual-viewport-width");
      root.style.removeProperty("--jtype-visual-viewport-height");
      root.style.removeProperty("--jtype-mobile-panel-width");
    };
  }, [adaptiveCapabilities.isMobile]);

  return (
    <RuntimeCapabilitiesContext.Provider value={adaptiveCapabilities}>
      {children}
    </RuntimeCapabilitiesContext.Provider>
  );
}

export function useRuntimeCapabilities() {
  return useContext(RuntimeCapabilitiesContext);
}
