import { describe, it, expect } from 'vitest';
import { computeCouponDiscount, couponLabel, normalizeCouponCode } from './CouponService';
import type { Coupon } from '../entities/Coupon';

const couponFixture = (overrides: Partial<Coupon> = {}): Coupon =>
  ({
    id: 'coupon-1',
    storeId: 'store-1',
    code: 'BEMVINDO10',
    discountType: 'percent',
    discountValue: 10,
    minSubtotal: null,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Coupon);

describe('CouponService pure helpers', () => {
  it('normaliza código: trim, upper, sem espaços, máx 40', () => {
    expect(normalizeCouponCode('  bem vindo10 ')).toBe('BEMVINDO10');
    expect(normalizeCouponCode(null)).toBe('');
    expect(normalizeCouponCode('A'.repeat(60))).toHaveLength(40);
  });

  it('desconto percentual arredonda para centavos', () => {
    expect(computeCouponDiscount(couponFixture({ discountValue: 10 }), 99.9)).toBe(9.99);
    expect(computeCouponDiscount(couponFixture({ discountValue: 50 }), 80)).toBe(40);
  });

  it('desconto percentual nunca passa de 100% e subtotal nunca fica negativo', () => {
    expect(computeCouponDiscount(couponFixture({ discountValue: 150 }), 100)).toBe(100);
    expect(computeCouponDiscount(couponFixture({ discountValue: 10 }), -5)).toBe(0);
  });

  it('desconto fixo é limitado ao subtotal', () => {
    expect(computeCouponDiscount(couponFixture({ discountType: 'fixed', discountValue: 20 }), 15)).toBe(15);
    expect(computeCouponDiscount(couponFixture({ discountType: 'fixed', discountValue: 20 }), 30)).toBe(20);
  });

  it('label em pt-BR para percentual e fixo', () => {
    expect(couponLabel({ discountType: 'percent', discountValue: 10 })).toContain('% OFF');
    expect(couponLabel({ discountType: 'fixed', discountValue: 12.5 })).toContain('R$');
  });
});
