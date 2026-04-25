export type GeoPoint = {
  lat?: number | null;
  lng?: number | null;
  lon?: number | null;
};

const EARTH_RADIUS_KM = 6371;

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const calculateDistanceKm = (origin?: GeoPoint | null, destination?: GeoPoint | null): number | null => {
  const lat1 = toFiniteNumber(origin?.lat);
  const lng1 = toFiniteNumber(origin?.lng ?? origin?.lon);
  const lat2 = toFiniteNumber(destination?.lat);
  const lng2 = toFiniteNumber(destination?.lng ?? destination?.lon);

  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const roundDistanceKm = (distanceKm?: number | null, fractionDigits = 1): number | null => {
  const parsed = toFiniteNumber(distanceKm);
  if (parsed === null) return null;
  return Number(parsed.toFixed(fractionDigits));
};
