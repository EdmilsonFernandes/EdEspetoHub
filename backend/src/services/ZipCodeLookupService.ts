import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { ZipCodeCache } from '../entities/ZipCodeCache';
import { logger } from '../utils/logger';

export type ZipCodeLookupResult = {
  zipCode: string;
  street: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  ibgeCode: string | null;
  latitude: number | null;
  longitude: number | null;
  provider: string;
};

type CachePayload = Omit<ZipCodeLookupResult, 'provider'> & { provider: string | null };

const parseCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeZipCode = (value: string) => String(value || '').replace(/\D/g, '').slice(0, 8);

const normalizeText = (value: unknown) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const normalizeState = (value: unknown) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized ? normalized.slice(0, 2) : null;
};

const normalizeLookupPayload = (payload: Partial<ZipCodeLookupResult> & { zipCode: string; provider: string }): ZipCodeLookupResult => ({
  zipCode: normalizeZipCode(payload.zipCode),
  street: normalizeText(payload.street),
  district: normalizeText(payload.district),
  city: normalizeText(payload.city),
  state: normalizeState(payload.state),
  ibgeCode: normalizeText(payload.ibgeCode),
  latitude: parseCoordinate(payload.latitude),
  longitude: parseCoordinate(payload.longitude),
  provider: String(payload.provider || 'unknown').trim() || 'unknown',
});

export class ZipCodeLookupService {
  private cacheRepo = AppDataSource.getRepository(ZipCodeCache);
  private log = logger.child({ scope: 'ZipCodeLookupService' });

  private async fromCache(zipCode: string): Promise<ZipCodeLookupResult | null> {
    const row = await this.cacheRepo.findOne({ where: { zipCode } });
    if (!row) return null;
    return normalizeLookupPayload({
      zipCode: row.zipCode,
      street: row.street,
      district: row.district,
      city: row.city,
      state: row.state,
      ibgeCode: row.ibgeCode,
      latitude: row.latitude,
      longitude: row.longitude,
      provider: row.provider || 'cache',
    });
  }

  private async persist(result: ZipCodeLookupResult) {
    const row = this.cacheRepo.create({
      zipCode: result.zipCode,
      street: result.street,
      district: result.district,
      city: result.city,
      state: result.state,
      ibgeCode: result.ibgeCode,
      latitude: result.latitude,
      longitude: result.longitude,
      provider: result.provider,
    } as Partial<ZipCodeCache>);
    await this.cacheRepo.upsert(row, [ 'zipCode' ]);
  }

  private async fetchJson(url: string) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Ja-no-Caminho/zip-lookup',
      },
    });
    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }
    return response.json();
  }

  private async lookupViaCep(zipCode: string): Promise<ZipCodeLookupResult | null> {
    const data = await this.fetchJson(`https://viacep.com.br/ws/${zipCode}/json/`);
    if (data?.erro) return null;
    return normalizeLookupPayload({
      zipCode,
      street: data?.logradouro,
      district: data?.bairro,
      city: data?.localidade,
      state: data?.uf,
      ibgeCode: data?.ibge,
      latitude: null,
      longitude: null,
      provider: 'viacep',
    });
  }

  private async lookupBrasilApiV1(zipCode: string): Promise<ZipCodeLookupResult | null> {
    const data = await this.fetchJson(`https://brasilapi.com.br/api/cep/v1/${zipCode}`);
    return normalizeLookupPayload({
      zipCode,
      street: data?.street,
      district: data?.neighborhood,
      city: data?.city,
      state: data?.state,
      ibgeCode: data?.city_ibge_code,
      latitude: null,
      longitude: null,
      provider: 'brasilapi_v1',
    });
  }

  private async lookupBrasilApiV2(zipCode: string): Promise<ZipCodeLookupResult | null> {
    const data = await this.fetchJson(`https://brasilapi.com.br/api/cep/v2/${zipCode}`);
    return normalizeLookupPayload({
      zipCode,
      street: data?.street,
      district: data?.neighborhood,
      city: data?.city,
      state: data?.state,
      ibgeCode: data?.city_ibge_code,
      latitude: data?.location?.coordinates?.latitude,
      longitude: data?.location?.coordinates?.longitude,
      provider: 'brasilapi_v2',
    });
  }

  private async lookupGoogleFallback(result: ZipCodeLookupResult): Promise<ZipCodeLookupResult | null> {
    if (!env.addressLookup.enableGoogleGeocodingFallback) return null;
    const parts = [ result.street, result.city, result.state, result.zipCode ].filter(Boolean);
    if (!parts.length) return null;
    try {
      const response = await fetch(`${env.etaV2.mapsBaseUrl}/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: parts.join(', ') }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { lat?: number; lng?: number };
      const latitude = parseCoordinate(payload?.lat);
      const longitude = parseCoordinate(payload?.lng);
      if (latitude === null || longitude === null) return null;
      return normalizeLookupPayload({
        ...result,
        latitude,
        longitude,
        provider: `${result.provider}+google`,
      });
    } catch (error) {
      this.log.warn('Google zip fallback failed', { zipCode: result.zipCode, error });
      return null;
    }
  }

  async lookup(rawZipCode: string): Promise<ZipCodeLookupResult> {
    const zipCode = normalizeZipCode(rawZipCode);
    if (zipCode.length !== 8) {
      throw new AppError('GEN-002', 400, { message: 'CEP inválido.' });
    }

    const cached = await this.fromCache(zipCode);
    if (cached) return cached;

    const providers = [
      () => this.lookupViaCep(zipCode),
      () => this.lookupBrasilApiV1(zipCode),
      () => this.lookupBrasilApiV2(zipCode),
    ];

    let bestResult: ZipCodeLookupResult | null = null;

    for (const provider of providers) {
      try {
        const result = await provider();
        if (!result) continue;
        const isMoreComplete =
          !bestResult ||
          ((bestResult.latitude === null || bestResult.longitude === null) &&
            result.latitude !== null &&
            result.longitude !== null);
        if (isMoreComplete) {
          bestResult = result;
        }
        if (bestResult?.street || bestResult?.city || bestResult?.state) {
          if (bestResult.latitude !== null && bestResult.longitude !== null) {
            await this.persist(bestResult);
            return bestResult;
          }
        }
      } catch (error) {
        this.log.warn('Zip provider failed', { zipCode, error });
      }
    }

    if (bestResult) {
      const fallback = await this.lookupGoogleFallback(bestResult);
      const resolved = fallback || bestResult;
      await this.persist(resolved);
      return resolved;
    }

    throw new AppError('GEN-001', 404, { message: 'CEP não encontrado. Verifique o número digitado.' });
  }
}
