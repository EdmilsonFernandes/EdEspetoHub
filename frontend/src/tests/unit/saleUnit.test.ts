import { describe, it, expect } from 'vitest';
import {
  calcCartLineSubtotalCents,
  calcWeightSubtotalCents,
  formatQuantityLabel,
  isWeightProduct,
  isValidWeightQuantity,
  normalizeSaleUnit,
} from '../../utils/saleUnit';
import { getCartPricing, getBundleDiscountForCartItem } from '../../utils/orderPricing';

/**
 * Venda por peso (30/10) — ESPELHO do backend. O frontend replica a MESMA
 * fórmula (round(preço/kg¢ × g ÷ 1000)); o backend segue sendo a autoridade.
 */
describe('saleUnit — regras compartilhadas', () => {
  it('formatQuantityLabel: "250 g" | "1 kg" | "1,25 kg" | "2 un"', () => {
    expect(formatQuantityLabel(250, 'WEIGHT')).toBe('250 g');
    expect(formatQuantityLabel(750, 'WEIGHT')).toBe('750 g');
    expect(formatQuantityLabel(1000, 'WEIGHT')).toBe('1 kg');
    expect(formatQuantityLabel(1250, 'WEIGHT')).toBe('1,25 kg');
    expect(formatQuantityLabel(1500, 'WEIGHT')).toBe('1,5 kg');
    expect(formatQuantityLabel(2, 'UNIT')).toBe('2 un');
    expect(formatQuantityLabel(2, undefined)).toBe('2 un');
  });

  it('calcWeightSubtotalCents: R$10/kg — 250g=250¢ 500g=500¢ 750g=750¢ 1kg=1000¢', () => {
    expect(calcWeightSubtotalCents(10, 250)).toBe(250);
    expect(calcWeightSubtotalCents(10, 500)).toBe(500);
    expect(calcWeightSubtotalCents(10, 750)).toBe(750);
    expect(calcWeightSubtotalCents(10, 1000)).toBe(1000);
    expect(calcWeightSubtotalCents(10, 1250)).toBe(1250);
  });

  it('isValidWeightQuantity: degraus de 250 g a partir de 250 g', () => {
    expect(isValidWeightQuantity(250, 250, 250)).toBe(true);
    expect(isValidWeightQuantity(1250, 250, 250)).toBe(true);
    expect(isValidWeightQuantity(300, 250, 250)).toBe(false);
    expect(isValidWeightQuantity(200, 250, 250)).toBe(false);
  });

  it('isWeightProduct/normalizeSaleUnit: legado sem saleUnit = unidade', () => {
    expect(isWeightProduct({ saleUnit: 'WEIGHT' })).toBe(true);
    expect(isWeightProduct({})).toBe(false);
    expect(isWeightProduct(null)).toBe(false);
    expect(normalizeSaleUnit('WEIGHT')).toBe('WEIGHT');
    expect(normalizeSaleUnit(undefined)).toBe('UNIT');
  });
});

describe('carrinho — linha por peso', () => {
  it('subtotal da linha: preço/kg × gramas + adicionais 1× (não escalam por grama)', () => {
    const item = {
      price: 10, // R$/kg (entry de peso guarda preço LIMPO)
      qty: 750, // gramas
      saleUnit: 'WEIGHT',
      selectedModifiers: [{ name: 'Embalagem', price: 2, quantity: 1 }],
    };
    // 7,50 do peso + 2,00 do adicional = 9,50
    expect(calcCartLineSubtotalCents(item)).toBe(950);
  });

  it('subtotal da linha UNIT: adicionais já embutidos no price (comportamento histórico)', () => {
    const item = {
      price: 9, // 7 base + 2 adicional (handleAddToCart soma)
      qty: 2,
      saleUnit: 'UNIT',
      selectedModifiers: [{ name: 'Embalagem', price: 2, quantity: 1 }],
    };
    expect(calcCartLineSubtotalCents(item)).toBe(1800); // sem dupla contagem
  });

  it('getCartPricing com carrinho misto: 2 abacaxis + 750 g de tomate = R$ 17,50', () => {
    const cart = {
      a: { price: 5, qty: 2, saleUnit: 'UNIT' },
      b: { price: 10, qty: 750, saleUnit: 'WEIGHT' },
    };
    const pricing = getCartPricing(cart);
    expect(pricing.subtotal).toBe(17.5);
    expect(pricing.discountedSubtotal).toBe(17.5);
  });

  it('getCartPricing: 500 g de tomate a R$10/kg + 2 adicionais de R$2 = R$ 9,00', () => {
    const cart = {
      t: {
        price: 10,
        qty: 500,
        saleUnit: 'WEIGHT',
        selectedModifiers: [
          { name: 'Emb', price: 2, quantity: 1 },
          { name: 'Saco', price: 2, quantity: 1 },
        ],
      },
    };
    expect(getCartPricing(cart).subtotal).toBe(9);
  });
});

describe('bundle promo — nunca para peso', () => {
  it('item WEIGHT com bundle configurado → desconto 0', () => {
    const item = {
      price: 10,
      qty: 1000, // 1 kg — "leve 2" jamais interpretará como 2 kg
      saleUnit: 'WEIGHT',
      bundlePromoActive: true,
      bundlePromoQty: 2,
      bundlePromoPrice: 16,
    };
    expect(getBundleDiscountForCartItem(item)).toBe(0);
  });

  it('item UNIT com bundle → comportamento histórico mantido', () => {
    const item = {
      price: 10,
      qty: 2,
      saleUnit: 'UNIT',
      bundlePromoActive: true,
      bundlePromoQty: 2,
      bundlePromoPrice: 16,
    };
    expect(getBundleDiscountForCartItem(item)).toBe(4);
  });
});
