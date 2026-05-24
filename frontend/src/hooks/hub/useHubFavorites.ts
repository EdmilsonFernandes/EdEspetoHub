import { useCallback, useEffect, useMemo, useState } from 'react';

const FAVORITES_STORAGE_KEY = 'hub:favorites:stores';

const readFavoriteStoreSlugs = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export function useHubFavorites<TStore extends { slug: string; isOpen?: boolean; rating?: number }>(stores: TStore[]) {
  const [favoriteStoreSlugs, setFavoriteStoreSlugs] = useState<string[]>(readFavoriteStoreSlugs);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStoreSlugs));
    } catch {
      // ignore storage failures
    }
  }, [favoriteStoreSlugs]);

  const favoriteStores = useMemo(() => {
    if (!favoriteStoreSlugs.length) return [];
    return stores
      .filter((store) => favoriteStoreSlugs.includes(store.slug))
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(b.rating || 0) - Number(a.rating || 0));
  }, [favoriteStoreSlugs, stores]);

  const toggleFavoriteStore = useCallback((slug: string) => {
    const normalized = String(slug || '').trim();
    if (!normalized) return;
    setFavoriteStoreSlugs((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized);
      return [normalized, ...prev].slice(0, 200);
    });
  }, []);

  return {
    favoriteStoreSlugs,
    favoriteStores,
    toggleFavoriteStore,
  };
}
