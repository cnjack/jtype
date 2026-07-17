const PREFIX = "jtype.";
declare const __JTYPE_MOBILE_BUILD__: boolean | undefined;

const isMobileBuild =
  typeof __JTYPE_MOBILE_BUILD__ !== "undefined" && __JTYPE_MOBILE_BUILD__;

function remove(key: string): void {
  window.localStorage.removeItem(`${PREFIX}${key}`);
}

export const appStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(`${PREFIX}${key}`);
      return raw !== null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    } catch { /* quota exceeded or private mode */ }
  },

  remove(key: string): void {
    remove(key);
  },

  getSensitive<T>(key: string, fallback: T): T {
    if (isMobileBuild) {
      // Purge credentials left by a mobile build that predates native secure
      // storage. The authoritative value is restored through the Tauri
      // cloud-profile command after React starts.
      remove(key);
      return fallback;
    }
    return this.get(key, fallback);
  },

  setSensitive(key: string, value: unknown): void {
    if (isMobileBuild) {
      remove(key);
      return;
    }
    this.set(key, value);
  },

  removeSensitive(key: string): void {
    remove(key);
  },

  clear(): void {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
    for (const k of keys) window.localStorage.removeItem(k);
  },
};
