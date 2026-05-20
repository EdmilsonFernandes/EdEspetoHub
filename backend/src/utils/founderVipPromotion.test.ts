import { describe, expect, it } from 'vitest';
import { resolveFounderVipPromotion } from './founderVipPromotion';

describe('founderVipPromotion', () => {
  it('keeps default trial when campaign is disabled', () => {
    const result = resolveFounderVipPromotion({
      enabledValue: 'false',
      existingStoresCount: 0,
      fallbackTrialDays: 7,
    });

    expect(result.applies).toBe(false);
    expect(result.trialDays).toBe(7);
  });

  it('applies promotional days while store count is inside the limit', () => {
    const result = resolveFounderVipPromotion({
      enabledValue: 'true',
      limitValue: '30',
      daysValue: '90',
      existingStoresCount: 29,
      fallbackTrialDays: 7,
    });

    expect(result.applies).toBe(true);
    expect(result.trialDays).toBe(90);
    expect(result.position).toBe(30);
  });

  it('stops applying promotional days when limit is reached', () => {
    const result = resolveFounderVipPromotion({
      enabledValue: 'true',
      limitValue: '30',
      daysValue: '90',
      existingStoresCount: 30,
      fallbackTrialDays: 7,
    });

    expect(result.applies).toBe(false);
    expect(result.trialDays).toBe(7);
  });
});
