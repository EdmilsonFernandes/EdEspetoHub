// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, Clock, ForkKnife, GlobeHemisphereWest, HouseLine, MapPinLine, ShoppingBagOpen, Sparkle, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatCurrency } from '../utils/format';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildWhatsAppUrl } from '../utils/destinationWhatsApp';
import { openActionTarget } from '../utils/actionLink';

const imageFor = (item: any) =>
  resolveAssetUrl(item?.bannerUrl || item?.imageUrl || item?.logoUrl || item?.store?.settings?.bannerUrl || item?.store?.settings?.logoUrl || '') ||
  getStoreAvatarUrl(item?.slug || item?.store?.slug || item?.id, item?.name || item?.title || item?.store?.name);

const externalUrl = (value?: string | null) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, '')}`;
};

const instagramUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw
    .replace(/^@/, '')
    .replace(/^www\.instagram\.com\//i, '')
    .replace(/^instagram\.com\//i, '')
    .replace(/^\/+/, '');
  return handle ? `https://instagram.com/${handle}` : '';
};

const placeTypeLabel = (value?: string | null) => {
  const key = String(value || '').toUpperCase();
  if (key === 'CHALE') return 'Chalé';
  if (key === 'POUSADA') return 'Pousada';
  if (key === 'HOTEL') return 'Hotel';
  if (key === 'CAMPING') return 'Camping';
  if (key === 'CABANA') return 'Cabana';
  if (key === 'CASA_TEMPORADA') return 'Casa de temporada';
  return 'Hospedagem';
};

const categoryLabel = (value?: string | null) => {
  const key = String(value || '').toUpperCase();
  if (key === 'RESTAURANTE_VISITAR') return 'Restaurante';
  if (key === 'PASSEIO') return 'Passeio';
  if (key === 'MASSAGEM') return 'Massagem';
  if (key === 'NOITE') return 'Noite';
  if (key === 'ATRATIVO') return 'Atrativo';
  return 'Serviço';
};

const siteLabel = (url?: string | null) => {
  const normalized = String(url || '').toLowerCase();
  if (normalized.includes('airbnb')) return 'Airbnb';
  if (normalized.includes('booking')) return 'Booking';
  return 'Site';
};

const InstagramIcon = ({ className = 'h-3.5 w-3.5' }) => (
  <img src="/insta.avif" alt="" className={`${className} rounded-full object-cover`} />
);

const openExternal = (url: string) => (event: any) => {
  event.preventDefault();
  event.stopPropagation();
  void openActionTarget({ href: url, external: true });
};

export function HospitalityPlacePage() {
  const { destinationSlug = '', placeSlug = '' } = useParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    destinationService
      .getHospitalityPlace(destinationSlug, placeSlug)
      .then((data) => {
        if (active) setPayload(data || null);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar esta hospedagem.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destinationSlug, placeSlug]);

  const destination = payload?.destination || {};
  const place = payload?.hospitalityPlace || {};
  const stores = Array.isArray(payload?.stores) ? payload.stores : [];
  const listings = Array.isArray(payload?.listings) ? payload.listings : [];
  const isNativePlatform = Capacitor.isNativePlatform();
  const destinationLocationLabel = [destination.city, destination.state].filter(Boolean).join(', ') || destination.name || 'Destino';
  const placeListings = listings.filter((listing: any) => String(listing.hospitalityPlaceId || '') === String(place.id || ''));
  const destinationListings = listings.filter((listing: any) => !listing.hospitalityPlaceId);
  const hasPlaceDeliveryOptions = stores.length > 0 || placeListings.length > 0;
  const placeWebsiteUrl = externalUrl(place.websiteUrl);
  const placeInstagramUrl = instagramUrl(place.instagramUrl);

  return (
    <main className="min-h-screen bg-[#f4f1ea] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(51,104,134,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(240,180,72,0.18),transparent_30%),linear-gradient(135deg,#f7f1e4,#eef6f1_58%,#eadfc8)] px-4 pb-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <div className="absolute -right-20 top-12 h-64 w-64 rounded-full bg-[#336886]/14 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <Link to={`/destinos/${destinationSlug}`} className="inline-flex items-center gap-2 rounded-full border border-[#153A4C]/10 bg-white/82 px-2.5 py-2 text-xs font-black text-[#153A4C] shadow-sm backdrop-blur">
              <ArrowRight size={14} className="rotate-180" weight="bold" />
              Cidade
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/82 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-sm">
              <img src="/janocaminho-logov1.svg" alt="Já no Caminho" className="h-6 w-6 rounded-full bg-white object-cover" />
              Já no Caminho
            </div>
          </div>
          {loading ? <p className="mt-8 text-sm font-bold text-slate-500">Carregando hospedagem...</p> : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {!loading && !error ? (
            <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-white/85 bg-white/90 p-2 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.44)] backdrop-blur">
              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
                <div className="relative h-44 overflow-hidden rounded-[1.25rem] bg-slate-100 sm:h-64 lg:h-full">
                  <img src={imageFor(place)} alt={place.name || 'Hospedagem'} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/42 via-slate-950/8 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm">
                      {placeTypeLabel(place.type)}
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#153A4C]/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#153A4C] ring-1 ring-[#153A4C]/10">
                    <Bed size={14} weight="duotone" />
                    Hospedagem
                  </p>
                  <h1 className="mt-3 text-3xl font-black leading-[0.96] tracking-[-0.05em] text-slate-950 sm:text-5xl">{place.name}</h1>
                  <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
                    <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                    <span className="truncate">{place.address || destinationLocationLabel}</span>
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                    {place.description || place.deliveryInstructions || 'Hospedagem cadastrada no Já no Caminho.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {place.whatsapp ? (
                      <a
                        href={buildWhatsAppUrl(place.whatsapp, buildDestinationInquiryMessage({
                          destinationName: destination.name,
                          city: destination.city,
                          state: destination.state,
                          itemName: place.name,
                          itemType: 'hospedagem',
                        }), isNativePlatform)}
                        target={isNativePlatform ? undefined : '_blank'}
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm"
                      >
                        <WhatsappLogo size={14} weight="fill" />
                        WhatsApp
                      </a>
                    ) : null}
                    {placeWebsiteUrl ? (
                      <a href={placeWebsiteUrl} onClick={openExternal(placeWebsiteUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                        <HouseLine size={14} weight="duotone" />
                        {siteLabel(place.websiteUrl)}
                      </a>
                    ) : null}
                    {placeInstagramUrl ? (
                      <a href={placeInstagramUrl} onClick={openExternal(placeInstagramUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                        <InstagramIcon className="h-4 w-4" />
                        Instagram
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 pt-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Atendem este chalé</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Comida e serviços no chalé</h2>
              </div>
              <ShoppingBagOpen size={28} weight="duotone" className="text-[#336886]" />
            </div>
            {!hasPlaceDeliveryOptions ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Ainda não há lojas ou contatos configurados para atendimento direto neste chalé.</p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {stores.map((entry: any) => {
                const store = entry.store || {};
                const link = entry || {};
                return (
                  <Link
                    key={`${entry.id}-${store.id}`}
                    to={`/${store.slug}?destino=${encodeURIComponent(destination.slug || destinationSlug)}&destino_nome=${encodeURIComponent(destination.name || destination.city || destinationSlug)}&hospedagem=${encodeURIComponent(place.slug || placeSlug)}&hospedagem_nome=${encodeURIComponent(place.name || placeSlug)}`}
                    className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)] transition hover:-translate-y-1"
                  >
                    <div className="relative h-32 overflow-hidden bg-slate-100 sm:h-40">
                      <img src={imageFor(store)} alt={store.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-700">
                        <Storefront size={12} weight="duotone" className="mr-1 inline" />
                        No app
                      </div>
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-1 text-base font-black text-slate-950">{store.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{store.settings?.description || 'Pedido online para esta hospedagem.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {link.deliveryEnabled ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                            Entrega {link.deliveryFee != null ? formatCurrency(link.deliveryFee) : ''}
                          </span>
                        ) : null}
                        {link.estimatedMinutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                            <Clock size={13} weight="duotone" />
                            {link.estimatedMinutes} min
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {placeListings.map((listing: any) => {
                const contactTarget = listing.whatsapp || listing.ctaUrl || '';
                const isExternalUrl = String(contactTarget || '').startsWith('http');
                const contactHref = isExternalUrl
                  ? contactTarget
                  : buildWhatsAppUrl(contactTarget, buildDestinationInquiryMessage({
                      destinationName: destination.name,
                      city: destination.city,
                      state: destination.state,
                      itemName: listing.title,
                      itemType: String(listing.category || 'serviço').replace('_', ' '),
                      placeName: place.name,
                    }), isNativePlatform);
                return (
                  <article key={listing.id} className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)]">
                    <div className="relative h-32 overflow-hidden bg-slate-100 sm:h-40">
                      <img src={imageFor(listing)} alt={listing.title} className="h-full w-full object-cover" />
                      <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white">
                        WhatsApp
                      </div>
                    </div>
                    <div className="p-3.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#336886]">{categoryLabel(listing.category)}</p>
                      <h3 className="mt-0.5 line-clamp-1 text-base font-black text-slate-950">{listing.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{listing.description || listing.address || `Atendimento para hóspedes em ${place.name}.`}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {contactHref ? (
                          <a
                            href={contactHref}
                            target={isNativePlatform && !isExternalUrl ? undefined : '_blank'}
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
                          >
                            <WhatsappLogo size={13} weight="fill" />
                            Chamar
                          </a>
                        ) : null}
                        {listing.instagramUrl ? (
                          <a href={instagramUrl(listing.instagramUrl)} onClick={openExternal(instagramUrl(listing.instagramUrl))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700">
                            <InstagramIcon className="h-3.5 w-3.5" />
                            Instagram
                          </a>
                        ) : null}
                        {listing.websiteUrl ? (
                          <a href={externalUrl(listing.websiteUrl)} onClick={openExternal(externalUrl(listing.websiteUrl))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700">
                            <GlobeHemisphereWest size={13} weight="duotone" />
                            {siteLabel(listing.websiteUrl)}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/82 p-4 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.32)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Cidade</p>
                  <h2 className="mt-1 text-base font-black">Também por perto</h2>
                </div>
                <Sparkle size={21} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-3 space-y-2.5">
                {destinationListings.map((listing: any) => {
                  const contactTarget = listing.whatsapp || listing.ctaUrl || '';
                  const isExternalUrl = String(contactTarget || '').startsWith('http');
                  const contactHref = isExternalUrl
                    ? contactTarget
                    : buildWhatsAppUrl(contactTarget, buildDestinationInquiryMessage({
                        destinationName: destination.name,
                        city: destination.city,
                        state: destination.state,
                        itemName: listing.title,
                        itemType: String(listing.category || 'serviço').replace('_', ' '),
                        placeName: place.name,
                      }), isNativePlatform);
                  return (
                  <article key={listing.id} className="rounded-[1.15rem] border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="flex gap-3">
                      <img src={imageFor(listing)} alt={listing.title} className="h-12 w-12 rounded-[1rem] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">{categoryLabel(listing.category)}</p>
                        <h3 className="mt-0.5 text-sm font-black text-slate-950">{listing.title}</h3>
                        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">{listing.description || listing.address || 'Dica da cidade.'}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {contactHref ? (
                        <a
                          href={contactHref}
                          target={isNativePlatform && !isExternalUrl ? undefined : '_blank'}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white"
                        >
                          <WhatsappLogo size={12} weight="fill" />
                          WhatsApp
                        </a>
                      ) : null}
                      {listing.instagramUrl ? (
                        <a href={instagramUrl(listing.instagramUrl)} onClick={openExternal(instagramUrl(listing.instagramUrl))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-700">
                          <InstagramIcon className="h-3 w-3" />
                          Insta
                        </a>
                      ) : null}
                      {listing.websiteUrl ? (
                        <a href={externalUrl(listing.websiteUrl)} onClick={openExternal(externalUrl(listing.websiteUrl))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-700">
                          <GlobeHemisphereWest size={12} weight="duotone" />
                          {siteLabel(listing.websiteUrl)}
                        </a>
                      ) : null}
                    </div>
                  </article>
                  );
                })}
                {destinationListings.length === 0 ? <p className="text-sm font-bold text-slate-500">Sem outros serviços aprovados na cidade ainda.</p> : null}
              </div>
            </div>
            {place.deliveryInstructions ? (
              <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Instrução de entrega</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{place.deliveryInstructions}</p>
              </div>
            ) : null}
            <Link to="/destinos/cadastrar" className="block rounded-[1.5rem] bg-[#153A4C] p-4 text-white">
              <ForkKnife size={22} weight="duotone" />
              <h3 className="mt-3 text-lg font-black">Quer aparecer neste chalé?</h3>
              <p className="mt-1 text-sm font-semibold text-white/72">Cadastre sua loja ou serviço para atender hóspedes pelo app ou WhatsApp.</p>
            </Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
