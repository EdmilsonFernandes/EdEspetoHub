import { describe, expect, it } from 'vitest';
import {
  FEATURED_PAYMENT_POLL_FALLBACK_MS,
  getFeaturedPaymentRemainingMs,
  getFeaturedPaymentStatusLabel,
  shouldPollFeaturedPayment,
} from './featuredPaymentStatus';

describe('featuredPaymentStatus', () => {
  it('keeps pending Pix as awaiting payment, not failed', () => {
    expect(getFeaturedPaymentStatusLabel('PENDING')).toBe('Aguardando pagamento');
    expect(getFeaturedPaymentStatusLabel('PENDING_PAYMENT')).toBe('Aguardando pagamento');
    expect(getFeaturedPaymentStatusLabel('')).toBe('Aguardando pagamento');
  });

  it('polls only non-terminal featured payments', () => {
    expect(shouldPollFeaturedPayment({ status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' })).toBe(true);
    expect(shouldPollFeaturedPayment({ status: 'APPROVED', paymentStatus: 'PAID' })).toBe(false);
    expect(shouldPollFeaturedPayment({ status: 'PENDING_PAYMENT', paymentStatus: 'FAILED' })).toBe(false);
    expect(shouldPollFeaturedPayment({ status: 'REJECTED', paymentStatus: 'PENDING' })).toBe(false);
  });

  it('uses provider expiration for automatic polling instead of a short local timeout', () => {
    const now = new Date('2026-05-17T12:00:00.000Z').getTime();
    const expiresAt = new Date(now + 22 * 60 * 1000).toISOString();

    expect(getFeaturedPaymentRemainingMs(expiresAt, now)).toBe(22 * 60 * 1000);
    expect(getFeaturedPaymentRemainingMs(null, now)).toBe(FEATURED_PAYMENT_POLL_FALLBACK_MS);
  });
});
