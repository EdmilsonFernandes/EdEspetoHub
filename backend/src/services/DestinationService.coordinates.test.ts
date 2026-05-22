import { describe, expect, it, vi } from 'vitest';
import { DestinationService } from './DestinationService';

const makeService = () => new DestinationService() as any;

describe('DestinationService coordinate resolver', () => {
  it('tries CEP-normalized address candidates before leaving coordinates empty', async () => {
    const service = makeService();
    const zipLookupSpy = vi.spyOn(service.zipCodeLookupService, 'lookup').mockResolvedValue({
      zipCode: '12249007',
      street: 'Estrada Humberto Saboya de Albuquerque',
      district: 'São Francisco Xavier',
      city: 'São José dos Campos',
      state: 'SP',
      ibgeCode: null,
      latitude: null,
      longitude: null,
      provider: 'test',
    });
    const geocodeSpy = vi.spyOn(service.geoLocationService, 'geocodeAddress')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        lat: -23.1826081,
        lng: -45.885768,
        formattedAddress: 'Estrada Humberto Saboya de Albuquerque, São Francisco Xavier, São José dos Campos - SP',
      });

    const coordinates = await service.resolveDestinationCoordinates({
      address: 'Estrada Humberto Saboya de Albuquerque',
      addressNumber: '1700',
      district: 'Centro (São Francisco Xavier)',
      city: 'São José dos Campos',
      state: 'SP',
      zipCode: '12249-007',
      lat: null,
      lng: null,
      scope: 'hospitality_place',
    });

    expect(coordinates).toEqual({ lat: -23.1826081, lng: -45.885768 });
    expect(zipLookupSpy).toHaveBeenCalledWith('12249007');
    expect(geocodeSpy).toHaveBeenCalledTimes(2);
    expect(geocodeSpy).toHaveBeenNthCalledWith(
      2,
      'Estrada Humberto Saboya de Albuquerque, 1700, São Francisco Xavier, São José dos Campos, SP, 12249007'
    );
  });

  it('uses CEP coordinates as fallback when geocoding does not resolve the address', async () => {
    const service = makeService();
    vi.spyOn(service.zipCodeLookupService, 'lookup').mockResolvedValue({
      zipCode: '12249000',
      street: 'Rua Sete de Setembro',
      district: 'São Francisco Xavier',
      city: 'São José dos Campos',
      state: 'SP',
      ibgeCode: null,
      latitude: -23.1826081,
      longitude: -45.885768,
      provider: 'test',
    });
    vi.spyOn(service.geoLocationService, 'geocodeAddress').mockResolvedValue(null);

    const coordinates = await service.resolveDestinationCoordinates({
      address: 'Rua Sete de Setembro',
      addressNumber: '212',
      district: 'São Francisco Xavier',
      city: 'São José dos Campos',
      state: 'SP',
      zipCode: '12249-000',
      lat: null,
      lng: null,
      scope: 'destination_listing',
    });

    expect(coordinates).toEqual({ lat: -23.1826081, lng: -45.885768 });
  });
});
