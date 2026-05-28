import { describe, expect, it, vi } from 'vitest';
import { ZipCodeLookupService } from './ZipCodeLookupService';

const cachedZip = {
  zipCode: '12490000',
  street: 'Rua Teste',
  district: 'Centro',
  city: 'São Bento do Sapucaí',
  state: 'SP',
  ibgeCode: null,
  latitude: null,
  longitude: null,
  provider: 'cache',
};

describe('ZipCodeLookupService', () => {
  it('upgrades cached CEP rows that still do not have coordinates', async () => {
    const service = new ZipCodeLookupService() as any;
    const resolved = {
      ...cachedZip,
      latitude: -22.687778,
      longitude: -45.731945,
      provider: 'cache+fallback',
    };
    vi.spyOn(service, 'fromCache').mockResolvedValue(cachedZip);
    vi.spyOn(service, 'lookupCoordinateFallback').mockResolvedValue(resolved);
    const persistSpy = vi.spyOn(service, 'persist').mockResolvedValue(undefined);

    const result = await service.lookup('12490-000');

    expect(result).toEqual(resolved);
    expect(persistSpy).toHaveBeenCalledWith(resolved);
  });
});
