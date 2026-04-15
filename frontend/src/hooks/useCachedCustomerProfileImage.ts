import { useEffect, useMemo, useState } from 'react';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const CUSTOMER_AVATAR_CACHE = 'jnk-customer-avatar-v1';
const memoryObjectUrls = new Map<string, string>();
const pendingLoads = new Map<string, Promise<string | undefined>>();

const supportsPersistentAvatarCache = () =>
  typeof window !== 'undefined' && 'caches' in window && typeof window.caches?.open === 'function';

export const buildCustomerProfileImageUrl = (value?: string | null, version?: number | null) => {
  const baseUrl = resolveAssetUrl(value || undefined);
  const normalizedVersion = Number(version || 0);
  if (!baseUrl) return undefined;
  if (!normalizedVersion) return baseUrl;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${normalizedVersion}`;
};

const loadCachedAvatarObjectUrl = async (versionedUrl: string) => {
  if (!supportsPersistentAvatarCache()) {
    return versionedUrl;
  }

  const cachedInMemory = memoryObjectUrls.get(versionedUrl);
  if (cachedInMemory) {
    return cachedInMemory;
  }

  const inFlight = pendingLoads.get(versionedUrl);
  if (inFlight) {
    return inFlight;
  }

  const loadPromise = (async () => {
    try {
      const cache = await window.caches.open(CUSTOMER_AVATAR_CACHE);
      const request = new Request(versionedUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      let response = await cache.match(request);
      if (!response) {
        response = await fetch(request, { cache: 'force-cache' });
        if (response.ok) {
          await cache.put(request, response.clone());
        }
      }

      if (!response?.ok) {
        return versionedUrl;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      memoryObjectUrls.set(versionedUrl, objectUrl);
      return objectUrl;
    } catch {
      return versionedUrl;
    } finally {
      pendingLoads.delete(versionedUrl);
    }
  })();

  pendingLoads.set(versionedUrl, loadPromise);
  return loadPromise;
};

export function useCachedCustomerProfileImage(value?: string | null, version?: number | null) {
  const versionedUrl = useMemo(() => buildCustomerProfileImageUrl(value, version), [value, version]);
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(versionedUrl);

  useEffect(() => {
    let mounted = true;

    if (!versionedUrl) {
      setResolvedUrl(undefined);
      return () => {
        mounted = false;
      };
    }

    const cachedInMemory = memoryObjectUrls.get(versionedUrl);
    setResolvedUrl(cachedInMemory || versionedUrl);

    void loadCachedAvatarObjectUrl(versionedUrl).then((nextUrl) => {
      if (!mounted || !nextUrl) return;
      setResolvedUrl(nextUrl);
    });

    return () => {
      mounted = false;
    };
  }, [versionedUrl]);

  return resolvedUrl;
}
