interface CacheItem {
  key: CryptoKey;
  lastUsed: number;
}

class LRUKeyCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 100; // Limit cache size
  private maxAge = 30 * 60 * 1000; // 30 minutes

  get(keyId: string): CryptoKey | null {
    const item = this.cache.get(keyId);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.lastUsed > this.maxAge) {
      this.cache.delete(keyId);
      return null;
    }

    // Update last used time
    item.lastUsed = Date.now();
    return item.key;
  }

  set(keyId: string, key: CryptoKey): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(keyId, { key, lastUsed: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const publicKeyCache = new LRUKeyCache();
export default publicKeyCache
