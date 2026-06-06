import { describe, expect, it, vi } from 'vitest';
import { ShippingTrackingService } from './ShippingTrackingService';

const buildManager = (order: any) => {
  const save = vi.fn(async (entity) => entity);
  return {
    save,
    manager: {
      getRepository: vi.fn(() => ({
        findOne: vi.fn(async () => order),
        save,
      })),
    },
  };
};

describe('ShippingTrackingService', () => {
  it('marks the order as delivered when carrier tracking confirms delivery', async () => {
    const order = {
      id: 'order-postal-1',
      status: 'dispatched',
      statusTimeline: [{ status: 'dispatched', at: '2026-06-06T10:00:00.000Z' }],
    };
    const { manager, save } = buildManager(order);

    await (new ShippingTrackingService() as any).markOrderDeliveredFromTrackingTx(
      manager,
      order.id,
      '2026-06-06T14:30:00.000Z'
    );

    expect(order.status).toBe('delivered');
    expect(order.statusTimeline).toEqual([
      { status: 'dispatched', at: '2026-06-06T10:00:00.000Z' },
      { status: 'delivered', at: '2026-06-06T14:30:00.000Z' },
    ]);
    expect(save).toHaveBeenCalledWith(order);
  });

  it('does not override a cancelled order from carrier tracking', async () => {
    const order = {
      id: 'order-postal-cancelled',
      status: 'cancelled',
      statusTimeline: [{ status: 'cancelled', at: '2026-06-06T10:00:00.000Z' }],
    };
    const { manager, save } = buildManager(order);

    await (new ShippingTrackingService() as any).markOrderDeliveredFromTrackingTx(
      manager,
      order.id,
      '2026-06-06T14:30:00.000Z'
    );

    expect(order.status).toBe('cancelled');
    expect(order.statusTimeline).toEqual([{ status: 'cancelled', at: '2026-06-06T10:00:00.000Z' }]);
    expect(save).not.toHaveBeenCalled();
  });
});
