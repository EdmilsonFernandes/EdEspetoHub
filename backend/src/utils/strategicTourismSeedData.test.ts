import { describe, expect, it } from 'vitest';
import { STRATEGIC_TOURISM_DESTINATION_SEEDS } from './strategicTourismSeedData';

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

describe('strategicTourismSeedData', () => {
  it('keeps all mapped strategic destinations normalized and uniquely ordered', () => {
    const slugs = STRATEGIC_TOURISM_DESTINATION_SEEDS.map((seed) => seed.destination.slug);
    const sortOrders = STRATEGIC_TOURISM_DESTINATION_SEEDS.map((seed) => seed.destination.sortOrder);

    expect(STRATEGIC_TOURISM_DESTINATION_SEEDS).toHaveLength(8);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
    expect(sortOrders.every((order) => order >= 55 && order <= 90)).toBe(true);
  });

  it('keeps each destination useful for the first public listing', () => {
    for (const seed of STRATEGIC_TOURISM_DESTINATION_SEEDS) {
      expect(seed.destination.name).toBeTruthy();
      expect(seed.destination.city).toBeTruthy();
      expect(seed.destination.state).toMatch(/^[A-Z]{2}$/);
      expect(seed.hospitality.length).toBeGreaterThanOrEqual(2);
      expect(seed.listings.length).toBeGreaterThanOrEqual(4);
      expect(seed.listings.some((listing) => listing.featured)).toBe(true);
    }
  });

  it('keeps upsert keys unique inside every destination', () => {
    for (const seed of STRATEGIC_TOURISM_DESTINATION_SEEDS) {
      const placeSlugs = seed.hospitality.map((place) => place.slug);
      const listingTitles = seed.listings.map((listing) => listing.title.toLowerCase());

      expect(new Set(placeSlugs).size).toBe(placeSlugs.length);
      expect(new Set(listingTitles).size).toBe(listingTitles.length);
    }
  });

  it('stores only regional coordinates and no copied public images', () => {
    for (const seed of STRATEGIC_TOURISM_DESTINATION_SEEDS) {
      const resources = [
        ...seed.hospitality,
        ...seed.listings,
      ];

      expect(resources.every((resource) => !(resource as any).imageUrl && !(resource as any).bannerUrl && !(resource as any).logoUrl)).toBe(true);
      expect(resources.every((resource) => resource.geo.lat < 0 && resource.geo.lng < 0)).toBe(true);
      expect(
        resources.every((resource) =>
          distanceKmBetween(
            seed.destination.lat,
            seed.destination.lng,
            resource.geo.lat,
            resource.geo.lng
          ) <= 35
        )
      ).toBe(true);
    }
  });

  it('keeps the batch focused on tourism value for the visitor', () => {
    const categories = new Set(
      STRATEGIC_TOURISM_DESTINATION_SEEDS.flatMap((seed) => seed.listings.map((listing) => listing.category))
    );

    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('LOJA')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('ATRATIVO')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
  });
});
