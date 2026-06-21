// ── Pluggable key/value cache with TTL ────────────────────────────────────
// Framework-free. Defaults to an in-memory store; the web app injects a
// localStorage-backed store so lookups survive reloads and work offline. A
// React Native port would inject an AsyncStorage adapter instead.

export interface KVStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

class MemoryStore implements KVStore {
  private m = new Map<string, string>();
  get(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  set(k: string, v: string) {
    this.m.set(k, v);
  }
}

let store: KVStore = new MemoryStore();

/** Swap in a persistent store (call once at app startup). */
export function configureCache(s: KVStore): void {
  store = s;
}

interface Entry<T> {
  v: T;
  exp: number; // epoch ms expiry
}

/** Read a cached value, or null if missing/expired. `now` is injectable for RN. */
export function cacheGet<T>(key: string, now = Date.now()): T | null {
  try {
    const raw = store.get(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (entry.exp && entry.exp < now) return null;
    return entry.v;
  } catch {
    return null;
  }
}

/** Cache a value for `ttlMs` (default 7 days). */
export function cacheSet<T>(key: string, value: T, ttlMs = 7 * 86_400_000, now = Date.now()): void {
  try {
    store.set(key, JSON.stringify({ v: value, exp: now + ttlMs } satisfies Entry<T>));
  } catch {
    /* storage full / unavailable — caching is best-effort */
  }
}
