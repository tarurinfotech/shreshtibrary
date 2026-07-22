// ============================================================================
// CLIENT-SIDE SMART CACHE MANAGER (shreshtlibrary)
// ============================================================================

interface CacheWrapper<T> {
  timestamp: number;
  version?: number;
  data: T;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default

const CACHE_TTL_MAP: Record<string, number> = {
  library_info: 24 * 60 * 60 * 1000,   // 24 hours
  profile: 12 * 60 * 60 * 1000,        // 12 hours
  attendance: 5 * 60 * 1000,           // 5 minutes
  notifications: 2 * 60 * 1000,        // 2 minutes
  dashboard: 5 * 60 * 1000,            // 5 minutes
  achievers: 12 * 60 * 60 * 1000,      // 12 hours
  facilities: 12 * 60 * 60 * 1000,     // 12 hours
  sliders: 12 * 60 * 60 * 1000,        // 12 hours
};

export class ClientCacheManager {
  private static getKey(key: string): string {
    return `shresht_admin_cache_${key}`;
  }

  /**
   * Save payload into client cache with timestamp
   */
  static set<T>(key: string, data: T, version?: number): void {
    if (typeof window === "undefined") return;
    try {
      const wrapper: CacheWrapper<T> = {
        timestamp: Date.now(),
        version,
        data,
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(wrapper));
    } catch (e) {
      console.warn("ClientCacheManager: Failed to write to localStorage", e);
    }
  }

  /**
   * Get payload from client cache.
   * If maxAge is provided or matched in CACHE_TTL_MAP, returns null if expired.
   */
  static get<T>(key: string, category?: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) return null;

      const wrapper: CacheWrapper<T> = JSON.parse(raw);
      const ttl = (category && CACHE_TTL_MAP[category]) || DEFAULT_TTL_MS;

      if (Date.now() - wrapper.timestamp > ttl) {
        return null; // Expired
      }
      return wrapper.data;
    } catch {
      return null;
    }
  }

  /**
   * Get cached data ignoring expiration (stale data fallback for offline mode)
   */
  static getStale<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) return null;
      const wrapper: CacheWrapper<T> = JSON.parse(raw);
      return wrapper.data;
    } catch {
      return null;
    }
  }

  /**
   * Invalidate a single key or pattern of keys
   */
  static invalidate(pattern: string): void {
    if (typeof window === "undefined") return;
    try {
      const prefix = this.getKey("");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix) && k.includes(pattern)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn("ClientCacheManager: Invalidation error", e);
    }
  }

  /**
   * Clear all admin app caches (e.g. on logout)
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
      console.warn("ClientCacheManager: Clear error", e);
    }
  }
}
