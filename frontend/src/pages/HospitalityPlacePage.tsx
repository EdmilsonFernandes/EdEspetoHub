// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, Clock, ForkKnife, GlobeHemisphereWest, HouseLine, MagnifyingGlass, MapPinLine, PhoneCall, ShoppingBagOpen, Sparkle, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { PreStoreCardSkeleton, PreStoreDetailSheet } from '../components/Destinations/PreStoreDetailSheet';
import { AppImagePreviewDialog } from '../components/common/AppImagePreviewDialog';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatCurrency } from '../utils/format';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildHospitalityServiceRouteUrl, buildPhoneCallUrl, buildWhatsAppUrl } from '../utils/destinationWhatsApp';
import { openActionTarget } from '../utils/actionLink';
import { buildListingClaimUrl } from '../utils/destinationListingClaim';

const fallbackAvatarFor = (item: any) =>
  getStoreAvatarUrl(item?.slug || item?.store?.slug || item?.id, item?.name || item?.title || item?.store?.name);

const domTokenFor = (...values: any[]) =>
  String(values.find((value) => value !== undefined && value !== null && String(value).trim()) || 'item')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'item';

const providerStoreTargetId = (entry: any, store: any, index: number) =>
  `hospitality-provider-store-${domTokenFor(entry?.id, store?.id, store?.slug, index)}`;

const providerListingTargetId = (listing: any, index: number) =>
  `hospitality-provider-listing-${domTokenFor(listing?.id, listing?.slug, listing?.title, index)}`;

const logoFor = (item: any) =>
  resolveAssetUrl(item?.logoUrl || item?.settings?.logoUrl || item?.store?.settings?.logoUrl || '');

const hasCoverImage = (item: any) =>
  Boolean(resolveAssetUrl(item?.bannerUrl || item?.imageUrl || item?.settings?.bannerUrl || item?.store?.settings?.bannerUrl || ''));

const imageFor = (item: any) =>
  resolveAssetUrl(
    item?.bannerUrl ||
      item?.bannerUrls?.[0] ||
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
  resolveAssetUrl(item?.bannerUrl || item?.imageUrl || item?.settings?.bannerUrl || item?.store?.settings?.bannerUrl || '');

const cardMediaFor = (item: any) => coverImageFor(item) || logoFor(item);

const galleryImagesFor = (item: any) => {
  const urls = [
    ...(Array.isArray(item?.bannerUrls) ? item.bannerUrls : []),
    item?.bannerUrl,
    item?.imageUrl,
    item?.logoUrl,
  ]
    .map((value) => resolveAssetUrl(value || ''))
    .filter(Boolean);
  const uniqueUrls = Array.from(new Set(urls));
  return uniqueUrls.length ? uniqueUrls : [imageFor(item)];
};

const listingHospitalityPlaceIds = (listing: any) =>
  Array.from(
    new Set(
      [
        ...(Array.isArray(listing?.hospitalityPlaceIds) ? listing.hospitalityPlaceIds : []),
        listing?.hospitalityPlaceId,
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );

const listingBelongsToPlace = (listing: any, placeId: any) => {
  const normalizedPlaceId = String(placeId || '').trim();
  return Boolean(normalizedPlaceId) && listingHospitalityPlaceIds(listing).includes(normalizedPlaceId);
};

const listingIsDestinationWide = (listing: any) => listingHospitalityPlaceIds(listing).length === 0;

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
    itemId: listing.id,
    itemType: String(listing.category || 'serviço').replace('_', ' '),
    placeName: place.name,
    placeAddress: place.address,
    placeAddressNumber: place.addressNumber,
    placeDistrict: place.district,
    placeCity: place.city || destination.city,
    placeState: place.state || destination.state,
    placeZipCode: place.zipCode,
    placeLat: place.lat,
    placeLng: place.lng,
    itemAddress: listing.address,
    itemAddressNumber: listing.addressNumber,
    itemDistrict: listing.district,
    itemCity: listing.city || destination.city,
    itemState: listing.state || destination.state,
    itemZipCode: listing.zipCode,
    itemLat: listing.lat,
    itemLng: listing.lng,
    destinationSlug: destination.slug,
    placeSlug: place.slug,
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

const handleListingCardKeyDown = (listing: any, setSelectedListing: any) => (event: any) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  setSelectedListing(listing);
};

export function HospitalityPlacePage() {
  const { destinationSlug = '', placeSlug = '' } = useParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'app' | 'direct'>('all');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [highlightedProviderTarget, setHighlightedProviderTarget] = useState('');
  const [providerJumpLabel, setProviderJumpLabel] = useState('');

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
  const placeListings = listings.filter((listing: any) => listingBelongsToPlace(listing, place.id));
  const destinationListings = listings.filter((listing: any) => listingIsDestinationWide(listing));
  const nearbyCityListings = destinationListings.slice(0, 4);
  const destinationDisplayName = destination.name || destination.city || destinationSlug || 'a região';
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
    placeName: place.name,
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
  const placeWhatsAppUrl = buildWhatsAppUrl(place.whatsapp, placeContactMessage, isNativePlatform);
  const placePhoneUrl = placeWhatsAppUrl ? '' : buildPhoneCallUrl(place.whatsapp);
  const placeBannerImages = galleryImagesFor(place);
  const selectedPlaceBanner = placeBannerImages[bannerIndex % placeBannerImages.length] || imageFor(place);
  const placeGalleryPreviewImages = placeBannerImages.map((src, index) => ({
    src,
    title: `${place.name || 'Hospedagem'} - Foto ${index + 1}`,
  }));
  const openPlaceGallery = (index = bannerIndex % Math.max(placeBannerImages.length, 1)) => {
    const safeIndex = Math.max(0, Math.min(placeGalleryPreviewImages.length - 1, index));
    const selected = placeGalleryPreviewImages[safeIndex] || { src: selectedPlaceBanner, title: place.name || 'Hospedagem' };
    setPreviewImage({
      src: selected.src,
      title: place.name || selected.title || 'Hospedagem',
      images: placeGalleryPreviewImages.length ? placeGalleryPreviewImages : [selected],
      initialIndex: safeIndex,
    });
  };
  const selectedListingAction = selectedListing ? buildListingAction({ listing: selectedListing, destination, place, isNativePlatform }) : null;
  const selectedListingRouteUrl = selectedListing ? buildHospitalityServiceRouteUrl({
    destinationSlug: destination.slug || destinationSlug,
    placeSlug: place.slug || placeSlug,
    serviceId: selectedListing.id,
    serviceName: selectedListing.title,
    serviceAddress: selectedListing.address,
    serviceAddressNumber: selectedListing.addressNumber,
    serviceDistrict: selectedListing.district,
    serviceCity: selectedListing.city || destination.city,
    serviceState: selectedListing.state || destination.state,
    serviceZipCode: selectedListing.zipCode,
    serviceLat: selectedListing.lat,
    serviceLng: selectedListing.lng,
    placeName: place.name,
    placeAddress: place.address,
    placeAddressNumber: place.addressNumber,
    placeDistrict: place.district,
    placeCity: place.city || destination.city,
    placeState: place.state || destination.state,
    placeZipCode: place.zipCode,
    placeLat: place.lat,
    placeLng: place.lng,
  }) : '';
  const selectedListingRouteHref = selectedListingRouteUrl ? selectedListingRouteUrl.replace(/^https?:\/\/[^/]+/i, '') : '';
  const selectedListingInstagramUrl = instagramUrl(selectedListing?.instagramUrl);
  const selectedListingWebsiteUrl = externalUrl(selectedListing?.websiteUrl);
  const selectedListingMediaUrl = selectedListing ? cardMediaFor(selectedListing) : '';
  const selectedListingHasImage = Boolean(selectedListingMediaUrl);
  const allSpotlightProviders = [
    ...stores.map((entry: any, index: number) => {
      const store = entry.store || {};
      return {
        id: `store-${entry.id || store.id || store.slug || index}`,
        targetId: providerStoreTargetId(entry, store, index),
        name: store.name || 'Loja',
        label: 'Pedido no app',
        imageUrl: logoFor(store) || imageFor(store),
        accentClass: 'from-[#336886] via-[#5FD35A] to-emerald-300',
        ringClass: 'ring-[#5FD35A]/35',
        badgeLabel: 'App',
        BadgeIcon: Storefront,
      };
    }),
    ...placeListings.map((listing: any, index: number) => ({
      id: `listing-${listing.id || listing.slug || listing.title || index}`,
      targetId: providerListingTargetId(listing, index),
      name: listing.title || 'Serviço',
      label: categoryLabel(listing.category),
      imageUrl: logoFor(listing) || imageFor(listing),
      accentClass: 'from-amber-300 via-orange-400 to-[#336886]',
      ringClass: 'ring-amber-300/40',
      badgeLabel: 'Direto',
      BadgeIcon: PhoneCall,
    })),
  ];
  const spotlightProviders = allSpotlightProviders.slice(0, 10);
  const hiddenSpotlightCount = Math.max(0, allSpotlightProviders.length - spotlightProviders.length);
  const highlightedProviderCardClass =
    'border-[#5FD35A]/70 bg-[linear-gradient(135deg,rgba(95,211,90,0.13),#ffffff_46%,rgba(51,104,134,0.10))] outline outline-2 outline-[#5FD35A]/65 ring-[#5FD35A]/45 shadow-[0_30px_70px_-32px_rgba(51,104,134,0.60)]';
  const scrollToProviderTarget = (targetId: string, providerName = '') => {
    if (!targetId || typeof window === 'undefined' || typeof document === 'undefined') return;
    setServiceFilter('all');
    setHighlightedProviderTarget(targetId);
    setProviderJumpLabel(providerName ? `${providerName} localizado na lista.` : 'Serviço localizado na lista.');
    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    window.setTimeout(() => {
      setHighlightedProviderTarget((current) => (current === targetId ? '' : current));
      setProviderJumpLabel('');
    }, 1800);
  };

  useEffect(() => {
    setBannerIndex(0);
    setSelectedListing(null);
    setPreviewImage(null);
    setHighlightedProviderTarget('');
    setProviderJumpLabel('');
  }, [destinationSlug, placeSlug]);

  useEffect(() => {
    if (placeBannerImages.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % placeBannerImages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [place.id, placeBannerImages.length]);

  return (
    <PublicDestinationShell active="place" backTo={`/destinos/${destinationSlug}`} backLabel="Voltar" contextLabel={place.name || 'Hospedagem'}>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(51,104,134,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(240,180,72,0.18),transparent_30%),linear-gradient(135deg,#f7f1e4,#eef6f1_58%,#eadfc8)] px-4 pb-5 pt-5">
        <div className="absolute -right-20 top-12 h-64 w-64 rounded-full bg-[#336886]/14 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          {loading ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <PreStoreCardSkeleton />
              <PreStoreCardSkeleton />
            </div>
          ) : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {!loading && !error ? (
            <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-white/85 bg-white/90 p-2 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.44)] backdrop-blur">
              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
                <div className="relative h-44 overflow-hidden rounded-[1.25rem] bg-slate-100 sm:h-64 lg:h-full">
                  <div
                    className="relative h-full w-full group/banner cursor-zoom-in overflow-hidden"
                    onClick={() => openPlaceGallery(bannerIndex % Math.max(placeBannerImages.length, 1))}
                  >
                    {placeBannerImages.map((url, index) => {
                      const active = index === bannerIndex % placeBannerImages.length;
                      return (
                        <img
                          key={url}
                          src={url}
                          alt={`${place.name || 'Hospedagem'} - Foto ${index + 1}`}
                          className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out group-hover/banner:scale-105 ${
                            active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95'
                          }`}
                        />
                      );
                    })}
                    <div className="absolute inset-0 bg-black/10 group-hover/banner:bg-black/20 transition-colors duration-300 z-10" />
                    <div className="absolute inset-0 opacity-0 group-hover/banner:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm shadow-md">
                        <MagnifyingGlass size={14} weight="bold" />
                        Ver fotos
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/42 via-slate-950/8 to-transparent z-10 pointer-events-none" />
                  {placeBannerImages.length > 1 ? (
                    <>
                      <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm ring-1 ring-white/80 backdrop-blur z-20">
                        {bannerIndex % placeBannerImages.length + 1}/{placeBannerImages.length}
                      </div>
                      <div className="absolute bottom-4 right-4 flex gap-1.5 z-20">
                        {placeBannerImages.map((url, index) => {
                          const active = index === bannerIndex % placeBannerImages.length;
                          return (
                            <button
                              key={url}
                              type="button"
                              aria-label={`Ver banner ${index + 1}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setBannerIndex(index);
                              }}
                              className={`h-2 rounded-full transition ${active ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/55 hover:bg-white/80'}`}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 z-20 pointer-events-none">
                    <span className="rounded-full bg-white/82 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.42)] ring-1 ring-white/75 backdrop-blur-xl">
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

      {!loading && !error && spotlightProviders.length > 0 ? (
        <section className="relative z-10 -mt-4 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-[1.65rem] border border-white/85 bg-white/88 px-3.5 py-3.5 shadow-[0_24px_62px_-38px_rgba(15,23,42,0.38)] ring-1 ring-slate-950/[0.03] backdrop-blur-xl sm:px-4 sm:py-4">
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                    <Sparkle size={14} weight="fill" className="text-amber-500" />
                    Parceiros do chalé
                  </p>
                  <h2 className="mt-1 text-[1.1rem] font-black tracking-[-0.035em] text-slate-950 sm:text-xl">
                    Quem atende este chalé
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">
                    Toque no logo para ir direto ao serviço abaixo.
                  </p>
                </div>
                <div className="min-w-0 sm:flex sm:items-center sm:justify-end sm:gap-3">
                  <div className="-mx-1 flex max-w-full items-center gap-0 overflow-x-auto px-1 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0">
                    {spotlightProviders.map((provider: any, index: number) => {
                      const BadgeIcon = provider.BadgeIcon;
                      return (
                        <button
                          type="button"
                          key={provider.id}
                          className={`group/provider relative -ml-2 first:ml-0 h-14 w-14 shrink-0 rounded-full bg-gradient-to-br ${provider.accentClass} p-[3px] shadow-[0_18px_34px_-22px_rgba(15,23,42,0.62)] ring-2 ${provider.ringClass} transition duration-300 ease-out hover:z-20 hover:-translate-y-1 hover:scale-105 active:scale-95 sm:h-16 sm:w-16`}
                          onClick={() => scrollToProviderTarget(provider.targetId, provider.name)}
                          aria-label={`Ver ${provider.name} na lista abaixo`}
                          title={`${provider.name} - ${provider.label}`}
                          style={{ zIndex: spotlightProviders.length - index }}
                        >
                          <img
                            src={provider.imageUrl}
                            alt={provider.name}
                            className="h-full w-full rounded-full border-[3px] border-white bg-slate-100 object-cover"
                            loading="lazy"
                          />
                          <span
                            className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-slate-950 px-1 text-[8px] font-black uppercase tracking-[-0.02em] text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.9)]"
                            aria-hidden="true"
                            title={provider.badgeLabel}
                          >
                            {BadgeIcon ? <BadgeIcon size={10} weight="bold" /> : provider.badgeLabel}
                          </span>
                        </button>
                      );
                    })}
                    {hiddenSpotlightCount > 0 ? (
                      <span
                        className="relative -ml-2 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-slate-950 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(15,23,42,0.62)] sm:h-16 sm:w-16"
                        style={{ zIndex: 0 }}
                      >
                        +{hiddenSpotlightCount}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-1 inline-flex shrink-0 rounded-full bg-[#336886]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] sm:mt-0">
                    {deliveryOptionLabel}
                  </span>
                </div>
              </div>
              {providerJumpLabel ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#5FD35A]/35 bg-[#5FD35A]/12 px-3 py-2 text-[11px] font-black text-[#153A4C] shadow-[0_18px_36px_-28px_rgba(51,104,134,0.36)] animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <Sparkle size={13} weight="fill" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{providerJumpLabel}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

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
                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-slate-950">Delivery e serviços para este chalé</h2>
                  <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                    A referência da hospedagem já acompanha o pedido ou a mensagem para facilitar a entrega.
                  </p>
                </div>
                <p className="hidden min-w-0 max-w-[18rem] whitespace-normal break-words text-right text-xs font-medium leading-relaxed text-slate-500 sm:block">
                  {deliveryOptionLabel} a {place.name}.
                </p>
              </div>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {serviceFilterOptions.map((option: any) => {
                  const Icon = option.icon;
                  const active = serviceFilter === option.id;
                  const filterStyles: Record<string, string> = {
                    all: 'bg-[#336886] text-white shadow-[0_12px_24px_-10px_rgba(51,104,134,0.65)] border-transparent',
                    app: 'bg-amber-600 text-white shadow-[0_12px_24px_-10px_rgba(217,119,6,0.65)] border-transparent',
                    direct: 'bg-emerald-600 text-white shadow-[0_12px_24px_-10px_rgba(5,150,105,0.65)] border-transparent',
                  };
                  const activeClass = filterStyles[option.id] || filterStyles.all;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setServiceFilter(option.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-300 ${
                        active
                          ? activeClass
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm'
                      }`}
                    >
                      <Icon size={14} weight={option.id === 'direct' ? 'fill' : 'duotone'} className={option.id === 'direct' && !active ? 'text-emerald-600' : ''} />
                      {option.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{option.count}</span>
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
              {visibleStores.map((entry: any, index: number) => {
                const store = entry.store || {};
                const link = entry || {};
                const mediaUrl = cardMediaFor(store);
                const targetId = providerStoreTargetId(entry, store, index);
                const highlighted = highlightedProviderTarget === targetId;
                const storeParams = new URLSearchParams({
                  destino: String(destination.slug || destinationSlug || ''),
                  destino_nome: String(destination.name || destination.city || destinationSlug || ''),
                  hospedagem: String(place.slug || placeSlug || ''),
                  hospedagem_nome: String(place.name || placeSlug || ''),
                });
                if (place.address) storeParams.set('hospedagem_endereco', String(place.address));
                if (place.addressNumber) storeParams.set('hospedagem_numero', String(place.addressNumber));
                if (place.district) storeParams.set('hospedagem_bairro', String(place.district));
                if (place.city || destination.city) storeParams.set('hospedagem_cidade', String(place.city || destination.city));
                if (place.state || destination.state) storeParams.set('hospedagem_uf', String(place.state || destination.state));
                if (place.zipCode) storeParams.set('hospedagem_cep', String(place.zipCode));
                if (place.lat) storeParams.set('hospedagem_lat', String(place.lat));
                if (place.lng) storeParams.set('hospedagem_lng', String(place.lng));
                return (
                  <Link
                    id={targetId}
                    key={`${entry.id}-${store.id}`}
                    to={`/${store.slug}?${storeParams.toString()}`}
                    className={`group/card relative scroll-mt-28 overflow-hidden rounded-[1.55rem] border border-slate-100 bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.04)] outline-offset-4 ring-1 ring-slate-100/50 transition-all duration-300 ease-out active:scale-[0.985] md:hover:-translate-y-1 md:hover:scale-[1.015] md:hover:border-white md:hover:shadow-[0_22px_48px_-20px_rgba(15,23,42,0.12)] ${highlighted ? highlightedProviderCardClass : ''} ${mediaUrl ? 'grid grid-cols-[6.75rem_1fr] items-start sm:grid-cols-[7.25rem_1fr]' : 'block'}`}
                  >
                    {highlighted ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(95,211,90,0.22),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(51,104,134,0.15),transparent_28%)]" />
                        <div className="pointer-events-none absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/92 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.48)] backdrop-blur-xl">
                          <Sparkle size={12} weight="fill" className="text-[#5FD35A]" />
                          Localizado
                        </div>
                      </>
                    ) : null}
                    {mediaUrl ? (
                      <div
                        className="relative aspect-square self-start overflow-hidden rounded-[1.35rem] group/image cursor-zoom-in shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPreviewImage({ src: mediaUrl, title: store.name });
                        }}
                      >
                        <SmartCardImage
                          src={mediaUrl}
                          alt={store.name}
                          fit={hasCoverImage(store) ? 'cover' : 'contain'}
                          className="h-full w-full"
                        >
                          <div className="absolute left-2 top-2 rounded-full bg-white/82 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#153A4C] shadow-[0_10px_22px_-18px_rgba(15,23,42,0.44)] ring-1 ring-white/75 backdrop-blur-xl z-20">
                            App
                          </div>
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                            <MagnifyingGlass size={22} weight="bold" className="text-white drop-shadow-md" />
                          </div>
                        </SmartCardImage>
                      </div>
                    ) : null}
                    <div className={`min-w-0 ${mediaUrl ? 'p-2.5' : 'p-3'}`}>
                      <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                        <Storefront size={12} weight="duotone" />
                        Pedido pelo app
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.025em] text-slate-950 transition-colors duration-200 group-hover/card:text-[#336886]">{store.name}</h3>
                      <p className="mt-1 line-clamp-4 text-sm font-medium leading-relaxed text-slate-600">{store.settings?.description || 'Pedido online para esta hospedagem.'}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2 min-w-0">
                          {link.deliveryEnabled ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] truncate">
                              Entrega {link.deliveryFee != null ? formatCurrency(link.deliveryFee) : ''}
                            </span>
                          ) : null}
                          {link.estimatedMinutes ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shrink-0">
                              <Clock size={13} weight="duotone" />
                              {link.estimatedMinutes} min
                            </span>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full border border-[#336886]/12 bg-[#336886]/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] transition-all duration-300 group-hover/card:bg-[#336886] group-hover/card:text-white group-hover/card:shadow-[0_4px_12px_rgba(51,104,134,0.2)]">
                          Ver cardápio
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {visiblePlaceListings.map((listing: any, index: number) => {
                const mediaUrl = cardMediaFor(listing);
                const targetId = providerListingTargetId(listing, index);
                const highlighted = highlightedProviderTarget === targetId;
                return (
                  <article
                    id={targetId}
                    key={listing.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedListing(listing)}
                    onKeyDown={handleListingCardKeyDown(listing, setSelectedListing)}
                    className={`group/card relative scroll-mt-28 cursor-pointer overflow-hidden rounded-[1.55rem] border border-slate-100 bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.04)] outline-none outline-offset-4 ring-1 ring-slate-100/50 transition-all duration-300 ease-out active:scale-[0.985] md:hover:-translate-y-1 md:hover:scale-[1.015] md:hover:border-white md:hover:shadow-[0_22px_48px_-20px_rgba(15,23,42,0.12)] focus-visible:ring-4 focus-visible:ring-[#336886]/14 ${highlighted ? highlightedProviderCardClass : ''} ${mediaUrl ? 'grid grid-cols-[6.75rem_1fr] items-start sm:grid-cols-[7.25rem_1fr]' : 'block'}`}
                  >
                    {highlighted ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(95,211,90,0.22),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(51,104,134,0.15),transparent_28%)]" />
                        <div className="pointer-events-none absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/92 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.48)] backdrop-blur-xl">
                          <Sparkle size={12} weight="fill" className="text-[#5FD35A]" />
                          Localizado
                        </div>
                      </>
                    ) : null}
                    {mediaUrl ? (
                      <div
                        className="relative aspect-square self-start overflow-hidden rounded-[1.35rem] group/image cursor-zoom-in shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPreviewImage({ src: mediaUrl, title: listing.title });
                        }}
                      >
                        <SmartCardImage
                          src={mediaUrl}
                          alt={listing.title}
                          fit={hasCoverImage(listing) ? 'cover' : 'contain'}
                          className="h-full w-full"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                          <MagnifyingGlass size={22} weight="bold" className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ) : null}
                    <div className={`min-w-0 ${mediaUrl ? 'p-2.5' : 'p-3'}`}>
                      <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                        <ForkKnife size={12} weight="duotone" />
                        {categoryLabel(listing.category)}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.025em] text-slate-950 transition-colors duration-200 group-hover/card:text-[#336886]">{listing.title}</h3>
                      <ExpandableText
                        value={listing.description || listing.address}
                        fallback={`Atendimento para hóspedes em ${place.name}.`}
                        className="mt-1 text-sm font-medium leading-relaxed text-slate-600"
                        collapsedClassName="line-clamp-4"
                        threshold={150}
                      />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-semibold text-slate-500">
                          {listing.address || 'Toque para ver detalhes e contatos'}
                        </span>
                        <span className="shrink-0 rounded-full border border-[#336886]/12 bg-[#336886]/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] transition-all duration-300 group-hover/card:bg-[#336886] group-hover/card:text-white group-hover/card:shadow-[0_4px_12px_rgba(51,104,134,0.2)]">
                          Ver detalhes
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.24)] ring-1 ring-slate-900/[0.025] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#336886]">Região</p>
                  <h2 className="mt-1 text-base font-bold">Também em {destinationDisplayName}</h2>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Outras opções da cidade para descobrir durante a estadia.
                  </p>
                </div>
                <Sparkle size={21} weight="duotone" className="text-[#336886]" />
              </div>
              <div className="mt-3 space-y-2.5">
                {nearbyCityListings.map((listing: any) => {
                  const mediaUrl = cardMediaFor(listing);
                  return (
                    <article
                      key={listing.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedListing(listing)}
                      onKeyDown={handleListingCardKeyDown(listing, setSelectedListing)}
                      className="group/card cursor-pointer rounded-[1.25rem] border border-slate-100 bg-slate-50/50 p-2.5 shadow-sm outline-none ring-1 ring-slate-100/50 transition-all duration-300 hover:border-white hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)] focus-visible:ring-4 focus-visible:ring-[#336886]/12 active:scale-[0.99]"
                    >
                      <div className="flex gap-3">
                        {mediaUrl ? (
                          <div
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[1.15rem] group/image cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPreviewImage({ src: mediaUrl, title: listing.title });
                            }}
                          >
                            <SmartCardImage
                              src={mediaUrl}
                              alt={listing.title}
                              fit={hasCoverImage(listing) ? 'cover' : 'contain'}
                              className="h-full w-full"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                              <MagnifyingGlass size={12} weight="bold" className="text-white drop-shadow-md" />
                            </div>
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-[9.5px] font-black uppercase tracking-[0.18em] text-[#336886]">{categoryLabel(listing.category)}</p>
                          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-950 transition-colors duration-200 group-hover/card:text-[#336886]">{listing.title}</h3>
                          <ExpandableText
                            value={listing.description || listing.address}
                            fallback="Dica da cidade."
                            className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600"
                            collapsedClassName="line-clamp-3"
                            threshold={105}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
                {destinationListings.length > nearbyCityListings.length ? (
                  <Link
                    to={`/destinos/${destination.slug || destinationSlug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#336886]/12 bg-[#336886]/8 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#336886] transition hover:bg-[#336886] hover:text-white"
                  >
                    Ver tudo em {destinationDisplayName}
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                ) : null}
                {destinationListings.length === 0 ? <p className="text-sm font-bold text-slate-500">Sem outras sugestões da cidade por enquanto.</p> : null}
              </div>
            </div>
            {place.deliveryInstructions ? (
              <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Instrução de entrega</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{place.deliveryInstructions}</p>
              </div>
            ) : null}
            <Link to="/destinos/cadastrar#dados-parceiro" className="group relative block overflow-hidden rounded-[1.65rem] border border-[#153A4C]/10 bg-[radial-gradient(circle_at_14%_12%,rgba(132,204,22,0.2),transparent_32%),radial-gradient(circle_at_92%_20%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(135deg,#153A4C_0%,#24576a_58%,#0f2f3f_100%)] p-4 text-white shadow-[0_18px_46px_-30px_rgba(21,58,76,0.82)] transition hover:-translate-y-0.5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-3xl" />
              <div className="relative max-w-[17rem]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/14">
                  <ForkKnife size={22} weight="duotone" />
                </span>
                <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.03em]">Quer aparecer neste chalé?</h3>
                <p className="mt-1.5 text-sm font-semibold leading-6 text-white/76">Cadastre sua loja ou serviço para atender hóspedes pelo app ou WhatsApp.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-[#153A4C] shadow-[0_14px_28px_-20px_rgba(255,255,255,0.55)] transition group-hover:translate-x-0.5">
                  Quero participar
                  <ArrowRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          </aside>
        </section>
      ) : null}

      <AppImagePreviewDialog image={previewImage} onClose={() => setPreviewImage(null)} label="Imagem ampliada da hospedagem" />

      <PreStoreDetailSheet
        open={Boolean(selectedListing)}
        onClose={() => setSelectedListing(null)}
        listing={selectedListing}
        destination={destination}
        placeName={selectedListing && listingBelongsToPlace(selectedListing, place.id) ? place.name : ''}
        categoryLabel={categoryLabel(selectedListing?.category)}
        imageUrl={selectedListingMediaUrl}
        hasImage={selectedListingHasImage}
        claimHref={selectedListing ? buildListingClaimUrl(destination, selectedListing) : ''}
        primaryAction={selectedListingAction}
        routeAction={selectedListingRouteHref ? { href: selectedListingRouteHref, label: 'Ver rota até meu chalé', kind: 'route', external: false } : null}
        instagramUrl={selectedListingInstagramUrl}
        websiteUrl={selectedListingWebsiteUrl}
        websiteLabel={siteLabel(selectedListing?.websiteUrl)}
        address={selectedListing?.address}
      />
    </PublicDestinationShell>
  );
}
