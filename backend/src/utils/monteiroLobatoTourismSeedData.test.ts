import { describe, expect, it } from 'vitest';
import {
  MONTEIRO_LOBATO_DESTINATION_SEED,
  MONTEIRO_LOBATO_HOSPITALITY_SEEDS,
  MONTEIRO_LOBATO_LISTING_SEEDS,
} from './monteiroLobatoTourismSeedData';

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

describe('monteiroLobatoTourismSeedData', () => {
  it('keeps Monteiro Lobato destination normalized for the public route', () => {
    expect(MONTEIRO_LOBATO_DESTINATION_SEED.slug).toBe('monteiro-lobato');
    expect(MONTEIRO_LOBATO_DESTINATION_SEED.city).toBe('Monteiro Lobato');
    expect(MONTEIRO_LOBATO_DESTINATION_SEED.state).toBe('SP');
    expect(MONTEIRO_LOBATO_DESTINATION_SEED.lat).toBeLessThan(0);
    expect(MONTEIRO_LOBATO_DESTINATION_SEED.lng).toBeLessThan(0);
  });

  it('keeps hospitality slugs unique and ready for idempotent upsert', () => {
    const slugs = MONTEIRO_LOBATO_HOSPITALITY_SEEDS.map((seed) => seed.slug);

    expect(MONTEIRO_LOBATO_HOSPITALITY_SEEDS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it('keeps listing titles unique so the seed can safely refresh its own records', () => {
    const titles = MONTEIRO_LOBATO_LISTING_SEEDS.map((seed) => seed.title);

    expect(MONTEIRO_LOBATO_LISTING_SEEDS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('stores only regional coordinates and no copied public images', () => {
    const seeds = [
      ...MONTEIRO_LOBATO_HOSPITALITY_SEEDS,
      ...MONTEIRO_LOBATO_LISTING_SEEDS,
    ];

    expect(seeds.every((seed) => !(seed as any).imageUrl && !(seed as any).bannerUrl && !(seed as any).logoUrl)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lat >= -23.01 && seed.geo.lat <= -22.87)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lng >= -45.87 && seed.geo.lng <= -45.78)).toBe(true);
    expect(
      seeds.every((seed) =>
        distanceKmBetween(
          MONTEIRO_LOBATO_DESTINATION_SEED.lat,
          MONTEIRO_LOBATO_DESTINATION_SEED.lng,
          seed.geo.lat,
          seed.geo.lng
        ) <= 15
      )
    ).toBe(true);
  });

  it('covers lodging plus restaurant, local shops, attractions and experiences', () => {
    const placeTypes = new Set(MONTEIRO_LOBATO_HOSPITALITY_SEEDS.map((seed) => seed.type));
    const categories = new Set(MONTEIRO_LOBATO_LISTING_SEEDS.map((seed) => seed.category));

    expect(placeTypes.has('POUSADA')).toBe(true);
    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('LOJA')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('ATRATIVO')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
  });
});
