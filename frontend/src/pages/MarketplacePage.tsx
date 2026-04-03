import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, MapPin, Star, Clock, Scooter, Storefront, House, UserCircle } from '@phosphor-icons/react';
import { storeService } from '../services/storeService';
import { productService } from '../services/productService';
import { featuredService } from '../services/featuredService';
import { mapsService } from '../services/mapsService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';

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
  } | null;
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

const pickRandomIndex = (length: number, current: number) => {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
};

export function MarketplacePage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'free_shipping' | 'nearby' | 'open_now'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Sua região');
  const [distanceByStore, setDistanceByStore] = useState<Record<string, number>>({});
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [rotatingHeroIndex, setRotatingHeroIndex] = useState(0);

  useEffect(() => {
    document.title = 'Hub Já no Caminho';
  }, []);

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

  useEffect(() => {
    let active = true;
    storeService
      .listPortfolio()
      .then((data) => {
        if (!active) return;
        setStores(Array.isArray(data) ? data : []);
      })
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
  }, []);

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
        lastY = currentY;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        const isOpen = (store?.settings?.isOrderingEnabled ?? true) !== false;
        const logo = resolveAssetUrl(store?.settings?.logoUrl || undefined) || '/janocaminho.jpg';
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

  const filteredStores = useMemo(() => {
    return enrichedStores.filter((store) => {
      if (debouncedQuery && !store.searchIndex.includes(debouncedQuery)) return false;
      if (segmentFilter !== 'all' && store.segment !== segmentFilter) return false;
      if (quickFilter === 'free_shipping' && !store.freeShipping) return false;
      if (quickFilter === 'nearby' && store.distanceKm > 2.5) return false;
      if (quickFilter === 'open_now' && !store.isOpen) return false;
      return true;
    });
  }, [enrichedStores, debouncedQuery, segmentFilter, quickFilter]);

  const categoryTiles = useMemo(() => {
    return segmentOptions.map((segment) => categoryVisuals[segment] || { emoji: '🏪', label: segment });
  }, [segmentOptions]);

  const heroBanners = useMemo(() => {
    const byStore = enrichedStores.map((store) => ({
      id: store.id,
      title: store.name,
      subtitle: `${store.etaMin}-${store.etaMax} min • ${store.freeShipping ? 'Frete gratis' : 'Entrega rapida'}`,
      image: store.banner,
      slug: store.slug,
    }));
    if (byStore.length > 0) return byStore;
    return [
      {
        id: 'fallback',
        title: 'As melhores lojas em um so lugar',
        subtitle: 'Descubra, compare e faca seu pedido com rapidez.',
        image: '/janocaminho.jpg',
        slug: '',
      },
    ];
  }, [enrichedStores]);

  useEffect(() => {
    const length = heroBanners.length;
    if (length <= 1) {
      setRotatingHeroIndex(0);
      return;
    }
    setRotatingHeroIndex((prev) => (prev < length ? prev : 0));
    const timer = window.setInterval(() => {
      setRotatingHeroIndex((prev) => pickRandomIndex(length, prev));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [heroBanners]);

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
            storeLogo: resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho.jpg',
            imageUrl: resolveAssetUrl(item?.imageUrl || undefined) || resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho.jpg',
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

  return (
    <div className="min-h-screen bg-slate-50 pb-28 sm:pb-20">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <MapPin size={14} weight="duotone" className="text-slate-500" />
            Entregar em: {locationLabel}
          </div>
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="O que você quer pedir agora?"
              className="h-11 w-full rounded-2xl bg-slate-100 border-none px-12 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['all', 'free_shipping', 'nearby', 'open_now'].map((filter) => {
              const label =
                filter === 'all'
                  ? 'Todos'
                  : filter === 'free_shipping'
                  ? 'Frete grátis'
                  : filter === 'nearby'
                  ? 'Mais próximos'
                  : 'Abertos agora';
              const active = quickFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQuickFilter(filter as any)}
                  className={`rounded-full px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] whitespace-nowrap transition-all duration-300 active:scale-95 ${
                    active ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={active ? { backgroundColor: theme.primary } : undefined}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className="rounded-full px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] whitespace-nowrap bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Filtros
            </button>
          </div>
          {showAdvancedFilters && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">Categoria</p>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSegmentFilter('all')}
                  className={`rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                    segmentFilter === 'all' ? 'text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  style={segmentFilter === 'all' ? { backgroundColor: theme.primary } : undefined}
                >
                  Todos os segmentos
                </button>
                {segmentOptions.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => setSegmentFilter(segment)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                      segmentFilter === segment ? 'text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                    style={segmentFilter === segment ? { backgroundColor: theme.primary } : undefined}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" style={{ borderColor: `${theme.secondary}66` }}>
          <div className="flex items-center gap-3">
            <img
              src="/janocaminho.jpg"
              alt="Já no Caminho"
              className="h-11 w-11 rounded-2xl object-cover border border-slate-200"
              style={{ borderColor: `${theme.primary}44` }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Marketplace Oficial</p>
              <h1 className="truncate text-lg sm:text-xl font-black" style={{ color: theme.primary }}>Já no Caminho</h1>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide px-0.5 py-1">
            {categoryTiles.map((item, index) => (
              (() => {
                const active = segmentFilter === item.label;
                return (
              <button
                key={`${item.label}-${index}`}
                type="button"
                className="min-w-[64px] flex-shrink-0 transition-transform duration-200 active:scale-95"
                onClick={() => setSegmentFilter((prev) => (prev === item.label ? 'all' : item.label))}
              >
                <span
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-full border shadow-sm text-lg transition-all duration-200 ${
                    active ? 'text-white border-transparent ring-2 ring-offset-2 ring-slate-300' : 'border-slate-200 bg-white'
                  }`}
                  style={active ? { backgroundColor: theme.primary } : undefined}
                >
                  {item.emoji}
                </span>
                <span
                  className={`mt-2 block text-[10px] font-black uppercase tracking-widest text-center transition-colors ${
                    active ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
                );
              })()
            ))}
          </div>
        </section>

        <section>
          {heroBanners[rotatingHeroIndex] && (
            <div className="relative aspect-[16/6] sm:aspect-[16/5] rounded-3xl p-4 sm:p-5 text-white shadow-lg overflow-hidden">
              <img
                src={heroBanners[rotatingHeroIndex].image}
                alt={heroBanners[rotatingHeroIndex].title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/75 via-slate-900/35 to-slate-900/15" />
              <div className="relative">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-200 font-bold">Já no Caminho</p>
                <p className="text-lg sm:text-xl font-black mt-1">{heroBanners[rotatingHeroIndex].title}</p>
                <p className="text-xs sm:text-sm text-slate-100 mt-1">{heroBanners[rotatingHeroIndex].subtitle}</p>
                {heroBanners[rotatingHeroIndex].slug ? (
                  <Link
                    to={`/${heroBanners[rotatingHeroIndex].slug}`}
                    className="mt-2.5 inline-flex rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-900 transition-transform duration-300 hover:scale-105 active:scale-95"
                  >
                    Ver loja
                  </Link>
                ) : null}
              </div>
              <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700">
                {rotatingHeroIndex + 1}/{heroBanners.length}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-black text-slate-900">{genericHighlightLabel}</h2>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Mais pedidos</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {featuredLoading &&
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={`featured-skeleton-${idx}`} className="min-w-[156px] rounded-2xl border border-slate-200 bg-white p-2 animate-pulse">
                  <div className="h-20 rounded-xl bg-slate-100" />
                  <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-slate-100" />
                    <div className="h-3 w-16 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            {!featuredLoading &&
              displayedFeaturedProducts.map((item) => (
                <Link
                  key={`${item.storeSlug}-${item.id}`}
                  to={`/${item.storeSlug}`}
                  className="group relative min-w-[156px] rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all duration-300 md:hover:-translate-y-0.5 md:hover:shadow-lg active:scale-[0.99]"
                >
                  <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-20 w-full rounded-xl object-cover" />
                  <span className="absolute top-3 left-3 rounded-full bg-slate-100/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-600">
                    Destaque
                  </span>
                  <p className="mt-2 line-clamp-1 text-[13px] font-bold text-slate-900">{item.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <img src={item.storeLogo} alt={item.storeName} className="h-4 w-4 rounded-full object-cover border border-slate-200" />
                    <p className="line-clamp-1 text-[11px] text-slate-500">{item.storeName}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">{currency.format(item.price)}</p>
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-sm font-black shadow-sm transition-transform active:scale-95 group-hover:scale-105"
                      style={{ backgroundColor: theme.primary }}
                    >
                      +
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900">Lojas da região</h2>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{filteredStores.length} resultados</p>
          </div>

          {loading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-36 rounded-3xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

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
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
              {filteredStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/${store.slug}`}
                  className="w-full max-w-[420px] group overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-300 md:hover:-translate-y-0.5 md:hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.50)] active:scale-[0.99]"
                >
                  <div className="relative aspect-[16/7] sm:aspect-[16/6.4] overflow-hidden">
                    <img
                      src={store.banner}
                      alt={store.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />
                  </div>
                  <div className="p-2.5 flex gap-2.5">
                    <img
                      src={store.logo}
                      alt={`${store.name} logo`}
                      loading="lazy"
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200 bg-white ring-1 ring-white"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-[15px] font-black text-slate-900 tracking-tight">{store.name}</h3>
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-400">{store.segment}</p>
                      <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <MapPin size={12} /> {store.city}{store.state ? ` • ${store.state}` : ''}
                      </p>
                      <div className="pt-0.5 flex flex-wrap gap-1 text-[10px] text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">
                          <Star size={12} weight="fill" className="text-amber-500" />
                          {store.rating.toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5">
                          {distanceLoading && userLocation ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5">
                          <Clock size={12} />
                          {store.etaMin}-{store.etaMax} min
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${
                            store.freeShipping ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Scooter size={12} />
                          {store.freeShipping ? 'Frete grátis' : 'Entrega disponível'}
                        </span>
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
          <button type="button" onClick={() => navigate('/cliente')} className="flex flex-col items-center justify-center text-slate-500">
            <UserCircle size={18} />
            <span className="text-[9px] font-black uppercase">Conta</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
