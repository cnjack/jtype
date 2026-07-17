import type { RecentItem } from "./types";
import { appStorage } from "./storage";

const PRIVATE_DEFAULT_MARKER = "/vaults/default";

export function rebaseAppPrivateVaultPath(path: string, currentDefaultVault: string): string {
  if (!path || !currentDefaultVault || path === currentDefaultVault) return path;
  const normalized = path.replace(/\\/g, "/");
  const markerIndex = normalized.lastIndexOf(PRIVATE_DEFAULT_MARKER);
  if (markerIndex < 0) return path;
  const suffix = normalized.slice(markerIndex + PRIVATE_DEFAULT_MARKER.length);
  if (suffix && !suffix.startsWith("/")) return path;
  return `${currentDefaultVault.replace(/\/+$/, "")}${suffix}`;
}

export function rebaseAppPrivateVaultRecents(
  items: RecentItem[],
  currentDefaultVault: string,
): RecentItem[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const next = {
      ...item,
      path: rebaseAppPrivateVaultPath(item.path, currentDefaultVault),
    };
    if (seen.has(next.path)) return [];
    seen.add(next.path);
    return [next];
  });
}

export function migrateAppPrivateVaultStorage(currentDefaultVault: string): {
  workspacePath: string;
  filePath: string;
} {
  const workspacePath = rebaseAppPrivateVaultPath(
    appStorage.get("lastWorkspacePath", ""),
    currentDefaultVault,
  );
  const filePath = rebaseAppPrivateVaultPath(
    appStorage.get("lastFilePath", ""),
    currentDefaultVault,
  );
  const recents = rebaseAppPrivateVaultRecents(
    appStorage.get<RecentItem[]>("recent", []),
    currentDefaultVault,
  );
  appStorage.set("lastWorkspacePath", workspacePath);
  appStorage.set("lastFilePath", filePath);
  appStorage.set("recent", recents);
  window.dispatchEvent(new CustomEvent("jtype:recent-changed"));
  return { workspacePath, filePath };
}
