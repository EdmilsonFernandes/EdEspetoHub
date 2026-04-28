import { env } from '../config/env';
import { logger } from '../utils/logger';

type Coordinates = {
  lat: number;
  lng: number;
};

export type GeocodeAddressResult = Coordinates & {
  formattedAddress: string;
};

export type EstimatedRouteResult = {
  distanceKm: number;
  durationMin: number;
  estimated: true;
};

const clampCoordinate = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export class GeoLocationService {
  private static nextGeocodeAt = 0;
  private static geocodeCache = new Map<string, { value: GeocodeAddressResult; expiresAt: number }>();
  private static geocodeCacheTtlMs = 1000 * 60 * 60 * 24;
  private log = logger.child({ scope: 'GeoLocationService' });

  private normalizeAddress(value?: string | null) {
    return String(value || '')
      .replace(/\|/g, ', ')
      .replace(/\bcep\b[:\s-]*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ', ')
      .trim();
  }

  private stripZipFromAddress(value: string) {
    return String(value || '')
      .replace(/\b\d{5}-?\d{3}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ', ')
      .trim();
  }

  private async waitForGeocodeWindow() {
    const waitMs = Math.max(0, GeoLocationService.nextGeocodeAt - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    GeoLocationService.nextGeocodeAt = Date.now() + 1100;
  }

  private getCachedAddress(address: string) {
    const cached = GeoLocationService.geocodeCache.get(address);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      GeoLocationService.geocodeCache.delete(address);
      return null;
    }
    return cached.value;
  }

  private setCachedAddress(address: string, value: GeocodeAddressResult) {
    GeoLocationService.geocodeCache.set(address, {
      value,
      expiresAt: Date.now() + GeoLocationService.geocodeCacheTtlMs,
    });
  }

  private parseCoordinate(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private async queryOpenStreetMap(address: string): Promise<GeocodeAddressResult | null> {
    await this.waitForGeocodeWindow();
    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      addressdetails: '0',
      countrycodes: 'br',
      q: address,
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'User-Agent': `JaNoCaminhoGeo/1.0 (+${env.appUrl || 'https://janocaminho.com.br'})`,
      },
    });

    if (!response.ok) {
      this.log.warn('OpenStreetMap geocode request failed', { address, status: response.status });
      return null;
    }

    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const candidate = Array.isArray(payload) ? payload[0] : null;
    const lat = this.parseCoordinate(candidate?.lat);
    const lng = this.parseCoordinate(candidate?.lon);
    if (lat === null || lng === null) return null;

    return {
      lat,
      lng,
      formattedAddress: String(candidate?.display_name || address).trim() || address,
    };
  }

  private isValidCoordinates(coords?: Partial<Coordinates> | null): coords is Coordinates {
    return Number.isFinite(Number(coords?.lat)) && Number.isFinite(Number(coords?.lng));
  }

  private haversineKm(origin: Coordinates, destination: Coordinates) {
    const lat1 = clampCoordinate(Number(origin.lat), -90, 90);
    const lng1 = clampCoordinate(Number(origin.lng), -180, 180);
    const lat2 = clampCoordinate(Number(destination.lat), -90, 90);
    const lng2 = clampCoordinate(Number(destination.lng), -180, 180);

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  async geocodeAddress(address: string): Promise<GeocodeAddressResult | null> {
    const normalizedAddress = this.normalizeAddress(address);
    if (!normalizedAddress) return null;

    const cached = this.getCachedAddress(normalizedAddress);
    if (cached) return cached;

    const attempts = [ normalizedAddress, this.stripZipFromAddress(normalizedAddress) ]
      .map((value) => value.trim())
      .filter((value, index, values) => value.length >= 5 && values.indexOf(value) === index);

    for (const candidate of attempts) {
      try {
        const result = await this.queryOpenStreetMap(candidate);
        if (!result) continue;
        this.setCachedAddress(normalizedAddress, result);
        return result;
      } catch (error) {
        this.log.warn('OpenStreetMap geocode exception', { address: candidate, error });
      }
    }

    return null;
  }

  estimateRoute(origin: Coordinates, destination: Coordinates): EstimatedRouteResult | null {
    if (!this.isValidCoordinates(origin) || !this.isValidCoordinates(destination)) {
      return null;
    }

    const straightDistanceKm = this.haversineKm(origin, destination);
    if (!Number.isFinite(straightDistanceKm)) return null;

    if (straightDistanceKm < 0.05) {
      return {
        distanceKm: 0,
        durationMin: 1,
        estimated: true,
      };
    }

    const roadFactor =
      straightDistanceKm <= 1 ? 1.42 :
      straightDistanceKm <= 3 ? 1.32 :
      straightDistanceKm <= 8 ? 1.24 :
      straightDistanceKm <= 20 ? 1.17 :
      1.12;
    const effectiveDistanceKm = Number((straightDistanceKm * roadFactor).toFixed(2));

    const averageSpeedKmH =
      effectiveDistanceKm <= 2 ? 18 :
      effectiveDistanceKm <= 5 ? 22 :
      effectiveDistanceKm <= 12 ? 26 :
      32;
    const durationMin = Math.max(4, Math.ceil((effectiveDistanceKm / averageSpeedKmH) * 60 + 3));

    return {
      distanceKm: effectiveDistanceKm,
      durationMin,
      estimated: true,
    };
  }
}
