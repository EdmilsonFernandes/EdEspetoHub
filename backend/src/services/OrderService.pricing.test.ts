import { describe, it, expect } from 'vitest';
import { OrderService } from './OrderService';

const service = new OrderService();
const resolveItemPrice = (service as any).resolveItemPrice.bind(service);
const resolveBundleDiscount = (service as any).resolveBundleDiscount.bind(service);

describe('OrderService — pricing', () => {
  describe('resolveItemPrice', () => {
    it('returns 0 for null product', () => {
      expect(resolveItemPrice(null)).toBe(0);
    });

    it('returns regular price when no promo', () => {
      expect(resolveItemPrice({ price: 12.5, promoActive: false })).toBe(12.5);
    });

    it('returns promo price when active', () => {
      expect(resolveItemPrice({ price: 12.5, promoActive: true, promoPrice: 9.9 })).toBe(9.9);
    });

    it('returns regular price when promo active but price is 0', () => {
      expect(resolveItemPrice({ price: 12.5, promoActive: true, promoPrice: 0 })).toBe(12.5);
    });

    it('returns regular price when promo active but price is null', () => {
      expect(resolveItemPrice({ price: 12.5, promoActive: true, promoPrice: null })).toBe(12.5);
    });
  });

  describe('resolveBundleDiscount', () => {
    const product = (overrides: any = {}) => ({
      price: 10,
      promoActive: false,
      bundlePromoActive: true,
      bundlePromoQty: 3,
      bundlePromoPrice: 25,
      ...overrides,
    });

    it('returns 0 when bundle inactive', () => {
      expect(resolveBundleDiscount(product({ bundlePromoActive: false }), 5)).toBe(0);
    });

    it('returns 0 when qty < bundleQty', () => {
      expect(resolveBundleDiscount(product(), 2)).toBe(0);
    });

    it('calculates discount for exact bundle qty', () => {
      // 3 units at 10 = 30, bundle price = 25, discount = 5
      expect(resolveBundleDiscount(product(), 3)).toBe(5);
    });

    it('calculates discount for multiple bundles', () => {
      // 6 units = 2 groups, each saves 5 = 10
      expect(resolveBundleDiscount(product(), 6)).toBe(10);
    });

    it('partial group gets no discount', () => {
      // 4 units = 1 full group (3) + 1 extra, discount = 5
      expect(resolveBundleDiscount(product(), 4)).toBe(5);
    });

    it('returns 0 when bundlePrice >= regular total', () => {
      expect(resolveBundleDiscount(product({ bundlePromoPrice: 30 }), 3)).toBe(0);
    });
  });
});
