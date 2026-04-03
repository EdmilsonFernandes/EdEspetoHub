import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, MapPin, Star, Clock, Scooter, Storefront, House, Heart, UserCircle } from '@phosphor-icons/react';
import { storeService } from '../services/storeService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

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
    restaurante: 'Restaurant',
    restaurantes: 'Restaurant',
    hamburgueria: 'Burger',
    hamburguerias: 'Burger',
    lanchonete: 'Snack',
    pizzaria: 'Pizza',
    adega: 'Beverages',
    mercado: 'Market',
    farmacia: 'Pharmacy',
    confeitaria: 'Desserts',
    outros: 'Local Shop',
  };
  return map[value] || 'Local Shop';
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
  Restaurant: { emoji: '🍽️', label: 'Restaurant' },
  Burger: { emoji: '🍔', label: 'Burger' },
  Snack: { emoji: '🥪', label: 'Snack' },
  Pizza: { emoji: '🍕', label: 'Pizza' },
  Beverages: { emoji: '🍷', label: 'Beverages' },
  Market: { emoji: '🛒', label: 'Market' },
  Pharmacy: { emoji: '💊', label: 'Pharmacy' },
  Desserts: { emoji: '🧁', label: 'Desserts' },
  'Local Shop': { emoji: '🏬', label: 'Local Shop' },
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

  useEffect(() => {
    document.title = 'Praça Já no Caminho';
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
        setError(err?.message || 'Não foi possível carregar a praça de lojas agora.');
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
      logo: string;
      banner: string;
      searchIndex: string;
    }>;
  }, [stores]);

  const segmentOptions = useMemo(() => {
    return Array.from(new Set(enrichedStores.map((item) => item.segment))).sort((a, b) => a.localeCompare(b));
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

  return (
    <div className="min-h-screen bg-slate-50 pb-28 sm:pb-20">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <MapPin size={14} weight="duotone" className="text-slate-500" />
            Entregar em: Rua Sebastião...
          </div>
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="O que você quer pedir agora?"
              className="w-full rounded-2xl bg-slate-100 border-none px-12 py-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                  className={`rounded-full px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] whitespace-nowrap transition ${
                    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
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
                    segmentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Todos os segmentos
                </button>
                {segmentOptions.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => setSegmentFilter(segment)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                      segmentFilter === segment ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-7">
        <section>
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide px-0.5 py-1">
            {categoryTiles.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                type="button"
                className="min-w-[72px] flex-shrink-0"
                onClick={() => setSegmentFilter(item.label)}
              >
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-slate-200 bg-white shadow-sm text-xl">
                  {item.emoji}
                </span>
                <span className="mt-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            {[
              { title: 'Lojas mais bem avaliadas da semana', subtitle: 'Encontre os melhores lojistas da sua região' },
              { title: 'Entrega mais rápida perto de você', subtitle: 'Peça agora e receba sem complicação' },
            ].map((banner) => (
              <div
                key={banner.title}
                className="snap-start min-w-full aspect-[16/6] rounded-3xl p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300 font-bold">Já no Caminho</p>
                <p className="text-xl sm:text-2xl font-black mt-1">{banner.title}</p>
                <p className="text-sm text-slate-300 mt-1">{banner.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900">Praça Já no Caminho</h2>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{filteredStores.length} resultados</p>
          </div>

          {loading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-44 rounded-3xl bg-white border border-slate-200 animate-pulse" />
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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/${store.slug}`}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="relative aspect-[16/6] overflow-hidden">
                    <img
                      src={store.banner}
                      alt={store.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />
                  </div>
                  <div className="p-4 flex gap-3">
                    <img
                      src={store.logo}
                      alt={`${store.name} logo`}
                      loading="lazy"
                      className="h-16 w-16 rounded-2xl object-cover border border-slate-200 bg-white"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-lg font-black text-slate-900 tracking-tight">{store.name}</h3>
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{store.segment}</p>
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <MapPin size={12} /> {store.city}{store.state ? ` • ${store.state}` : ''}
                      </p>
                      <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Star size={12} weight="fill" className="text-amber-500" />
                          {store.rating.toFixed(1)}
                        </span>
                        <span>{store.distanceKm.toFixed(1)} km</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {store.etaMin}-{store.etaMax} min
                        </span>
                        <span className={`inline-flex items-center gap-1 font-semibold ${store.freeShipping ? 'text-emerald-600' : 'text-slate-600'}`}>
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

        <section className="pb-6">
          <p className="text-center text-xs font-semibold text-slate-500">Conectando você aos melhores lojistas da região.</p>
        </section>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/80 backdrop-blur-2xl h-14 lg:hidden transition-transform duration-300"
        style={{ transform: isBottomNavVisible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="h-full grid grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),0px)]">
          <button type="button" onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-slate-500">
            <House size={18} />
            <span className="text-[9px] font-black uppercase">Início</span>
          </button>
          <button type="button" className="flex flex-col items-center justify-center text-slate-900">
            <Storefront size={18} weight="fill" />
            <span className="text-[9px] font-black uppercase">Praça</span>
          </button>
          <button type="button" onClick={() => navigate('/portfolio')} className="flex flex-col items-center justify-center text-slate-500">
            <Heart size={18} />
            <span className="text-[9px] font-black uppercase">Portfólio</span>
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
