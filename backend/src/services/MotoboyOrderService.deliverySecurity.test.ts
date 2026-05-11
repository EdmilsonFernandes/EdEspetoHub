import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderDelivery } from '../entities/OrderDelivery';
import { MotoboyOrderService } from './MotoboyOrderService';
import { deliveryService } from './DeliveryService';

vi.mock('./DeliveryService', () => ({
  deliveryService: {
    complete: vi.fn(),
  },
}));

describe('MotoboyOrderService - delivery security', () => {
  let service: any;
  let deliveryState: any;

  beforeEach(() => {
    service = new MotoboyOrderService();
    service.deliveryBillingService = {
      recordDelivery: vi.fn().mockResolvedValue(undefined),
    };
    service.emailService = {
      sendStoreDeliveryCodeLockAlert: vi.fn().mockResolvedValue(undefined),
    };
    service.pushService = {
      notifyStoreUsersSecurityAlert: vi.fn().mockResolvedValue(undefined),
    };

    deliveryState = {
      orderId: 'order-1',
      motoboyId: 'motoboy-1',
      confirmationCode: '1234',
      confirmationCodeAttempts: 0,
      confirmationCodeBlockedAt: null,
    };

    const deliveryRepo = {
      findOne: vi.fn(async () => ({ ...deliveryState })),
      update: vi.fn(async (_where: any, patch: any) => {
        deliveryState = { ...deliveryState, ...patch };
        return { affected: 1 };
      }),
    };

    vi.spyOn(AppDataSource, 'getRepository').mockImplementation((entity: any) => {
      if (entity === OrderDelivery) return deliveryRepo as any;
      if (entity === Order) {
        return {
          save: vi.fn(async (order: any) => order),
        } as any;
      }
      throw new Error(`Unexpected repository request: ${String(entity?.name || entity)}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects cash confirmation when the informed amount is lower than the order total', async () => {
    service.orderDeliveryRepository = {
      findByOrderId: vi.fn(async () => ({
        orderId: 'order-1',
        motoboyId: 'motoboy-1',
      })),
      save: vi.fn(),
    };
    service.orderRepository = {
      findById: vi.fn(async () => ({
        id: 'order-1',
        type: 'delivery',
        total: 42.5,
        paymentMethod: 'dinheiro',
      })),
      save: vi.fn(),
    };

    await expect(
      service.confirmPayment('order-1', { id: 'motoboy-1' }, 30)
    ).rejects.toMatchObject({
      code: 'MOTO-036',
      status: 400,
    });
    expect(service.orderRepository.save).not.toHaveBeenCalled();
  });

  it('blocks delivery code after the third invalid attempt and notifies the store', async () => {
    service.orderRepository = {
      findById: vi.fn(async () => ({
        id: 'order-1',
        customerName: 'Cliente Teste',
        store: {
          id: 'store-1',
          name: 'Loja Teste',
          settings: { contactEmail: 'contato@loja.com' },
          owner: { email: 'owner@loja.com' },
        },
      })),
    };

    const motoboy = {
      id: 'motoboy-1',
      user: { fullName: 'Motoboy Teste' },
    };

    await expect(service.markDelivered('order-1', motoboy, '0000')).rejects.toMatchObject({
      code: 'DELIV-CODE',
      status: 400,
      details: {
        remainingAttempts: 2,
      },
    });
    await expect(service.markDelivered('order-1', motoboy, '0000')).rejects.toMatchObject({
      code: 'DELIV-CODE',
      status: 400,
      details: {
        remainingAttempts: 1,
      },
    });
    await expect(service.markDelivered('order-1', motoboy, '0000')).rejects.toMatchObject({
      code: 'MOTO-035',
      status: 423,
      details: {
        blocked: true,
        attempts: 3,
      },
    });

    expect(deliveryState.confirmationCodeAttempts).toBe(3);
    expect(deliveryState.confirmationCodeBlockedAt).toBeInstanceOf(Date);
    expect(service.emailService.sendStoreDeliveryCodeLockAlert).toHaveBeenCalledTimes(2);
    expect(service.pushService.notifyStoreUsersSecurityAlert).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deliveryService.complete)).not.toHaveBeenCalled();

    await expect(service.markDelivered('order-1', motoboy, '1234')).rejects.toMatchObject({
      code: 'MOTO-035',
      status: 423,
      details: {
        blocked: true,
      },
    });
  });
});
