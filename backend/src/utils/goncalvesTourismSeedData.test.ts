import { describe, expect, it } from 'vitest';
import {
  GONCALVES_DESTINATION_SEED,
  GONCALVES_HOSPITALITY_SEEDS,
  GONCALVES_LISTING_SEEDS,
} from './goncalvesTourismSeedData';

const phoneDigits = (value?: string) => String(value || '').replace(/\D/g, '');

const localPhoneDigits = (value?: string) => {
  const digits = phoneDigits(value);
  return digits.startsWith('55') ? digits.slice(2) : digits;
};

describe('goncalvesTourismSeedData', () => {
  it('keeps Goncalves destination normalized for the public route', () => {
    expect(GONCALVES_DESTINATION_SEED.slug).toBe('goncalves');
    expect(GONCALVES_DESTINATION_SEED.city).toBe('Gonçalves');
    expect(GONCALVES_DESTINATION_SEED.state).toBe('MG');
    expect(GONCALVES_DESTINATION_SEED.lat).toBeLessThan(0);
    expect(GONCALVES_DESTINATION_SEED.lng).toBeLessThan(0);
  });

  it('keeps hospitality slugs unique and ready for idempotent upsert', () => {
    const slugs = GONCALVES_HOSPITALITY_SEEDS.map((seed) => seed.slug);

    expect(GONCALVES_HOSPITALITY_SEEDS.length).toBe(53);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it('keeps listing titles unique so the seed can safely refresh its own records', () => {
    const titles = GONCALVES_LISTING_SEEDS.map((seed) => seed.title);

    expect(GONCALVES_LISTING_SEEDS.length).toBe(36);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('only marks mobile numbers as whatsapp contacts', () => {
    const whatsappNumbers = [
      ...GONCALVES_HOSPITALITY_SEEDS.map((seed) => seed.whatsapp),
      ...GONCALVES_LISTING_SEEDS.map((seed) => seed.whatsapp),
    ].filter(Boolean);

    expect(whatsappNumbers.length).toBeGreaterThan(60);
    expect(whatsappNumbers.every((phone) => /^\d{2}9\d{8}$/.test(localPhoneDigits(phone)))).toBe(true);
  });

  it('covers lodging plus restaurant and local experience categories', () => {
    const placeTypes = new Set(GONCALVES_HOSPITALITY_SEEDS.map((seed) => seed.type));
    const categories = new Set(GONCALVES_LISTING_SEEDS.map((seed) => seed.category));

    expect(placeTypes.has('CHALE')).toBe(true);
    expect(placeTypes.has('POUSADA')).toBe(true);
    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
    expect(categories.has('LOJA')).toBe(true);
  });
});
