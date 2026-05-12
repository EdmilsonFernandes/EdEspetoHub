// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, ArrowUpRight, Bed, Clock, ForkKnife, GlobeHemisphereWest, HouseLine, MapPinLine, PhoneCall, ShoppingBagOpen, Sparkle, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatCurrency } from '../utils/format';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildPhoneCallUrl, buildWhatsAppUrl } from '../utils/destinationWhatsApp';
import { openActionTarget } from '../utils/actionLink';

const fallbackAvatarFor = (item: any) =>
  getStoreAvatarUrl(item?.slug || item?.store?.slug || item?.id, item?.name || item?.title || item?.store?.name);

const logoFor = (item: any) =>
  resolveAssetUrl(item?.logoUrl || item?.settings?.logoUrl || item?.store?.settings?.logoUrl || '') ||
  fallbackAvatarFor(item);

const hasCoverImage = (item: any) =>
  Boolean(resolveAssetUrl(item?.bannerUrl || item?.imageUrl || item?.settings?.bannerUrl || item?.store?.settings?.bannerUrl || ''));

const imageFor = (item: any) =>
  resolveAssetUrl(
    item?.bannerUrl ||
      item?.imageUrl ||
      item?.settings?.bannerUrl ||
      item?.store?.settings?.bannerUrl ||
      item?.logoUrl ||
      item?.settings?.logoUrl ||
      item?.store?.settings?.logoUrl ||
      ''
  ) ||
  fallbackAvatarFor(item);

const coverImageFor = (item: any) =>
  resolveAssetUrl(item?.bannerUrl || item?.imageUrl || item?.settings?.bannerUrl || item?.store?.settings?.bannerUrl || '') ||
  logoFor(item);

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

const SmartCardImage = ({ src, alt, fit = 'cover', className = '', children }: any) => (
  <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
    {fit === 'contain' ? (
      <>
        <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-24 blur-lg" />
        <div className="absolute inset-0 bg-white/70" />
      </>
    ) : (
      <div className="absolute inset-0 bg-slate-900/5" />
    )}
    <img
      src={src}
      alt={alt}
      className={`relative h-full w-full object-center transition duration-500 group-hover:scale-[1.035] ${fit === 'contain' ? 'object-contain p-2.5' : 'object-cover'}`}
    />
    {children}
  </div>
);

const ExpandableText = ({ value, fallback, className = '', collapsedClassName = 'line-clamp-3', threshold = 150 }: any) => {
  const [expanded, setExpanded] = useState(false);
  const text = String(value || fallback || '').trim();
  const canExpand = text.length > threshold;
  if (!text) return null;

  return (
    <div>
      <p className={`${className} ${canExpand && !expanded ? collapsedClassName : ''}`}>{text}</p>
      {canExpand ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
          className="mt-1 text-[11px] font-bold text-[#336886]"
        >
          {expanded ? 'Mostrar menos' : 'Ler descrição completa'}
        </button>
      ) : null}
    </div>
  );
};

const openExternal = (url: string) => (event: any) => {
  event.preventDefault();
  event.stopPropagation();
  void openActionTarget({ href: url, external: true });
};

const buildPhoneContactAction = ({ phone, message, isNativePlatform }: any) => {
  const whatsappHref = buildWhatsAppUrl(phone, message, isNativePlatform);
  if (whatsappHref) return { href: whatsappHref, label: 'WhatsApp', kind: 'whatsapp', external: false, native: isNativePlatform };

  const phoneHref = buildPhoneCallUrl(phone);
  if (phoneHref) return { href: phoneHref, label: 'Ligar', kind: 'phone', external: false, native: false };

  return null;
};

const buildListingAction = ({ listing, destination, place, isNativePlatform }: any) => {
  const message = buildDestinationInquiryMessage({
    destinationName: destination.name,
    city: destination.city,
    state: destination.state,
    itemName: listing.title,
    itemType: String(listing.category || 'serviço').replace('_', ' '),
    placeName: place.name,
  });
  const phoneAction = buildPhoneContactAction({ phone: listing.whatsapp, message, isNativePlatform });
  if (phoneAction) return phoneAction;

  const ctaUrl = String(listing.ctaUrl || '').trim();
  if (ctaUrl) {
    if (/^https?:\/\//i.test(ctaUrl)) return { href: ctaUrl, label: 'Abrir', kind: 'site', external: true };
    const ctaPhoneAction = buildPhoneContactAction({ phone: ctaUrl, message, isNativePlatform });
    if (ctaPhoneAction) return ctaPhoneAction;
    return { href: externalUrl(ctaUrl), label: 'Abrir', kind: 'site', external: true };
  }

  const websiteHref = externalUrl(listing.websiteUrl);
  if (websiteHref) return { href: websiteHref, label: siteLabel(listing.websiteUrl), kind: 'site', external: true };

  const instagramHref = instagramUrl(listing.instagramUrl);
  if (instagramHref) return { href: instagramHref, label: 'Instagram', kind: 'instagram', external: true };

  return null;
};

const openListingActionTarget = (action: any) => {
  if (!action?.href) return;
  if (action.external) {
    void openActionTarget({ href: action.href, external: true });
    return;
  }
  if (action.kind === 'whatsapp' && !action.native) {
    const opened = window.open(action.href, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(action.href);
    return;
  }
  window.location.assign(action.href);
};

const handleListingCardKeyDown = (action: any) => (event: any) => {
  if (!action?.href) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openListingActionTarget(action);
};

export function HospitalityPlacePage() {
  const { destinationSlug = '', placeSlug = '' } = useParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'app' | 'direct'>('all');

  useEffect(() => {
    let active = true;
    setServiceFilter('all');
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
  const deliveryOptionCount = stores.length + placeListings.length;
  const deliveryOptionLabel = deliveryOptionCount === 1 ? '1 opção vinculada' : `${deliveryOptionCount} opções vinculadas`;
  const visibleStores = serviceFilter === 'direct' ? [] : stores;
  const visiblePlaceListings = serviceFilter === 'app' ? [] : placeListings;
  const hasVisiblePlaceDeliveryOptions = visibleStores.length > 0 || visiblePlaceListings.length > 0;
  const serviceFilterOptions = [
    { id: 'all', label: 'Todos', count: deliveryOptionCount, icon: ShoppingBagOpen },
    { id: 'app', label: 'Pedido no app', count: stores.length, icon: Storefront },
    { id: 'direct', label: 'Contato direto', count: placeListings.length, icon: PhoneCall },
  ];
  const placeWebsiteUrl = externalUrl(place.websiteUrl);
  const placeInstagramUrl = instagramUrl(place.instagramUrl);
  const placeContactMessage = buildDestinationInquiryMessage({
    destinationName: destination.name,
    city: destination.city,
    state: destination.state,
    itemName: place.name,
    itemType: 'hospedagem',
  });
  const placeWhatsAppUrl = buildWhatsAppUrl(place.whatsapp, placeContactMessage, isNativePlatform);
  const placePhoneUrl = placeWhatsAppUrl ? '' : buildPhoneCallUrl(place.whatsapp);

  return (
    <main className="min-h-screen bg-[#f4f1ea] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(51,104,134,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(240,180,72,0.18),transparent_30%),linear-gradient(135deg,#f7f1e4,#eef6f1_58%,#eadfc8)] px-4 pb-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <div className="absolute -right-20 top-12 h-64 w-64 rounded-full bg-[#336886]/14 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <Link to={`/destinos/${destinationSlug}`} className="inline-flex items-center gap-2 rounded-full border border-[#153A4C]/10 bg-white/82 px-2.5 py-2 text-xs font-bold text-[#153A4C] shadow-sm backdrop-blur">
              <ArrowRight size={14} className="rotate-180" weight="bold" />
              Cidade
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/82 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#153A4C] shadow-sm">
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
                    <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 shadow-sm">
                      {placeTypeLabel(place.type)}
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#153A4C]/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#153A4C] ring-1 ring-[#153A4C]/10">
                    <Bed size={14} weight="duotone" />
                    Hospedagem
                  </p>
                  <h1 className="mt-3 text-3xl font-extrabold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">{place.name}</h1>
                  <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                    <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                    <span className="truncate">{place.address || destinationLocationLabel}</span>
                  </p>
                  <ExpandableText
                    value={place.description || place.deliveryInstructions}
                    fallback="Hospedagem cadastrada no Já no Caminho."
                    className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 sm:text-base"
                    collapsedClassName="line-clamp-4"
                    threshold={210}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {placeWhatsAppUrl ? (
                      <a
                        href={placeWhatsAppUrl}
                        target={isNativePlatform ? undefined : '_blank'}
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm"
                      >
                        <WhatsappLogo size={14} weight="fill" />
                        WhatsApp
                      </a>
                    ) : null}
                    {placePhoneUrl ? (
                      <a href={placePhoneUrl} className="inline-flex items-center gap-1 rounded-full bg-[#153A4C] px-3 py-2 text-xs font-bold text-white shadow-sm">
                        <PhoneCall size={14} weight="duotone" />
                        Ligar
                      </a>
                    ) : null}
                    {placeWebsiteUrl ? (
                      <a href={placeWebsiteUrl} onClick={openExternal(placeWebsiteUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                        <HouseLine size={14} weight="duotone" />
                        {siteLabel(place.websiteUrl)}
                      </a>
                    ) : null}
                    {placeInstagramUrl ? (
                      <a href={placeInstagramUrl} onClick={openExternal(placeInstagramUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
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
        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 pt-3 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4">
            <div className="px-1 pt-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#336886]">
                    <ShoppingBagOpen size={15} weight="duotone" />
                    Atendem este chalé
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-slate-950">Comida e serviços que chegam aqui</h2>
                  <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                    Toque em um card para pedir pelo app ou chamar o atendimento direto no WhatsApp.
                  </p>
                </div>
                <p className="hidden max-w-[13rem] text-right text-xs font-medium leading-relaxed text-slate-500 sm:block">
                  {deliveryOptionLabel} a {place.name}.
                </p>
              </div>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {serviceFilterOptions.map((option: any) => {
                  const Icon = option.icon;
                  const active = serviceFilter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setServiceFilter(option.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-bold transition ${
                        active
                          ? 'bg-[#153A4C] text-white shadow-[0_10px_24px_-18px_rgba(21,58,76,0.85)]'
                          : 'border border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <Icon size={14} weight={option.id === 'direct' ? 'fill' : 'duotone'} className={option.id === 'direct' && !active ? 'text-emerald-600' : ''} />
                      {option.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/16 text-white' : 'bg-slate-100 text-slate-500'}`}>{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {!hasVisiblePlaceDeliveryOptions ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">
                  {hasPlaceDeliveryOptions ? 'Nenhuma opção neste filtro por enquanto.' : 'Ainda não há lojas ou contatos configurados para atendimento direto neste chalé.'}
                </p>
              </div>
            ) : null}
            <div className="grid gap-3 xl:grid-cols-2">
              {visibleStores.map((entry: any) => {
                const store = entry.store || {};
                const link = entry || {};
                return (
                  <Link
                    key={`${entry.id}-${store.id}`}
                    to={`/${store.slug}?destino=${encodeURIComponent(destination.slug || destinationSlug)}&destino_nome=${encodeURIComponent(destination.name || destination.city || destinationSlug)}&hospedagem=${encodeURIComponent(place.slug || placeSlug)}&hospedagem_nome=${encodeURIComponent(place.name || placeSlug)}`}
                    className="group grid grid-cols-[6.75rem_1fr] items-start overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white p-2 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.48)] transition hover:-translate-y-1 hover:border-[#336886]/30 sm:grid-cols-[7.25rem_1fr]"
                  >
                    <SmartCardImage
                      src={coverImageFor(store)}
                      alt={store.name}
                      fit={hasCoverImage(store) ? 'cover' : 'contain'}
                      className="aspect-square self-start rounded-[1.1rem]"
                    >
                      <div className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#153A4C] shadow-sm ring-1 ring-white/80 backdrop-blur">
                        App
                      </div>
                    </SmartCardImage>
                    <div className="min-w-0 p-2.5">
                      <p className="inline-flex items-center gap-1 rounded-full bg-[#edf5fa] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#336886]">
                        <Storefront size={12} weight="duotone" />
                        Pedido pelo app
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 text-base font-bold leading-snug text-slate-950">{store.name}</h3>
                      <p className="mt-1 line-clamp-4 text-sm font-medium leading-relaxed text-slate-500">{store.settings?.description || 'Pedido online para esta hospedagem.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {link.deliveryEnabled ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                            Entrega {link.deliveryFee != null ? formatCurrency(link.deliveryFee) : ''}
                          </span>
                        ) : null}
                        {link.estimatedMinutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            <Clock size={13} weight="duotone" />
                            {link.estimatedMinutes} min
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {visiblePlaceListings.map((listing: any) => {
                const action = buildListingAction({ listing, destination, place, isNativePlatform });
                const listingInstagramUrl = instagramUrl(listing.instagramUrl);
                const listingWebsiteUrl = externalUrl(listing.websiteUrl);
                return (
                  <article
                    key={listing.id}
                    role={action?.href ? 'link' : undefined}
                    tabIndex={action?.href ? 0 : undefined}
                    onClick={() => openListingActionTarget(action)}
                    onKeyDown={handleListingCardKeyDown(action)}
                    className={`group grid grid-cols-[6.75rem_1fr] items-start overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white p-2 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.48)] transition sm:grid-cols-[7.25rem_1fr] ${action?.href ? 'cursor-pointer hover:-translate-y-1 hover:border-amber-300/70' : ''}`}
                  >
                    <SmartCardImage
                      src={coverImageFor(listing)}
                      alt={listing.title}
                      fit={hasCoverImage(listing) ? 'cover' : 'contain'}
                      className="aspect-square self-start rounded-[1.1rem]"
                    >
                      {action?.kind === 'whatsapp' ? (
                        <div className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/92 text-emerald-600 shadow-sm ring-1 ring-white/80 backdrop-blur">
                          <WhatsappLogo size={13} weight="fill" />
                        </div>
                      ) : null}
                      {action?.kind === 'phone' ? (
                        <div className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/92 text-[#153A4C] shadow-sm ring-1 ring-white/80 backdrop-blur">
                          <PhoneCall size={13} weight="duotone" />
                        </div>
                      ) : null}
                    </SmartCardImage>
                    <div className="min-w-0 p-2.5">
                      <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                        <ForkKnife size={12} weight="duotone" />
                        {categoryLabel(listing.category)}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 text-base font-bold leading-snug text-slate-950">{listing.title}</h3>
                      <ExpandableText
                        value={listing.description || listing.address}
                        fallback={`Atendimento para hóspedes em ${place.name}.`}
                        className="mt-1 text-sm font-medium leading-relaxed text-slate-500"
                        collapsedClassName="line-clamp-4"
                        threshold={150}
                      />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-semibold text-slate-400">
                          {listing.address || (action?.label ? `Toque para abrir ${action.label}` : 'Contato em análise')}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {listingInstagramUrl ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); void openActionTarget({ href: listingInstagramUrl, external: true }); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                              <InstagramIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {listingWebsiteUrl ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); void openActionTarget({ href: listingWebsiteUrl, external: true }); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                              <GlobeHemisphereWest size={13} weight="duotone" />
                            </button>
                          ) : null}
                          {action?.href ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#153A4C] text-white shadow-sm">
                              {action.kind === 'whatsapp' ? <WhatsappLogo size={13} weight="fill" /> : action.kind === 'phone' ? <PhoneCall size={13} weight="duotone" /> : <ArrowUpRight size={13} weight="bold" />}
                            </span>
                          ) : null}
                        </div>
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Cidade</p>
                  <h2 className="mt-1 text-base font-bold">Também por perto</h2>
                </div>
                <Sparkle size={21} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-3 space-y-2.5">
                {destinationListings.map((listing: any) => {
                  const action = buildListingAction({ listing, destination, place, isNativePlatform });
                  const listingInstagramUrl = instagramUrl(listing.instagramUrl);
                  const listingWebsiteUrl = externalUrl(listing.websiteUrl);
                  return (
                  <article
                    key={listing.id}
                    role={action?.href ? 'link' : undefined}
                    tabIndex={action?.href ? 0 : undefined}
                    onClick={() => openListingActionTarget(action)}
                    onKeyDown={handleListingCardKeyDown(action)}
                    className={`rounded-[1.15rem] border border-slate-100 bg-slate-50/70 p-2.5 transition ${action?.href ? 'cursor-pointer hover:border-[#336886]/20 hover:bg-white' : ''}`}
                  >
                    <div className="flex gap-3">
                      <SmartCardImage
                        src={coverImageFor(listing)}
                        alt={listing.title}
                        fit={hasCoverImage(listing) ? 'cover' : 'contain'}
                        className="h-12 w-12 shrink-0 rounded-[1rem]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#336886]">{categoryLabel(listing.category)}</p>
                        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-slate-950">{listing.title}</h3>
                        <ExpandableText
                          value={listing.description || listing.address}
                          fallback="Dica da cidade."
                          className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500"
                          collapsedClassName="line-clamp-3"
                          threshold={105}
                        />
                      </div>
                      {action?.href ? (
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#153A4C] ring-1 ring-slate-200">
                          {action.kind === 'whatsapp' ? <WhatsappLogo size={13} weight="fill" className="text-emerald-600" /> : action.kind === 'phone' ? <PhoneCall size={13} weight="duotone" /> : <ArrowUpRight size={13} weight="bold" />}
                        </span>
                      ) : null}
                    </div>
                    {(listingInstagramUrl || listingWebsiteUrl) ? (
                      <div className="mt-2 flex justify-end gap-1.5">
                        {listingInstagramUrl ? (
                          <button type="button" onClick={(event) => { event.stopPropagation(); void openActionTarget({ href: listingInstagramUrl, external: true }); }} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                            <InstagramIcon className="h-3 w-3" />
                          </button>
                        ) : null}
                        {listingWebsiteUrl ? (
                          <button type="button" onClick={(event) => { event.stopPropagation(); void openActionTarget({ href: listingWebsiteUrl, external: true }); }} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                            <GlobeHemisphereWest size={12} weight="duotone" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                  );
                })}
                {destinationListings.length === 0 ? <p className="text-sm font-bold text-slate-500">Sem outros serviços aprovados na cidade ainda.</p> : null}
              </div>
            </div>
            {place.deliveryInstructions ? (
              <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Instrução de entrega</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{place.deliveryInstructions}</p>
              </div>
            ) : null}
            <Link to="/destinos/cadastrar" className="block rounded-[1.5rem] bg-[#153A4C] p-4 text-white">
              <ForkKnife size={22} weight="duotone" />
              <h3 className="mt-3 text-lg font-bold">Quer aparecer neste chalé?</h3>
              <p className="mt-1 text-sm font-semibold text-white/72">Cadastre sua loja ou serviço para atender hóspedes pelo app ou WhatsApp.</p>
            </Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
