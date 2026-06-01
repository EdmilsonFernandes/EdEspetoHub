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

type GeocodeProvider = 'geoapify' | 'locationiq' | 'photon' | 'openstreetmap';

type ProviderConfig = {
  enabled: boolean;
  execute: (address: string) => Promise<GeocodeAddressResult | null>;
};

const clampCoordinate = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export class GeoLocationService {
  private static nextGeocodeAtByProvider = new Map<GeocodeProvider, number>();
  private static geocodeCache = new Map<string, { value: GeocodeAddressResult; expiresAt: number }>();
  private static geocodeCacheTtlMs = 1000 * 60 * 60 * 24;
  private log = logger.child({ scope: 'GeoLocationService' });

  static resetRuntimeForTests() {
    GeoLocationService.nextGeocodeAtByProvider.clear();
    GeoLocationService.geocodeCache.clear();
  }

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

  private isTestRuntime() {
    return env.nodeEnv === 'test' || process.env.VITEST === 'true';
  }

  private async waitForGeocodeWindow(provider: GeocodeProvider, rateLimitMs: number) {
    if (this.isTestRuntime()) return;
    const nextAt = GeoLocationService.nextGeocodeAtByProvider.get(provider) || 0;
    const waitMs = Math.max(0, nextAt - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    GeoLocationService.nextGeocodeAtByProvider.set(provider, Date.now() + rateLimitMs);
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

  private normalizeComparableText(value: unknown) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private distinctiveTokens(value: string) {
    const stopWords = new Set([
      'brasil', 'sao', 'santo', 'santa', 'sp', 'mg', 'rio', 'janeiro',
      'rua', 'avenida', 'av', 'estrada', 'rodovia', 'bairro', 'centro',
      'pousada', 'chale', 'hotel', 'restaurante', 'lanches', 'servico', 'delivery',
      'dos', 'das', 'do', 'da', 'de', 'para', 'com',
    ]);
    return this.normalizeComparableText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !stopWords.has(token));
  }

  private hasReasonableTextMatch(query: string, formattedAddress: string) {
    const primarySegment = String(query || '').split(',')[0] || '';
    const primaryTokens = this.distinctiveTokens(primarySegment);
    const formatted = ` ${this.normalizeComparableText(formattedAddress)} `;
    if (primaryTokens.length >= 2) {
      const primaryMatches = primaryTokens.filter((token) => formatted.includes(` ${token} `)).length;
      if (primaryMatches < 2) return false;
    }

    const queryTokens = this.distinctiveTokens(query);
    if (!queryTokens.length) return true;
    const matches = queryTokens.filter((token) => formatted.includes(` ${token} `)).length;
    return matches >= Math.min(2, queryTokens.length);
  }

  private isLikelyBrazilCoordinate(lat: number | null, lng: number | null) {
    if (lat === null || lng === null) return false;
    return lat >= -34.5 && lat <= 6 && lng >= -74.5 && lng <= -30;
  }

  private async fetchJson<T>(provider: GeocodeProvider, url: string, headers: Record<string, string>, rateLimitMs: number) {
    await this.waitForGeocodeWindow(provider, rateLimitMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.geocoding.timeoutMs);
    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        this.log.warn('Geocode provider request failed', { provider, status: response.status });
        return null;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeResult(provider: GeocodeProvider, lat: unknown, lng: unknown, formattedAddress: unknown, fallbackAddress: string) {
    const parsedLat = this.parseCoordinate(lat);
    const parsedLng = this.parseCoordinate(lng);
    if (!this.isLikelyBrazilCoordinate(parsedLat, parsedLng)) {
      this.log.warn('Geocode provider returned coordinates outside Brazil bounds', { provider, lat: parsedLat, lng: parsedLng });
      return null;
    }

    const resolvedAddress = String(formattedAddress || fallbackAddress).trim() || fallbackAddress;
    if (!this.hasReasonableTextMatch(fallbackAddress, resolvedAddress)) {
      this.log.warn('Geocode provider returned weak text match', { provider, query: fallbackAddress, formattedAddress: resolvedAddress });
      return null;
    }

    return {
      lat: parsedLat as number,
      lng: parsedLng as number,
      formattedAddress: resolvedAddress,
    };
  }

  private async queryGeoapify(address: string): Promise<GeocodeAddressResult | null> {
    const apiKey = env.geocoding.geoapifyApiKey;
    if (!apiKey) return null;

    const params = new URLSearchParams({
      text: address,
      filter: 'countrycode:br',
      lang: 'pt',
      limit: '1',
      apiKey,
    });
    const payload = await this.fetchJson<{
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          lat?: number | string;
          lon?: number | string;
          formatted?: string;
        };
      }>;
    }>('geoapify', `https://api.geoapify.com/v1/geocode/search?${params.toString()}`, {
      Accept: 'application/json',
      'User-Agent': `JaNoCaminhoGeo/1.0 (+${env.appUrl || 'https://janocaminho.com.br'})`,
    }, 250);

    const candidate = Array.isArray(payload?.features) ? payload.features[0] : null;
    const coordinates = candidate?.geometry?.coordinates;
    return this.normalizeResult(
      'geoapify',
      candidate?.properties?.lat ?? coordinates?.[1],
      candidate?.properties?.lon ?? coordinates?.[0],
      candidate?.properties?.formatted,
      address
    );
  }

  private async queryLocationIq(address: string): Promise<GeocodeAddressResult | null> {
    const apiKey = env.geocoding.locationIqApiKey;
    if (!apiKey) return null;

    const params = new URLSearchParams({
      key: apiKey,
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
      addressdetails: '0',
      normalizeaddress: '1',
    });
    const payload = await this.fetchJson<Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>>('locationiq', `https://us1.locationiq.com/v1/search?${params.toString()}`, {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'User-Agent': `JaNoCaminhoGeo/1.0 (+${env.appUrl || 'https://janocaminho.com.br'})`,
    }, 650);

    const candidate = Array.isArray(payload) ? payload[0] : null;
    return this.normalizeResult('locationiq', candidate?.lat, candidate?.lon, candidate?.display_name, address);
  }

  private async queryPhoton(address: string): Promise<GeocodeAddressResult | null> {
    if (!env.geocoding.photonEnabled) return null;

    const params = new URLSearchParams({
      q: address,
      limit: '1',
    });
    const payload = await this.fetchJson<{
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          street?: string;
          housenumber?: string;
          district?: string;
          city?: string;
          state?: string;
          country?: string;
        };
      }>;
    }>('photon', `https://photon.komoot.io/api/?${params.toString()}`, {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'User-Agent': `JaNoCaminhoGeo/1.0 (+${env.appUrl || 'https://janocaminho.com.br'})`,
    }, 700);

    const candidate = Array.isArray(payload?.features) ? payload.features[0] : null;
    const coordinates = candidate?.geometry?.coordinates;
    const formatted = [
      candidate?.properties?.name,
      [candidate?.properties?.street, candidate?.properties?.housenumber].filter(Boolean).join(', '),
      candidate?.properties?.district,
      candidate?.properties?.city,
      candidate?.properties?.state,
      candidate?.properties?.country,
    ].filter(Boolean).join(', ');
    return this.normalizeResult('photon', coordinates?.[1], coordinates?.[0], formatted, address);
  }

  private async queryOpenStreetMap(address: string): Promise<GeocodeAddressResult | null> {
    if (!env.geocoding.openStreetMapEnabled) return null;
    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      addressdetails: '0',
      countrycodes: 'br',
      q: address,
    });
    const payload = await this.fetchJson<Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>>('openstreetmap', `https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'User-Agent': `JaNoCaminhoGeo/1.0 (+${env.appUrl || 'https://janocaminho.com.br'})`,
    }, 1100);

    const candidate = Array.isArray(payload) ? payload[0] : null;
    return this.normalizeResult('openstreetmap', candidate?.lat, candidate?.lon, candidate?.display_name, address);
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

    const providers = this.getProviderConfig();

    for (const candidate of attempts) {
      for (const provider of providers) {
        try {
          const result = await provider.execute(candidate);
          if (!result) continue;
          this.setCachedAddress(normalizedAddress, result);
          return result;
        } catch (error) {
          this.log.warn('Geocode provider exception', { provider: provider.name, address: candidate, error });
        }
      }
    }

    return null;
  }

  private getProviderConfig() {
    const providers: Record<GeocodeProvider, ProviderConfig & { name: GeocodeProvider }> = {
      geoapify: {
        name: 'geoapify',
        enabled: Boolean(env.geocoding.geoapifyApiKey),
        execute: (address) => this.queryGeoapify(address),
      },
      locationiq: {
        name: 'locationiq',
        enabled: Boolean(env.geocoding.locationIqApiKey),
        execute: (address) => this.queryLocationIq(address),
      },
      photon: {
        name: 'photon',
        enabled: env.geocoding.photonEnabled,
        execute: (address) => this.queryPhoton(address),
      },
      openstreetmap: {
        name: 'openstreetmap',
        enabled: env.geocoding.openStreetMapEnabled,
        execute: (address) => this.queryOpenStreetMap(address),
      },
    };

    return env.geocoding.providerOrder
      .map((provider) => provider.trim().toLowerCase() as GeocodeProvider)
      .filter((provider, index, values) => provider in providers && values.indexOf(provider) === index)
      .map((provider) => providers[provider])
      .filter((provider) => provider.enabled);
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
