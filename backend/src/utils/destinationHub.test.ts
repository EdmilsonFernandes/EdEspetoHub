import { describe, expect, it } from 'vitest';
import {
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
});
