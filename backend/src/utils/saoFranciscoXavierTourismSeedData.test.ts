import { describe, expect, it } from 'vitest';
import {
  SAO_FRANCISCO_XAVIER_DESTINATION_SEED,
  SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS,
  SAO_FRANCISCO_XAVIER_LISTING_SEEDS,
} from './saoFranciscoXavierTourismSeedData';

const phoneDigits = (value?: string) => String(value || '').replace(/\D/g, '');

const localPhoneDigits = (value?: string) => {
  const digits = phoneDigits(value);
  return digits.startsWith('55') ? digits.slice(2) : digits;
};

const distanceKmBetween = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

describe('saoFranciscoXavierTourismSeedData', () => {
  it('keeps Sao Francisco Xavier destination normalized for the public route', () => {
    expect(SAO_FRANCISCO_XAVIER_DESTINATION_SEED.slug).toBe('sao-francisco-xavier');
    expect(SAO_FRANCISCO_XAVIER_DESTINATION_SEED.city).toBe('São Francisco Xavier');
    expect(SAO_FRANCISCO_XAVIER_DESTINATION_SEED.state).toBe('SP');
    expect(SAO_FRANCISCO_XAVIER_DESTINATION_SEED.lat).toBeLessThan(0);
    expect(SAO_FRANCISCO_XAVIER_DESTINATION_SEED.lng).toBeLessThan(0);
  });

  it('keeps hospitality slugs unique and ready for idempotent upsert', () => {
    const slugs = SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS.map((seed) => seed.slug);

    expect(SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it('keeps listing titles unique so the seed can safely refresh its own records', () => {
    const titles = SAO_FRANCISCO_XAVIER_LISTING_SEEDS.map((seed) => seed.title);

    expect(SAO_FRANCISCO_XAVIER_LISTING_SEEDS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('stores only trusted regional coordinates and no copied public images', () => {
    const seeds = [
      ...SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS,
      ...SAO_FRANCISCO_XAVIER_LISTING_SEEDS,
    ];

    expect(seeds.every((seed) => !(seed as any).imageUrl && !(seed as any).bannerUrl && !(seed as any).logoUrl)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lat >= -23 && seed.geo.lat <= -22.8)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lng >= -46.1 && seed.geo.lng <= -45.9)).toBe(true);
    expect(
      seeds.every((seed) =>
        distanceKmBetween(
          SAO_FRANCISCO_XAVIER_DESTINATION_SEED.lat,
          SAO_FRANCISCO_XAVIER_DESTINATION_SEED.lng,
          seed.geo.lat,
          seed.geo.lng
        ) <= 8
      )
    ).toBe(true);
  });

  it('only marks mobile numbers as whatsapp contacts', () => {
    const whatsappNumbers = [
      ...SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS.map((seed) => seed.whatsapp),
      ...SAO_FRANCISCO_XAVIER_LISTING_SEEDS.map((seed) => seed.whatsapp),
    ].filter(Boolean);

    expect(whatsappNumbers.length).toBeGreaterThanOrEqual(8);
    expect(whatsappNumbers.every((phone) => /^\d{2}9\d{8}$/.test(localPhoneDigits(phone)))).toBe(true);
  });

  it('covers lodging plus restaurant, local shops, attractions and experiences', () => {
    const placeTypes = new Set(SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS.map((seed) => seed.type));
    const categories = new Set(SAO_FRANCISCO_XAVIER_LISTING_SEEDS.map((seed) => seed.category));

    expect(placeTypes.has('CHALE')).toBe(true);
    expect(placeTypes.has('POUSADA')).toBe(true);
    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('LOJA')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('ATRATIVO')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
  });
});
