import { describe, expect, it } from 'vitest';
import { getOrderItemLineTotal, getOrderItemOriginalLineTotal, getOrderItemQuantity } from './orderItems';

describe('orderItems', () => {
  it('keeps backend line totals without multiplying twice', () => {
    const item = {
      quantity: 2,
      price: 24,
      originalPrice: 12,
      product: { price: 12 },
    };

    expect(getOrderItemQuantity(item)).toBe(2);
    expect(getOrderItemLineTotal(item)).toBe(24);
    expect(getOrderItemOriginalLineTotal(item)).toBe(24);
  });

  it('rebuilds line total when payload looks unit-based', () => {
    const item = {
      quantity: 2,
      price: 12,
      product: { price: 12 },
    };

    expect(getOrderItemLineTotal(item)).toBe(24);
  });

  it('prefers explicit line total metadata when available', () => {
    const item = {
      quantity: 3,
      price: 12,
      unitPrice: 12,
      lineTotal: 36,
      originalLineTotal: 45,
    };

    expect(getOrderItemLineTotal(item)).toBe(36);
    expect(getOrderItemOriginalLineTotal(item)).toBe(45);
  });
});
