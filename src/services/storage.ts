/** Versioned JSON in localStorage. Anything unreadable or from another version counts as empty. */
export const STORAGE_VERSION = 1;

export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; data?: T };
    return parsed.version === STORAGE_VERSION && parsed.data !== undefined ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, data }));
  } catch {
    // Storage full or blocked (private mode): the game still works, it just cannot be resumed.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore, see saveJson.
  }
}
