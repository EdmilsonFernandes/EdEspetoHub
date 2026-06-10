// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Buildings, Compass, MagnifyingGlass, MapTrifold, Mountains, Sparkle, X } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { DestinationPartnerCta } from '../components/Destinations/DestinationPartnerCta';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { prefetchRouteByPath } from '../utils/clientRoutePrefetch';

const destinationImage = (destination: any, variant: 'logo' | 'banner' = 'banner') => {
  const firstBanner = (Array.isArray(destination?.banners) ? destination.banners : []).find((banner: any) => banner?.imageUrl);
  const source = variant === 'logo'
    ? destination?.logoUrl || firstBanner?.imageUrl || destination?.bannerUrl
    : firstBanner?.imageUrl || destination?.bannerUrl || destination?.logoUrl;
  return resolveAssetUrl(source || '') || getStoreAvatarUrl(destination?.slug, destination?.name);
};

const destinationLocationLabel = (destination: any) => {
  const match = destination?.destinationMatch || {};
  const distance = Number(match.distanceKm);
  if (Number.isFinite(distance)) return `${distance < 10 ? distance.toFixed(1) : distance.toFixed(0)} km de você`;
  if (match.reason === 'same_city') return 'Na sua cidade';
  if (match.reason === 'same_state') return 'Mesma UF';
  return [destination.city, destination.state].filter(Boolean).join(' - ');
};

const destinationDisplayName = (destination: any) => {
  const name = String(destination?.name || destination?.city || 'Destino').trim();
  const state = String(destination?.state || '').trim().toUpperCase();
  if (!state) return name;
  const hasState = new RegExp(`(^|[\\s,\\-/()])${state}($|[\\s,\\-/()])`, 'i').test(name);
  return hasState ? name : `${name} - ${state}`;
};

export function DestinationsPage() {
  const location = useLocation();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    window.requestAnimationFrame(scrollToTop);
    const timeoutId = window.setTimeout(scrollToTop, 80);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    window.requestAnimationFrame(scrollToTop);
    const timeoutId = window.setTimeout(scrollToTop, 180);
    return () => window.clearTimeout(timeoutId);
  }, [loading, location.pathname, location.search]);

  const states = useMemo(() => {
    const list = new Set<string>();
    destinations.forEach((d) => {
      if (d.state) {
        list.add(String(d.state).trim().toUpperCase());
      }
    });
    return Array.from(list).sort();
  }, [destinations]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(location.search || '');
    setLoading(true);
    destinationService
      .listPublic({
        lat: params.get('lat'),
        lng: params.get('lng'),
        city: params.get('city'),
        state: params.get('state'),
      })
      .then((payload) => {
        if (!active) return;
        setDestinations(Array.isArray(payload) ? payload : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Não foi possível carregar destinos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location.search]);

  const stats = useMemo(() => ({
    cities: destinations.length,
    places: destinations.reduce((sum, item) => sum + Number(item.placesCount || 0), 0),
    listings: destinations.reduce((sum, item) => sum + Number(item.listingsCount || 0), 0),
  }), [destinations]);
  const scrollToDestinationsList = () => {
    if (typeof document === 'undefined') return;
    document.getElementById('destinos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const destinationStats = [
    { value: stats.cities, label: 'cidades', hint: 'Ver cidades' },
    { value: stats.places, label: 'hospedagens', hint: 'Escolher cidade' },
    { value: stats.listings, label: 'serviços', hint: 'Escolher cidade' },
  ];

  const filteredDestinations = useMemo(() => {
    let result = destinations;
    if (selectedState !== 'ALL') {
      result = result.filter((d) => String(d.state).trim().toUpperCase() === selectedState);
    }
    const query = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!query) return result;
    return result.filter((destination: any) => [
      destination.name,
      destination.city,
      destination.state,
      destination.description,
      destination.heroSubtitle,
    ]
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(query));
  }, [destinations, searchTerm, selectedState]);
  const destinationResultLabel = filteredDestinations.length === 1
    ? '1 cidade encontrada'
    : `${filteredDestinations.length} cidades encontradas`;

  return (
    <PublicDestinationShell active="destinations" backTo="/hub" backLabel="Voltar" contextLabel="Destinos turísticos">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#d7f4e8_0,#f4f1ea_38%,#efe5d1_100%)] px-4 pb-4 pt-3 sm:pt-4">
        <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#153A4C] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_-20px_rgba(21,58,76,0.46)] ring-1 ring-white/25">
                <Mountains size={14} weight="duotone" />
                Destinos turísticos
              </p>
              <h1 className="mt-2 max-w-3xl text-2xl font-black leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Explore cidades turísticas com apoio local.
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                Encontre hospedagens, comida, passeios e serviços próximos em poucos toques.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-[1.35rem] border border-white/82 bg-white/72 p-2 shadow-[0_20px_48px_-38px_rgba(15,23,42,0.36)] ring-1 ring-white/30 backdrop-blur-xl lg:min-w-[20rem]">
              {destinationStats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={scrollToDestinationsList}
                  className="jnc-hub-touch group rounded-[1rem] bg-white/90 px-3 py-2.5 text-center shadow-[0_12px_26px_-22px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/35 transition hover:-translate-y-0.5 hover:ring-[#336886]/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#336886]/16"
                  aria-label={`${stat.hint}: ${stat.value} ${stat.label}`}
                >
                  <p className="text-xl font-black tracking-[-0.04em] text-[#153A4C]">{stat.value}</p>
                  <p className="mt-1 whitespace-normal break-words text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-slate-500">{stat.label}</p>
                  <p className="mt-1 hidden text-[9px] font-black uppercase tracking-[0.14em] text-[#336886]/70 sm:block">{stat.hint}</p>
                </button>
              ))}
            </div>
          </div>
          {/* ... Search Term field ... */}
          <div className="mt-4 rounded-[1.5rem] border border-white/80 bg-white/86 p-2 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur transition-all duration-300 focus-within:border-[#336886]/35 focus-within:shadow-[0_20px_48px_-30px_rgba(51,104,134,0.25)] focus-within:ring-2 focus-within:ring-[#336886]/10">
            <label className="flex min-h-[3.25rem] items-center gap-3 rounded-[1.15rem] bg-slate-50 px-4 ring-1 ring-slate-200/60 focus-within:ring-transparent transition-all">
              <MagnifyingGlass size={18} weight="bold" className="shrink-0 text-[#336886]/80" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cidade, região ou experiência"
                className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-700 ring-1 ring-slate-200 shadow-sm active:scale-95 transition-transform"
                >
                  <X size={12} weight="bold" />
                </button>
              ) : null}
            </label>
          </div>

          {states.length > 0 && (
            <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setSelectedState('ALL')}
                className={`snap-start px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                  selectedState === 'ALL'
                    ? 'bg-[linear-gradient(145deg,#153A4C_0%,#336886_60%,#5FD35A_145%)] text-white shadow-[0_10px_20px_-8px_rgba(21,58,76,0.48),0_4px_8px_-2px_rgba(95,211,90,0.3)] border border-white/20'
                    : 'bg-white/86 text-slate-600 border border-white shadow-[0_8px_16px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5'
                }`}
              >
                Todos
              </button>
              {states.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => setSelectedState(state)}
                  className={`snap-start px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    selectedState === state
                      ? 'bg-[linear-gradient(145deg,#153A4C_0%,#336886_60%,#5FD35A_145%)] text-white shadow-[0_10px_20px_-8px_rgba(21,58,76,0.48),0_4px_8px_-2px_rgba(95,211,90,0.3)] border border-white/20'
                      : 'bg-white/86 text-slate-600 border border-white shadow-[0_8px_16px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="destinos" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Cidades disponíveis</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">
              {searchTerm || selectedState !== 'ALL' ? destinationResultLabel : 'Escolha uma cidade'}
            </h2>
            <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500">Toque em uma cidade para ver hospedagens, comida, passeios e serviços.</p>
          </div>
          <MapTrifold size={28} weight="duotone" className="text-[#336886]" />
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white/80 p-0 sm:min-h-[12.5rem] sm:grid-cols-[154px_minmax(0,1fr)] shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
              >
                <div className="h-36 sm:h-full sm:min-h-[12.5rem] ds-skeleton" />
                <div className="flex flex-col justify-between gap-4 p-4">
                  <div className="space-y-3">
                    <div className="h-6 w-7/12 rounded-full ds-skeleton" />
                    <div className="h-4 w-10/12 rounded-full ds-skeleton" />
                    <div className="h-4 w-8/12 rounded-full ds-skeleton" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-24 rounded-full ds-skeleton" />
                    <div className="h-8 w-24 rounded-full ds-skeleton" />
                    <div className="ml-auto h-8 w-24 rounded-full ds-skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredDestinations.map((destination) => {
              const displayName = destinationDisplayName(destination);
              return (
                <Link
                  key={destination.id}
                  to={`/destinos/${destination.slug}`}
                  onPointerEnter={() => prefetchRouteByPath(`/destinos/${destination.slug}`)}
                  onFocus={() => prefetchRouteByPath(`/destinos/${destination.slug}`)}
                  onTouchStart={() => prefetchRouteByPath(`/destinos/${destination.slug}`)}
                  className="jnc-hub-touch jnc-hub-lift group grid overflow-hidden rounded-[1.75rem] border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-[0_12px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/50 sm:min-h-[12.5rem] sm:grid-cols-[154px_minmax(0,1fr)] md:hover:border-[#336886]/18"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-100 sm:h-full sm:min-h-[12.5rem]">
                    <img src={destinationImage(destination)} alt={displayName} className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-108" />
                    <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/86 px-3 py-1 text-[11px] font-black text-slate-700 shadow-[0_6px_14px_-4px_rgba(15,23,42,0.12)] backdrop-blur-md">
                      {destinationLocationLabel(destination)}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between gap-4 p-4">
                    <div>
                      <h3 className="text-xl font-black tracking-[-0.04em] text-slate-900 transition-colors duration-200 group-hover:text-[#336886] sm:text-2xl">{displayName}</h3>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">
                        {destination.description || destination.heroSubtitle || 'Um destino pronto para receber sua próxima viagem.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex min-w-0 flex-wrap items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black leading-tight text-slate-700">
                        <Buildings size={14} weight="duotone" />
                        <span className="whitespace-normal break-words">{destination.placesCount || 0} hospedagens</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                        <Sparkle size={14} weight="duotone" />
                        {destination.listingsCount || 0} serviços
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#336886] px-3 py-1.5 text-xs font-black text-white transition-all duration-300 group-hover:bg-[#153A4C] group-hover:shadow-[0_10px_22px_-14px_rgba(51,104,134,0.52)]">
                        Explorar
                        <Compass size={14} weight="bold" className="transition-transform duration-500 group-hover:rotate-45" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {!loading && !filteredDestinations.length ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm font-bold text-slate-500">
            Nenhuma cidade encontrada para essa busca.
          </p>
        ) : null}

        <DestinationPartnerCta className="mt-6" />
      </section>
    </PublicDestinationShell>
  );
}
