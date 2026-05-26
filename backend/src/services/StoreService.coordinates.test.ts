import { describe, expect, it, vi } from 'vitest';
import { StoreService } from './StoreService';

describe('StoreService coordinate handling', () => {
  it('does not treat blank coordinates as zero', () => {
    const service = new StoreService() as any;

    expect(service.parseCoordinate('')).toBeNull();
    expect(service.parseCoordinate('   ')).toBeNull();
    expect(service.parseCoordinate(null)).toBeNull();
  });

  it('rejects 0,0 as a store coordinate', () => {
    const service = new StoreService() as any;

    expect(() => service.assertResolvedCoordinates(0, 0)).toThrow();
    expect(() => service.assertResolvedCoordinates(-23.2398493, -45.9027298)).not.toThrow();
  });

  it('refreshes persisted 0,0 coordinates from the store address', async () => {
    const service = new StoreService() as any;
    const save = vi.fn(async (store) => store);
    const geocodeAddress = vi.fn(async () => ({
      lat: -23.2398493,
      lng: -45.9027298,
      formattedAddress: 'Rua Sebastiao Sorato, Sao Jose dos Campos, SP',
    }));

    service.storeRepository = { save };
    service.geoLocationService = { geocodeAddress };

    const store = {
      id: 'store-id',
      slug: 'loja-teste',
      settings: {
        address: 'Rua Sebastiao Sorato, 200 | Condominio Spazio Campo Azuli',
        city: 'Sao Jose dos Campos',
        state: 'SP',
        lat: 0,
        lng: 0,
      },
      owner: {
        address: 'Rua Sebastiao Sorato, 200 | Condominio Spazio Campo Azuli',
      },
    };

    const result = await service.ensureStoreCoordinates(store as any);

    expect(geocodeAddress).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(store);
    expect(result.settings.lat).toBe(-23.2398493);
    expect(result.settings.lng).toBe(-45.9027298);
  });
});
