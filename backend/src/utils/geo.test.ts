import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, roundDistanceKm } from './geo';

describe('geo', () => {
  describe('calculateDistanceKm', () => {
    it('returns null when origin is null', () => {
      expect(calculateDistanceKm(null, { lat: -23.55, lng: -46.63 })).toBeNull();
    });

    it('returns null when destination has missing coords', () => {
      expect(calculateDistanceKm({ lat: -23.55, lng: -46.63 }, { lat: null, lng: null })).toBeNull();
    });

    it('returns 0 for same point', () => {
      const p = { lat: -23.55052, lng: -46.633308 };
      expect(calculateDistanceKm(p, p)).toBe(0);
    });

    it('calculates ~1.5km for known points in SP', () => {
      const origin = { lat: -23.55052, lng: -46.633308 };
      const dest = { lat: -23.5615, lng: -46.6253 };
      const dist = calculateDistanceKm(origin, dest)!;
      expect(dist).toBeGreaterThan(1);
      expect(dist).toBeLessThan(2);
    });

    it('supports lon alias', () => {
      const origin = { lat: -23.55, lon: -46.63 };
      const dest = { lat: -23.56, lon: -46.64 };
      expect(calculateDistanceKm(origin, dest)).toBeGreaterThan(0);
    });
  });

  describe('roundDistanceKm', () => {
    it('returns null for null', () => {
      expect(roundDistanceKm(null)).toBeNull();
    });

    it('rounds to 1 decimal by default', () => {
      expect(roundDistanceKm(1.456)).toBe(1.5);
    });

    it('rounds to specified decimals', () => {
      expect(roundDistanceKm(1.456, 2)).toBe(1.46);
    });
  });
});
