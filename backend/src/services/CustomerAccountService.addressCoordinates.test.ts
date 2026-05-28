import { describe, expect, it, vi } from 'vitest';
import { CustomerAccountService } from './CustomerAccountService';

describe('CustomerAccountService — coordenadas de endereco', () => {
  it('usa fallback por cidade/CEP quando rua completa nao resolve coordenadas', async () => {
    const service = new CustomerAccountService() as any;
    service.zipCodeLookupService = {
      lookup: vi.fn().mockResolvedValue({
        zipCode: '45700000',
        street: null,
        district: null,
        city: 'Itapetinga',
        state: 'BA',
        ibgeCode: null,
        latitude: null,
        longitude: null,
        provider: 'test',
      }),
    };
    service.geoLocationService = {
      geocodeAddress: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ lat: -15.2475, lng: -40.2478, formattedAddress: 'Itapetinga, BA' }),
    };

    const coordinates = await service.resolveAddressCoordinates({
      cep: '45700000',
      street: 'rua lindoma4',
      number: '751',
      neighborhood: 'lanches',
      city: 'Itapetinga',
      state: 'BA',
    });

    expect(coordinates).toEqual({ lat: -15.2475, lng: -40.2478 });
    expect(service.geoLocationService.geocodeAddress).toHaveBeenCalledWith(
      expect.stringContaining('Itapetinga, BA')
    );
  });
});
