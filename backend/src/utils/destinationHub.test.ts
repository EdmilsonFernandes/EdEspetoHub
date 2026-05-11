import { describe, expect, it } from 'vitest';
import {
  buildDestinationStoreMatchMeta,
  normalizeDestinationListingCategory,
  normalizeDestinationPartnerType,
  normalizeDestinationSlug,
  normalizeHospitalityPlaceType,
  toNullableNumber,
  toOptionalText,
} from './destinationHub';

describe('destinationHub utils', () => {
  it('normalizes destination slugs with accents and spaces', () => {
    expect(normalizeDestinationSlug(' São Bento do Sapucaí ')).toBe('sao-bento-do-sapucai');
    expect(normalizeDestinationSlug('São Francisco Xavier/SP')).toBe('sao-francisco-xaviersp');
  });

  it('falls back to safe domain enums', () => {
    expect(normalizeDestinationPartnerType('service-provider')).toBe('SERVICE_PROVIDER');
    expect(normalizeDestinationPartnerType('unknown')).toBe('HOSPITALITY');
    expect(normalizeHospitalityPlaceType('pousada')).toBe('POUSADA');
    expect(normalizeHospitalityPlaceType('x')).toBe('CHALE');
    expect(normalizeDestinationListingCategory('restaurante visitar')).toBe('RESTAURANTE_VISITAR');
    expect(normalizeDestinationListingCategory('x')).toBe('SERVICO');
  });

  it('sanitizes optional scalar values', () => {
    expect(toNullableNumber('12,50')).toBe(12.5);
    expect(toNullableNumber('abc')).toBeNull();
    expect(toOptionalText('  Vale  ')).toBe('Vale');
    expect(toOptionalText('   ')).toBeNull();
  });

  it('recommends destination options by store city and distance', () => {
    const sameCity = buildDestinationStoreMatchMeta(
      { city: 'São Bento do Sapucaí', state: 'SP' },
      { city: 'Sao Bento do Sapucai', state: 'SP' }
    );
    expect(sameCity.recommended).toBe(true);
    expect(sameCity.reason).toBe('same_city');
    expect(sameCity.rank).toBe(0);

    const nearby = buildDestinationStoreMatchMeta(
      { lat: -22.6867, lng: -45.7319, deliveryRadiusKm: 30 },
      { lat: -22.6833, lng: -45.7289 }
    );
    expect(nearby.recommended).toBe(true);
    expect(nearby.reason).toBe('within_delivery_radius');
    expect(nearby.distanceKm).toBeLessThan(5);

    const outsideRegion = buildDestinationStoreMatchMeta(
      { city: 'São Bento do Sapucaí', state: 'SP', lat: -22.6867, lng: -45.7319, deliveryRadiusKm: 20 },
      { city: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729 }
    );
    expect(outsideRegion.recommended).toBe(false);
    expect(outsideRegion.reason).toBe('outside_region');
  });
});
