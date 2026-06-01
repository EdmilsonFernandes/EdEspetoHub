import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { GeoLocationService } from './GeoLocationService';

const service = new GeoLocationService();
const estimateRoute = service.estimateRoute.bind(service);

const originalGeocodingEnv = { ...env.geocoding };

const mockJsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => payload,
});

const mockFetchSequence = (...payloads: unknown[]) => {
  const fetchMock = vi.fn(async () => {
    if (!payloads.length) return mockJsonResponse([]);
    const next = payloads.shift();
    return next && typeof next === 'object' && 'ok' in (next as Record<string, unknown>)
      ? next
      : mockJsonResponse(next);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const fetchUrlAt = (fetchMock: ReturnType<typeof mockFetchSequence>, index: number) => {
  const call = fetchMock.mock.calls[index] as unknown[] | undefined;
  return String(call?.[0] || '');
};

describe('GeoLocationService — geocodeAddress providers', () => {
  beforeEach(() => {
    GeoLocationService.resetRuntimeForTests();
    Object.assign(env.geocoding, {
      ...originalGeocodingEnv,
      providerOrder: ['geoapify', 'locationiq', 'photon', 'openstreetmap'],
      timeoutMs: 1000,
      geoapifyApiKey: '',
      locationIqApiKey: '',
      photonEnabled: true,
      openStreetMapEnabled: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    GeoLocationService.resetRuntimeForTests();
    Object.assign(env.geocoding, originalGeocodingEnv);
  });

  it('uses Geoapify first when the API key is configured', async () => {
    env.geocoding.geoapifyApiKey = 'geoapify-key';
    env.geocoding.locationIqApiKey = 'locationiq-key';
    const fetchMock = mockFetchSequence({
      features: [{
        geometry: { coordinates: [-45.7341126, -22.6929799] },
        properties: { formatted: 'Golden Burguer, São Bento do Sapucaí, SP, Brasil' },
      }],
    });

    const result = await service.geocodeAddress('Golden Burguer, São Bento do Sapucaí, SP, Brasil');

    expect(result).toEqual({
      lat: -22.6929799,
      lng: -45.7341126,
      formattedAddress: 'Golden Burguer, São Bento do Sapucaí, SP, Brasil',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchUrlAt(fetchMock, 0)).toContain('api.geoapify.com');
  });

  it('falls back from Geoapify to LocationIQ when the first provider has no result', async () => {
    env.geocoding.geoapifyApiKey = 'geoapify-key';
    env.geocoding.locationIqApiKey = 'locationiq-key';
    const fetchMock = mockFetchSequence(
      { features: [] },
      [{ lat: '-22.6929799', lon: '-45.7341126', display_name: 'Golden Burguer, SP, Brasil' }]
    );

    const result = await service.geocodeAddress('Golden Burguer, São Bento do Sapucaí, SP, Brasil');

    expect(result?.formattedAddress).toBe('Golden Burguer, SP, Brasil');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchUrlAt(fetchMock, 0)).toContain('api.geoapify.com');
    expect(fetchUrlAt(fetchMock, 1)).toContain('locationiq.com');
  });

  it('uses Photon before OpenStreetMap when paid-key providers are not configured', async () => {
    const fetchMock = mockFetchSequence({
      features: [{
        geometry: { coordinates: [-45.7319876, -22.6874246] },
        properties: {
          name: 'Pousada Refúgio dos Palmares',
          city: 'São Bento do Sapucaí',
          state: 'São Paulo',
          country: 'Brasil',
        },
      }],
    });

    const result = await service.geocodeAddress('Pousada Refúgio dos Palmares, São Bento do Sapucaí, SP, Brasil');

    expect(result?.formattedAddress).toContain('Pousada Refúgio dos Palmares');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchUrlAt(fetchMock, 0)).toContain('photon.komoot.io');
  });

  it('keeps OpenStreetMap as fallback when Photon has no result', async () => {
    const fetchMock = mockFetchSequence(
      { features: [] },
      [{ lat: '-22.6929799', lon: '-45.7341126', display_name: 'Rua Pintora Adelaide, São Bento do Sapucaí, SP, Brasil' }]
    );

    const result = await service.geocodeAddress('Rua Pintora Adelaide, 361, São Bento do Sapucaí, SP, Brasil');

    expect(result?.formattedAddress).toContain('Rua Pintora Adelaide');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchUrlAt(fetchMock, 0)).toContain('photon.komoot.io');
    expect(fetchUrlAt(fetchMock, 1)).toContain('nominatim.openstreetmap.org');
  });

  it('rejects weak text matches to avoid routing to a similar but wrong place', async () => {
    const fetchMock = mockFetchSequence(
      {
        features: [{
          geometry: { coordinates: [-45.7319876, -22.6874246] },
          properties: {
            name: 'Pousada refúgio das pedras',
            street: 'Rua dos Ipês',
            city: 'São Bento do Sapucaí',
            state: 'São Paulo',
            country: 'Brasil',
          },
        }],
      },
      []
    );

    const result = await service.geocodeAddress('Pousada Refúgio dos Palmares, Quilombo, São Bento do Sapucaí, SP, Brasil');

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchUrlAt(fetchMock, 0)).toContain('photon.komoot.io');
    expect(fetchUrlAt(fetchMock, 1)).toContain('nominatim.openstreetmap.org');
  });
});

describe('GeoLocationService — estimateRoute', () => {
  it('returns null for invalid origin', () => {
    expect(estimateRoute({ lat: NaN, lng: -46.63 }, { lat: -23.56, lng: -46.64 })).toBeNull();
  });

  it('returns null for invalid destination', () => {
    expect(estimateRoute({ lat: -23.55, lng: -46.63 }, { lat: NaN, lng: NaN })).toBeNull();
  });

  it('very close points return 0 distance, 1 min', () => {
    const origin = { lat: -23.55052, lng: -46.633308 };
    const dest = { lat: -23.55053, lng: -46.633310 };
    const result = estimateRoute(origin, dest)!;
    expect(result.distanceKm).toBe(0);
    expect(result.durationMin).toBe(1);
    expect(result.estimated).toBe(true);
  });

  it('~1km distance uses road factor and returns reasonable ETA', () => {
    const origin = { lat: -23.55052, lng: -46.633308 };
    const dest = { lat: -23.5580, lng: -46.6280 };
    const result = estimateRoute(origin, dest)!;
    expect(result.distanceKm).toBeGreaterThan(0.5);
    expect(result.distanceKm).toBeLessThan(3);
    expect(result.durationMin).toBeGreaterThanOrEqual(4);
    expect(result.estimated).toBe(true);
  });

  it('~5km distance returns higher ETA', () => {
    const origin = { lat: -23.55052, lng: -46.633308 };
    const dest = { lat: -23.5900, lng: -46.6700 };
    const result = estimateRoute(origin, dest)!;
    expect(result.distanceKm).toBeGreaterThan(3);
    expect(result.durationMin).toBeGreaterThan(5);
  });
});
