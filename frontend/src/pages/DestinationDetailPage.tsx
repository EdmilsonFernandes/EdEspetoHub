// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Bed, Buildings, Compass, ForkKnife, MapPinLine, Mountains, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

const asset = (item: any, variant: 'logo' | 'banner' | 'image' = 'banner') => {
  const source =
    variant === 'logo'
      ? item?.logoUrl || item?.bannerUrl || item?.imageUrl
      : variant === 'image'
        ? item?.imageUrl || item?.bannerUrl || item?.logoUrl
        : item?.bannerUrl || item?.imageUrl || item?.logoUrl;
  return resolveAssetUrl(source || '') || getStoreAvatarUrl(item?.slug || item?.id, item?.name || item?.title);
};

const categoryLabel = (category?: string) => {
  const key = String(category || '').toUpperCase();
  if (key === 'PASSEIO') return 'Passeio';
  if (key === 'MASSAGEM') return 'Massagem';
  if (key === 'RESTAURANTE_VISITAR') return 'Para visitar';
  if (key === 'NOITE') return 'Noite';
  if (key === 'ATRATIVO') return 'Atrativo';
  if (key === 'LOJA') return 'Loja';
  return 'Serviço';
};

export function DestinationDetailPage() {
  const { destinationSlug = '' } = useParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    destinationService
      .getPublic(destinationSlug)
      .then((data) => {
        if (active) setPayload(data || null);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar este destino.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destinationSlug]);

  const destination = payload?.destination || {};
  const places = Array.isArray(payload?.hospitalityPlaces) ? payload.hospitalityPlaces : [];
  const listings = Array.isArray(payload?.listings) ? payload.listings : [];
  const banners = Array.isArray(payload?.banners) ? payload.banners : [];
  const heroBanner = useMemo(() => banners.find((banner: any) => banner.imageUrl) || null, [banners]);

  return (
    <main className="min-h-screen bg-[#f6f2e9] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,#17394b,#0f172a_64%,#332315)]" />
        <div className="relative mx-auto max-w-6xl">
          <Link to="/destinos" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/15">
            <ArrowRight size={14} className="rotate-180" weight="bold" />
            Destinos
          </Link>

          {loading ? <p className="mt-8 text-sm font-bold text-white/70">Carregando destino...</p> : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

          {!loading && !error ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-white/10">
                  <Mountains size={15} weight="duotone" />
                  {destination.city} - {destination.state}
                </p>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl">
                  {destination.heroTitle || destination.name}
                </h1>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-white/72">
                  {destination.heroSubtitle || destination.description || 'Hospedagens, lojas e experiências cadastradas neste destino.'}
                </p>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/10 p-3 shadow-[0_28px_80px_-38px_rgba(0,0,0,0.65)] backdrop-blur">
                <div className="relative h-64 overflow-hidden rounded-[1.45rem] bg-slate-900">
                  <img src={asset(heroBanner || destination)} alt={destination.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-lg font-black text-white">{heroBanner?.title || destination.name}</p>
                    <p className="mt-1 text-sm font-semibold text-white/78">{heroBanner?.subtitle || destination.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Hospedagens</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Chalés e pousadas</h2>
              </div>
              <Bed size={28} weight="duotone" className="text-[#336886]" />
            </div>

            {places.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Nenhuma hospedagem aprovada ainda neste destino.</p>
                <Link to="/destinos/cadastrar" className="mt-3 inline-flex rounded-full bg-[#153A4C] px-4 py-2 text-xs font-black text-white">
                  Cadastrar chalé ou pousada
                </Link>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {places.map((place: any) => (
                <Link
                  key={place.id}
                  to={`/destinos/${destination.slug}/chales/${place.slug}`}
                  className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)] transition hover:-translate-y-1"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img src={asset(place)} alt={place.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-700">
                      {String(place.type || 'CHALE').replace('_', ' ')}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-black text-slate-950">{place.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{place.description || place.address || 'Hospedagem cadastrada.'}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        <Buildings size={13} weight="duotone" />
                        {place.storeCount || 0} lojas
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-[#153A4C]">
                        Abrir
                        <ArrowRight size={14} weight="bold" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Experiências</p>
                  <h2 className="mt-1 text-xl font-black">Serviços e lugares</h2>
                </div>
                <Sparkle size={25} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-4 space-y-3">
                {listings.map((listing: any) => (
                  <article key={listing.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex gap-3">
                      <img src={asset(listing, 'image')} alt={listing.title} className="h-16 w-16 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#336886]">{categoryLabel(listing.category)}</p>
                        <h3 className="mt-0.5 line-clamp-1 text-sm font-black text-slate-950">{listing.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{listing.description || listing.address || 'Parceiro cadastrado.'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {listing.whatsapp || listing.ctaUrl ? (
                        <a
                          href={String(listing.ctaUrl || listing.whatsapp || '').startsWith('http') ? listing.ctaUrl : `https://wa.me/${String(listing.ctaUrl || listing.whatsapp || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
                        >
                          <WhatsappLogo size={13} weight="fill" />
                          Contato
                        </a>
                      ) : null}
                      {listing.address ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">
                          <MapPinLine size={13} weight="duotone" />
                          Local
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
                {listings.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Nenhum serviço aprovado ainda.
                  </p>
                ) : null}
              </div>
            </div>

            <Link to="/destinos/cadastrar" className="block rounded-[2rem] border border-[#153A4C]/10 bg-[#153A4C] p-5 text-white shadow-[0_18px_50px_-34px_rgba(21,58,76,0.75)]">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">
                <ForkKnife size={14} weight="duotone" />
                Participar
              </p>
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">Tem chalé, pousada ou serviço?</h3>
              <p className="mt-2 text-sm font-semibold text-white/72">Cadastre sua responsabilidade e aguarde aprovação da plataforma.</p>
            </Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
