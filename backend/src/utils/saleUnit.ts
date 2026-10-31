/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: saleUnit.ts
 * @Date: 2026-10-30
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

/**
 * Venda por unidade × peso (30/10) — regras compartilhadas por services.
 * Quantidade canônica de item por peso é GRAMAS INTEIRAS (nunca 0,5 kg).
 */

export type SaleUnit = 'UNIT' | 'WEIGHT';

/** Aceita qualquer entrada (null/undefined/unknown) — legado sem saleUnit = UNIT. */
export const normalizeSaleUnit = (raw: unknown): SaleUnit =>
  String(raw ?? '').trim().toUpperCase() === 'WEIGHT' ? 'WEIGHT' : 'UNIT';

/** É quantidade válida p/ produto por peso? (gramas inteiras ≥ mín, alinhada ao incremento) */
export const isValidWeightQuantity = (
  grams: number,
  weightMinG: number | null | undefined,
  weightStepG: number | null | undefined
): boolean => {
  const min = Math.max(1, Math.floor(Number(weightMinG) || 0));
  const step = Math.max(1, Math.floor(Number(weightStepG) || 0));
  const g = Math.floor(Number(grams));
  if (!Number.isFinite(g) || g <= 0) return false;
  if (g < min) return false;
  return (g - min) % step === 0;
};

/**
 * Subtotal de um item por peso, em CENTAVOS INTEIROS (política de arredondamento
 * explícita: round(preço/kg em centavos × gramas ÷ 1000) — banker's rounding do
 * Math.round do JS sobre meio exato; meio centavo sobe). Ex.: R$10/kg × 750 g
 * = 1000¢ × 750 / 1000 = 750¢ = R$ 7,50. Backend é a autoridade; o front replica
 * a MESMA fórmula.
 */
export const calcWeightSubtotalCents = (pricePerKgBrl: number, grams: number): number => {
  const pricePerKgCents = Math.round(Number(pricePerKgBrl || 0) * 100);
  const g = Math.max(0, Math.floor(Number(grams) || 0));
  return Math.round((pricePerKgCents * g) / 1000);
};

/** 250 → "250 g" | 1000 → "1 kg" | 1250 → "1,25 kg" (pt-BR, sem espaço antes de kg). */
export const formatQuantityLabel = (quantity: number, saleUnit: unknown): string => {
  if (normalizeSaleUnit(saleUnit) === 'WEIGHT') {
    const grams = Math.max(0, Math.floor(Number(quantity) || 0));
    if (grams < 1000) return `${grams} g`;
    const kg = grams / 1000;
    // kg com até 2 casas, vírgula pt-BR, sem trailing zeros: 1 → "1 kg", 1,25 → "1,25 kg"
    const rounded = Math.round(kg * 100) / 100;
    const label = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
    return `${label} kg`;
  }
  const units = Math.max(0, Math.floor(Number(quantity) || 0));
  return `${units} un`;
};

/** Sufixo do preço de referência p/ exibição: "/kg" ou "" (unidade não precisa). */
export const priceRefSuffixLabel = (saleUnit: unknown): string =>
  normalizeSaleUnit(saleUnit) === 'WEIGHT' ? '/kg' : '';
