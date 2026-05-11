import { slugify } from './slugify';

export const DESTINATION_PARTNER_TYPES = [ 'HOSPITALITY', 'SERVICE_PROVIDER' ] as const;
export const HOSPITALITY_PLACE_TYPES = [ 'CHALE', 'POUSADA', 'HOTEL', 'CABANA', 'CASA_TEMPORADA', 'OUTRO' ] as const;
export const DESTINATION_LISTING_CATEGORIES = [
  'PASSEIO',
  'MASSAGEM',
  'RESTAURANTE_VISITAR',
  'NOITE',
  'ATRATIVO',
  'SERVICO',
  'LOJA',
] as const;

export type DestinationPartnerType = (typeof DESTINATION_PARTNER_TYPES)[number];
export type HospitalityPlaceType = (typeof HOSPITALITY_PLACE_TYPES)[number];
export type DestinationListingCategory = (typeof DESTINATION_LISTING_CATEGORIES)[number];

export type DestinationLocationContext = {
  city?: string | null;
  state?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

const normalizeToken = (value?: string | null) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeDestinationSlug = (value?: string | null) => slugify(String(value || '').trim());

export const normalizeDestinationPartnerType = (value?: string | null): DestinationPartnerType => {
  const normalized = normalizeToken(value);
  return DESTINATION_PARTNER_TYPES.includes(normalized as DestinationPartnerType)
    ? (normalized as DestinationPartnerType)
    : 'HOSPITALITY';
};

export const normalizeHospitalityPlaceType = (value?: string | null): HospitalityPlaceType => {
  const normalized = normalizeToken(value);
  return HOSPITALITY_PLACE_TYPES.includes(normalized as HospitalityPlaceType)
    ? (normalized as HospitalityPlaceType)
    : 'CHALE';
};

export const normalizeDestinationListingCategory = (value?: string | null): DestinationListingCategory => {
  const normalized = normalizeToken(value);
  return DESTINATION_LISTING_CATEGORIES.includes(normalized as DestinationListingCategory)
    ? (normalized as DestinationListingCategory)
    : 'SERVICO';
};

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const toOptionalText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeLocationText = (value?: string | null) =>
  normalizeDestinationSlug(value || '');

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = toNullableNumber(value);
  return parsed === null ? null : parsed;
};

const distanceKmBetween = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateDestinationRouteDistanceKm = (straightDistanceKm: number) => {
  if (!Number.isFinite(straightDistanceKm)) return null;
  if (straightDistanceKm < 0.05) return 0;

  // Tourist destinations in Serra/Mantiqueira regions are not well represented by aerial distance.
  // The factor is intentionally higher for regional trips where roads follow valleys and mountain access.
  const routeFactor =
    straightDistanceKm <= 5 ? 1.25 :
    straightDistanceKm <= 15 ? 1.35 :
    straightDistanceKm <= 45 ? Math.min(2.05, 1.52 + 20 / (straightDistanceKm + 10)) :
    straightDistanceKm <= 90 ? Math.min(1.72, 1.28 + 20 / (straightDistanceKm + 10)) :
    straightDistanceKm <= 180 ? 1.28 :
    1.18;

  return Number((straightDistanceKm * routeFactor).toFixed(1));
};

const buildDestinationDistanceMeta = (
  originLat: number | null,
  originLng: number | null,
  destinationLat: number | null,
  destinationLng: number | null
) => {
  if (originLat === null || originLng === null || destinationLat === null || destinationLng === null) {
    return {
      distanceKm: null,
      straightDistanceKm: null,
      distanceMode: null,
    };
  }

  const straightDistanceKm = Number(distanceKmBetween(originLat, originLng, destinationLat, destinationLng).toFixed(1));
  return {
    distanceKm: estimateDestinationRouteDistanceKm(straightDistanceKm),
    straightDistanceKm,
    distanceMode: 'estimated_route',
  };
};

export const buildDestinationStoreMatchMeta = (storeSettings: any, destination: any) => {
  const storeCity = normalizeLocationText(storeSettings?.city);
  const storeState = String(storeSettings?.state || '').trim().toUpperCase();
  const destinationCity = normalizeLocationText(destination?.city);
  const destinationState = String(destination?.state || '').trim().toUpperCase();
  const sameCity = Boolean(storeCity && destinationCity && storeCity === destinationCity && (!storeState || !destinationState || storeState === destinationState));
  const sameState = Boolean(storeState && destinationState && storeState === destinationState);
  const storeLat = toFiniteNumber(storeSettings?.lat);
  const storeLng = toFiniteNumber(storeSettings?.lng);
  const destinationLat = toFiniteNumber(destination?.lat);
  const destinationLng = toFiniteNumber(destination?.lng);
  const distanceMeta = buildDestinationDistanceMeta(storeLat, storeLng, destinationLat, destinationLng);
  const distanceKm = distanceMeta.distanceKm;
  const deliveryRadiusKm = toFiniteNumber(storeSettings?.deliveryRadiusKm);
  const smartRadiusKm = Math.max(deliveryRadiusKm || 0, 25);
  const withinDeliveryRadius = distanceKm !== null ? distanceKm <= smartRadiusKm : null;
  const hasStoreLocation = Boolean(storeCity || storeState || (storeLat !== null && storeLng !== null));
  const recommended = sameCity || withinDeliveryRadius === true;
  const reason = sameCity
    ? 'same_city'
    : withinDeliveryRadius
      ? 'within_delivery_radius'
      : sameState
        ? 'same_state'
        : hasStoreLocation
          ? 'outside_region'
          : 'missing_store_location';
  const rank = sameCity ? 0 : withinDeliveryRadius ? 1 : sameState ? 2 : hasStoreLocation ? 4 : 3;

  return {
    recommended,
    reason,
    sameCity,
    sameState,
    distanceKm,
    straightDistanceKm: distanceMeta.straightDistanceKm,
    distanceMode: distanceMeta.distanceMode,
    deliveryRadiusKm,
    rank,
  };
};

export const buildDestinationVisitorMatchMeta = (
  location: DestinationLocationContext | null | undefined,
  destination: any
) => {
  const visitorCity = normalizeLocationText(location?.city);
  const visitorState = String(location?.state || '').trim().toUpperCase();
  const destinationCity = normalizeLocationText(destination?.city);
  const destinationState = String(destination?.state || '').trim().toUpperCase();
  const sameCity = Boolean(visitorCity && destinationCity && visitorCity === destinationCity && (!visitorState || !destinationState || visitorState === destinationState));
  const sameState = Boolean(visitorState && destinationState && visitorState === destinationState);
  const visitorLat = toFiniteNumber(location?.lat);
  const visitorLng = toFiniteNumber(location?.lng);
  const destinationLat = toFiniteNumber(destination?.lat);
  const destinationLng = toFiniteNumber(destination?.lng);
  const distanceMeta = buildDestinationDistanceMeta(visitorLat, visitorLng, destinationLat, destinationLng);
  const distanceKm = distanceMeta.distanceKm;
  const nearby = distanceKm !== null && distanceKm <= 120;
  const hasLocation = Boolean(visitorCity || visitorState || (visitorLat !== null && visitorLng !== null));
  const recommended = sameCity || nearby || sameState;
  const reason = sameCity
    ? 'same_city'
    : nearby
      ? 'nearby_destination'
      : sameState
        ? 'same_state'
        : distanceKm !== null
          ? 'distance_available'
          : hasLocation
            ? 'outside_region'
            : 'missing_location';
  const rank = sameCity ? 0 : nearby ? 1 : sameState ? 2 : distanceKm !== null ? 3 : hasLocation ? 4 : 5;

  return {
    recommended,
    reason,
    sameCity,
    sameState,
    distanceKm,
    straightDistanceKm: distanceMeta.straightDistanceKm,
    distanceMode: distanceMeta.distanceMode,
    rank,
  };
};
