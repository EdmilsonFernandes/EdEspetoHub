import { describe, it, expect } from 'vitest';
import { resolvePlanTier, resolvePlanFeatures } from './planFeatures';

describe('planFeatures', () => {
  describe('resolvePlanTier', () => {
    it('returns basic for null/empty plan', () => {
      expect(resolvePlanTier(null)).toBe('basic');
      expect(resolvePlanTier('')).toBe('basic');
      expect(resolvePlanTier(undefined)).toBe('basic');
    });

    it('returns vip when planExempt', () => {
      expect(resolvePlanTier('basic', true)).toBe('vip');
      expect(resolvePlanTier(null, true)).toBe('vip');
    });

    it('resolves pro tier', () => {
      expect(resolvePlanTier('Pro Mensal')).toBe('pro');
      expect(resolvePlanTier('PRO')).toBe('pro');
    });

    it('resolves vip tier', () => {
      expect(resolvePlanTier('VIP Anual')).toBe('vip');
    });

    it('defaults to basic for unknown', () => {
      expect(resolvePlanTier('Starter')).toBe('basic');
    });
  });

  describe('resolvePlanFeatures', () => {
    it('trial gets pro features', () => {
      const f = resolvePlanFeatures({ subscriptionStatus: 'TRIAL' });
      expect(f.deliveryMode).toBe(true);
      expect(f.motoboyManagement).toBe(true);
    });

    it('basic plan has no delivery', () => {
      const f = resolvePlanFeatures({ planName: 'Básico', subscriptionStatus: 'ACTIVE' });
      expect(f.deliveryMode).toBe(false);
      expect(f.pickupMode).toBe(true);
    });

    it('pro plan has delivery', () => {
      const f = resolvePlanFeatures({ planName: 'Pro Mensal', subscriptionStatus: 'ACTIVE' });
      expect(f.deliveryMode).toBe(true);
      expect(f.motoboyManagement).toBe(true);
    });

    it('planExempt overrides to vip', () => {
      const f = resolvePlanFeatures({ planName: null, planExempt: true, subscriptionStatus: 'ACTIVE' });
      expect(f.deliveryMode).toBe(true);
      expect(f.advancedDashboard).toBe(true);
    });
  });
});
