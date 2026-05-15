// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, ForkKnife, GlobeHemisphereWest, MagnifyingGlass, MapPinLine, Mountains, PhoneCall, Sparkle, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { PreStoreCardSkeleton, PreStoreDetailSheet } from '../components/Destinations/PreStoreDetailSheet';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildPhoneCallUrl, buildWhatsAppUrl } from '../utils/destinationWhatsApp';
import { openActionTarget } from '../utils/actionLink';
import { buildListingClaimUrl } from '../utils/destinationListingClaim';

const asset = (item: any, variant: 'logo' | 'banner' | 'image' = 'banner') => {
  const source =
    variant === 'logo'
      ? item?.logoUrl || item?.bannerUrl || item?.imageUrl
      : variant === 'image'
        ? item?.imageUrl || item?.bannerUrl || item?.logoUrl
        : item?.bannerUrl || item?.imageUrl || item?.logoUrl;
  return resolveAssetUrl(source || '') || getStoreAvatarUrl(item?.slug || item?.id, item?.name || item?.title);
};

const hasConfiguredAsset = (item: any, variant: 'logo' | 'banner' | 'image' = 'banner') => {
  const source =
    variant === 'logo'
      ? item?.logoUrl || item?.bannerUrl || item?.imageUrl
      : variant === 'image'
        ? item?.imageUrl || item?.bannerUrl || item?.logoUrl
        : item?.bannerUrl || item?.imageUrl || item?.logoUrl;
  return Boolean(resolveAssetUrl(source || ''));
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

const resolveLinkedStoreSlug = (listing: any) => {
  const directSlug = String(listing?.store?.slug || '').trim();
  if (directSlug) return directSlug;
  if (String(listing?.ctaType || '').toUpperCase() === 'STORE') {
    return String(listing?.ctaUrl || '').trim().replace(/^\/?(store|janocaminho)\//, '');
  }
  return '';
};

const normalizeText = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const itemMatchesSearch = (item: any, query: string, extra: string[] = []) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  const haystack = [
    item?.name,
    item?.title,
    item?.address,
    item?.description,
    item?.type,
    categoryLabel(item?.category),
    ...extra,
  ].map(normalizeText).join(' ');
  return haystack.includes(normalizedQuery);
};

const buildDestinationListingAction = ({ listing, destination, isNativePlatform }: any) => {
  const ctaUrl = String(listing?.ctaUrl || '').trim();
  const rawContact = listing?.whatsapp || listing?.phone || (/^https?:\/\//i.test(ctaUrl) ? '' : ctaUrl);
  const message = buildDestinationInquiryMessage({
    destinationName: destination.name,
    city: destination.city,
    state: destination.state,
    itemName: listing.title,
    itemType: categoryLabel(listing.category),
  });
  const whatsappHref = buildWhatsAppUrl(rawContact, message, isNativePlatform);
  if (whatsappHref) return { href: whatsappHref, label: 'WhatsApp', kind: 'whatsapp', external: false, native: isNativePlatform };

  const phoneHref = buildPhoneCallUrl(rawContact);
  if (phoneHref) return { href: phoneHref, label: 'Ligar', kind: 'phone', external: false, native: false };

  if (/^https?:\/\//i.test(ctaUrl)) return { href: ctaUrl, label: 'Abrir contato', kind: 'site', external: true };

  const websiteHref = externalUrl(listing.websiteUrl);
  if (websiteHref) return { href: websiteHref, label: siteLabel(listing.websiteUrl), kind: 'site', external: true };

  const instagramHref = instagramUrl(listing.instagramUrl);
  if (instagramHref) return { href: instagramHref, label: 'Instagram', kind: 'instagram', external: true };

  return null;
};

export function DestinationDetailPage() {
  const { destinationSlug = '' } = useParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [placeLimit, setPlaceLimit] = useState(6);
  const [listingLimit, setListingLimit] = useState(10);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const isNativePlatform = Capacitor.isNativePlatform();

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
  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(listings.map((listing: any) => String(listing.category || 'SERVICO'))));
    return unique.map((category: string) => ({
      value: category,
      label: categoryLabel(category),
      count: listings.filter((listing: any) => String(listing.category || 'SERVICO') === category).length,
    }));
  }, [listings]);
  const filterOptions = useMemo(() => [
    { value: 'TODOS', label: 'Todos', count: places.length + listings.length },
    { value: 'HOSPEDAGENS', label: 'Hospedagens', count: places.length },
    ...categoryOptions,
  ], [places.length, listings.length, categoryOptions]);
  const filteredPlaces = useMemo(
    () => {
      if (!['TODOS', 'HOSPEDAGENS'].includes(activeCategory)) return [];
      return places.filter((place: any) => itemMatchesSearch(place, searchTerm, [destination.name, destination.city]));
    },
    [places, activeCategory, searchTerm, destination.name, destination.city]
  );
  const filteredListings = useMemo(
    () => listings
      .filter((listing: any) => {
        if (activeCategory === 'HOSPEDAGENS') return false;
        const categoryMatches = activeCategory === 'TODOS' || String(listing.category || 'SERVICO') === activeCategory;
        return categoryMatches && itemMatchesSearch(listing, searchTerm, [destination.name, destination.city]);
      })
      .sort((left: any, right: any) => {
        const officialDiff = Number(Boolean(resolveLinkedStoreSlug(right))) - Number(Boolean(resolveLinkedStoreSlug(left)));
        if (officialDiff !== 0) return officialDiff;
        return String(left.title || '').localeCompare(String(right.title || ''), 'pt-BR');
      }),
    [listings, activeCategory, searchTerm, destination.name, destination.city]
  );
  const visiblePlaces = filteredPlaces.slice(0, placeLimit);
  const visibleListings = filteredListings.slice(0, listingLimit);
  const activeFilterLabel = filterOptions.find((option: any) => option.value === activeCategory)?.label || 'Todos';
  const showPlacesSection = activeCategory === 'TODOS' || activeCategory === 'HOSPEDAGENS';
  const showListingsSection = activeCategory !== 'HOSPEDAGENS';
  const showcaseSlides = useMemo(() => {
    const bannerSlides = banners.filter((banner: any) => hasConfiguredAsset(banner)).map((banner: any) => ({
      key: `banner-${banner.id}`,
      title: banner.title || destination.name,
      subtitle: banner.subtitle || destination.description,
      item: banner,
      actionTarget: banner.actionTarget,
      kind: 'Cidade',
    }));
    const fallbackSlides = hasConfiguredAsset(destination) ? [{
      key: `destination-${destination.id || destination.slug}`,
      title: destination.heroTitle || destination.name,
      subtitle: destination.heroSubtitle || destination.description,
      item: destination,
      actionTarget: '',
      kind: 'Cidade',
    }] : [];
    const citySlides = (bannerSlides.length ? bannerSlides : fallbackSlides).slice(0, 4);
    return citySlides.length
      ? citySlides
      : [{
          key: 'destination',
          title: destination.name,
          subtitle: destination.description,
          item: destination,
          actionTarget: '',
          kind: 'Destino',
        }];
  }, [banners, destination]);
  const activeShowcaseIndex = carouselIndex % Math.max(showcaseSlides.length, 1);
  const currentSlide = showcaseSlides[activeShowcaseIndex];
  const currentSlideTarget = externalUrl(currentSlide?.actionTarget);
  const destinationLocationLabel = [destination.city, destination.state].filter(Boolean).join(', ') || destination.name || 'Destino';
  const selectedListingImageConfigured = hasConfiguredAsset(selectedListing, 'image');
  const selectedListingWebsiteUrl = externalUrl(selectedListing?.websiteUrl);
  const selectedListingInstagramUrl = instagramUrl(selectedListing?.instagramUrl);
  const selectedListingAction = selectedListing ? buildDestinationListingAction({ listing: selectedListing, destination, isNativePlatform }) : null;

  useEffect(() => {
    setPlaceLimit(6);
    setListingLimit(10);
  }, [searchTerm, activeCategory, destinationSlug]);

  useEffect(() => {
    setCarouselIndex(0);
    setSelectedListing(null);
  }, [destinationSlug, showcaseSlides.length]);

  useEffect(() => {
    if (showcaseSlides.length <= 1) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % showcaseSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [showcaseSlides.length]);

  return (
    <PublicDestinationShell active="city" backTo="/destinos" backLabel="Destinos" contextLabel={destination.name || 'Cidade turística'}>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(51,104,134,0.16),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(216,245,231,0.55),transparent_30%),linear-gradient(135deg,#f6f2e9,#eef5f1_56%,#eadfc8)] px-4 pb-4 pt-5">
        <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-[#336886]/16 blur-3xl" />
        <div className="absolute -left-16 bottom-4 h-56 w-56 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          {loading ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <PreStoreCardSkeleton />
              <PreStoreCardSkeleton />
            </div>
          ) : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

          {!loading && !error ? (
            <div className="mt-4 grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div className="min-w-0">
                <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#153A4C]/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#153A4C] ring-1 ring-[#153A4C]/10">
                  <Mountains size={15} weight="duotone" />
                  <span>Guia da cidade</span>
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-black leading-[0.96] tracking-[-0.055em] text-slate-950 sm:text-5xl">
                  {destination.heroTitle || destination.name}
                </h1>
                <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
                  <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{destinationLocationLabel}</span>
                </p>
                <p className="mt-3 line-clamp-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                  {destination.heroSubtitle || destination.description || 'Hospedagens, lojas e experiências cadastradas neste destino.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-[11px] font-black text-[#153A4C] shadow-sm backdrop-blur">
                    <Bed size={17} weight="duotone" />
                    {places.length} hospedagens
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-[11px] font-black text-[#153A4C] shadow-sm backdrop-blur">
                    <ForkKnife size={17} weight="duotone" />
                    {listings.length} serviços
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/85 bg-white/88 p-2 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.55)] backdrop-blur">
                <button
                  type="button"
                  disabled={!currentSlideTarget}
                  onClick={() => currentSlideTarget && void openActionTarget({ href: currentSlideTarget, external: true })}
                  className="group relative block w-full overflow-hidden rounded-[1.55rem] bg-slate-900 text-left disabled:cursor-default"
                  aria-label={currentSlideTarget ? `Abrir ${currentSlide?.title || destination.name}` : currentSlide?.title || destination.name}
                >
                  <div className="aspect-[16/9] min-h-[13rem] sm:min-h-[18rem] lg:min-h-[20rem]">
                    {hasConfiguredAsset(currentSlide?.item || destination) ? (
                      <img src={asset(currentSlide?.item || destination)} alt={currentSlide?.title || destination.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_15%,rgba(16,185,129,0.35),transparent_34%),linear-gradient(135deg,#18384a,#0f172a_62%,#3b2f1c)]">
                        <Mountains size={84} weight="duotone" className="text-white/40" />
                      </div>
                    )}
                  </div>
                  <div className="absolute right-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-black text-slate-700 shadow-sm">
                    {activeShowcaseIndex + 1}/{showcaseSlides.length}
                  </div>
                  {currentSlideTarget ? (
                    <div className="absolute bottom-4 right-4 rounded-full bg-[#153A4C] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-sm">
                      Abrir
                    </div>
                  ) : null}
                </button>
                <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-2">
                  <span className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Fotos da cidade</span>
                  <div className="flex min-w-0 flex-1 justify-end gap-2 overflow-x-auto pb-1">
                    {showcaseSlides.map((slide: any, index: number) => (
                      <button
                        key={slide.key}
                        type="button"
                        aria-label={`Abrir foto ${index + 1}`}
                        onClick={() => setCarouselIndex(index)}
                        className={`h-12 w-16 overflow-hidden rounded-xl ring-2 transition sm:h-14 sm:w-20 ${index === activeShowcaseIndex ? 'ring-[#153A4C]' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                      >
                        {hasConfiguredAsset(slide.item) ? (
                          <img src={asset(slide.item)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-[#153A4C]/10">
                            <Mountains size={20} weight="duotone" className="text-[#153A4C]" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 pb-10 pt-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="relative z-10 min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/92 p-3 shadow-[0_16px_42px_-36px_rgba(15,23,42,0.36)] backdrop-blur lg:col-span-2 sm:p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Escolha o que procurar</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">Buscar em {destination.name}</h2>
              </div>
              <p className="text-xs font-bold text-slate-500">
                {activeFilterLabel}: {filteredPlaces.length + filteredListings.length} resultado(s)
              </p>
            </div>
            <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="group flex min-h-[52px] min-w-0 max-w-full items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.4)] focus-within:border-[#336886]/40 focus-within:ring-4 focus-within:ring-[#336886]/10">
                <MagnifyingGlass size={18} weight="bold" className="text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ex: Pedra do Baú, pousada, pizza, escalada..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                />
                {searchTerm ? (
                  <button type="button" onClick={() => setSearchTerm('')} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                    Limpar
                  </button>
                ) : null}
              </label>
              <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:max-w-[620px]">
                {filterOptions.map((category: any) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.value);
                      if (category.value === 'TODOS') setSearchTerm('');
                    }}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] shadow-sm transition ${activeCategory === category.value ? 'bg-[#153A4C] text-white shadow-[0_16px_28px_-20px_rgba(21,58,76,0.72)]' : 'border border-slate-200 bg-white text-slate-600 hover:border-[#336886]/30 hover:text-[#153A4C]'}`}
                  >
                    <span className="max-w-[7.25rem] truncate">{category.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeCategory === category.value ? 'bg-white/16 text-white/80' : 'bg-slate-100 text-slate-500'}`}>{category.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {showPlacesSection ? (
          <div id="hospedagens" className="min-w-0 max-w-full scroll-mt-28 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Hospedagens</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Onde você está hospedado?</h2>
                <p className="mt-1 max-w-xl text-sm font-semibold leading-relaxed text-slate-500">
                  Primeiro escolha o chalé ou pousada. Depois mostramos quem entrega, atende ou resolve algo perto dali.
                </p>
              </div>
              <Bed size={28} weight="duotone" className="shrink-0 text-[#336886]" />
            </div>

            {places.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Nenhuma hospedagem aprovada ainda neste destino.</p>
                <Link to="/destinos/cadastrar" className="mt-3 inline-flex rounded-full bg-[#153A4C] px-4 py-2 text-xs font-black text-white">
                  Cadastrar chalé ou pousada
                </Link>
              </div>
            ) : null}

            {places.length > 0 && filteredPlaces.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Nenhuma hospedagem bateu com a busca atual.</p>
              </div>
            ) : null}

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {visiblePlaces.map((place: any) => {
                const placeWebsiteUrl = externalUrl(place.websiteUrl);
                const placeInstagramUrl = instagramUrl(place.instagramUrl);
                const whatsappMessage = buildDestinationInquiryMessage({
                  destinationName: destination.name,
                  city: destination.city,
                  state: destination.state,
                  itemName: place.name,
                  itemType: 'hospedagem',
                });
                const placeWhatsAppHref = buildWhatsAppUrl(place.whatsapp, whatsappMessage, isNativePlatform);
                const placePhoneHref = placeWhatsAppHref ? '' : buildPhoneCallUrl(place.whatsapp);
                const placeServiceCount = Number(place.storeCount || place.featuredStores?.length || 0);
                const placeServiceLabel = placeServiceCount === 1 ? '1 lugar atende aqui' : `${placeServiceCount} lugares atendem aqui`;
                return (
                <article
                  key={place.id}
                  className="group min-w-0 max-w-full overflow-hidden rounded-[1.8rem] border border-[#336886]/15 bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_52%,#edf7f2_100%)] shadow-[0_18px_46px_-34px_rgba(21,58,76,0.48)] transition hover:-translate-y-1"
                >
                  <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="relative block h-44 overflow-hidden bg-slate-100 sm:h-40">
                    {hasConfiguredAsset(place) ? (
                      <img src={asset(place)} alt={place.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(51,104,134,0.22),transparent_36%),linear-gradient(135deg,#e9f1ef,#d9e7df)]">
                        <Bed size={42} weight="duotone" className="text-[#153A4C]/42" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/42 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-black text-[#153A4C] shadow-sm">
                      <Bed size={12} weight="duotone" />
                      {placeTypeLabel(place.type)}
                    </div>
                    {placeServiceCount > 0 ? (
                      <div className="absolute right-3 top-3 rounded-full bg-[#153A4C]/92 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                        {placeServiceLabel}
                      </div>
                    ) : null}
                  </Link>
                  <div className="p-3.5">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#153A4C]/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#153A4C]">
                      <Bed size={12} weight="duotone" />
                      Hospedagem
                    </div>
                    <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="line-clamp-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                      {place.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{place.description || place.address || 'Hospedagem cadastrada.'}</p>
                    {place.address ? (
                      <p className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-white/78 px-2.5 py-1 text-[11px] font-black text-slate-600">
                        <MapPinLine size={12} weight="duotone" className="shrink-0 text-[#336886]" />
                        <span className="truncate">{place.address}</span>
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
                        <Sparkle size={13} weight="duotone" />
                        Base da viagem
                      </span>
                      {placeWhatsAppHref ? (
                        <a
                          href={placeWhatsAppHref}
                          target={isNativePlatform ? undefined : '_blank'}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white"
                        >
                          <WhatsappLogo size={12} weight="fill" />
                          Falar
                        </a>
                      ) : null}
                      {placePhoneHref ? (
                        <a href={placePhoneHref} className="inline-flex items-center gap-1 rounded-full bg-[#153A4C] px-2.5 py-1 text-[11px] font-black text-white">
                          <PhoneCall size={12} weight="duotone" />
                          Ligar
                        </a>
                      ) : null}
                      {placeInstagramUrl ? (
                        <a href={placeInstagramUrl} onClick={openExternal(placeInstagramUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 shadow-sm ring-1 ring-pink-100">
                          <InstagramIcon className="h-3.5 w-3.5" />
                          Insta
                        </a>
                      ) : null}
                      {placeWebsiteUrl ? (
                        <a href={placeWebsiteUrl} onClick={openExternal(placeWebsiteUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700">
                          <GlobeHemisphereWest size={12} weight="duotone" />
                          {siteLabel(place.websiteUrl)}
                        </a>
                      ) : null}
                      <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#153A4C] px-3 py-1.5 text-xs font-black text-white">
                        Ver chalé
                        <ArrowRight size={14} weight="bold" />
                      </Link>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
            {filteredPlaces.length > visiblePlaces.length ? (
              <button
                type="button"
                onClick={() => setPlaceLimit((current) => current + 6)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
              >
                Ver mais hospedagens ({filteredPlaces.length - visiblePlaces.length})
              </button>
            ) : null}
          </div>
          ) : null}

          {showListingsSection ? (
          <aside id="servicos-cidade" className={showPlacesSection ? 'min-w-0 max-w-full scroll-mt-28 space-y-4' : 'min-w-0 max-w-full scroll-mt-28 space-y-4 lg:col-span-2'}>
            <div className="min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Cidade</p>
                  <h2 className="mt-1 text-xl font-black">Comer, comprar e fazer</h2>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                    Lojas oficiais ganham pedido pelo app. Os demais aparecem como contato direto até ativarem o cardápio online.
                  </p>
                </div>
                <Sparkle size={25} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-4 min-w-0 space-y-3">
                {visibleListings.map((listing: any) => {
                  const linkedStoreSlug = resolveLinkedStoreSlug(listing);
                  const linkedStore = listing.store || null;
                  const hasLinkedStore = Boolean(linkedStoreSlug);
                  const description = hasLinkedStore
                    ? linkedStore?.settings?.description || listing.description || listing.address || 'Loja ativa no Já no Caminho.'
                    : listing.description || listing.address || 'Toque para ver contato, endereço e opção de virar loja oficial.';
                  const imageIsConfigured = hasConfiguredAsset(listing, 'image');
                  const imageUrl = imageIsConfigured ? asset(listing, 'image') : '';
                  const cardBody = (
                    <>
                      <div className="flex min-w-0 max-w-full gap-3">
                        {imageIsConfigured ? (
                          <img src={imageUrl} alt={listing.title} className="h-16 w-16 shrink-0 rounded-[1.15rem] object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.15rem] bg-amber-50">
                            <Sparkle size={23} weight="duotone" className="text-amber-700/70" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-[#edf5fa] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">{categoryLabel(listing.category)}</span>
                            {hasLinkedStore ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Loja oficial</span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">Pré-loja</span>
                            )}
                          </div>
                          <h3 className="mt-1 line-clamp-1 text-base font-extrabold tracking-[-0.02em] text-slate-950">{listing.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">{description}</p>
                        </div>
                        <span className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${hasLinkedStore ? 'bg-[#153A4C] text-white' : 'bg-white text-[#153A4C] ring-1 ring-slate-200'} transition group-hover:translate-x-0.5`}>
                          {hasLinkedStore ? <Storefront size={15} weight="duotone" /> : <ArrowRight size={15} weight="bold" />}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <span className="min-w-0 truncate text-[11px] font-semibold text-slate-400">
                          {listing.address || (hasLinkedStore ? 'Pedido online pelo app' : 'Detalhes e contatos no toque')}
                        </span>
                        <span className="shrink-0 text-[11px] font-black text-[#336886]">
                          {hasLinkedStore ? 'Ver cardápio' : 'Ver detalhes'}
                        </span>
                      </div>
                    </>
                  );
                  return (
                    hasLinkedStore ? (
                      <Link
                        key={listing.id}
                        to={`/store/${linkedStoreSlug}`}
                        className="group block min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 text-left shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-[#336886]/24"
                      >
                        {cardBody}
                      </Link>
                    ) : (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => setSelectedListing(listing)}
                        className="group block w-full min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 text-left shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-amber-300/70 active:scale-[0.99]"
                      >
                        {cardBody}
                      </button>
                    )
                  );
                })}
                {listings.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Nenhum serviço aprovado ainda.
                  </p>
                ) : null}
                {listings.length > 0 && filteredListings.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Nenhum serviço bateu com a busca atual.
                  </p>
                ) : null}
                {filteredListings.length > visibleListings.length ? (
                  <button
                    type="button"
                    onClick={() => setListingLimit((current) => current + 10)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
                  >
                    Ver mais serviços ({filteredListings.length - visibleListings.length})
                  </button>
                ) : null}
              </div>
            </div>

            <Link to="/destinos/cadastrar" className="block rounded-[2rem] border border-[#153A4C]/10 bg-[#153A4C] p-5 text-white shadow-[0_18px_50px_-34px_rgba(21,58,76,0.75)]">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">
                <ForkKnife size={14} weight="duotone" />
                Participar
              </p>
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">Tem chalé, pousada ou serviço?</h3>
              <p className="mt-2 text-sm font-semibold text-white/72">Apareça para turistas da cidade e receba pedidos de hóspedes pelo app ou contato direto.</p>
            </Link>
          </aside>
          ) : null}

          {!showListingsSection ? (
            <aside className="space-y-4">
              <Link to="/destinos/cadastrar" className="block rounded-[2rem] border border-[#153A4C]/10 bg-[#153A4C] p-5 text-white shadow-[0_18px_50px_-34px_rgba(21,58,76,0.75)]">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">
                  <ForkKnife size={14} weight="duotone" />
                  Participar
                </p>
                <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">Tem chalé, pousada ou serviço?</h3>
                <p className="mt-2 text-sm font-semibold text-white/72">Apareça para turistas da cidade e receba pedidos de hóspedes pelo app ou contato direto.</p>
              </Link>
            </aside>
          ) : null}
        </section>
      ) : null}
      <PreStoreDetailSheet
        open={Boolean(selectedListing)}
        onClose={() => setSelectedListing(null)}
        listing={selectedListing}
        destination={destination}
        categoryLabel={categoryLabel(selectedListing?.category)}
        imageUrl={selectedListingImageConfigured ? asset(selectedListing, 'image') : ''}
        hasImage={selectedListingImageConfigured}
        claimHref={selectedListing ? buildListingClaimUrl(destination, selectedListing) : ''}
        primaryAction={selectedListingAction}
        instagramUrl={selectedListingInstagramUrl}
        websiteUrl={selectedListingWebsiteUrl}
        websiteLabel={siteLabel(selectedListing?.websiteUrl)}
        address={selectedListing?.address}
      />
    </PublicDestinationShell>
  );
}
