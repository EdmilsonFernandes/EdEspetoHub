import { describe, expect, it } from 'vitest';
import { getPostalStatusCopy, getPostalTrackingHeadline, sortPostalEventsDesc } from './postalTracking';

describe('postalTracking utils', () => {
  it('returns friendly copy for known postal statuses', () => {
    expect(getPostalStatusCopy('posted').label).toBe('Pedido postado');
    expect(getPostalStatusCopy('out_for_delivery').description).toMatch(/saiu para entrega/i);
  });

  it('builds no-code headline for postal orders without tracking yet', () => {
    const headline = getPostalTrackingHeadline({ trackingCode: null, shipmentStatus: 'pending_posting' });
    expect(headline.label).toBe('Aguardando código');
    expect(headline.description).toMatch(/informar o código/i);
  });

  it('sorts events by event date descending', () => {
    const events = sortPostalEventsDesc([
      { status: 'posted', eventAt: '2026-01-01T10:00:00.000Z' },
      { status: 'delivered', eventAt: '2026-01-02T10:00:00.000Z' },
    ]);
    expect(events[0].status).toBe('delivered');
  });
});
