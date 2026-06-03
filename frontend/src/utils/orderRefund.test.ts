import { describe, expect, it } from 'vitest';
import { getOrderRefundSnapshot } from './orderRefund';

describe('getOrderRefundSnapshot', () => {
  it('normaliza reembolso vindo apenas do pagamento aninhado', () => {
    const snapshot = getOrderRefundSnapshot({
      status: 'cancelled',
      paymentStatus: 'PAID',
      payment: {
        refundStatus: 'REFUNDED',
        refundAmount: '3.00',
        refundReason: 'Cancelamento solicitado',
        refundedAt: '2026-06-03T23:05:47.112Z',
      },
    });

    expect(snapshot.status).toBe('REFUNDED');
    expect(snapshot.amount).toBe('3.00');
    expect(snapshot.reason).toBe('Cancelamento solicitado');
    expect(snapshot.refundedAt).toBe('2026-06-03T23:05:47.112Z');
    expect(snapshot.hasRefund).toBe(true);
  });

  it('prioriza campos do topo quando existem', () => {
    const snapshot = getOrderRefundSnapshot({
      refundStatus: 'partially_refunded',
      refundAmount: 1.5,
      payment: {
        refundStatus: 'REFUNDED',
        refundAmount: 3,
      },
    });

    expect(snapshot.status).toBe('PARTIALLY_REFUNDED');
    expect(snapshot.amount).toBe(1.5);
  });

  it('retorna vazio quando ainda nao houve reembolso', () => {
    const snapshot = getOrderRefundSnapshot({
      status: 'cancelled',
      payment: { status: 'PAID' },
    });

    expect(snapshot.status).toBe('');
    expect(snapshot.amount).toBeNull();
    expect(snapshot.reason).toBe('');
    expect(snapshot.hasRefund).toBe(false);
  });
});
