import { useEffect, useMemo } from 'react';
import { preloadImageUrls } from '../../utils/imagePreload';

type HubImagePreloadInput = {
  enabled?: boolean;
  homeBanners?: Array<string | null | undefined>;
  featuredProducts?: Array<{
    imageUrl?: string | null;
    storeLogo?: string | null;
  }>;
  stores?: Array<{
    logo?: string | null;
    banner?: string | null;
  }>;
  destinations?: Array<{
    imageUrl?: string | null;
    bannerUrl?: string | null;
    logoUrl?: string | null;
    resolvedImageUrl?: string | null;
  }>;
};

export const useHubImagePreload = ({
  enabled = true,
  homeBanners = [],
  featuredProducts = [],
  stores = [],
  destinations = [],
}: HubImagePreloadInput) => {
  const preloadUrls = useMemo(() => {
    if (!enabled) return [];

    return [
      ...homeBanners.slice(0, 2),
      ...featuredProducts.slice(0, 4).flatMap((item) => [item.imageUrl, item.storeLogo]),
      ...stores.slice(0, 8).flatMap((store) => [store.logo, store.banner]),
      ...destinations.slice(0, 3).flatMap((destination) => [
        destination.resolvedImageUrl,
        destination.bannerUrl,
        destination.logoUrl,
        destination.imageUrl,
      ]),
    ];
  }, [destinations, enabled, featuredProducts, homeBanners, stores]);

  useEffect(() => {
    if (!enabled || !preloadUrls.length) return undefined;
    return preloadImageUrls(preloadUrls, { limit: 18, idleTimeoutMs: 1400 });
  }, [enabled, preloadUrls]);
};
