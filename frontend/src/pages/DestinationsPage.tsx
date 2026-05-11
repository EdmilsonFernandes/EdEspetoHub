// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Bed, Buildings, Compass, MapTrifold, Mountains, Sparkle } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

const destinationImage = (destination: any, variant: 'logo' | 'banner' = 'banner') => {
  const source = variant === 'logo'
    ? destination?.logoUrl || destination?.bannerUrl
    : destination?.bannerUrl || destination?.logoUrl;
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

  const featured = useMemo(() => destinations.length > 3 ? destinations.slice(0, 2) : [], [destinations]);

  return (
    <main className="min-h-screen bg-[#f4f1ea] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#d7f4e8_0,#f4f1ea_36%,#efe5d1_100%)] px-4 pb-10 pt-[max(1.2rem,env(safe-area-inset-top))]">
        <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <Link to="/hub" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur">
            <ArrowRight size={14} className="rotate-180" weight="bold" />
            Voltar ao Hub
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                <Mountains size={15} weight="duotone" />
                Destinos Já no Caminho
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 sm:text-6xl">
                Escolha a cidade, o chalé e o que fazer perto.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-slate-600 sm:text-lg">
                Uma vitrine real para chalés, pousadas, lojas que entregam, passeios, massagens e lugares para visitar.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/destinos/cadastrar" className="rounded-full bg-[#153A4C] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-22px_rgba(21,58,76,0.8)]">
                  Cadastrar meu chalé ou serviço
                </Link>
                <a href="#destinos" className="rounded-full border border-slate-300 bg-white/72 px-5 py-3 text-sm font-black text-slate-700">
                  Ver cidades
                </a>
              </div>
            </div>
            {featured.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {featured.map((destination) => (
                  <Link
                    key={destination.id}
                    to={`/destinos/${destination.slug}`}
                    className="group overflow-hidden rounded-[2rem] border border-white/80 bg-white/78 p-3 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur transition hover:-translate-y-1"
                  >
                    <div className="relative h-44 overflow-hidden rounded-[1.5rem] bg-slate-200">
                      <img src={destinationImage(destination)} alt={destination.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.10),rgba(15,23,42,0.18)_38%,rgba(15,23,42,0.82))]" />
                      <div className="absolute bottom-3 left-3 right-3 rounded-[1.15rem] border border-white/14 bg-slate-950/58 px-3 py-2.5 shadow-[0_16px_28px_-22px_rgba(0,0,0,0.75)] backdrop-blur-md">
                        <p className="text-lg font-black text-white">{destination.name}</p>
                        <p className="text-xs font-bold text-white/82">{destinationLocationLabel(destination)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        <Bed size={13} weight="duotone" />
                        {destination.placesCount || 0} hospedagens
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-[#153A4C]">
                        Abrir
                        <ArrowRight size={14} weight="bold" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#153A4C]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#153A4C]">
                  <Compass size={14} weight="duotone" />
                  Curadoria local
                </p>
                <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950">
                  Primeiro escolha a cidade. Depois veja hospedagens, lojas e experiências.
                </h2>
                <div className="mt-5 grid gap-3">
                  {[
                    { icon: Mountains, title: 'Cidade', text: 'São Bento, São Francisco Xavier e próximos destinos entram aqui.' },
                    { icon: Bed, title: 'Hospedagem', text: 'Chalés e pousadas ficam agrupados dentro da cidade certa.' },
                    { icon: Sparkle, title: 'Serviços', text: 'Passeios, massagens, restaurantes e lugares para visitar aparecem no detalhe.' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/82 p-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#153A4C]/8 text-[#153A4C]">
                          <Icon size={20} weight="duotone" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-950">{item.title}</p>
                          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="destinos" className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Cidades cadastradas</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">Escolha uma cidade</h2>
            <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500">A lista abaixo é a navegação principal dos destinos. O detalhe da cidade concentra chalés, pousadas, serviços e lugares.</p>
          </div>
          <MapTrifold size={28} weight="duotone" className="text-[#336886]" />
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {destinations.map((destination) => (
            <Link
              key={destination.id}
              to={`/destinos/${destination.slug}`}
              className="group grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_48px_-34px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 sm:grid-cols-[190px_1fr]"
            >
              <div className="relative min-h-48 overflow-hidden bg-slate-100 sm:min-h-full">
                <img src={destinationImage(destination)} alt={destination.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                  {destinationLocationLabel(destination)}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-5 p-5">
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{destination.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-relaxed text-slate-600">
                    {destination.description || destination.heroSubtitle || 'Destino cadastrado no Já no Caminho.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                    <Buildings size={14} weight="duotone" />
                    {destination.placesCount || 0} chalés/pousadas
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                    <Sparkle size={14} weight="duotone" />
                    {destination.listingsCount || 0} serviços
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#153A4C] px-3 py-1.5 text-xs font-black text-white">
                    Ver destino
                    <Compass size={14} weight="bold" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
