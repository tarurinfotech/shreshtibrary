// ============================================================================
// ADMIN WEB VERSIONED CACHE MANAGER (shreshtlibrary)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  version: number;
  schemaVersion: number;
  cachedAt: number;
}

const SCHEMA_VERSION = 3; // Bump when the response shape changes in a new build

export class VersionedCacheManager {
  private static getKey(category: string): string {
    return `shresht_v2_cache_${category}`;
  }

  /**
   * Get cached data IF schemaVersion matches AND serverVersion matches.
   * Returns null if missing, schema outdated, or server version bumped.
   */
  static get<T>(category: string, serverVersion: number): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(this.getKey(category));
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (entry.schemaVersion !== SCHEMA_VERSION) return null;
      if (entry.version !== serverVersion) return null;

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Set cached data with current server version and schema version.
   */
  static set<T>(category: string, data: T, version: number): void {
    if (typeof window === "undefined") return;
    try {
      const entry: CacheEntry<T> = {
        data,
        version,
        schemaVersion: SCHEMA_VERSION,
        cachedAt: Date.now(),
      };
      localStorage.setItem(this.getKey(category), JSON.stringify(entry));
    } catch (e) {
      console.warn("VersionedCacheManager: Failed to write to localStorage", e);
    }
  }

  /**
   * Clear all versioned caches (e.g. on logout)
   */
  static clearAll(): void {
    if (typeof window === "undefined") return;
    try {
      const prefix = this.getKey("");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn("VersionedCacheManager: Clear error", e);
    }
  }
}
