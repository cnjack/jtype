declare const __JTYPE_VERSION__: string | undefined;
declare const __JTYPE_PACKAGE_VERSION__: string | undefined;

function cleanVersion(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const appVersion =
  cleanVersion(typeof __JTYPE_VERSION__ === "undefined" ? "" : __JTYPE_VERSION__) ||
  cleanVersion(typeof __JTYPE_PACKAGE_VERSION__ === "undefined" ? "" : __JTYPE_PACKAGE_VERSION__) ||
  "dev";

export function formatAppVersion(version = appVersion): string {
  const clean = cleanVersion(version);
  if (!clean) return "vdev";
  return clean.startsWith("v") ? clean : `v${clean}`;
}
