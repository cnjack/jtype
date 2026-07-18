import { useCallback } from "react";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";
import { tauri } from "../lib/tauri";
import type { HapticStyle } from "../lib/types";

/**
 * Thin platform adapter for touch feedback. Product components keep using the
 * same Desktop callbacks; Android/iOS decide how the optional feedback feels.
 */
export function useMobileInteraction() {
  const capabilities = useRuntimeCapabilities();

  return useCallback(async (style: HapticStyle) => {
    if (!capabilities.isMobile || !tauri.isAvailable) return false;
    try {
      return await tauri.performHaptic(style);
    } catch {
      // Feedback is supplemental and respects OS/device support. A disabled or
      // unavailable haptic engine must never block the underlying action.
      return false;
    }
  }, [capabilities.isMobile]);
}
