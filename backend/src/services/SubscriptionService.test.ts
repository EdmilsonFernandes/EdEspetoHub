import { describe, it, expect } from 'vitest';
import { SubscriptionService } from './SubscriptionService';

const service = new SubscriptionService();
const resolveStatus = (service as any).resolveStatus.bind(service);

const sub = (overrides: any = {}) => ({
  status: 'ACTIVE',
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  store: { settings: {} },
  ...overrides,
});

describe('SubscriptionService — resolveStatus', () => {
  it('PENDING stays PENDING', () => {
    expect(resolveStatus(sub({ status: 'PENDING' }))).toBe('PENDING');
  });

  it('SUSPENDED stays SUSPENDED', () => {
    expect(resolveStatus(sub({ status: 'SUSPENDED' }))).toBe('SUSPENDED');
  });

  it('CANCELLED stays CANCELLED', () => {
    expect(resolveStatus(sub({ status: 'CANCELLED' }))).toBe('CANCELLED');
  });

  it('planExempt returns ACTIVE regardless of date', () => {
    const expired = sub({ endDate: new Date('2020-01-01'), store: { settings: { planExempt: true } } });
    expect(resolveStatus(expired)).toBe('ACTIVE');
  });

  it('expired subscription returns EXPIRED', () => {
    expect(resolveStatus(sub({ endDate: new Date(Date.now() - 1000) }))).toBe('EXPIRED');
  });

  it('TRIAL stays TRIAL', () => {
    expect(resolveStatus(sub({ status: 'TRIAL' }))).toBe('TRIAL');
  });

  it('expiring within 5 days returns EXPIRING', () => {
    const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(resolveStatus(sub({ endDate }))).toBe('EXPIRING');
  });

  it('active with >5 days returns ACTIVE', () => {
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expect(resolveStatus(sub({ endDate }))).toBe('ACTIVE');
  });
});
