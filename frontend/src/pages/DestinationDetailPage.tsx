// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, ForkKnife, GlobeHemisphereWest, MagnifyingGlass, MapPinLine, Mountains, Sparkle, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildWhatsAppUrl } from '../utils/destinationWhatsApp';
import { openActionTarget } from '../utils/actionLink';

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

const categoryToStoreSegment = (category?: string) => {
  const key = String(category || '').toUpperCase();
  if (key.includes('RESTAURANTE') || key === 'NOITE') return 'restaurante';
  if (key === 'LOJA') return 'outros';
  return 'outros';
};

const buildListingClaimUrl = (destination: any, listing: any) => {
  const params = new URLSearchParams();
  params.set('source', 'destination_listing_claim');
  params.set('destinationListingId', String(listing?.id || ''));
  if (destination?.id) params.set('destinationId', String(destination.id));
  if (destination?.slug) params.set('destinationSlug', String(destination.slug));
  if (destination?.name) params.set('destinationName', String(destination.name));
  if (destination?.city) params.set('city', String(destination.city));
  if (destination?.state) params.set('state', String(destination.state));
  if (listing?.title) {
    params.set('storeName', String(listing.title));
    params.set('listingTitle', String(listing.title));
  }
  if (listing?.description) params.set('description', String(listing.description));
  if (listing?.address) params.set('address', String(listing.address));
  if (listing?.whatsapp || listing?.phone) params.set('phone', String(listing.whatsapp || listing.phone));
  params.set('segment', categoryToStoreSegment(listing?.category));
  return `/create?${params.toString()}`;
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
  const heroBanner = useMemo(() => banners.find((banner: any) => banner.imageUrl) || null, [banners]);
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
    () => listings.filter((listing: any) => {
      if (activeCategory === 'HOSPEDAGENS') return false;
      const categoryMatches = activeCategory === 'TODOS' || String(listing.category || 'SERVICO') === activeCategory;
      return categoryMatches && itemMatchesSearch(listing, searchTerm, [destination.name, destination.city]);
    }),
    [listings, activeCategory, searchTerm, destination.name, destination.city]
  );
  const visiblePlaces = filteredPlaces.slice(0, placeLimit);
  const visibleListings = filteredListings.slice(0, listingLimit);
  const activeFilterLabel = filterOptions.find((option: any) => option.value === activeCategory)?.label || 'Todos';
  const showPlacesSection = activeCategory === 'TODOS' || activeCategory === 'HOSPEDAGENS';
  const showListingsSection = activeCategory !== 'HOSPEDAGENS';
  const showcaseSlides = useMemo(() => {
    const destinationSlides = hasConfiguredAsset(destination) ? [{
      key: `destination-${destination.id || destination.slug}`,
      title: destination.heroTitle || destination.name,
      subtitle: destination.heroSubtitle || destination.description,
      item: destination,
      kind: 'Cidade',
    }] : [];
    const bannerSlides = banners.filter((banner: any) => hasConfiguredAsset(banner)).map((banner: any) => ({
      key: `banner-${banner.id}`,
      title: banner.title || destination.name,
      subtitle: banner.subtitle || destination.description,
      item: banner,
      kind: 'Cidade',
    }));
    const placeSlides = places.filter((place: any) => hasConfiguredAsset(place)).map((place: any) => ({
      key: `place-${place.id}`,
      title: place.name,
      subtitle: place.address || place.description || 'Hospedagem em destaque para completar a viagem.',
      item: place,
      placeSlug: place.slug,
      kind: placeTypeLabel(place.type),
    }));
    const listingSlides = listings.filter((listing: any) => hasConfiguredAsset(listing, 'image')).map((listing: any) => ({
      key: `listing-${listing.id}`,
      title: listing.title,
      subtitle: listing.address || listing.description || 'Experiência local cadastrada neste destino.',
      item: listing,
      kind: categoryLabel(listing.category),
    }));
    return [...destinationSlides, ...bannerSlides, ...placeSlides, ...listingSlides].length
      ? [...destinationSlides, ...bannerSlides, ...placeSlides, ...listingSlides]
      : [{
          key: 'destination',
          title: destination.name,
          subtitle: destination.description,
          item: destination,
          kind: 'Destino',
        }];
  }, [banners, places, listings, destination]);
  const currentSlide = showcaseSlides[carouselIndex % Math.max(showcaseSlides.length, 1)];
  const destinationLocationLabel = [destination.city, destination.state].filter(Boolean).join(', ') || destination.name || 'Destino';
  const heroHighlights = [
    'Hospedagens selecionadas',
    'Comida e serviços locais',
    'Passeios e dicas da cidade',
  ];

  useEffect(() => {
    setPlaceLimit(6);
    setListingLimit(10);
  }, [searchTerm, activeCategory, destinationSlug]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [destinationSlug, showcaseSlides.length]);

  useEffect(() => {
    if (showcaseSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % showcaseSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [showcaseSlides.length]);

  return (
    <main className="min-h-screen bg-[#f6f2e9] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(51,104,134,0.18),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(216,245,231,0.65),transparent_30%),linear-gradient(135deg,#f6f2e9,#eef5f1_56%,#eadfc8)] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-[#336886]/16 blur-3xl" />
        <div className="absolute -left-16 bottom-4 h-56 w-56 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <Link to="/destinos" className="inline-flex items-center gap-2 rounded-full border border-[#153A4C]/10 bg-white/78 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#153A4C] shadow-sm backdrop-blur">
              <ArrowRight size={14} className="rotate-180" weight="bold" />
              Destinos
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/82 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-sm">
              <img src="/janocaminho-logov1.svg" alt="Já no Caminho" className="h-6 w-6 rounded-full bg-white object-cover" />
              Já no Caminho
            </div>
          </div>

          {loading ? <p className="mt-8 text-sm font-bold text-slate-500">Carregando destino...</p> : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

          {!loading && !error ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#153A4C]/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#153A4C] ring-1 ring-[#153A4C]/10">
                  <Mountains size={15} weight="duotone" />
                  <span>Guia da cidade</span>
                </p>
                <h1 className="mt-4 max-w-3xl text-[2.35rem] font-black leading-[0.94] tracking-[-0.055em] text-slate-950 sm:text-6xl">
                  {destination.heroTitle || destination.name}
                </h1>
                <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
                  <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{destinationLocationLabel}</span>
                </p>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
                  {destination.heroSubtitle || destination.description || 'Hospedagens, lojas e experiências cadastradas neste destino.'}
                </p>
                <div className="mt-5 flex max-w-2xl flex-wrap gap-2">
                  {heroHighlights.map((label) => (
                    <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-2 text-[11px] font-black text-[#153A4C] shadow-sm backdrop-blur">
                      <Sparkle size={13} weight="duotone" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/85 bg-white/86 p-3 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.48)] backdrop-blur">
                <div className="relative h-52 overflow-hidden rounded-[1.45rem] bg-slate-900 sm:h-64">
                  {hasConfiguredAsset(currentSlide?.item || heroBanner || destination) ? (
                    <img src={asset(currentSlide?.item || heroBanner || destination)} alt={currentSlide?.title || destination.name} className="h-full w-full object-cover transition duration-700" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_15%,rgba(16,185,129,0.35),transparent_34%),linear-gradient(135deg,#18384a,#0f172a_62%,#3b2f1c)]">
                      <Mountains size={72} weight="duotone" className="text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(21,58,76,0.02),rgba(21,58,76,0.08))]" />
                  <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-slate-700 shadow-sm">
                    {(carouselIndex % showcaseSlides.length) + 1}/{showcaseSlides.length}
                  </div>
                </div>
                <div className="px-1 pb-1 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">
                    {hasConfiguredAsset(currentSlide?.item) ? currentSlide?.kind || 'Destaque' : 'Destaque da cidade'}
                  </p>
                  <p className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">{currentSlide?.title || heroBanner?.title || destination.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">{currentSlide?.subtitle || heroBanner?.subtitle || destination.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      {showcaseSlides.slice(0, 6).map((slide: any, index: number) => (
                        <button
                          key={slide.key}
                          type="button"
                          aria-label={`Abrir destaque ${index + 1}`}
                          onClick={() => setCarouselIndex(index)}
                          className={`h-1.5 rounded-full transition-all ${index === carouselIndex % showcaseSlides.length ? 'w-7 bg-[#153A4C]' : 'w-2 bg-[#153A4C]/22'}`}
                        />
                      ))}
                    </div>
                    {currentSlide?.placeSlug ? (
                      <Link to={`/destinos/${destination.slug}/chales/${currentSlide.placeSlug}`} className="rounded-full bg-[#153A4C] px-3 py-1.5 text-[11px] font-black text-white">
                        Ver hospedagem
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="lg:col-span-2 rounded-[2rem] border border-white/80 bg-white/82 p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.36)] backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Encontre no destino</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Busque chalés, sabores, passeios e serviços locais</h2>
              </div>
              <p className="text-xs font-bold text-slate-500">
                {activeFilterLabel}: {filteredPlaces.length + filteredListings.length} resultado(s)
              </p>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <label className="group flex min-h-[52px] items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.4)] focus-within:border-[#336886]/40 focus-within:ring-4 focus-within:ring-[#336886]/10">
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
              <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[620px]">
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

            {places.length > 0 && filteredPlaces.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Nenhuma hospedagem bateu com a busca atual.</p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
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
                return (
                <article
                  key={place.id}
                  className="group overflow-hidden rounded-[1.6rem] border border-[#336886]/15 bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_52%,#edf7f2_100%)] shadow-[0_18px_46px_-34px_rgba(21,58,76,0.48)] transition hover:-translate-y-1"
                >
                  <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="relative block h-36 overflow-hidden bg-slate-100">
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
                      {place.whatsapp ? (
                        <a
                          href={buildWhatsAppUrl(place.whatsapp, whatsappMessage, isNativePlatform)}
                          target={isNativePlatform ? undefined : '_blank'}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white"
                        >
                          <WhatsappLogo size={12} weight="fill" />
                          Falar
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
          <aside className={showPlacesSection ? 'space-y-4' : 'space-y-4 lg:col-span-2'}>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Experiências</p>
                  <h2 className="mt-1 text-xl font-black">Experiências locais</h2>
                </div>
                <Sparkle size={25} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-4 space-y-3">
                {visibleListings.map((listing: any) => {
                  const linkedStoreSlug = resolveLinkedStoreSlug(listing);
                  const linkedStore = listing.store || null;
                  const hasLinkedStore = Boolean(linkedStoreSlug);
                  const contactTarget = hasLinkedStore ? listing.whatsapp || listing.phone || '' : listing.whatsapp || listing.ctaUrl || '';
                  const isExternalUrl = String(contactTarget || '').startsWith('http');
                  const whatsappMessage = buildDestinationInquiryMessage({
                    destinationName: destination.name,
                    city: destination.city,
                    state: destination.state,
                    itemName: listing.title,
                    itemType: categoryLabel(listing.category),
                  });
                  const contactHref = isExternalUrl ? contactTarget : buildWhatsAppUrl(contactTarget, whatsappMessage, isNativePlatform);
                  const claimHref = buildListingClaimUrl(destination, listing);
                  const listingWebsiteUrl = externalUrl(listing.websiteUrl);
                  const listingInstagramUrl = instagramUrl(listing.instagramUrl);
                  return (
                  <article key={listing.id} className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                    <div className="flex gap-3">
                      {hasConfiguredAsset(listing, 'image') ? (
                        <img src={asset(listing, 'image')} alt={listing.title} className="h-14 w-14 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                          <Sparkle size={23} weight="duotone" className="text-amber-700/70" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#336886]">{categoryLabel(listing.category)}</p>
                          {hasLinkedStore ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">Pedidos no app</span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700">Contato direto</span>
                          )}
                        </div>
                        <h3 className="mt-0.5 line-clamp-1 text-sm font-black text-slate-950">{listing.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                          {hasLinkedStore
                            ? linkedStore?.settings?.description || listing.description || listing.address || 'Loja ativa no Já no Caminho.'
                            : listing.description || listing.address || 'Serviço local com atendimento direto.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hasLinkedStore ? (
                        <Link
                          to={`/store/${linkedStoreSlug}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#153A4C] px-3 py-1.5 text-[11px] font-black text-white"
                        >
                          <Storefront size={13} weight="duotone" />
                          Pedir pelo app
                        </Link>
                      ) : null}
                      {contactHref ? (
                        <a
                          href={contactHref}
                          target={isNativePlatform && !isExternalUrl ? undefined : '_blank'}
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black ${hasLinkedStore ? 'border border-emerald-100 bg-white text-emerald-700' : 'bg-emerald-600 text-white'}`}
                        >
                          <WhatsappLogo size={13} weight="fill" />
                          {hasLinkedStore ? 'WhatsApp' : 'Chamar no WhatsApp'}
                        </a>
                      ) : null}
                      {listingInstagramUrl ? (
                        <a href={listingInstagramUrl} onClick={openExternal(listingInstagramUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700">
                          <InstagramIcon className="h-3.5 w-3.5" />
                          Instagram
                        </a>
                      ) : null}
                      {listingWebsiteUrl ? (
                        <a href={listingWebsiteUrl} onClick={openExternal(listingWebsiteUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700">
                          <GlobeHemisphereWest size={13} weight="duotone" />
                          {siteLabel(listing.websiteUrl)}
                        </a>
                      ) : null}
                      {!hasLinkedStore ? (
                        <Link
                          to={claimHref}
                          className="inline-flex items-center gap-1 rounded-full border border-[#153A4C]/15 bg-white px-3 py-1.5 text-[11px] font-black text-[#153A4C]"
                        >
                          <Storefront size={13} weight="duotone" />
                          Receber pedidos pelo app
                        </Link>
                      ) : null}
                      {listing.address ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">
                          <MapPinLine size={13} weight="duotone" />
                          Local
                        </span>
                      ) : null}
                    </div>
                  </article>
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
              <p className="mt-2 text-sm font-semibold text-white/72">Cadastre seu espaço ou serviço e aguarde a aprovação da plataforma.</p>
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
                <p className="mt-2 text-sm font-semibold text-white/72">Cadastre seu espaço ou serviço e aguarde a aprovação da plataforma.</p>
              </Link>
            </aside>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
