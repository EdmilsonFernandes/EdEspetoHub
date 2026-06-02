import { describe, expect, it } from 'vitest';
import {
  CUNHA_DESTINATION_SEED,
  CUNHA_HOSPITALITY_SEEDS,
  CUNHA_LISTING_SEEDS,
} from './cunhaTourismSeedData';

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

describe('cunhaTourismSeedData', () => {
  it('keeps Cunha destination normalized for the public route', () => {
    expect(CUNHA_DESTINATION_SEED.slug).toBe('cunha');
    expect(CUNHA_DESTINATION_SEED.city).toBe('Cunha');
    expect(CUNHA_DESTINATION_SEED.state).toBe('SP');
    expect(CUNHA_DESTINATION_SEED.sortOrder).toBe(50);
    expect(CUNHA_DESTINATION_SEED.lat).toBeLessThan(0);
    expect(CUNHA_DESTINATION_SEED.lng).toBeLessThan(0);
  });

  it('keeps hospitality slugs unique and ready for idempotent upsert', () => {
    const slugs = CUNHA_HOSPITALITY_SEEDS.map((seed) => seed.slug);

    expect(CUNHA_HOSPITALITY_SEEDS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it('keeps listing titles unique so the seed can safely refresh its own records', () => {
    const titles = CUNHA_LISTING_SEEDS.map((seed) => seed.title);

    expect(CUNHA_LISTING_SEEDS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('stores only regional coordinates and no copied public images', () => {
    const seeds = [
      ...CUNHA_HOSPITALITY_SEEDS,
      ...CUNHA_LISTING_SEEDS,
    ];

    expect(seeds.every((seed) => !(seed as any).imageUrl && !(seed as any).bannerUrl && !(seed as any).logoUrl)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lat >= -23.25 && seed.geo.lat <= -23.03)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lng >= -45.03 && seed.geo.lng <= -44.80)).toBe(true);
    expect(
      seeds.every((seed) =>
        distanceKmBetween(
          CUNHA_DESTINATION_SEED.lat,
          CUNHA_DESTINATION_SEED.lng,
          seed.geo.lat,
          seed.geo.lng
        ) <= 21
      )
    ).toBe(true);
  });

  it('covers lodging plus restaurants, local shops, attractions and experiences', () => {
    const placeTypes = new Set(CUNHA_HOSPITALITY_SEEDS.map((seed) => seed.type));
    const categories = new Set(CUNHA_LISTING_SEEDS.map((seed) => seed.category));

    expect(placeTypes.has('POUSADA')).toBe(true);
    expect(placeTypes.has('HOTEL')).toBe(true);
    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('LOJA')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('ATRATIVO')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
  });

  it('does not mark landline numbers as whatsapp contacts', () => {
    const whatsappNumbers = [
      ...CUNHA_HOSPITALITY_SEEDS.map((seed) => seed.whatsapp),
      ...CUNHA_LISTING_SEEDS.map((seed) => seed.whatsapp),
    ].filter(Boolean);

    expect(whatsappNumbers).toHaveLength(0);
  });
});
