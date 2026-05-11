// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, Buildings, ForkKnife, MagnifyingGlass, MapPinLine, Mountains, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildWhatsAppUrl } from '../utils/destinationWhatsApp';

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
      kind: String(place.type || 'Hospedagem').replace('_', ' '),
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
  const destinationHeroImage = hasConfiguredAsset(destination) ? asset(destination) : '';
  const configuredShowcaseCount =
    (hasConfiguredAsset(destination) ? 1 : 0) +
    banners.filter((banner: any) => hasConfiguredAsset(banner)).length +
    places.filter((place: any) => hasConfiguredAsset(place)).length +
    listings.filter((listing: any) => hasConfiguredAsset(listing, 'image')).length;
  const heroStats = [
    { label: 'Chalés', value: places.length },
    { label: 'Serviços', value: listings.length },
    { label: 'Fotos', value: configuredShowcaseCount },
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
      <section className="relative overflow-hidden px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="absolute inset-0 bg-[#153A4C]" />
        {destinationHeroImage ? (
          <img src={destinationHeroImage} alt={destination.name || destination.city || 'Destino'} className="absolute inset-0 h-full w-full object-cover opacity-35" />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(216,245,231,0.22),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(250,204,21,0.14),transparent_26%),linear-gradient(135deg,rgba(21,58,76,0.93),rgba(51,104,134,0.82)_56%,rgba(72,52,30,0.78))]" />
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
                <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100 ring-1 ring-white/10">
                  <Mountains size={15} weight="duotone" />
                  <span>Destino</span>
                </p>
                <h1 className="mt-5 max-w-3xl text-[2.65rem] font-black leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl">
                  {destination.heroTitle || destination.name}
                </h1>
                <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/82 ring-1 ring-white/10">
                  <MapPinLine size={15} weight="duotone" className="shrink-0 text-emerald-100" />
                  <span className="truncate">{destinationLocationLabel}</span>
                </p>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-white/72">
                  {destination.heroSubtitle || destination.description || 'Hospedagens, lojas e experiências cadastradas neste destino.'}
                </p>
                <div className="mt-5 grid max-w-[25rem] grid-cols-3 gap-2 text-white">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="rounded-[1.15rem] border border-white/12 bg-white/10 px-3 py-3 text-center shadow-[0_18px_42px_-32px_rgba(0,0,0,0.65)] backdrop-blur">
                      <p className="text-xl font-black leading-none tracking-[-0.04em]">{stat.value}</p>
                      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/68">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/16 bg-white/14 p-3 shadow-[0_28px_80px_-38px_rgba(0,0,0,0.65)] backdrop-blur">
                <div className="relative h-64 overflow-hidden rounded-[1.45rem] bg-slate-900">
                  {hasConfiguredAsset(currentSlide?.item || heroBanner || destination) ? (
                    <img src={asset(currentSlide?.item || heroBanner || destination)} alt={currentSlide?.title || destination.name} className="h-full w-full object-cover transition duration-700" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_15%,rgba(16,185,129,0.35),transparent_34%),linear-gradient(135deg,#18384a,#0f172a_62%,#3b2f1c)]">
                      <Mountains size={72} weight="duotone" className="text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.16),rgba(15,23,42,0.10)_34%,rgba(10,20,25,0.86))]" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-800">
                    {hasConfiguredAsset(currentSlide?.item) ? currentSlide?.kind || 'Destaque' : 'Destaque editorial'}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 rounded-[1.35rem] border border-white/16 bg-slate-950/64 p-3 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md">
                    <p className="text-lg font-black text-white">{currentSlide?.title || heroBanner?.title || destination.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/78">{currentSlide?.subtitle || heroBanner?.subtitle || destination.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex gap-1.5">
                        {showcaseSlides.slice(0, 6).map((slide: any, index: number) => (
                          <button
                            key={slide.key}
                            type="button"
                            aria-label={`Abrir destaque ${index + 1}`}
                            onClick={() => setCarouselIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${index === carouselIndex % showcaseSlides.length ? 'w-7 bg-white' : 'w-2 bg-white/45'}`}
                          />
                        ))}
                      </div>
                      <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-black text-white/78">
                        {(carouselIndex % showcaseSlides.length) + 1}/{showcaseSlides.length}
                      </span>
                      {currentSlide?.placeSlug ? (
                        <Link to={`/destinos/${destination.slug}/chales/${currentSlide.placeSlug}`} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-900">
                          Ver hospedagem
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="lg:col-span-2 rounded-[2rem] border border-white/80 bg-white/82 p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.36)] backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Encontrar rápido</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Busque hospedagem, restaurante, passeio ou serviço</h2>
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
                  className="group overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white shadow-[0_16px_38px_-32px_rgba(15,23,42,0.5)] transition hover:-translate-y-1"
                >
                  <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="relative block h-32 overflow-hidden bg-slate-100">
                    {hasConfiguredAsset(place) ? (
                      <img src={asset(place)} alt={place.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(51,104,134,0.22),transparent_36%),linear-gradient(135deg,#e9f1ef,#d9e7df)]">
                        <Bed size={42} weight="duotone" className="text-[#153A4C]/42" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-700">
                      {String(place.type || 'CHALE').replace('_', ' ')}
                    </div>
                  </Link>
                  <div className="p-3.5">
                    <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="line-clamp-1 text-base font-black text-slate-950">
                      {place.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{place.description || place.address || 'Hospedagem cadastrada.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        <Buildings size={13} weight="duotone" />
                        {place.storeCount || 0} lojas
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
                      <Link to={`/destinos/${destination.slug}/chales/${place.slug}`} className="ml-auto inline-flex items-center gap-1 text-xs font-black text-[#153A4C]">
                        Abrir
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
                  <h2 className="mt-1 text-xl font-black">Serviços e lugares</h2>
                </div>
                <Sparkle size={25} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-4 space-y-3">
                {visibleListings.map((listing: any) => {
                  const contactTarget = listing.whatsapp || listing.ctaUrl || '';
                  const isExternalUrl = String(contactTarget || '').startsWith('http');
                  const whatsappMessage = buildDestinationInquiryMessage({
                    destinationName: destination.name,
                    city: destination.city,
                    state: destination.state,
                    itemName: listing.title,
                    itemType: categoryLabel(listing.category),
                  });
                  const contactHref = isExternalUrl ? contactTarget : buildWhatsAppUrl(contactTarget, whatsappMessage, isNativePlatform);
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
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#336886]">{categoryLabel(listing.category)}</p>
                        <h3 className="mt-0.5 line-clamp-1 text-sm font-black text-slate-950">{listing.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{listing.description || listing.address || 'Parceiro cadastrado.'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contactHref ? (
                        <a
                          href={contactHref}
                          target={isNativePlatform && !isExternalUrl ? undefined : '_blank'}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
                        >
                          <WhatsappLogo size={13} weight="fill" />
                          Pedir informações
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
              <p className="mt-2 text-sm font-semibold text-white/72">Cadastre sua responsabilidade e aguarde aprovação da plataforma.</p>
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
                <p className="mt-2 text-sm font-semibold text-white/72">Cadastre sua responsabilidade e aguarde aprovação da plataforma.</p>
              </Link>
            </aside>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
