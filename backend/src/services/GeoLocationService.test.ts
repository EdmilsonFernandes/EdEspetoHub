import { describe, it, expect } from 'vitest';
import { GeoLocationService } from './GeoLocationService';

const service = new GeoLocationService();
const estimateRoute = service.estimateRoute.bind(service);

describe('GeoLocationService — estimateRoute', () => {
  it('returns null for invalid origin', () => {
    expect(estimateRoute({ lat: NaN, lng: -46.63 }, { lat: -23.56, lng: -46.64 })).toBeNull();
  });

  it('returns null for invalid destination', () => {
    expect(estimateRoute({ lat: -23.55, lng: -46.63 }, { lat: NaN, lng: NaN })).toBeNull();
  });

  it('very close points return 0 distance, 1 min', () => {
    const origin = { lat: -23.55052, lng: -46.633308 };
    const dest = { lat: -23.55053, lng: -46.633310 };
    const result = estimateRoute(origin, dest)!;
    expect(result.distanceKm).toBe(0);
    expect(result.durationMin).toBe(1);
    expect(result.estimated).toBe(true);
  });

  it('~1km distance uses road factor and returns reasonable ETA', () => {
    const origin = { lat: -23.55052, lng: -46.633308 };
    const dest = { lat: -23.5580, lng: -46.6280 };
    const result = estimateRoute(origin, dest)!;
    expect(result.distanceKm).toBeGreaterThan(0.5);
    expect(result.distanceKm).toBeLessThan(3);
    expect(result.durationMin).toBeGreaterThanOrEqual(4);
    expect(result.estimated).toBe(true);
  });

  it('~5km distance returns higher ETA', () => {
    const origin = { lat: -23.55052, lng: -46.633308 };
    const dest = { lat: -23.5900, lng: -46.6700 };
    const result = estimateRoute(origin, dest)!;
    expect(result.distanceKm).toBeGreaterThan(3);
    expect(result.durationMin).toBeGreaterThan(5);
  });
});
