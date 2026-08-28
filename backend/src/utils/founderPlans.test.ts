import { describe, it, expect } from 'vitest';
import {
  isFounderPlanName,
  toFounderPlanName,
  fromFounderPlanName,
  isFounderStore,
} from './founderPlans';

describe('founderPlans', () => {
  it('identifica planos fundador pelo prefixo founder_', () => {
    expect(isFounderPlanName('founder_basic_monthly')).toBe(true);
    expect(isFounderPlanName('founder_pro_monthly')).toBe(true);
    expect(isFounderPlanName('founder_basic_yearly')).toBe(true);
    expect(isFounderPlanName('basic_monthly')).toBe(false);
    expect(isFounderPlanName('monthly')).toBe(false);
    expect(isFounderPlanName('')).toBe(false);
    expect(isFounderPlanName(null)).toBe(false);
    expect(isFounderPlanName(undefined)).toBe(false);
  });

  it('mapeia plano regular para variante fundador (idempotente)', () => {
    expect(toFounderPlanName('basic_monthly')).toBe('founder_basic_monthly');
    expect(toFounderPlanName('pro_monthly')).toBe('founder_pro_monthly');
    expect(toFounderPlanName('basic_yearly')).toBe('founder_basic_yearly');
    expect(toFounderPlanName('pro_yearly')).toBe('founder_pro_yearly');
    expect(toFounderPlanName('founder_basic_monthly')).toBe('founder_basic_monthly');
  });

  it('retorna null para nomes fora do catálogo regular', () => {
    expect(toFounderPlanName('monthly')).toBeNull();
    expect(toFounderPlanName('yearly')).toBeNull();
    expect(toFounderPlanName('vip')).toBeNull();
    expect(toFounderPlanName('')).toBeNull();
    expect(toFounderPlanName(null)).toBeNull();
  });

  it('remove o prefixo fundador mantendo nomes regulares', () => {
    expect(fromFounderPlanName('founder_pro_monthly')).toBe('pro_monthly');
    expect(fromFounderPlanName('founder_basic_yearly')).toBe('basic_yearly');
    expect(fromFounderPlanName('basic_monthly')).toBe('basic_monthly');
    expect(fromFounderPlanName(null)).toBeNull();
  });

  it('loja fundadora = attribution founderVipPromotion persistida', () => {
    expect(
      isFounderStore({ settings: { acquisitionAttribution: { founderVipPromotion: { applied: true } } } })
    ).toBe(true);
    expect(isFounderStore({ settings: { acquisitionAttribution: {} } })).toBe(false);
    expect(isFounderStore({ settings: { acquisitionAttribution: null } })).toBe(false);
    expect(isFounderStore({ settings: {} })).toBe(false);
    expect(isFounderStore({})).toBe(false);
    expect(isFounderStore(null)).toBe(false);
  });
});
