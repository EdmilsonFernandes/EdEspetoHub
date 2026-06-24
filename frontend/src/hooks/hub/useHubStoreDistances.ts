import { useEffect, useRef, useState } from 'react';
import type { HubLocation, HubRegion, PreferredDiscoveryAddress } from './useHubLocation';
import { haversineKm } from '../../utils/geo';

const HUB_DISTANCE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type HubDebug = (event: string, payload?: Record<string, any>) => void;

type HubDistanceStore = {
  id: string;
  slug: string;
  distanceKm?: number | null;
  distanceSource?: 'server' | 'local' | 'none' | string;
  storeLat?: number | null;
  storeLng?: number | null;
};

type UseHubStoreDistancesParams = {
  stores: HubDistanceStore[];
  activeLocation: HubLocation | null;
  activeRegion: HubRegion | null;
  preferredDiscoveryAddress: PreferredDiscoveryAddress | null;
  savedAddressLocation: HubLocation | null;
  isCondominiumScope: boolean;
  hubDebug: HubDebug;
  hubDebugEnabled: boolean;
};

const normalizeSearchText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const readHubCache = <T,>(key: string, ttlMs: number): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || Date.now() - ts > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return (parsed?.data ?? null) as T | null;
  } catch {
    return null;
  }
};

const writeHubCache = (key: string, data: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
};

const buildDistanceContextKey = (
  preferredAddress: PreferredDiscoveryAddress | null,
  activeLocation: HubLocation | null,
  activeRegion: HubRegion | null
) => {
  const label = preferredAddress?.addressLine || preferredAddress?.label || '';
  const lat = activeLocation?.lat != null ? Number(activeLocation.lat).toFixed(4) : 'na';
  const lng = activeLocation?.lng != null ? Number(activeLocation.lng).toFixed(4) : 'na';
  const region = [activeRegion?.city, activeRegion?.state].filter(Boolean).join('|') || 'na';
  return [normalizeSearchText(label), normalizeSearchText(region), lat, lng].join(':');
};

export function useHubStoreDistances({
  stores,
  activeLocation,
  activeRegion,
  preferredDiscoveryAddress,
  savedAddressLocation,
  isCondominiumScope,
  hubDebug,
  hubDebugEnabled,
}: UseHubStoreDistancesParams) {
  const [distanceByStore, setDistanceByStore] = useState<Record<string, number>>({});
  const [distanceLoading, setDistanceLoading] = useState(false);
  const distanceCacheKeyRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    const loadApproxDistances = async () => {
      if (isCondominiumScope || !activeLocation || stores.length === 0) {
        setDistanceByStore({});
        return;
      }
      const contextKey = buildDistanceContextKey(preferredDiscoveryAddress, activeLocation, activeRegion);
      if (distanceCacheKeyRef.current !== contextKey) {
        distanceCacheKeyRef.current = contextKey;
        try {
          const cached = readHubCache<Record<string, number>>(`hub:store-distance:${contextKey}`, HUB_DISTANCE_CACHE_TTL_MS);
          setDistanceByStore(cached && typeof cached === 'object' ? cached : {});
        } catch {
          setDistanceByStore({});
        }
      }
      if (stores.every((store) => store.distanceSource === 'server')) {
        setDistanceByStore({});
        return;
      }

      try {
        const targets = stores
          .filter((store) => store.distanceSource !== 'server')
          .filter((store) => store.storeLat != null && store.storeLng != null);
        const cachedDistances =
          readHubCache<Record<string, number>>(`hub:store-distance:${contextKey}`, HUB_DISTANCE_CACHE_TTL_MS) || {};

        const missingTargets = targets.filter((store) => {
          const cachedKm = Number(cachedDistances?.[store.id]);
          return !Number.isFinite(cachedKm);
        });

        if (Object.keys(cachedDistances).length > 0 && !cancelled) {
          setDistanceByStore(cachedDistances);
        }
        if (missingTargets.length === 0) {
          hubDebug('distance-cache-hit', {
            contextKey,
            cachedCount: Object.keys(cachedDistances).length,
          });
          setDistanceLoading(false);
          return;
        }

        setDistanceLoading(true);
        const settled = await Promise.allSettled(
          missingTargets.map(async (store) => {
            const km = haversineKm(activeLocation, { lat: Number(store.storeLat), lng: Number(store.storeLng) });
            return [store.id, km] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, number> = { ...cachedDistances };
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            next[result.value[0]] = result.value[1] ?? 0;
          }
        });
        setDistanceByStore(next);
        writeHubCache(`hub:store-distance:${contextKey}`, next);
        hubDebug('distance-calculated', {
          contextKey,
          activeSource: savedAddressLocation ? 'saved_address' : activeLocation ? 'gps' : 'none',
          targetCount: missingTargets.length,
          sample: missingTargets.slice(0, 5).map((store) => ({
            slug: store.slug,
            km: next[store.id] ?? null,
            storeLat: store.storeLat,
            storeLng: store.storeLng,
          })),
        });
      } catch (_err) {
        // preserve the last valid cache instead of clearing the distance badge
      } finally {
        if (!cancelled) setDistanceLoading(false);
      }
    };
    const timer = window.setTimeout(loadApproxDistances, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeLocation, activeRegion?.city, activeRegion?.state, hubDebug, isCondominiumScope, preferredDiscoveryAddress?.addressLine, savedAddressLocation, stores]);

  useEffect(() => {
    if (!hubDebugEnabled) return;
    hubDebug('distance-snapshot', {
      totalStores: stores.length,
      computedLocalDistances: Object.keys(distanceByStore).length,
      distanceLoading,
      sample: stores.slice(0, 5).map((store) => ({
        slug: store.slug,
        source: distanceByStore[store.id] != null ? 'local_haversine' : store.distanceKm != null ? 'server' : 'none',
        km: distanceByStore[store.id] ?? store.distanceKm ?? null,
        hasStoreLatLng: store.storeLat != null && store.storeLng != null,
      })),
    });
  }, [distanceByStore, distanceLoading, hubDebug, hubDebugEnabled, stores]);

  return { distanceByStore, distanceLoading };
}
