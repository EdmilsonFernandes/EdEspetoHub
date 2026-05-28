import { describe, expect, it } from 'vitest';
import { StoreController } from './StoreController';

const enrichStoreGeoPayload = (StoreController as any).enrichStoreGeoPayload.bind(StoreController);
const sortStoresForLocation = (StoreController as any).sortStoresForLocation.bind(StoreController);

const baseStore = (overrides: Record<string, any> = {}) => ({
  id: overrides.id || 'store-1',
  openNow: overrides.openNow ?? true,
  reviewSummary: { avgStoreRating: 4.8 },
  settings: {
    orderTypes: overrides.orderTypes || ['pickup'],
    city: overrides.city || 'São José dos Campos',
    state: overrides.state || 'SP',
    lat: overrides.lat ?? -23.2398493,
    lng: overrides.lng ?? -45.9027298,
    postalEnabled: overrides.postalEnabled ?? false,
    deliveryRadiusKm: overrides.deliveryRadiusKm ?? 5,
  },
});

describe('StoreController geo availability', () => {
  it('keeps far pickup stores visible as pickup/cardapio options', () => {
    const payload = enrichStoreGeoPayload(baseStore(), {
      lat: -15.2475,
      lng: -40.2478,
      city: 'Itapetinga',
      state: 'BA',
    });

    expect(payload.geoAvailability).toBe('pickup_available');
    expect(payload.isOutOfRegion).toBe(false);
    expect(payload.deliveryStatusLabel).toBe('Retirada disponível');
  });

  it('marks delivery-only stores outside the delivery area without hiding pickup stores', () => {
    const payload = enrichStoreGeoPayload(baseStore({ orderTypes: ['delivery'] }), {
      lat: -15.2475,
      lng: -40.2478,
      city: 'Itapetinga',
      state: 'BA',
    });

    expect(payload.geoAvailability).toBe('outside_radius');
    expect(payload.isOutOfRegion).toBe(true);
    expect(payload.deliveryStatusLabel).toBe('Entrega fora da área');
  });

  it('keeps same-city pickup available even when precise coordinates are missing', () => {
    const payload = enrichStoreGeoPayload(baseStore(), {
      lat: null,
      lng: null,
      city: 'São José dos Campos',
      state: 'SP',
    });

    expect(payload.geoAvailability).toBe('same_city_pickup');
    expect(payload.isOutOfRegion).toBe(false);
    expect(payload.deliveryStatusLabel).toBe('Retirada disponível');
  });

  it('keeps postal stores available regardless of customer distance', () => {
    const payload = enrichStoreGeoPayload(
      baseStore({ orderTypes: ['delivery', 'pickup'], postalEnabled: true }),
      {
        lat: -15.2475,
        lng: -40.2478,
        city: 'Itapetinga',
        state: 'BA',
      }
    );

    expect(payload.geoAvailability).toBe('postal_everywhere');
    expect(payload.isOutOfRegion).toBe(false);
    expect(payload.deliveryStatusLabel).toBe('Entrega postal disponível');
  });

  it('sorts local coverage before remote pickup stores', () => {
    const localPickup = enrichStoreGeoPayload(baseStore({ id: 'local' }), {
      lat: null,
      lng: null,
      city: 'São José dos Campos',
      state: 'SP',
    });
    const remotePickup = enrichStoreGeoPayload(baseStore({ id: 'remote' }), {
      lat: -15.2475,
      lng: -40.2478,
      city: 'Itapetinga',
      state: 'BA',
    });

    expect(sortStoresForLocation([remotePickup, localPickup]).map((store: any) => store.id)).toEqual([
      'local',
      'remote',
    ]);
  });
});
