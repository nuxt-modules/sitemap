// Path resolution cache to avoid repeated expensive operations
const CACHE_SIZE_LIMIT = 10000

export class PathResolutionCache {
  private cache = new Map<string, string>()

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: string): void {
    // Implement simple LRU by deleting oldest entries when limit is reached
    if (this.cache.size >= CACHE_SIZE_LIMIT) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

// Global singleton cache
export const pathCache = new PathResolutionCache()
