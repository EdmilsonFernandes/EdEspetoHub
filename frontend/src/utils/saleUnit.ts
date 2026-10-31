/**
 * Venda por unidade × peso (30/10) — ESPELHO EXATO do backend
 * (backend/src/utils/saleUnit.ts). O backend é a autoridade: qualquer
 * divergência de cálculo/validação o pedido é recusado lá.
 *
 * Quantidade canônica por peso = GRAMAS INTEIRAS (nunca 0,5 kg).
 */

export type SaleUnit = 'UNIT' | 'WEIGHT';

export const normalizeSaleUnit = (raw: unknown): SaleUnit =>
  String(raw || '').trim().toUpperCase() === 'WEIGHT' ? 'WEIGHT' : 'UNIT';

export const isWeightProduct = (product: any): boolean =>
  normalizeSaleUnit(product?.saleUnit) === 'WEIGHT';

/** Gramas inteiras ≥ mínimo e alinhadas ao incremento a partir do mínimo. */
export const isValidWeightQuantity = (
  grams: number,
  weightMinG?: number | null,
  weightStepG?: number | null
): boolean => {
  const min = Math.max(1, Math.floor(Number(weightMinG) || 0));
  const step = Math.max(1, Math.floor(Number(weightStepG) || 0));
  const g = Math.floor(Number(grams));
  if (!Number.isFinite(g) || g <= 0) return false;
  if (g < min) return false;
  return (g - min) % step === 0;
};

/**
 * Subtotal de item por peso em CENTAVOS inteiros — MESMA fórmula do backend:
 * round(preço/kg em centavos × gramas ÷ 1000). R$10/kg × 750 g = R$ 7,50.
 */
export const calcWeightSubtotalCents = (pricePerKgBrl: number, grams: number): number => {
  const pricePerKgCents = Math.round(Number(pricePerKgBrl || 0) * 100);
  const g = Math.max(0, Math.floor(Number(grams) || 0));
  return Math.round((pricePerKgCents * g) / 1000);
};

/** 250 → "250 g" | 1000 → "1 kg" | 1250 → "1,25 kg" | UNIT → "2 un". */
export const formatQuantityLabel = (quantity: number, saleUnit: string | null | undefined): string => {
  if (normalizeSaleUnit(saleUnit) === 'WEIGHT') {
    const grams = Math.max(0, Math.floor(Number(quantity) || 0));
    if (grams < 1000) return `${grams} g`;
    const kg = Math.round((grams / 1000) * 100) / 100;
    const label = Number.isInteger(kg)
      ? String(kg)
      : kg.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
    return `${label} kg`;
  }
  return `${Math.max(0, Math.floor(Number(quantity) || 0))} un`;
};

/** "R$ 10,00/kg" nos cards de produto por peso; unidade não precisa de sufixo. */
export const formatPriceRef = (
  formatCurrency: (v: number) => string,
  price: number,
  saleUnit: string | null | undefined
): string => (normalizeSaleUnit(saleUnit) === 'WEIGHT' ? `${formatCurrency(price)}/kg` : formatCurrency(price));

/**
 * Subtotal da linha do CARRINHO (centavos).
 * Convenção do carrinho local:
 * - UNIT: `price` JÁ embute os adicionais (handleAddToCart soma modifiersTotal)
 *   → subtotal = price × qty, adicionais NÃO somam de novo aqui.
 * - WEIGHT: `price` é o preço/kg LIMPO (adicionais não escalam por peso — são
 *   por linha) → subtotal = round(preço/kg¢ × g ÷ 1000) + adicionais da linha.
 */
export const calcCartLineSubtotalCents = (item: any): number => {
  const price = Number(item?.price || 0);
  const qty = Number(item?.qty || 0);
  if (normalizeSaleUnit(item?.saleUnit) === 'WEIGHT') {
    const modifiersCents = Math.round(
      (item?.selectedModifiers || []).reduce(
        (sum: number, mod: any) => sum + Number(mod?.price || 0) * Number(mod?.quantity || 1),
        0
      ) * 100
    );
    return calcWeightSubtotalCents(price, qty) + modifiersCents;
  }
  return Math.round(price * qty * 100);
};
