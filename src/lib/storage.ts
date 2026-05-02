const PREFIX = "jtype.";

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
    window.localStorage.removeItem(`${PREFIX}${key}`);
  },

  clear(): void {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
    for (const k of keys) window.localStorage.removeItem(k);
  },
};
