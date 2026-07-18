import type { RecentItem } from "./types";
import { appStorage } from "./storage";

const PRIVATE_VAULTS_MARKER = "/vaults";

export function rebaseAppPrivateVaultPath(path: string, currentDefaultVault: string): string {
  if (!path || !currentDefaultVault || path === currentDefaultVault) return path;
  const normalized = path.replace(/\\/g, "/");
  const current = currentDefaultVault.replace(/\\/g, "/").replace(/\/+$/, "");
  const currentMarkerIndex = current.lastIndexOf(PRIVATE_VAULTS_MARKER);
  const markerIndex = normalized.lastIndexOf(PRIVATE_VAULTS_MARKER);
  if (currentMarkerIndex < 0 || !current.slice(currentMarkerIndex).startsWith("/vaults/default")) return path;
  if (markerIndex < 0) return path;
  const suffix = normalized.slice(markerIndex + PRIVATE_VAULTS_MARKER.length);
  if (
    suffix !== "/default"
    && !suffix.startsWith("/default/")
    && !suffix.startsWith("/external/")
  ) return path;
  const currentVaultsRoot = current.slice(0, currentMarkerIndex + PRIVATE_VAULTS_MARKER.length);
  return `${currentVaultsRoot}${suffix}`;
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
