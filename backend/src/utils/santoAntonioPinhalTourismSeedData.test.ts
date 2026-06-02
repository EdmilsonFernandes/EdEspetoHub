import { describe, expect, it } from 'vitest';
import {
  SANTO_ANTONIO_PINHAL_DESTINATION_SEED,
  SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS,
  SANTO_ANTONIO_PINHAL_LISTING_SEEDS,
} from './santoAntonioPinhalTourismSeedData';

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

describe('santoAntonioPinhalTourismSeedData', () => {
  it('keeps Santo Antonio do Pinhal destination normalized for the public route', () => {
    expect(SANTO_ANTONIO_PINHAL_DESTINATION_SEED.slug).toBe('santo-antonio-do-pinhal');
    expect(SANTO_ANTONIO_PINHAL_DESTINATION_SEED.city).toBe('Santo Antônio do Pinhal');
    expect(SANTO_ANTONIO_PINHAL_DESTINATION_SEED.state).toBe('SP');
    expect(SANTO_ANTONIO_PINHAL_DESTINATION_SEED.lat).toBeLessThan(0);
    expect(SANTO_ANTONIO_PINHAL_DESTINATION_SEED.lng).toBeLessThan(0);
  });

  it('keeps hospitality slugs unique and ready for idempotent upsert', () => {
    const slugs = SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS.map((seed) => seed.slug);

    expect(SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it('keeps listing titles unique so the seed can safely refresh its own records', () => {
    const titles = SANTO_ANTONIO_PINHAL_LISTING_SEEDS.map((seed) => seed.title);

    expect(SANTO_ANTONIO_PINHAL_LISTING_SEEDS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('stores only regional coordinates and no copied public images', () => {
    const seeds = [
      ...SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS,
      ...SANTO_ANTONIO_PINHAL_LISTING_SEEDS,
    ];

    expect(seeds.every((seed) => !(seed as any).imageUrl && !(seed as any).bannerUrl && !(seed as any).logoUrl)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lat >= -22.9 && seed.geo.lat <= -22.75)).toBe(true);
    expect(seeds.every((seed) => seed.geo.lng >= -45.75 && seed.geo.lng <= -45.62)).toBe(true);
    expect(
      seeds.every((seed) =>
        distanceKmBetween(
          SANTO_ANTONIO_PINHAL_DESTINATION_SEED.lat,
          SANTO_ANTONIO_PINHAL_DESTINATION_SEED.lng,
          seed.geo.lat,
          seed.geo.lng
        ) <= 11
      )
    ).toBe(true);
  });

  it('only marks mobile numbers as whatsapp contacts', () => {
    const whatsappNumbers = [
      ...SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS.map((seed) => seed.whatsapp),
      ...SANTO_ANTONIO_PINHAL_LISTING_SEEDS.map((seed) => seed.whatsapp),
    ].filter(Boolean);

    expect(whatsappNumbers.length).toBeGreaterThanOrEqual(5);
    expect(whatsappNumbers.every((phone) => /^\d{2}9\d{8}$/.test(localPhoneDigits(phone)))).toBe(true);
  });

  it('covers lodging plus restaurant, local shops, attractions and experiences', () => {
    const placeTypes = new Set(SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS.map((seed) => seed.type));
    const categories = new Set(SANTO_ANTONIO_PINHAL_LISTING_SEEDS.map((seed) => seed.category));

    expect(placeTypes.has('POUSADA')).toBe(true);
    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('LOJA')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('ATRATIVO')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
  });
});
