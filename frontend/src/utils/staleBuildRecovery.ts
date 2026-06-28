const STALE_BUILD_RECOVERY_KEY = 'jnc:stale-build-recovery-at';
const STALE_BUILD_RECOVERY_WINDOW_MS = 45_000;

const STALE_BUILD_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /failed to load module script/i,
  /chunkloaderror/i,
  /loading chunk .+ failed/i,
  /cannot access .+ before initialization/i,
  /\.js\b.*(?:404|net::err_|failed)/i,
];

const VERSIONED_ASSET_URL_PATTERNS = [
  /\/assets\/[^\s?#]+\.(?:js|css)(?:[?#].*)?$/i,
  /\/(?:\.\/)?[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9_-]{6,}\.js(?:[?#].*)?$/i,
];

export const isStaleBuildErrorMessage = (value: unknown) => {
  const message = String(value || '').trim();
  if (!message) return false;
  return STALE_BUILD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const isVersionedAssetUrl = (value: unknown) => {
  const url = String(value || '').trim();
  if (!url) return false;
  return VERSIONED_ASSET_URL_PATTERNS.some((pattern) => pattern.test(url));
};

const clearRuntimeCaches = async () => {
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    // no-op
  }

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => undefined)));
    }
  } catch {
    // no-op
  }
};

const wasRecentlyRecovered = () => {
  try {
    const last = Number(sessionStorage.getItem(STALE_BUILD_RECOVERY_KEY) || 0);
    return Number.isFinite(last) && last > 0 && Date.now() - last < STALE_BUILD_RECOVERY_WINDOW_MS;
  } catch {
    return false;
  }
};

const markRecovered = () => {
  try {
    sessionStorage.setItem(STALE_BUILD_RECOVERY_KEY, String(Date.now()));
  } catch {
    // no-op
  }
};

const reloadWithCacheBust = () => {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('_recover', String(Date.now()));
  window.location.replace(nextUrl.toString());
};

export const recoverFromStaleBuild = async (options: { force?: boolean } = {}) => {
  if (typeof window === 'undefined') return;
  if (!options.force && wasRecentlyRecovered()) return;
  markRecovered();
  await clearRuntimeCaches();
  reloadWithCacheBust();
};

export const installStaleBuildRecovery = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null;
    const sourceUrl =
      target && 'src' in target
        ? String((target as HTMLScriptElement).src || '')
        : target && 'href' in target
          ? String((target as HTMLLinkElement).href || '')
        : String(event.filename || '');
    const message = [event.message, sourceUrl].filter(Boolean).join(' ');
    if (isVersionedAssetUrl(sourceUrl) || isStaleBuildErrorMessage(message)) {
      void recoverFromStaleBuild();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? `${reason.name} ${reason.message}` : String(reason || '');
    if (isStaleBuildErrorMessage(message)) {
      void recoverFromStaleBuild();
    }
  });
};
