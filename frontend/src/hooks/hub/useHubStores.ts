import { useCallback, useEffect, useRef, useState } from 'react';
import { storeService } from '../../services/storeService';
import type { HubLocation, HubRegion, PreferredDiscoveryAddress } from './useHubLocation';

export type MarketplaceStore = {
  id?: string;
  name?: string;
  slug?: string;
  distanceKm?: number | null;
  deliveryRadiusKm?: number | null;
  deliversToUserLocation?: boolean | null;
  deliveryStatusLabel?: string | null;
  acceptsDelivery?: boolean | null;
  acceptsPickup?: boolean | null;
  geoAvailability?: string | null;
  isOutOfRegion?: boolean | null;
  isNearest?: boolean | null;
  reviewSummary?: {
    totalReviews?: number;
    avgStoreRating?: number;
  } | null;
  settings?: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
    segment?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    isOrderingEnabled?: boolean;
    orderTypes?: string[] | null;
    postalEnabled?: boolean | null;
    lat?: number | null;
    lng?: number | null;
    openingHours?: Array<{
      day: number;
      enabled?: boolean;
      intervals?: Array<{ start: string; end: string }>;
    }> | null;
  } | null;
  openNow?: boolean;
  nextOpeningLabel?: string | null;
};

export type StoreDiscoveryResponse = {
  mode?: 'deliverable' | 'same_city_fallback' | 'nearby_fallback' | 'no_coverage' | string;
  stores?: MarketplaceStore[];
  summary?: {
    deliverableCount?: number;
    sameCityCount?: number;
    nearbyCount?: number;
  } | null;
};

type HubDebug = (event: string, payload?: Record<string, any>) => void;
const CUSTOMER_ADDRESS_UPDATED_EVENT = 'jnc:customer-addresses-updated';

type UseHubStoresParams = {
  selectedCondominiumSlug?: string | null;
  activeLocation: HubLocation | null;
  activeRegion: HubRegion | null;
  savedAddressLocation: HubLocation | null;
  userLocation: HubLocation | null;
  preferredDiscoveryAddress: PreferredDiscoveryAddress | null;
  hubDebug: HubDebug;
};

export function useHubStores({
  selectedCondominiumSlug,
  activeLocation,
  activeRegion,
  savedAddressLocation,
  userLocation,
  preferredDiscoveryAddress,
  hubDebug,
}: UseHubStoresParams) {
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [geoDiscovery, setGeoDiscovery] = useState<StoreDiscoveryResponse | null>(null);
  const [hubScopeOverride, setHubScopeOverride] = useState<'default' | 'all_stores'>('default');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const portfolioLoadInFlightRef = useRef(false);
  const pendingPortfolioReloadRef = useRef(false);
  const latestLoadPortfolioRef = useRef<(() => Promise<void>) | null>(null);
  const isShowingAllStores = hubScopeOverride === 'all_stores';

  const loadPortfolio = useCallback(async () => {
    if (portfolioLoadInFlightRef.current) {
      pendingPortfolioReloadRef.current = true;
      hubDebug('portfolio-load-skipped', { reason: 'in-flight' });
      return;
    }
    portfolioLoadInFlightRef.current = true;
    try {
      const locationQuery =
        selectedCondominiumSlug || hubScopeOverride === 'all_stores'
          ? { lat: null, lng: null, city: null, state: null }
          : {
              lat: savedAddressLocation?.lat ?? userLocation?.lat ?? null,
              lng: savedAddressLocation?.lng ?? userLocation?.lng ?? null,
              city: preferredDiscoveryAddress?.city || activeRegion?.city || null,
              state: preferredDiscoveryAddress?.state || activeRegion?.state || null,
            };
      const hasDiscoveryContext = Boolean(
        Number.isFinite(Number(locationQuery.lat)) ||
          Number.isFinite(Number(locationQuery.lng)) ||
          locationQuery.city ||
          locationQuery.state
      );
      const basePortfolio =
        !selectedCondominiumSlug && hubScopeOverride !== 'all_stores' && hasDiscoveryContext
          ? await storeService.discoverPortfolio({
              lat: locationQuery.lat,
              lng: locationQuery.lng,
              city: locationQuery.city,
              state: locationQuery.state,
            })
          : await storeService.listPortfolio({
              lat: locationQuery.lat,
              lng: locationQuery.lng,
              city: locationQuery.city,
              state: locationQuery.state,
            });
      const discoveryPayload =
        basePortfolio && !Array.isArray(basePortfolio) && Array.isArray((basePortfolio as StoreDiscoveryResponse).stores)
          ? (basePortfolio as StoreDiscoveryResponse)
          : null;
      const baseStores = discoveryPayload ? discoveryPayload.stores || [] : Array.isArray(basePortfolio) ? basePortfolio : [];
      setGeoDiscovery(discoveryPayload);
      setStores(baseStores);
      setError('');
      hubDebug('portfolio-loaded', {
        count: baseStores.length,
        mode: discoveryPayload?.mode || null,
        sample: baseStores.slice(0, 5).map((store: any) => ({
          slug: String(store?.slug || ''),
          hasStoreLatLng: Number.isFinite(Number(store?.settings?.lat)) && Number.isFinite(Number(store?.settings?.lng)),
          city: String(store?.settings?.city || ''),
          state: String(store?.settings?.state || ''),
        })),
      });
    } finally {
      portfolioLoadInFlightRef.current = false;
      if (pendingPortfolioReloadRef.current) {
        pendingPortfolioReloadRef.current = false;
        window.setTimeout(() => {
          void (latestLoadPortfolioRef.current || loadPortfolio)();
        }, 0);
      }
    }
  }, [
    activeLocation?.lat,
    activeLocation?.lng,
    activeRegion?.city,
    activeRegion?.state,
    hubDebug,
    hubScopeOverride,
    preferredDiscoveryAddress?.city,
    preferredDiscoveryAddress?.state,
    savedAddressLocation?.lat,
    savedAddressLocation?.lng,
    selectedCondominiumSlug,
    userLocation?.lat,
    userLocation?.lng,
  ]);
  latestLoadPortfolioRef.current = loadPortfolio;

  const refreshHub = useCallback(async () => {
    if (portfolioLoadInFlightRef.current) return;
    setIsRefreshing(true);
    try {
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o app agora.');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPortfolio]);

  useEffect(() => {
    let active = true;
    if (!stores.length) setLoading(true);
    loadPortfolio()
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Não foi possível carregar as lojas agora.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hubScopeOverride, loadPortfolio]);

  useEffect(() => {
    const clearAndReload = () => {
      storeService.clearPortfolioCache();
      window.setTimeout(() => {
        void (latestLoadPortfolioRef.current || loadPortfolio)();
      }, 80);
    };
    window.addEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, clearAndReload as EventListener);
    return () => window.removeEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, clearAndReload as EventListener);
  }, [loadPortfolio]);

  return {
    stores,
    loading,
    error,
    setError,
    geoDiscovery,
    hubScopeOverride,
    setHubScopeOverride,
    isShowingAllStores,
    isRefreshing,
    refreshHub,
  };
}
