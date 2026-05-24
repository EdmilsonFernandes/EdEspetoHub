const LAST_CACHE_CLEAR_AT_KEY = 'clientCache:lastClearAt';
const LAST_BUILD_ID_KEY = 'clientCache:lastBuildId';
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

type ClientFreshStartOptions = {
  maxAgeMs?: number;
  currentBuildId?: string;
  preserveLocalStorageKeys?: string[];
  preserveSessionStorageKeys?: string[];
};

const PRESERVED_LOCAL_STORAGE_KEYS = new Set([
  'theme',
  'jnk_cookie_consent',
  'jnk_cookie_consent_v1',
  'jnk_cookie_consent_meta',
  'motoboy:last_email',
  'signupEmail',
  LAST_BUILD_ID_KEY,
]);

const clearNonHttpOnlyCookies = () => {
  if (typeof document === 'undefined') return;
  const raw = document.cookie || '';
  if (!raw) return;
  raw.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim();
    if (!name) return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
};

const clearStorage = (options?: Pick<ClientFreshStartOptions, 'preserveLocalStorageKeys' | 'preserveSessionStorageKeys'>) => {
  const preservedLocalStorageKeys = new Set([
    ...PRESERVED_LOCAL_STORAGE_KEYS,
    ...(options?.preserveLocalStorageKeys || []),
  ]);

  if (typeof localStorage !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key === LAST_CACHE_CLEAR_AT_KEY) return;
      if (preservedLocalStorageKeys.has(key)) return;
      localStorage.removeItem(key);
    });
  }
  if (typeof sessionStorage !== 'undefined') {
    const preservedEntries = new Map<string, string>();
    (options?.preserveSessionStorageKeys || []).forEach((key) => {
      const value = sessionStorage.getItem(key);
      if (value !== null) preservedEntries.set(key, value);
    });
    sessionStorage.clear();
    preservedEntries.forEach((value, key) => sessionStorage.setItem(key, value));
  }
};

const clearCacheStorage = async () => {
  if (typeof caches === 'undefined') return;
  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch {
    // no-op
  }
};

const refreshServiceWorkers = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.update();
        } catch {
          // no-op
        }
      })
    );
  } catch {
    // no-op
  }
};

export const runClientFreshStart = async (options?: ClientFreshStartOptions) => {
  const maxAgeMs = Number(options?.maxAgeMs || EIGHT_HOURS_MS);
  if (typeof localStorage === 'undefined') return { skipped: true };
  const currentBuildId = String(options?.currentBuildId || '').trim();

  const now = Date.now();
  const lastRaw = Number(localStorage.getItem(LAST_CACHE_CLEAR_AT_KEY) || 0);
  const lastBuildId = String(localStorage.getItem(LAST_BUILD_ID_KEY) || '').trim();
  const isBuildChanged = Boolean(currentBuildId && lastBuildId && currentBuildId !== lastBuildId);
  const shouldSkip = !isBuildChanged && Number.isFinite(lastRaw) && lastRaw > 0 && now - lastRaw < maxAgeMs;
  if (shouldSkip) {
    if (currentBuildId && !lastBuildId) {
      try {
        localStorage.setItem(LAST_BUILD_ID_KEY, currentBuildId);
      } catch {
        // no-op
      }
    }
    return { skipped: true, nextInMs: maxAgeMs - (now - lastRaw) };
  }

  clearNonHttpOnlyCookies();
  clearStorage(options);
  await clearCacheStorage();
  await refreshServiceWorkers();

  try {
    localStorage.setItem(LAST_CACHE_CLEAR_AT_KEY, String(Date.now()));
    if (currentBuildId) localStorage.setItem(LAST_BUILD_ID_KEY, currentBuildId);
  } catch {
    // no-op
  }

  return { skipped: false };
};
