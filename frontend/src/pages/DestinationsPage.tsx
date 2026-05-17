// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Buildings, Compass, MagnifyingGlass, MapTrifold, Mountains, Sparkle } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

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

export function DestinationsPage() {
  const location = useLocation();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredDestinations = useMemo(() => {
    const query = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!query) return destinations;
    return destinations.filter((destination: any) => [
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
  }, [destinations, searchTerm]);

  return (
    <PublicDestinationShell active="destinations" backTo="/hub" backLabel="Hub" contextLabel="Destinos turísticos">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#d7f4e8_0,#f4f1ea_38%,#efe5d1_100%)] px-4 pb-5 pt-5">
        <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                <Mountains size={14} weight="duotone" />
                Destinos turísticos
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-5xl">
                Escolha uma cidade e veja o que tem por perto.
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                Chalés, pousadas, comida, passeios e serviços locais em um guia direto para sua viagem.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/80 bg-white/76 p-2 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur lg:min-w-[22rem]">
              {[
                { value: stats.cities, label: 'cidades' },
                { value: stats.places, label: 'hospedagens' },
                { value: stats.listings, label: 'serviços' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[1.1rem] bg-white/86 px-3 py-3 text-center ring-1 ring-slate-200/70">
                  <p className="text-xl font-black tracking-[-0.04em] text-[#153A4C]">{stat.value}</p>
                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/86 p-2 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <label className="flex min-h-[3.25rem] items-center gap-3 rounded-[1.15rem] bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:ring-[#336886]/30">
              <MagnifyingGlass size={18} weight="bold" className="shrink-0 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cidade, região ou experiência"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
              />
              {searchTerm ? (
                <button type="button" onClick={() => setSearchTerm('')} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                  Limpar
                </button>
              ) : null}
            </label>
          </div>
        </div>
      </section>

      <section id="destinos" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Cidades disponíveis</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">
              {searchTerm ? `${filteredDestinations.length} resultado(s)` : 'Escolha uma cidade'}
            </h2>
            <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500">Toque em uma cidade para ver hospedagens, comida, passeios e serviços.</p>
          </div>
          <MapTrifold size={28} weight="duotone" className="text-[#336886]" />
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {filteredDestinations.map((destination) => (
            <Link
              key={destination.id}
              to={`/destinos/${destination.slug}`}
              className="group grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_48px_-34px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 sm:min-h-[13.75rem] sm:grid-cols-[170px_minmax(0,1fr)]"
            >
              <div className="relative h-40 overflow-hidden bg-slate-100 sm:h-full sm:min-h-[13.75rem]">
                <img src={destinationImage(destination)} alt={destination.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                  {destinationLocationLabel(destination)}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-4 p-4">
                <div>
                  <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">{destination.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">
                    {destination.description || destination.heroSubtitle || 'Um destino pronto para receber sua próxima viagem.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                    <Buildings size={14} weight="duotone" />
                    {destination.placesCount || 0} hospedagens
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                    <Sparkle size={14} weight="duotone" />
                    {destination.listingsCount || 0} serviços
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#153A4C] px-3 py-1.5 text-xs font-black text-white">
                    Explorar
                    <Compass size={14} weight="bold" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {!loading && !filteredDestinations.length ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm font-bold text-slate-500">
            Nenhuma cidade encontrada para essa busca.
          </p>
        ) : null}
      </section>
    </PublicDestinationShell>
  );
}
