import { describe, expect, it } from 'vitest';
import { reconcileCartStock } from './cartStock';

describe('cartStock', () => {
  it('removes a managed product when fresh stock is zero', () => {
    const result = reconcileCartStock(
      {
        item1: { id: 'p1', name: 'Batata Frita', qty: 2, manageStock: true, stockQuantity: 5 },
      },
      [{ id: 'p1', name: 'Batata Frita', manageStock: true, stockQuantity: 0, active: true }]
    );

    expect(result.ok).toBe(false);
    expect(result.nextCart).toEqual({});
    expect(result.message).toContain('esgotado');
  });

  it('caps quantities across cart entries using the fresh product stock', () => {
    const result = reconcileCartStock(
      {
        item1: { id: 'p1', name: 'Batata Frita', qty: 2, manageStock: true, stockQuantity: 10 },
        item2: { id: 'p1', name: 'Batata Frita', qty: 3, manageStock: true, stockQuantity: 10 },
      },
      [{ id: 'p1', name: 'Batata Frita', manageStock: true, stockQuantity: 3, active: true }]
    );

    expect(result.ok).toBe(false);
    expect(result.nextCart.item1.qty).toBe(2);
    expect(result.nextCart.item2.qty).toBe(1);
    expect(result.message).toContain('3 unidades');
  });

  it('keeps unmanaged products untouched', () => {
    const result = reconcileCartStock(
      {
        item1: { id: 'p1', name: 'Produto livre', qty: 7, manageStock: false, stockQuantity: 0 },
      },
      [{ id: 'p1', name: 'Produto livre', manageStock: false, stockQuantity: 0, active: true }]
    );

    expect(result.ok).toBe(true);
    expect(result.nextCart.item1.qty).toBe(7);
  });
});
