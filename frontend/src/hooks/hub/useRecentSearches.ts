import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'jnc:recent-searches:v1';
const MAX_ITEMS = 6;
const MIN_LENGTH = 3;

const sanitize = (term: string) => term.trim().replace(/\s+/g, ' ').slice(0, 48);

const readStored = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? sanitize(item) : ''))
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
};

/**
 * Buscas recentes do hub (benchmark §5: busca com histórico local).
 * Persiste em localStorage — sem contrato de backend.
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(readStored());
  }, []);

  const addRecentSearch = useCallback((term: string) => {
    const sanitized = sanitize(term);
    if (sanitized.length < MIN_LENGTH) return;
    setRecentSearches((prev) => {
      const next = [sanitized, ...prev.filter((item) => item.toLowerCase() !== sanitized.toLowerCase())].slice(0, MAX_ITEMS);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage indisponível (modo privado) — mantém só em memória
      }
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}
