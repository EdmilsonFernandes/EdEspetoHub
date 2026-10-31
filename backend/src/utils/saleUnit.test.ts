import { describe, it, expect } from 'vitest';
import {
  calcWeightSubtotalCents,
  formatQuantityLabel,
  isValidWeightQuantity,
  normalizeSaleUnit,
  priceRefSuffixLabel,
} from './saleUnit';

/**
 * Venda por peso (30/10) — regras puras compartilhadas por OrderService e
 * ProductService. O frontend (frontend/src/utils/saleUnit.ts) é ESPELHO
 * EXATO: qualquer mudança aqui precisa ser replicada lá.
 */
describe('normalizeSaleUnit', () => {
  it('qualquer coisa que não seja WEIGHT vira UNIT (default dos legados)', () => {
    expect(normalizeSaleUnit('WEIGHT')).toBe('WEIGHT');
    expect(normalizeSaleUnit('weight')).toBe('WEIGHT');
    expect(normalizeSaleUnit('UNIT')).toBe('UNIT');
    expect(normalizeSaleUnit(undefined)).toBe('UNIT');
    expect(normalizeSaleUnit(null)).toBe('UNIT');
    expect(normalizeSaleUnit('')).toBe('UNIT');
    expect(normalizeSaleUnit('quilo')).toBe('UNIT');
  });
});

describe('isValidWeightQuantity (mín 250 g, incremento 250 g)', () => {
  const min = 250;
  const step = 250;
  it('aceita degraus a partir do mínimo: 250/500/750/1000/1250', () => {
    expect(isValidWeightQuantity(250, min, step)).toBe(true);
    expect(isValidWeightQuantity(500, min, step)).toBe(true);
    expect(isValidWeightQuantity(750, min, step)).toBe(true);
    expect(isValidWeightQuantity(1000, min, step)).toBe(true);
    expect(isValidWeightQuantity(1250, min, step)).toBe(true);
  });
  it('recusa abaixo do mínimo, fora do degrau, zero e negativo', () => {
    expect(isValidWeightQuantity(200, min, step)).toBe(false);
    expect(isValidWeightQuantity(300, min, step)).toBe(false);
    expect(isValidWeightQuantity(0, min, step)).toBe(false);
    expect(isValidWeightQuantity(-250, min, step)).toBe(false);
  });
  it('mín/incremento ausentes degradam para degrau de 1 g (não trava pedido legado)', () => {
    expect(isValidWeightQuantity(333, null, undefined)).toBe(true);
  });
});

describe('calcWeightSubtotalCents (política de arredondamento explícita)', () => {
  it('R$10/kg × 750 g = R$ 7,50 (750 ¢) — inteiro, sem float', () => {
    expect(calcWeightSubtotalCents(10, 750)).toBe(750);
  });
  it('especificação: 250 g = 250¢, 500 g = 500¢, 1 kg = 1000¢ (a R$10/kg)', () => {
    expect(calcWeightSubtotalCents(10, 250)).toBe(250);
    expect(calcWeightSubtotalCents(10, 500)).toBe(500);
    expect(calcWeightSubtotalCents(10, 1000)).toBe(1000);
    expect(calcWeightSubtotalCents(10, 1250)).toBe(1250);
  });
  it('preço com centavos: R$ 7,49/kg × 333 g = round(749 × 333 / 1000) = 249,6 → 250¢', () => {
    // 749 × 333 = 249417 / 1000 = 249,417 → 249¢  (verifica a matemática real)
    expect(749 * 333 / 1000).toBeCloseTo(249.417, 3);
    expect(calcWeightSubtotalCents(7.49, 333)).toBe(249);
  });
  it('meio centavo exato arredonda PARA CIMA (Math.round do JS)', () => {
    // R$5/kg = 500¢; 500¢ × 1 g ÷ 1000 = 0,5¢ → Math.round(0,5) = 1¢
    expect(calcWeightSubtotalCents(5, 1)).toBe(1);
  });
});

describe('formatQuantityLabel (exibição legível)', () => {
  it('gramas abaixo de 1 kg: "250 g", "750 g"', () => {
    expect(formatQuantityLabel(250, 'WEIGHT')).toBe('250 g');
    expect(formatQuantityLabel(750, 'WEIGHT')).toBe('750 g');
  });
  it('quilos inteiros: "1 kg", "2 kg"', () => {
    expect(formatQuantityLabel(1000, 'WEIGHT')).toBe('1 kg');
    expect(formatQuantityLabel(2000, 'WEIGHT')).toBe('2 kg');
  });
  it('quilos fracionários pt-BR: "1,25 kg"', () => {
    expect(formatQuantityLabel(1250, 'WEIGHT')).toBe('1,25 kg');
    expect(formatQuantityLabel(1500, 'WEIGHT')).toBe('1,5 kg');
  });
  it('unidade: "2 un"; saleUnit ausente = unidade', () => {
    expect(formatQuantityLabel(2, 'UNIT')).toBe('2 un');
    expect(formatQuantityLabel(3, undefined)).toBe('3 un');
  });
});

describe('priceRefSuffixLabel', () => {
  it('peso anuncia "/kg"; unidade sem sufixo', () => {
    expect(priceRefSuffixLabel('WEIGHT')).toBe('/kg');
    expect(priceRefSuffixLabel('UNIT')).toBe('');
    expect(priceRefSuffixLabel(null)).toBe('');
  });
});
