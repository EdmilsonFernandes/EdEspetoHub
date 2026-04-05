import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Star, Storefront, House, List, CaretDown, Heart, CaretRight } from '@phosphor-icons/react';
import { storeService } from '../services/storeService';
import { productService } from '../services/productService';
import { customerAccountService } from '../services/customerAccountService';
import { featuredService } from '../services/featuredService';
import { mapsService } from '../services/mapsService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { HeaderAvatarTrigger } from '../components/Marketplace/HeaderAvatarTrigger';
import { ProfileDrawer } from '../components/Marketplace/ProfileDrawer';
import { APP_BUILD_INFO } from '../generated/buildInfo';

type MarketplaceStore = {
  id?: string;
  name?: string;
  slug?: string;
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
    openingHours?: Array<{
      day: number;
      enabled?: boolean;
      intervals?: Array<{ start: string; end: string }>;
    }> | null;
  } | null;
  openNow?: boolean;
  nextOpeningLabel?: string | null;
};

const normalizeSegment = (segment?: string | null) =>
  String(segment || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const segmentLabel = (segment?: string | null) => {
  const value = normalizeSegment(segment);
  const map: Record<string, string> = {
    restaurante: 'Restaurante',
    restaurantes: 'Restaurante',
    hamburgueria: 'Hamburguer',
    hamburguerias: 'Hamburguer',
    lanchonete: 'Lanche',
    pizzaria: 'Pizza',
    adega: 'Bebidas',
    mercado: 'Mercado',
    farmacia: 'Farmacia',
    confeitaria: 'Doces',
    outros: 'Loja Local',
  };
  return map[value] || 'Loja Local';
};

const parseCityStateFromAddress = (address?: string | null) => {
  const raw = String(address || '').trim();
  if (!raw) return { city: '', state: '' };
  const byPipe = raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const candidates = byPipe.length ? [...byPipe].reverse() : [raw];
  candidates.push(raw);
  const matched = candidates
    .map((target) => target.match(/(.+?)\s*[-/]\s*([A-Za-z]{2})\b/))
    .find(Boolean);
  if (!matched) return { city: '', state: '' };
  return {
    city: String(matched?.[1] || '').trim(),
    state: String(matched?.[2] || '').trim().toUpperCase(),
  };
};

const hashFrom = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const categoryVisuals: Record<string, { emoji: string; label: string }> = {
  Restaurante: { emoji: '🍽️', label: 'Restaurante' },
  Hamburguer: { emoji: '🍔', label: 'Hamburguer' },
  Lanche: { emoji: '🥪', label: 'Lanche' },
  Pizza: { emoji: '🍕', label: 'Pizza' },
  Bebidas: { emoji: '🍷', label: 'Bebidas' },
  Mercado: { emoji: '🛒', label: 'Mercado' },
  Farmacia: { emoji: '💊', label: 'Farmacia' },
  Doces: { emoji: '🧁', label: 'Doces' },
  'Loja Local': { emoji: '🏬', label: 'Loja Local' },
};

type FeaturedProduct = {
  id: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string;
  name: string;
  imageUrl: string;
  price: number;
  sponsored?: boolean;
};

const readCustomerSession = () => {
  try {
    const raw = localStorage.getItem('customerSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    
    if (parsed.token && parsed.user) {
      return parsed as {
        token?: string;
        user?: { fullName?: string; name?: string; email?: string; profileImageUrl?: string | null };
      };
    }
    return null;
  } catch {
    return null;
  }
};

const FAVORITES_STORAGE_KEY = 'hub:favorites:stores';

export function MarketplacePage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'free_shipping' | 'nearby' | 'open_now' | 'favorites'>('all');
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isHeaderElevated, setIsHeaderElevated] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Sua região');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => readCustomerSession());
  const [distanceByStore, setDistanceByStore] = useState<Record<string, number>>({});
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [favoriteStoreSlugs, setFavoriteStoreSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  });
  const touchStartYRef = useRef<number | null>(null);
  const touchPullActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    document.title = 'Hub Já no Caminho';
  }, []);

  useEffect(() => {
    const syncSession = () => setCustomerSession(readCustomerSession());
    window.addEventListener('storage', syncSession);
    window.addEventListener('focus', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('focus', syncSession);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStoreSlugs));
    } catch {
      // ignore
    }
  }, [favoriteStoreSlugs]);

  useEffect(() => {
    let cancelled = false;
    const resolveUserLabel = async () => {
      if (!userLocation) return;
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.lat}&lon=${userLocation.lng}`,
          { signal: controller.signal }
        );
        window.clearTimeout(timeout);
        const data = await response.json().catch(() => null);
        const addr = data?.address || {};
        const locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.city ||
          addr.town ||
          addr.village ||
          '';
        const state = (addr.state_code || addr.state || '').toString();
        const nextLabel = [locality, state].filter(Boolean).join(' - ').trim();
        if (!cancelled && nextLabel) setLocationLabel(nextLabel);
      } catch (_error) {
        if (!cancelled) setLocationLabel('Sua região');
      }
    };
    resolveUserLabel();
    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
        });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  const loadPortfolio = useCallback(async () => {
    const data = await storeService.listPortfolio();
    setStores(Array.isArray(data) ? data : []);
    setError('');
  }, []);

  const refreshHub = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o Hub agora.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadPortfolio]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadPortfolio()
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Não foi possível carregar o Hub de lojas agora.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadPortfolio]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (featuredProducts.length <= 8) {
      setFeaturedOffset(0);
      return;
    }
    const timer = window.setInterval(() => {
      setFeaturedOffset((prev) => (prev + 1) % featuredProducts.length);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [featuredProducts]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setHasEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const delta = currentY - lastY;
        if (delta > 8 && currentY > 120) setIsBottomNavVisible(false);
        if (delta < -8) setIsBottomNavVisible(true);
        setIsHeaderElevated(currentY > 8);
        lastY = currentY;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 2 || isRefreshing) return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      touchPullActiveRef.current = touchStartYRef.current != null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchPullActiveRef.current || touchStartYRef.current == null) return;
      const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
      const delta = currentY - touchStartYRef.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const withResistance = Math.min(120, delta * 0.45);
      pullDistanceRef.current = withResistance;
      setPullDistance(withResistance);
    };

    const onTouchEnd = () => {
      if (!touchPullActiveRef.current) {
        setPullDistance(0);
        return;
      }
      touchPullActiveRef.current = false;
      touchStartYRef.current = null;
      const shouldRefresh = pullDistanceRef.current >= 68;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      if (shouldRefresh) {
        refreshHub();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isRefreshing, refreshHub]);

  const enrichedStores = useMemo(() => {
    return (stores || [])
      .map((store, index) => {
        const slug = String(store?.slug || '').trim();
        if (!slug) return null;
        const seed = hashFrom(`${slug}-${store?.name || ''}`);
        const rawCity = String((store as any)?.settings?.city || '').trim();
        const rawState = String((store as any)?.settings?.state || '').trim().toUpperCase();
        const fallbackLocation = parseCityStateFromAddress((store as any)?.settings?.address || '');
        const city = rawCity || fallbackLocation.city || 'Perto de você';
        const state = rawState || fallbackLocation.state;
        const segment = segmentLabel(store?.settings?.segment);
        const rating = Number(store?.reviewSummary?.avgStoreRating || 0) > 0
          ? Number(store?.reviewSummary?.avgStoreRating)
          : 4.6 + ((seed % 5) * 0.1);
        const distanceKm = 0.8 + (seed % 52) / 10;
        const etaMin = 18 + (seed % 18);
        const etaMax = etaMin + 10;
        const freeShipping = seed % 3 === 0;
        const rawOrderTypes = Array.isArray(store?.settings?.orderTypes)
          ? (store?.settings?.orderTypes as unknown[])
              .map((value) => String(value || '').trim().toLowerCase())
              .filter(Boolean)
          : [];
        const supportsDelivery = rawOrderTypes.includes('delivery');
        const supportsPickup = rawOrderTypes.includes('pickup');
        const supportsTable = rawOrderTypes.includes('table');
        const supportsPostal = supportsDelivery && Boolean(store?.settings?.postalEnabled);
        const rawHours = Array.isArray(store?.settings?.openingHours) ? (store?.settings?.openingHours as any[]) : [];
        const isOpen =
          (store?.settings?.isOrderingEnabled ?? true) !== false &&
          (
            typeof store?.openNow === 'boolean'
              ? store.openNow
              : (rawHours.length > 0
                  ? isStoreOpenNow(normalizeOpeningHours(rawHours as any) as any)
                  : true)
          );
        const logo = resolveAssetUrl(store?.settings?.logoUrl || undefined) || '/janocaminho-logo.png';
        const banner = resolveAssetUrl(store?.settings?.bannerUrl || undefined) || logo;
        const searchIndex = [store?.name, slug, segment, city, state].filter(Boolean).join(' ').toLowerCase();
        return {
          id: String(store?.id || slug || index),
          name: String(store?.name || 'Loja'),
          slug,
          segment,
          city,
          state,
          rating,
          distanceKm,
          etaMin,
          etaMax,
          freeShipping,
          isOpen,
          supportsDelivery,
          supportsPickup,
          supportsTable,
          supportsPostal,
          nextOpeningLabel: String(store?.nextOpeningLabel || '').trim(),
          primaryColor: String(store?.settings?.primaryColor || '').trim(),
          secondaryColor: String(store?.settings?.secondaryColor || '').trim(),
          addressText: [
            String((store as any)?.settings?.address || '').trim(),
            String((store as any)?.settings?.city || '').trim(),
            String((store as any)?.settings?.state || '').trim(),
          ]
            .filter(Boolean)
            .join(', '),
          logo,
          banner,
          searchIndex,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      slug: string;
      segment: string;
      city: string;
      state: string;
      rating: number;
      distanceKm: number;
      etaMin: number;
      etaMax: number;
      freeShipping: boolean;
      isOpen: boolean;
      supportsDelivery: boolean;
      supportsPickup: boolean;
      supportsTable: boolean;
      supportsPostal: boolean;
      nextOpeningLabel: string;
      primaryColor: string;
      secondaryColor: string;
      addressText: string;
      logo: string;
      banner: string;
      searchIndex: string;
    }>;
  }, [stores]);

  const segmentOptions = useMemo(() => {
    return Array.from(new Set(enrichedStores.map((item) => item.segment))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [enrichedStores]);

  const fallbackRegionLabel = useMemo(() => {
    const firstWithLocation = enrichedStores.find((store) => String(store.city || '').trim() && String(store.state || '').trim());
    if (!firstWithLocation) return '';
    return `${firstWithLocation.city} - ${firstWithLocation.state}`;
  }, [enrichedStores]);

  const filteredStores = useMemo(() => {
    return enrichedStores
      .filter((store) => {
        if (debouncedQuery && !store.searchIndex.includes(debouncedQuery)) return false;
        if (segmentFilter !== 'all' && store.segment !== segmentFilter) return false;
        if (quickFilter === 'free_shipping' && !store.freeShipping) return false;
        if (quickFilter === 'nearby' && store.distanceKm > 2.5) return false;
        if (quickFilter === 'open_now' && !store.isOpen) return false;
        if (quickFilter === 'favorites' && !favoriteStoreSlugs.includes(store.slug)) return false;
        return true;
      })
      .sort((a, b) => {
        const favoritesDelta = Number(favoriteStoreSlugs.includes(b.slug)) - Number(favoriteStoreSlugs.includes(a.slug));
        if (favoritesDelta !== 0) return favoritesDelta;
        return Number(b.isOpen) - Number(a.isOpen);
      });
  }, [enrichedStores, debouncedQuery, segmentFilter, quickFilter, favoriteStoreSlugs]);

  const categoryTiles = useMemo(() => {
    return segmentOptions.map((segment) => categoryVisuals[segment] || { emoji: '🏪', label: segment });
  }, [segmentOptions]);

  const favoriteStores = useMemo(() => {
    if (!favoriteStoreSlugs.length) return [];
    return enrichedStores
      .filter((store) => favoriteStoreSlugs.includes(store.slug))
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || b.rating - a.rating);
  }, [enrichedStores, favoriteStoreSlugs]);

  useEffect(() => {
    let cancelled = false;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      return R * c;
    };

    const loadApproxDistances = async () => {
      if (!userLocation || enrichedStores.length === 0) return;
      setDistanceLoading(true);
      try {
        const targets = enrichedStores.slice(0, 18).filter((store) => store.addressText.length >= 8);
        const settled = await Promise.allSettled(
          targets.map(async (store) => {
            const geo = await mapsService.geocode(store.addressText);
            const km = haversineKm(userLocation, { lat: geo.lat, lng: geo.lng });
            return [store.id, km] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, number> = {};
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            next[result.value[0]] = result.value[1];
          }
        });
        setDistanceByStore(next);
      } catch (_err) {
        if (!cancelled) setDistanceByStore({});
      } finally {
        if (!cancelled) setDistanceLoading(false);
      }
    };
    loadApproxDistances();
    return () => {
      cancelled = true;
    };
  }, [userLocation, enrichedStores]);

  useEffect(() => {
    let cancelled = false;
    const loadFeaturedProducts = async () => {
      if (enrichedStores.length === 0) {
        setFeaturedProducts([]);
        return;
      }
      setFeaturedLoading(true);
      try {
        const sponsored = await featuredService.listPublicFeatured(18).catch(() => []);
        const sponsoredEntries = (Array.isArray(sponsored) ? sponsored : [])
          .filter((item: any) => String(item?.storeSlug || '').trim())
          .map((item: any) => ({
            id: String(item?.id || `${item?.storeSlug}-${item?.productId || item?.productName || 'sponsored'}`),
            storeSlug: String(item?.storeSlug || ''),
            storeName: String(item?.storeName || 'Loja'),
            name: String(item?.productName || 'Produto em destaque'),
            storeLogo: resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho-logo.png',
            imageUrl: resolveAssetUrl(item?.imageUrl || undefined) || resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho-logo.png',
            price: Number(item?.price || 0),
            sponsored: true,
          }))
          .filter((item: any) => item.storeSlug && item.price > 0);

        const candidates = enrichedStores.slice(0, 6);
        const responses = await Promise.allSettled(
          candidates.map(async (store) => {
            const products = await productService.listPublicBySlug(store.slug);
            const valid = (Array.isArray(products) ? products : [])
              .filter((product: any) => Boolean(product?.name) && Number(product?.price || product?.promoPrice || 0) > 0)
              .map((product: any) => ({
                id: String(product?.id || `${store.slug}-${product?.name}`),
                storeSlug: store.slug,
                storeName: store.name,
                name: String(product?.name || 'Produto'),
                storeLogo: store.logo,
                imageUrl: resolveAssetUrl(product?.imageUrl || undefined) || store.logo,
                price: Number(
                  (product?.promoActive && product?.promoPrice != null ? product?.promoPrice : product?.price) || 0
                ),
                featured: Boolean(product?.isFeatured),
                sponsored: false,
              }))
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 5);
            return valid;
          })
        );
        if (cancelled) return;
        const organicPool = responses
          .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
          .filter((entry) => entry.price > 0)
          .map(({ featured: _featured, ...entry }) => entry);
        const sponsoredKeys = new Set(
          sponsoredEntries.map((entry: any) => `${entry.storeSlug}::${entry.id}::${entry.name}`)
        );
        const uniqueOrganic = organicPool.filter(
          (entry: any) => !sponsoredKeys.has(`${entry.storeSlug}::${entry.id}::${entry.name}`)
        );
        const shuffledOrganic = [...uniqueOrganic].sort(() => Math.random() - 0.5);
        const merged = [...sponsoredEntries, ...shuffledOrganic].slice(0, 18);
        setFeaturedProducts(merged);
      } catch (_error) {
        if (!cancelled) setFeaturedProducts([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    };
    loadFeaturedProducts();
    return () => {
      cancelled = true;
    };
  }, [enrichedStores]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    []
  );

  const theme = useMemo(() => {
    const target = filteredStores[0] || enrichedStores[0];
    const isHexColor = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
    const primary = isHexColor(String(target?.primaryColor || '')) ? String(target?.primaryColor) : '#0f172a';
    const secondary = isHexColor(String(target?.secondaryColor || '')) ? String(target?.secondaryColor) : '#e2e8f0';
    return { primary, secondary };
  }, [filteredStores, enrichedStores]);

  const genericHighlightLabel = useMemo(() => {
    const hasFoodHeavy = enrichedStores.some((store) =>
      [ 'Restaurante', 'Hamburguer', 'Lanche', 'Pizza', 'Doces' ].includes(store.segment)
    );
    return hasFoodHeavy ? 'Itens em destaque' : 'Produtos em destaque';
  }, [enrichedStores]);

  const formatDistance = (km: number) => {
    if (!Number.isFinite(km) || km <= 0) return 'Região';
    if (km > 50) return 'Região';
    if (km < 1) return `${Math.max(100, Math.round(km * 1000 / 100) * 100)} m`;
    return `${km.toFixed(1)} km`;
  };

  const displayedFeaturedProducts = useMemo(() => {
    const items = Array.isArray(featuredProducts) ? featuredProducts : [];
    const sponsored = items.filter((item) => item.sponsored);
    const organic = items.filter((item) => !item.sponsored);
    const windowSize = 8;
    if (items.length <= windowSize) return items;
    if (organic.length === 0) return sponsored.slice(0, windowSize);

    const fixedSponsored = sponsored.slice(0, Math.min(windowSize, sponsored.length));
    const remainingSlots = Math.max(0, windowSize - fixedSponsored.length);
    if (remainingSlots === 0) return fixedSponsored;

    const rotatedOrganic: FeaturedProduct[] = [];
    for (let i = 0; i < remainingSlots; i += 1) {
      rotatedOrganic.push(organic[(featuredOffset + i) % organic.length]);
    }
    return [...fixedSponsored, ...rotatedOrganic];
  }, [featuredProducts, featuredOffset]);

  const isCustomerLogged = Boolean(customerSession?.token);
  const customerDisplayName = String(
    customerSession?.user?.fullName || customerSession?.user?.name || (isCustomerLogged ? 'Cliente' : 'Anônimo')
  ).trim();
  const customerEmail = String(customerSession?.user?.email || '').trim();
  const customerProfileImage = resolveAssetUrl(customerSession?.user?.profileImageUrl || undefined);
  const displayLocationLabel = locationLabel === 'Sua região' && fallbackRegionLabel ? fallbackRegionLabel : locationLabel;

  const openCustomerAccount = useCallback(() => {
    navigate('/cliente/conta');
  }, [navigate]);

  const openCustomerLogin = useCallback(() => {
    navigate('/cliente?mode=login&next=/hub&hub=1');
  }, [navigate]);

  const openAdminLogin = useCallback(() => {
    navigate('/admin');
  }, [navigate]);

  const openMotoboyLogin = useCallback(() => {
    navigate('/motoboy/login');
  }, [navigate]);

  const openTerms = useCallback(() => {
    navigate('/terms?from=hub');
  }, [navigate]);

  const openPrivacy = useCallback(() => {
    navigate('/terms?from=hub#lgpd');
  }, [navigate]);

  const openHelp = useCallback(() => {
    window.location.href = 'mailto:contato@janocaminho.com.br?subject=Ajuda%20-%20Ja%20no%20Caminho';
  }, []);

  const handleCustomerLogout = useCallback(() => {
    localStorage.removeItem('customerSession');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('customerSession_')) localStorage.removeItem(key);
    });
    setCustomerSession(null);
    navigate('/hub');
  }, [navigate]);

  const toggleFavoriteStore = useCallback((slug: string) => {
    const normalized = String(slug || '').trim();
    if (!normalized) return;
    setFavoriteStoreSlugs((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized);
      return [normalized, ...prev].slice(0, 200);
    });
  }, []);

  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  const loadActiveOrders = useCallback(async () => {
    const session = readCustomerSession();
    if (!session?.token) {
      setActiveOrders([]);
      return;
    }
    try {
      const orders = await customerAccountService.listOrders();
      const active = (orders || []).filter((o: any) => {
        const status = String(o.status || '').toLowerCase();
        return !['done', 'delivered', 'finished', 'cancelled', 'rejected'].includes(status);
      });
      setActiveOrders(active.slice(0, 3));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadActiveOrders();
    const interval = window.setInterval(loadActiveOrders, 30000);
    return () => window.clearInterval(interval);
  }, [loadActiveOrders]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setHasEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden overscroll-x-none bg-slate-50 pb-28 sm:pb-20 text-slate-900 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Elemento Decorativo de Fundo (Premium Look) */}
      <div className="fixed top-0 left-0 right-0 h-[320px] bg-gradient-to-b from-sky-100/40 via-slate-50 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-[-10%] right-[-10%] h-[40%] w-[50%] bg-sky-200/20 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />

      <div
        className={`pointer-events-none fixed left-1/2 z-[120] -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 ${
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ top: `${Math.max(8, 8 + pullDistance * 0.35)}px` }}
      >
        {isRefreshing ? 'Atualizando...' : pullDistance >= 68 ? 'Solte para atualizar' : 'Puxe para atualizar'}
      </div>
      
      <ProfileDrawer
        isOpen={profileDrawerOpen}
        isLogged={isCustomerLogged}
        userName={customerDisplayName || 'Anônimo'}
        userEmail={customerEmail}
        profileImageUrl={customerProfileImage}
        onClose={() => setProfileDrawerOpen(false)}
        onLogin={openCustomerLogin}
        onOpenAdminLogin={openAdminLogin}
        onOpenMotoboyLogin={openMotoboyLogin}
        onOpenAccount={openCustomerAccount}
        onOpenTerms={openTerms}
        onOpenPrivacy={openPrivacy}
        onOpenHelp={openHelp}
        onLogout={handleCustomerLogout}
        versionLabel={APP_BUILD_INFO.versionLabel}
      />

      <div
        className={`relative transition-all duration-700 ${
          hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <header className={`sticky top-0 z-[60] transition-all duration-500 ${isHeaderElevated ? 'bg-white/90 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl' : 'bg-transparent'}`}>
          <div className="mx-auto max-w-[1200px] px-4 pb-4 pt-[max(1.2rem,calc(env(safe-area-inset-top)+0.5rem))] space-y-5">
            {/* Linha 1: Perfil e Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeaderAvatarTrigger
                  displayName={customerDisplayName}
                  profileImageUrl={customerProfileImage}
                  hasNotification={!isCustomerLogged}
                  onClick={() => setProfileDrawerOpen(true)}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase tracking-widest text-slate-400">Entregar em</p>
                  <button
                    type="button"
                    className="inline-flex min-w-0 items-center gap-1 text-[14px] font-black text-slate-900 transition-colors hover:text-sky-700"
                    onClick={() => setQuickFilter((prev) => (prev === 'nearby' ? 'all' : 'nearby'))}
                  >
                    <span className="truncate">{displayLocationLabel}</span>
                    <CaretDown size={14} weight="bold" className="shrink-0 text-sky-500" />
                  </button>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => navigate('/hub')}
                className="relative shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] border border-slate-100 transition-transform active:scale-90"
              >
                <img
                  src="/janocaminho-logov1.svg"
                  alt="Logo"
                  className="h-[70%] w-[70%] object-contain"
                />
              </button>
            </div>

            {/* Linha 2: Busca Premium */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <MagnifyingGlass size={20} weight="bold" className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="O que você quer pedir agora?"
                className="h-13 w-full rounded-[1.25rem] border-none bg-white px-12 text-[15px] font-medium text-slate-700 shadow-[0_10px_25px_-8px_rgba(0,0,0,0.08)] ring-1 ring-slate-200/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
              />
            </div>

            {/* Linha 3: Filtros Minimalistas (Pílulas) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide pb-1">
              {['all', 'free_shipping', 'nearby', 'open_now', 'favorites'].map((filter) => {
                const label =
                  filter === 'all' ? 'Ver Todos' :
                  filter === 'free_shipping' ? 'Frete Grátis' :
                  filter === 'nearby' ? 'Perto de Você' :
                  filter === 'favorites' ? 'Favoritos' : 'Abertos Agora';
                const active = quickFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setQuickFilter(filter as any)}
                    className={`rounded-full border px-5 py-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                  setSegmentFilter('all');
                  setQuickFilter('all');
                }}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap text-slate-500 hover:border-slate-300"
              >
                Limpar
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1200px] mx-auto px-4 pt-4 space-y-10">
          {activeOrders.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-emerald-200/50 bg-emerald-50/90 backdrop-blur-md p-5 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                        Pedido em Andamento
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => navigate(`/pedido/${order.id}`)}
                          className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-emerald-900 border border-emerald-100 shadow-sm active:scale-95"
                        >
                          #{String(order.id).slice(-6).toUpperCase()} • {order.store?.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/pedido/${activeOrders[0].id}`)}
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-xl transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    Acompanhar Agora
                    <CaretRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Seção Categorias Premium Squircle */}
          <section className="relative px-1" style={{ transition: 'all .45s ease', transitionDelay: '100ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-2 snap-x snap-mandatory">
              <button
                type="button"
                className="flex-shrink-0 snap-start group"
                onClick={() => setSegmentFilter('all')}
              >
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-2 transition-all duration-500 ${
                  segmentFilter === 'all' ? 'border-sky-500 bg-sky-50 shadow-2xl shadow-sky-500/20 -translate-y-1' : 'border-white bg-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.1)]'
                }`}>
                  <List size={28} weight="duotone" className={segmentFilter === 'all' ? 'text-sky-600' : 'text-slate-400'} />
                </div>
                <span className={`mt-3 block text-center text-[10px] font-black uppercase tracking-[0.15em] ${
                  segmentFilter === 'all' ? 'text-slate-900' : 'text-slate-400'
                }`}>Todos</span>
              </button>
              
              {categoryTiles.map((item, index) => {
                const active = segmentFilter === item.label;
                return (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    className="flex-shrink-0 snap-start group"
                    onClick={() => setSegmentFilter(prev => prev === item.label ? 'all' : item.label)}
                  >
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-2 transition-all duration-500 ${
                      active ? 'border-sky-500 bg-sky-50 shadow-2xl shadow-sky-500/20 -translate-y-1' : 'border-white bg-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.1)]'
                    }`}>
                      <span className="text-3xl transition-transform duration-500 group-hover:scale-110">{item.emoji}</span>
                    </div>
                    <span className={`mt-3 block text-center text-[10px] font-black uppercase tracking-[0.15em] ${
                      active ? 'text-slate-900' : 'text-slate-400'
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Banner de Destaques Premium */}
          <section className="space-y-4" style={{ transition: 'all .45s ease', transitionDelay: '200ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{genericHighlightLabel}</h2>
              <div className="flex gap-1">
                <div className="h-1 w-4 rounded-full bg-sky-500" />
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <div className="h-1 w-1 rounded-full bg-slate-300" />
              </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory px-1">
              {featuredLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="min-w-[260px] h-[140px] rounded-[2rem] bg-white border border-slate-100 animate-pulse" />
                ))
              ) : (
                displayedFeaturedProducts.map((item) => (
                  <Link
                    key={`${item.storeSlug}-${item.id}`}
                    to={`/${item.storeSlug}`}
                    className="group relative min-w-[260px] h-[140px] overflow-hidden rounded-[2.25rem] bg-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02] active:scale-[0.98] snap-start border border-slate-100"
                  >
                    <img src={item.imageUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent" />
                    
                    <div className="absolute top-3.5 left-4">
                      {item.sponsored ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-amber-400/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-slate-900 backdrop-blur-md shadow-lg">
                          <Star size={10} weight="fill" /> Promo
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/30">
                          Sugestão
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3.5 left-4 right-4 text-white">
                      <p className="text-[13px] font-black tracking-tight line-clamp-1 drop-shadow-sm">{item.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={item.storeLogo} alt={item.storeName} className="h-4.5 w-4.5 rounded-full border border-white/50 shadow-sm" />
                          <span className="text-[9px] font-bold opacity-90">{item.storeName}</span>
                        </div>
                        <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-slate-900 shadow-lg">
                          {currency.format(item.price)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {favoriteStores.length > 0 && (
            <section className="space-y-3" style={{ transition: 'all .45s ease', transitionDelay: '300ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-slate-900">Minhas favoritas</h2>
                <button
                  type="button"
                  onClick={() => setQuickFilter('favorites')}
                  className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 hover:text-slate-700"
                >
                  Ver todas
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                {favoriteStores.map((store) => (
                  <Link
                    key={`favorite-${store.id}`}
                    to={`/${store.slug}`}
                    className="min-w-[168px] sm:min-w-[186px] rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all duration-300 md:hover:-translate-y-0.5 md:hover:shadow-lg"
                  >
                    <img src={store.banner || store.logo} alt={store.name} loading="lazy" className="h-20 w-full rounded-xl object-cover border border-slate-200" />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-black text-slate-900">{store.name}</p>
                      <Heart size={14} weight="fill" className="text-rose-500 shrink-0" />
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {distanceLoading && userLocation ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)} • {store.etaMin}-{store.etaMax} min
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4" style={{ transition: 'all .45s ease', transitionDelay: '400ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">Lojas da região</h2>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{filteredStores.length} resultados</p>
            </div>

            {loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-36 rounded-3xl bg-white border border-slate-200 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && error && <div className="rounded-2xl border border-rose-900/60 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</div>}

            {!loading && !error && filteredStores.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-700 font-semibold">Nenhuma loja encontrada com esses filtros.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDebouncedQuery('');
                    setQuickFilter('all');
                    setSegmentFilter('all');
                  }}
                  className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {!loading && !error && filteredStores.length > 0 && (
              <div className="grid grid-cols-1 gap-2 md:gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                {filteredStores.map((store) => (
                  <Link
                    key={store.id}
                    to={`/${store.slug}`}
                    className={`group rounded-2xl border bg-white p-2.5 transition-all duration-300 active:scale-[0.99] ${
                      store.isOpen
                        ? 'border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.07)] md:hover:-translate-y-0.5 md:hover:shadow-[0_14px_28px_-16px_rgba(15,23,42,0.25)]'
                        : 'border-slate-200/70 opacity-90 saturate-90'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={store.banner || store.logo}
                        alt={store.name}
                        loading="lazy"
                        className="h-16 w-16 md:h-[72px] md:w-[72px] shrink-0 rounded-xl object-cover border border-slate-200 bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="truncate text-sm font-black text-slate-900">{store.name}</h3>
                              <span className={`inline-flex h-1.5 w-1.5 rounded-full ${store.isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {!store.isOpen && <span className="text-[10px] font-semibold text-slate-500">Fechada</span>}
                            </div>
                            {(store as any).sponsored && (
                              <p className="mt-0.5 text-[10px] text-slate-400 font-semibold">Patrocinado</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleFavoriteStore(store.slug);
                            }}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-rose-500"
                            aria-label={`Favoritar ${store.name}`}
                            title={`Favoritar ${store.name}`}
                          >
                            <Heart
                              size={15}
                              weight={favoriteStoreSlugs.includes(store.slug) ? 'fill' : 'regular'}
                              className={favoriteStoreSlugs.includes(store.slug) ? 'text-rose-500' : ''}
                            />
                          </button>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600">
                          {store.etaMin}-{store.etaMax} min • {distanceLoading && userLocation ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)} • {store.freeShipping ? 'Grátis' : 'Taxa'}
                        </p>
                        {!store.isOpen && (
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {store.nextOpeningLabel || 'Sem horário cadastrado'}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {store.freeShipping && (
                            <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Frete grátis
                            </span>
                          )}
                          {store.rating >= 4.8 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <Star size={10} weight="fill" className="text-emerald-600" />
                              Mais bem avaliadas
                            </span>
                          )}
                          {store.supportsDelivery && (
                            <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              Entrega
                            </span>
                          )}
                          {store.supportsPickup && (
                            <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              Retirada
                            </span>
                          )}
                          {store.supportsTable && (
                            <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              Mesa
                          </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="pb-6 space-y-2">
            <p className="text-center text-xs font-semibold text-slate-500">Conectando você aos melhores lojistas da região.</p>
            <PlatformTrustFooter mode="minimal" align="center" compact />
          </section>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/80 backdrop-blur-2xl h-14 lg:hidden transition-transform duration-300"
        style={{ transform: isBottomNavVisible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="h-full grid grid-cols-3 px-2 pb-[max(env(safe-area-inset-bottom),0px)]">
          <button type="button" onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-slate-500">
            <House size={18} />
            <span className="text-[9px] font-black uppercase">Início</span>
          </button>
          <button type="button" className="flex flex-col items-center justify-center" style={{ color: theme.primary }}>
            <Storefront size={18} weight="fill" />
            <span className="text-[9px] font-black uppercase">Hub</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter((prev) => (prev === 'favorites' ? 'all' : 'favorites'))}
            className="flex flex-col items-center justify-center text-slate-500"
            style={quickFilter === 'favorites' ? { color: theme.primary } : undefined}
          >
            <Heart size={18} weight={quickFilter === 'favorites' ? 'fill' : 'regular'} />
            <span className="text-[9px] font-black uppercase">Favoritos</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
