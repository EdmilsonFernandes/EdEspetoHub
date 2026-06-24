/**
 * Utilitários de geolocalização partilhados (frontend).
 * Consolida haversine + helpers de coordenadas que estavam duplicados em
 * HospitalityPlacePage, HospitalityServiceRoutePage, HospitalityRouteSheet,
 * StorePage e useHubStoreDistances.
 */

export type GeoPoint = { lat?: string | number | null; lng?: string | number | null };

/** Normaliza um valor de coordenada (string/number) para number ou null. */
export const normalizeCoordinate = (value?: string | number | null): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

/** Verifica se um ponto tem coordenadas válidas (lat + lng). */
export const hasCoords = (point: GeoPoint | null | undefined): boolean =>
  normalizeCoordinate(point?.lat) !== null && normalizeCoordinate(point?.lng) !== null;

/** Extrai { lat, lng } como números de um ponto (assumindo que hasCoords é true). */
export const toCoords = (point: GeoPoint | null | undefined): { lat: number; lng: number } => ({
  lat: Number(normalizeCoordinate(point?.lat)),
  lng: Number(normalizeCoordinate(point?.lng)),
});

/**
 * Distância em km entre dois pontos (fórmula de Haversine).
 * Retorna null se qualquer ponto não tiver coordenadas válidas.
 */
export const haversineKm = (
  origin: GeoPoint | null | undefined,
  destination: GeoPoint | null | undefined
): number | null => {
  if (!hasCoords(origin) || !hasCoords(destination)) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const a = toCoords(origin);
  const b = toCoords(destination);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};

/** Verifica se um ponto tem coordenadas aproximadas (não precisas). */
export const isApproximatePoint = (point: any): boolean =>
  Boolean(point?.geoApproximate || ['zip', 'city', 'unknown'].includes(String(point?.geoPrecision || '').toLowerCase()));
