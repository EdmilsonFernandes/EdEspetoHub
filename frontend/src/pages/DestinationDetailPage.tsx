// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, ForkKnife, GlobeHemisphereWest, MagnifyingGlass, MapPinLine, Mountains, PhoneCall, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
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

const stopCardClick = (event: any) => {
  event.stopPropagation();
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
    itemId: listing.id,
    itemType: categoryLabel(listing.category),
    itemAddress: listing.address,
    itemAddressNumber: listing.addressNumber,
    itemDistrict: listing.district,
    itemCity: listing.city || destination.city,
    itemState: listing.state || destination.state,
    itemZipCode: listing.zipCode,
    itemLat: listing.lat,
    itemLng: listing.lng,
    destinationSlug: destination.slug,
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
  const navigate = useNavigate();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [placeLimit, setPlaceLimit] = useState(6);
  const [listingLimit, setListingLimit] = useState(10);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
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
    const fallbackSlides = !bannerSlides.length && hasConfiguredAsset(destination) ? [{
      key: `destination-${destination.id || destination.slug}`,
      title: destination.heroTitle || destination.name,
      subtitle: destination.heroSubtitle || destination.description,
      item: destination,
      actionTarget: '',
      kind: 'Cidade',
    }] : [];
    return [...bannerSlides, ...fallbackSlides].slice(0, 4);
  }, [banners, destination]);
  const selectedListingImageConfigured = hasConfiguredAsset(selectedListing, 'image');
  const selectedListingWebsiteUrl = externalUrl(selectedListing?.websiteUrl);
  const selectedListingInstagramUrl = instagramUrl(selectedListing?.instagramUrl);
  const selectedListingAction = selectedListing ? buildDestinationListingAction({ listing: selectedListing, destination, isNativePlatform }) : null;

  useEffect(() => {
    setPlaceLimit(6);
    setListingLimit(10);
  }, [searchTerm, activeCategory, destinationSlug]);

  useEffect(() => {
    setSelectedListing(null);
    setPreviewImage(null);
  }, [destinationSlug]);

  return (
    <PublicDestinationShell active="city" backTo="/destinos" backLabel="Voltar" contextLabel={destination.name || 'Cidade turística'}>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(51,104,134,0.16),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(216,245,231,0.55),transparent_30%),linear-gradient(135deg,#f6f2e9,#eef5f1_56%,#eadfc8)] px-4 pb-3 pt-3 sm:pb-4 sm:pt-5">
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
            <div className="space-y-4 py-2 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">Explore a região</p>
                  <h1 className="mt-2 text-2xl font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-4xl">
                    O que vamos descobrir em {destination.name}?
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                    {destination.heroSubtitle || destination.description || 'Hospedagens, comida, passeios e serviços perto de você, sem complicar.'}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/70 bg-white/62 px-3 text-[11px] font-black text-[#153A4C] shadow-[0_12px_26px_-22px_rgba(15,23,42,0.42)] ring-1 ring-white/45 backdrop-blur-xl">
                    <Bed size={16} weight="duotone" className="shrink-0" />
                    {places.length} hospedagens
                  </span>
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/70 bg-white/62 px-3 text-[11px] font-black text-[#153A4C] shadow-[0_12px_26px_-22px_rgba(15,23,42,0.42)] ring-1 ring-white/45 backdrop-blur-xl">
                    <ForkKnife size={16} weight="duotone" className="shrink-0" />
                    {listings.length} serviços
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 rounded-[1.7rem] border border-white/55 bg-white/40 p-2.5 shadow-[0_22px_62px_-50px_rgba(15,23,42,0.42)] ring-1 ring-white/35 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <label className="group flex min-h-[54px] min-w-0 max-w-full items-center gap-3 rounded-[1.35rem] bg-white/88 px-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.42)] ring-1 ring-white/70 transition focus-within:bg-white focus-within:ring-4 focus-within:ring-[#336886]/12">
                  <MagnifyingGlass size={18} weight="bold" className="text-[#336886]" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar hospedagem, comida, passeio ou serviço"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {searchTerm ? (
                    <button type="button" onClick={() => setSearchTerm('')} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      Limpar
                    </button>
                  ) : null}
                </label>
                <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:max-w-[650px] lg:pb-0">
                  {filterOptions.map((category: any) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category.value);
                        if (category.value === 'TODOS') setSearchTerm('');
                      }}
                      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition ${activeCategory === category.value ? 'bg-[#336886] text-white shadow-[0_16px_30px_-20px_rgba(51,104,134,0.62)]' : 'border border-white/70 bg-white/72 text-slate-600 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.36)] backdrop-blur hover:bg-white hover:text-[#153A4C]'}`}
                    >
                      <span className="max-w-[7.25rem] truncate">{category.label}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeCategory === category.value ? 'bg-white/16 text-white/80' : 'bg-slate-100 text-slate-500'}`}>{category.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid w-full min-w-0 max-w-6xl gap-7 px-4 pb-10 pt-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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
                <Link to="/destinos/cadastrar#dados-parceiro" className="mt-3 inline-flex rounded-full bg-[#153A4C] px-4 py-2 text-xs font-black text-white">
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
                  placeAddress: place.address,
                  placeAddressNumber: place.addressNumber,
                  placeDistrict: place.district,
                  placeCity: place.city || destination.city,
                  placeState: place.state || destination.state,
                  placeZipCode: place.zipCode,
                  placeLat: place.lat,
                  placeLng: place.lng,
                  destinationSlug: destination.slug,
                  placeSlug: place.slug,
                });
                const placeWhatsAppHref = buildWhatsAppUrl(place.whatsapp, whatsappMessage, isNativePlatform);
                const placePhoneHref = placeWhatsAppHref ? '' : buildPhoneCallUrl(place.whatsapp);
                const placeServiceCount = Number(place.storeCount || place.featuredStores?.length || 0);
                const placeServiceLabel = placeServiceCount === 1 ? '1 lugar atende aqui' : `${placeServiceCount} lugares atendem aqui`;
                const placePath = `/destinos/${destination.slug}/chales/${place.slug}`;
                return (
                <article
                  key={place.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(placePath)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    navigate(placePath);
                  }}
                  className="group min-w-0 max-w-full cursor-pointer overflow-hidden rounded-[1.85rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.92)_0%,#ffffff_52%,rgba(237,247,242,0.86)_100%)] shadow-[0_22px_58px_-46px_rgba(21,58,76,0.46)] outline-none ring-1 ring-[#336886]/[0.04] transition duration-200 hover:-translate-y-1 hover:border-[#336886]/18 hover:shadow-[0_28px_68px_-48px_rgba(21,58,76,0.52)] focus-visible:ring-4 focus-visible:ring-[#336886]/14 active:scale-[0.99]"
                >
                  <div className="relative m-2 h-44 overflow-hidden rounded-[1.45rem] bg-slate-100 sm:h-40">
                    {hasConfiguredAsset(place) ? (
                      <div
                        className="relative h-full w-full group/image cursor-zoom-in overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPreviewImage({ src: asset(place, 'banner'), title: place.name });
                        }}
                      >
                        <img src={asset(place)} alt={place.name} className="h-full w-full object-cover transition-all duration-700 group-hover/image:scale-110" />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm shadow-md">
                            <MagnifyingGlass size={12} weight="bold" />
                            Ampliar
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(51,104,134,0.22),transparent_36%),linear-gradient(135deg,#e9f1ef,#d9e7df)]">
                        <Bed size={42} weight="duotone" className="text-[#153A4C]/42" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/42 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/82 px-2.5 py-1 text-[11px] font-black text-[#153A4C] shadow-[0_12px_26px_-20px_rgba(15,23,42,0.42)] ring-1 ring-white/75 backdrop-blur-xl">
                      <Bed size={12} weight="duotone" />
                      {placeTypeLabel(place.type)}
                    </div>
                    {placeServiceCount > 0 ? (
                      <div className="absolute right-3 top-3 rounded-full bg-[#153A4C]/72 px-2.5 py-1 text-[10px] font-black text-white shadow-[0_12px_26px_-20px_rgba(15,23,42,0.52)] ring-1 ring-white/18 backdrop-blur-xl">
                        {placeServiceLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="p-4 pt-2">
                    <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                      <Bed size={12} weight="duotone" />
                      Hospedagem
                    </div>
                    <h3 className="line-clamp-1 text-xl font-semibold tracking-[-0.035em] text-slate-950">
                      {place.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">{place.description || place.address || 'Hospedagem cadastrada.'}</p>
                    {place.address ? (
                      <p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[11px] font-semibold leading-relaxed text-slate-500">
                        <MapPinLine size={12} weight="duotone" className="shrink-0 text-[#336886]" />
                        <span className="truncate">{place.address}</span>
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]">
                        <Sparkle size={13} weight="duotone" />
                        Base da viagem
                      </span>
                      {placeWhatsAppHref ? (
                        <a
                          href={placeWhatsAppHref}
                          onClick={stopCardClick}
                          target={isNativePlatform ? undefined : '_blank'}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_10px_22px_-17px_rgba(5,150,105,0.65)]"
                        >
                          <WhatsappLogo size={12} weight="fill" />
                          Falar
                        </a>
                      ) : null}
                      {placePhoneHref ? (
                        <a href={placePhoneHref} onClick={stopCardClick} className="inline-flex items-center gap-1 rounded-full border border-[#336886]/14 bg-[#336886] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_10px_22px_-17px_rgba(51,104,134,0.58)]">
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
                      <span className="ml-auto inline-flex min-h-8 items-center rounded-full border border-[#336886]/12 bg-[#336886]/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#336886] transition group-hover:bg-[#336886] group-hover:text-white">
                        Ver opções
                      </span>
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
            <div className="min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-white/85 bg-white/94 p-4 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.36)] ring-1 ring-slate-900/[0.025] sm:p-5">
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
                          <div
                            className="relative h-[4.6rem] w-[4.6rem] shrink-0 overflow-hidden rounded-[1.35rem] group/image cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPreviewImage({ src: imageUrl, title: listing.title });
                            }}
                          >
                            <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover transition-all duration-500 group-hover/image:scale-110" />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <MagnifyingGlass size={16} weight="bold" className="text-white drop-shadow-md" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#fff7ed,#f4f1ea)]">
                            <Sparkle size={23} weight="duotone" className="text-amber-700/70" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[9.5px] font-black uppercase tracking-[0.18em] text-[#336886]">{categoryLabel(listing.category)}</span>
                            {hasLinkedStore ? (
                              <span className="rounded-full bg-[#336886]/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#336886] ring-1 ring-[#336886]/10">Loja oficial</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200/80">Contato direto</span>
                            )}
                          </div>
                          <h3 className="mt-1 line-clamp-1 text-lg font-semibold tracking-[-0.025em] text-slate-950">{listing.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">{description}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-[11px] font-semibold text-slate-500">
                          {listing.address || (hasLinkedStore ? 'Pedido online pelo app' : 'Detalhes e contatos no toque')}
                        </span>
                        <span className="shrink-0 rounded-full border border-[#336886]/12 bg-[#336886]/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] transition-all duration-300 group-hover/card:bg-[#336886] group-hover/card:text-white group-hover/card:shadow-[0_4px_12px_rgba(51,104,134,0.2)]">
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
                        className="group/card block min-w-0 max-w-full overflow-hidden rounded-[1.45rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-slate-100/50 transition-all duration-300 ease-out active:scale-[0.985] md:hover:-translate-y-1 md:hover:scale-[1.015] md:hover:border-white md:hover:shadow-[0_18px_36px_-16px_rgba(15,23,42,0.12)]"
                      >
                        {cardBody}
                      </Link>
                    ) : (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => setSelectedListing(listing)}
                        className="group/card block w-full min-w-0 max-w-full overflow-hidden rounded-[1.45rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-slate-100/50 transition-all duration-300 ease-out active:scale-[0.985] md:hover:-translate-y-1 md:hover:scale-[1.015] md:hover:border-white md:hover:shadow-[0_18px_36px_-16px_rgba(15,23,42,0.12)]"
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

            <Link to="/destinos/cadastrar#dados-parceiro" className="group relative block overflow-hidden rounded-[2rem] border border-[#153A4C]/10 bg-[radial-gradient(circle_at_18%_12%,rgba(132,204,22,0.2),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(145deg,#153A4C_0%,#214f5f_54%,#0f2f3f_100%)] p-5 text-white shadow-[0_22px_58px_-36px_rgba(21,58,76,0.82)] transition hover:-translate-y-0.5">
              <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/20 blur-3xl" />
              <div className="relative max-w-[16rem]">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">
                  <Sparkle size={14} weight="duotone" />
                  Guia local
                </p>
                <h3 className="mt-4 text-xl font-black leading-tight tracking-[-0.03em]">Tem chalé, pousada ou serviço local?</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/76">Apareça no guia da cidade e seja encontrado por hóspedes e turistas.</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {['Hospedagem', 'Passeios', 'Serviços'].map((label) => (
                    <span key={label} className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-black text-white/86 ring-1 ring-white/10">
                      {label}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-[#153A4C] shadow-[0_14px_28px_-20px_rgba(255,255,255,0.55)] transition group-hover:translate-x-0.5">
                  Quero participar
                  <ArrowRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          </aside>
          ) : null}

          {!showListingsSection ? (
            <aside className="space-y-4">
              <Link to="/destinos/cadastrar#dados-parceiro" className="group relative block overflow-hidden rounded-[2rem] border border-[#153A4C]/10 bg-[radial-gradient(circle_at_18%_12%,rgba(132,204,22,0.2),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(145deg,#153A4C_0%,#214f5f_54%,#0f2f3f_100%)] p-5 text-white shadow-[0_22px_58px_-36px_rgba(21,58,76,0.82)] transition hover:-translate-y-0.5">
                <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/20 blur-3xl" />
                <div className="relative max-w-[16rem]">
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">
                    <Sparkle size={14} weight="duotone" />
                    Guia local
                  </p>
                  <h3 className="mt-4 text-xl font-black leading-tight tracking-[-0.03em]">Tem chalé, pousada ou serviço local?</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/76">Apareça no guia da cidade e seja encontrado por hóspedes e turistas.</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {['Hospedagem', 'Passeios', 'Serviços'].map((label) => (
                      <span key={label} className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-black text-white/86 ring-1 ring-white/10">
                        {label}
                      </span>
                    ))}
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-[#153A4C] shadow-[0_14px_28px_-20px_rgba(255,255,255,0.55)] transition group-hover:translate-x-0.5">
                    Quero participar
                    <ArrowRight size={12} weight="bold" />
                  </span>
                </div>
              </Link>
            </aside>
          ) : null}
        </section>
      ) : null}

      {!loading && !error && showcaseSlides.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-4 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.35)] sm:p-5">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Conheça a cidade</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Fotos e destaques de {destination.name}</h2>
              </div>
              <Mountains size={26} weight="duotone" className="shrink-0 text-[#336886]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {showcaseSlides.map((slide: any, index: number) => {
                const target = externalUrl(slide.actionTarget);
                const title = slide.title || destination.name;
                const cardClass = 'group relative overflow-hidden rounded-[1.35rem] bg-slate-100 text-left shadow-[0_12px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50 transition-all duration-300 active:scale-[0.985] md:hover:-translate-y-1 md:hover:scale-[1.02] md:hover:shadow-[0_20px_40px_-18px_rgba(15,23,42,0.15)]';
                const content = (
                  <>
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      {hasConfiguredAsset(slide.item) ? (
                        <img src={asset(slide.item)} alt={title} className="h-full w-full object-cover transition-all duration-700 group-hover:scale-108" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#e9f1ef,#d9e7df)]">
                          <Mountains size={32} weight="duotone" className="text-[#153A4C]/42" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-slate-950/10 group-hover:bg-slate-950/20 transition-colors duration-300" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-3">
                      <p className="line-clamp-1 text-xs font-black text-white">{title}</p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/76 flex items-center gap-1">
                        {target ? (
                          <>
                            Abrir destaque
                            <ArrowRight size={10} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                          </>
                        ) : (
                          <>
                            Visualizar foto
                            <MagnifyingGlass size={10} weight="bold" />
                          </>
                        )}
                      </p>
                    </div>
                  </>
                );

                return target ? (
                  <button
                    key={slide.key || index}
                    type="button"
                    onClick={() => void openActionTarget({ href: target, external: true })}
                    className={cardClass}
                    aria-label={`Abrir ${title}`}
                  >
                    {content}
                  </button>
                ) : (
                  <button
                    key={slide.key || index}
                    type="button"
                    onClick={() => setPreviewImage({ src: asset(slide.item, 'banner'), title })}
                    className={cardClass}
                    aria-label={`Visualizar ${title}`}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition active:scale-90"
            onClick={() => setPreviewImage(null)}
          >
            <X size={20} weight="bold" />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.src}
              alt={previewImage.title}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />
            <div className="bg-slate-900/90 px-4 py-3 text-center text-white">
              <p className="text-sm font-bold">{previewImage.title}</p>
            </div>
          </div>
        </div>
      )}

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
