type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const PUBLIC_STORE_CACHE_TTL_MS = 60 * 1000;

const portfolioCache = new Map<string, CacheEntry<any>>();
const storeBySlugCache = new Map<string, CacheEntry<any>>();

const readEntry = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const writeEntry = <T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + PUBLIC_STORE_CACHE_TTL_MS,
  });
  return value;
};

export const publicStoreCache = {
  getPortfolio() {
    return readEntry(portfolioCache, 'all');
  },
  setPortfolio<T>(value: T) {
    return writeEntry(portfolioCache, 'all', value);
  },
  getStoreBySlug(slug: string) {
    return readEntry(storeBySlugCache, String(slug || '').trim().toLowerCase());
  },
  setStoreBySlug<T>(slug: string, value: T) {
    return writeEntry(storeBySlugCache, String(slug || '').trim().toLowerCase(), value);
  },
  invalidatePortfolio() {
    portfolioCache.clear();
  },
  invalidateStoreBySlug(slug?: string | null) {
    const normalized = String(slug || '').trim().toLowerCase();
    if (!normalized) return;
    storeBySlugCache.delete(normalized);
  },
  invalidateStore(store?: { slug?: string | null } | null) {
    portfolioCache.clear();
    if (store?.slug) {
      storeBySlugCache.delete(String(store.slug).trim().toLowerCase());
    }
  },
  invalidateAll() {
    portfolioCache.clear();
    storeBySlugCache.clear();
  },
};
