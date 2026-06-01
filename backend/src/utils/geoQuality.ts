export type GeoSource = 'manual_pin' | 'geocoder' | 'zip_code' | 'city_fallback' | 'imported' | 'unknown';
export type GeoPrecision = 'exact' | 'street' | 'zip' | 'city' | 'unknown';

export type GeoQualityPayload = {
  geoSource?: GeoSource | string | null;
  geoPrecision?: GeoPrecision | string | null;
  geoVerified?: boolean | null;
  geocodedAt?: Date | string | null;
  formattedAddress?: string | null;
};

const GEO_SOURCES = new Set(['manual_pin', 'geocoder', 'zip_code', 'city_fallback', 'imported', 'unknown']);
const GEO_PRECISIONS = new Set(['exact', 'street', 'zip', 'city', 'unknown']);

export const parseGeoCoordinate = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasUsableBrazilCoordinatePair = (lat: unknown, lng: unknown) => {
  const parsedLat = parseGeoCoordinate(lat);
  const parsedLng = parseGeoCoordinate(lng);
  if (parsedLat === null || parsedLng === null) return false;
  if (Math.abs(parsedLat) < 0.000001 && Math.abs(parsedLng) < 0.000001) return false;
  return parsedLat >= -34 && parsedLat <= 6 && parsedLng >= -74 && parsedLng <= -34;
};

export const sameCoordinatePair = (leftLat: unknown, leftLng: unknown, rightLat: unknown, rightLng: unknown) => {
  const aLat = parseGeoCoordinate(leftLat);
  const aLng = parseGeoCoordinate(leftLng);
  const bLat = parseGeoCoordinate(rightLat);
  const bLng = parseGeoCoordinate(rightLng);
  if (aLat === null || aLng === null || bLat === null || bLng === null) return false;
  return Math.abs(aLat - bLat) < 0.000001 && Math.abs(aLng - bLng) < 0.000001;
};

export const normalizeGeoSource = (value: unknown): GeoSource => {
  const normalized = String(value || '').trim().toLowerCase();
  return GEO_SOURCES.has(normalized) ? normalized as GeoSource : 'unknown';
};

export const normalizeGeoPrecision = (value: unknown): GeoPrecision => {
  const normalized = String(value || '').trim().toLowerCase();
  return GEO_PRECISIONS.has(normalized) ? normalized as GeoPrecision : 'unknown';
};

export const isApproximateGeoPrecision = (value: unknown) => {
  const precision = normalizeGeoPrecision(value);
  return precision === 'zip' || precision === 'city' || precision === 'unknown';
};

export const buildGeoQuality = (payload?: GeoQualityPayload | null) => ({
  geoSource: normalizeGeoSource(payload?.geoSource),
  geoPrecision: normalizeGeoPrecision(payload?.geoPrecision),
  geoVerified: Boolean(payload?.geoVerified),
  geocodedAt: payload?.geocodedAt || null,
  formattedAddress: String(payload?.formattedAddress || '').trim() || null,
});
