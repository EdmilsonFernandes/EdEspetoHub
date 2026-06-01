import { describe, expect, it, vi } from 'vitest';
import { DestinationService } from './DestinationService';

const makeService = () => new DestinationService() as any;

describe('DestinationService coordinate resolver', () => {
  it('tries full address candidates without letting broad CEP dominate the search', async () => {
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

    expect(coordinates).toEqual(expect.objectContaining({
      lat: -23.1826081,
      lng: -45.885768,
      geoSource: 'geocoder',
      geoPrecision: 'street',
      geoVerified: false,
      formattedAddress: 'Estrada Humberto Saboya de Albuquerque, São Francisco Xavier, São José dos Campos - SP',
    }));
    expect(zipLookupSpy).toHaveBeenCalledWith('12249007');
    expect(geocodeSpy).toHaveBeenCalledTimes(2);
    expect(geocodeSpy).toHaveBeenNthCalledWith(
      1,
      'Estrada Humberto Saboya de Albuquerque, 1700, Centro (São Francisco Xavier), São José dos Campos, SP, Brasil'
    );
    expect(geocodeSpy).toHaveBeenNthCalledWith(
      2,
      '1700 Estrada Humberto Saboya de Albuquerque, Centro (São Francisco Xavier), São José dos Campos, SP, Brasil'
    );
  });

  it('prefers manually edited street and district over CEP provider fields', async () => {
    const service = makeService();
    vi.spyOn(service.zipCodeLookupService, 'lookup').mockResolvedValue({
      zipCode: '12490000',
      street: 'Centro',
      district: 'Centro',
      city: 'São Bento do Sapucaí',
      state: 'SP',
      ibgeCode: null,
      latitude: null,
      longitude: null,
      provider: 'test',
    });
    const geocodeSpy = vi.spyOn(service.geoLocationService, 'geocodeAddress').mockResolvedValue({
      lat: -22.68301,
      lng: -45.72491,
      formattedAddress: 'Rua Projetada, Quilombo, São Bento do Sapucaí - SP',
    });

    const coordinates = await service.resolveDestinationCoordinates({
      address: 'Rua Projetada',
      addressNumber: '42',
      district: 'Quilombo',
      city: 'São Bento do Sapucaí',
      state: 'SP',
      zipCode: '12490-000',
      lat: null,
      lng: null,
      scope: 'destination_listing',
    });

    expect(coordinates).toEqual(expect.objectContaining({
      lat: -22.68301,
      lng: -45.72491,
      geoSource: 'geocoder',
      geoPrecision: 'street',
    }));
    expect(geocodeSpy).toHaveBeenCalledTimes(1);
    expect(geocodeSpy).toHaveBeenCalledWith(
      'Rua Projetada, 42, Quilombo, São Bento do Sapucaí, SP, Brasil'
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

    expect(coordinates).toEqual(expect.objectContaining({
      lat: -23.1826081,
      lng: -45.885768,
      geoSource: 'zip_code',
      geoPrecision: 'zip',
      geoVerified: false,
    }));
  });

  it('falls back to destination coordinates when CEP and geocoding do not resolve a precise point', async () => {
    const service = makeService();
    vi.spyOn(service.zipCodeLookupService, 'lookup').mockResolvedValue({
      zipCode: '12490000',
      street: null,
      district: null,
      city: 'São Bento do Sapucaí',
      state: 'SP',
      ibgeCode: null,
      latitude: null,
      longitude: null,
      provider: 'test',
    });
    vi.spyOn(service.geoLocationService, 'geocodeAddress').mockResolvedValue(null);

    const coordinates = await service.resolveDestinationCoordinates({
      address: 'Rua Santa Edwiges, 100 - Quilombo',
      addressNumber: '900',
      district: 'Quilombo',
      city: 'São Bento do Sapucaí',
      state: 'SP',
      zipCode: '12490-000',
      lat: null,
      lng: null,
      fallbackLat: -22.687778,
      fallbackLng: -45.731945,
      scope: 'hospitality_place',
    });

    expect(coordinates).toEqual(expect.objectContaining({
      lat: -22.687778,
      lng: -45.731945,
      geoSource: 'city_fallback',
      geoPrecision: 'city',
      geoVerified: false,
    }));
  });

  it('does not geocode city-only data as a street-level coordinate', async () => {
    const service = makeService();
    vi.spyOn(service.zipCodeLookupService, 'lookup').mockResolvedValue({
      zipCode: '12490000',
      street: null,
      district: null,
      city: 'São Bento do Sapucaí',
      state: 'SP',
      ibgeCode: null,
      latitude: null,
      longitude: null,
      provider: 'test',
    });
    const geocodeSpy = vi.spyOn(service.geoLocationService, 'geocodeAddress').mockResolvedValue({
      lat: -22.687778,
      lng: -45.731945,
      formattedAddress: 'São Bento do Sapucaí, SP',
    });

    const coordinates = await service.resolveDestinationCoordinates({
      address: '',
      city: 'São Bento do Sapucaí',
      state: 'SP',
      zipCode: '12490-000',
      lat: null,
      lng: null,
      fallbackLat: -22.687778,
      fallbackLng: -45.731945,
      scope: 'hospitality_place',
    });

    expect(geocodeSpy).not.toHaveBeenCalled();
    expect(coordinates).toEqual(expect.objectContaining({
      lat: -22.687778,
      lng: -45.731945,
      geoSource: 'city_fallback',
      geoPrecision: 'city',
    }));
  });

  it('ignores stale submitted coordinates when an address changes', () => {
    const service = makeService();
    const coordinates = service.submittedCoordinatesForAddressChange(
      {
        zipCode: '40301-110',
        address: 'Rua da Bahia',
        lat: '-22.687778',
        lng: '-45.731945',
      },
      {
        zipCode: '12490-000',
        address: 'Rua antiga',
        lat: -22.687778,
        lng: -45.731945,
      },
      true
    );

    expect(coordinates).toEqual({
      lat: null,
      lng: null,
      hasCoordinateInput: false,
    });
  });
});
