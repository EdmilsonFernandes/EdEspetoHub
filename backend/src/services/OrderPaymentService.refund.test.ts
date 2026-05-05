import { describe, it, expect } from 'vitest';

/**
 * Tests the refund validation logic extracted from OrderPaymentService.refundOrder.
 * Same pattern as SubscriptionService.test.ts and OrderService.pricing.test.ts.
 */

type PaymentLike = {
  paymentStatus: string;
  storeId: string;
  amount: number;
  providerId?: string | null;
  refundStatus?: string | null;
};

function validateRefund(payment: PaymentLike | null, storeId: string, amount?: number) {
  if (!payment) return { error: 'Pagamento não encontrado para este pedido.' };
  if (payment.storeId !== storeId) return { error: 'Acesso negado.' };
  if (payment.paymentStatus !== 'PAID') return { error: 'Só é possível reembolsar pagamentos confirmados.' };
  if (payment.refundStatus === 'REFUNDED' || payment.refundStatus === 'PARTIALLY_REFUNDED') {
    return { error: 'Este pagamento já foi reembolsado.' };
  }
  if (!payment.providerId) return { error: 'ID do pagamento no provedor não encontrado.' };

  const refundAmount = amount && amount < Number(payment.amount) ? amount : undefined;
  const finalAmount = refundAmount || Number(payment.amount);
  const refundStatus = refundAmount ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

  return { ok: true, refundStatus, refundAmount: finalAmount, partial: Boolean(refundAmount) };
}

describe('OrderPaymentService — refund validation', () => {
  const paid = {
    storeId: 'store-1',
    paymentStatus: 'PAID',
    amount: 80,
    providerId: 'mp-123',
    refundStatus: null,
  };

  it('rejects null payment', () => {
    expect(validateRefund(null, 'store-1').error).toContain('não encontrado');
  });

  it('rejects wrong store', () => {
    expect(validateRefund(paid, 'other-store').error).toContain('Acesso');
  });

  it('rejects PENDING payment', () => {
    expect(validateRefund({ ...paid, paymentStatus: 'PENDING' }, 'store-1').error).toContain('confirmados');
  });

  it('rejects FAILED payment', () => {
    expect(validateRefund({ ...paid, paymentStatus: 'FAILED' }, 'store-1').error).toContain('confirmados');
  });

  it('rejects already REFUNDED', () => {
    expect(validateRefund({ ...paid, refundStatus: 'REFUNDED' }, 'store-1').error).toContain('reembolsado');
  });

  it('rejects already PARTIALLY_REFUNDED', () => {
    expect(validateRefund({ ...paid, refundStatus: 'PARTIALLY_REFUNDED' }, 'store-1').error).toContain('reembolsado');
  });

  it('rejects missing providerId', () => {
    expect(validateRefund({ ...paid, providerId: null }, 'store-1').error).toContain('provedor');
  });

  it('full refund when no amount specified', () => {
    const result = validateRefund(paid, 'store-1');
    expect(result.ok).toBe(true);
    expect(result.refundStatus).toBe('REFUNDED');
    expect(result.refundAmount).toBe(80);
    expect(result.partial).toBe(false);
  });

  it('full refund when amount equals total', () => {
    const result = validateRefund(paid, 'store-1', 80);
    expect(result.refundStatus).toBe('REFUNDED');
    expect(result.refundAmount).toBe(80);
  });

  it('full refund when amount exceeds total', () => {
    const result = validateRefund(paid, 'store-1', 100);
    expect(result.refundStatus).toBe('REFUNDED');
    expect(result.refundAmount).toBe(80);
  });

  it('partial refund when amount < total', () => {
    const result = validateRefund(paid, 'store-1', 30);
    expect(result.refundStatus).toBe('PARTIALLY_REFUNDED');
    expect(result.refundAmount).toBe(30);
    expect(result.partial).toBe(true);
  });

  it('partial refund with small amount', () => {
    const result = validateRefund(paid, 'store-1', 0.01);
    expect(result.refundStatus).toBe('PARTIALLY_REFUNDED');
    expect(result.refundAmount).toBe(0.01);
  });
});


type DenyPaymentLike = {
  paymentStatus: string;
  storeId: string;
  refundStatus?: string | null;
};

function validateDeny(payment: DenyPaymentLike | null, storeId: string) {
  if (!payment) return { error: 'Pagamento não encontrado para este pedido.' };
  if (payment.storeId !== storeId) return { error: 'Acesso negado.' };
  if (payment.refundStatus === 'REFUNDED' || payment.refundStatus === 'PARTIALLY_REFUNDED') {
    return { error: 'Este pagamento já foi reembolsado.' };
  }
  if (payment.refundStatus === 'DENIED') {
    return { error: 'Reembolso já foi recusado anteriormente.' };
  }
  return { ok: true, refundStatus: 'DENIED' };
}

describe('OrderPaymentService — denyRefund validation', () => {
  const paid = { storeId: 'store-1', paymentStatus: 'PAID', refundStatus: null };

  it('rejects null payment', () => {
    expect(validateDeny(null, 'store-1').error).toContain('não encontrado');
  });

  it('rejects wrong store', () => {
    expect(validateDeny(paid, 'other-store').error).toContain('Acesso');
  });

  it('rejects if already refunded', () => {
    expect(validateDeny({ ...paid, refundStatus: 'REFUNDED' }, 'store-1').error).toContain('reembolsado');
  });

  it('rejects if already denied', () => {
    expect(validateDeny({ ...paid, refundStatus: 'DENIED' }, 'store-1').error).toContain('recusado');
  });

  it('allows deny for pending payment', () => {
    const result = validateDeny(paid, 'store-1');
    expect(result.ok).toBe(true);
    expect(result.refundStatus).toBe('DENIED');
  });
});
