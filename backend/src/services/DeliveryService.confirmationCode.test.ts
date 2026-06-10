import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDataSource } from '../config/database';
import { DeliveryEvent } from '../entities/DeliveryEvent';
import { Order } from '../entities/Order';
import { OrderDelivery } from '../entities/OrderDelivery';
import { DeliveryService } from './DeliveryService';

function generateConfirmationCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function validateCode(stored: string | null | undefined, input: string | null | undefined): { ok: boolean; error?: string } {
  if (!stored) return { ok: true };
  if (!input || String(input).trim() !== String(stored)) {
    return { ok: false, error: 'Código de confirmação incorreto.' };
  }
  return { ok: true };
}

const createOrderQueryBuilder = (order: any) => {
  const builder: any = {
    leftJoinAndSelect: vi.fn(() => builder),
    setLock: vi.fn(() => builder),
    where: vi.fn(() => builder),
    getOne: vi.fn(async () => order),
  };
  return builder;
};

const createDeliveryQueryBuilder = (delivery: any) => {
  const builder: any = {
    setLock: vi.fn(() => builder),
    where: vi.fn(() => builder),
    getOne: vi.fn(async () => delivery),
  };
  return builder;
};

describe('Delivery - confirmation code helpers', () => {
  describe('generateConfirmationCode', () => {
    it('generates a 4-digit string', () => {
      const code = generateConfirmationCode();
      expect(code).toHaveLength(4);
      expect(Number(code)).toBeGreaterThanOrEqual(1000);
      expect(Number(code)).toBeLessThanOrEqual(9999);
    });

    it('generates different codes', () => {
      const codes = new Set(Array.from({ length: 20 }, generateConfirmationCode));
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('validateCode', () => {
    it('passes when no code is stored (legacy orders)', () => {
      expect(validateCode(null, null).ok).toBe(true);
      expect(validateCode(undefined, '1234').ok).toBe(true);
    });

    it('passes when code matches', () => {
      expect(validateCode('7284', '7284').ok).toBe(true);
    });

    it('fails when code does not match', () => {
      const result = validateCode('7284', '1111');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('incorreto');
    });

    it('fails when no code provided but one is required', () => {
      const result = validateCode('7284', null);
      expect(result.ok).toBe(false);
    });

    it('fails when empty string provided', () => {
      const result = validateCode('7284', '');
      expect(result.ok).toBe(false);
    });

    it('trims whitespace from input', () => {
      expect(validateCode('7284', ' 7284 ').ok).toBe(true);
    });
  });
});

describe('DeliveryService confirmation code operations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets blocked confirmation code attempts for the owning store without changing delivery status', async () => {
    const service = new DeliveryService();
    const order = {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'delivery',
      status: 'in_delivery',
      fulfillmentMode: 'distance',
      store: { id: 'store-1' },
    };
    const delivery = {
      orderId: order.id,
      status: 'IN_TRANSIT',
      confirmationCode: '1234',
      confirmationCodeAttempts: 3,
      confirmationCodeBlockedAt: new Date('2026-06-10T12:00:00.000Z'),
    };
    const deliverySave = vi.fn(async (value: any) => value);
    const eventSave = vi.fn(async (value: any) => value);
    const eventCreate = vi.fn((value: any) => value);
    const manager = {
      getRepository: vi.fn((entity: any) => {
        if (entity === Order) return { createQueryBuilder: () => createOrderQueryBuilder(order) };
        if (entity === OrderDelivery) {
          return {
            createQueryBuilder: () => createDeliveryQueryBuilder(delivery),
            save: deliverySave,
          };
        }
        if (entity === DeliveryEvent) return { create: eventCreate, save: eventSave };
        throw new Error(`Unexpected repository ${String(entity?.name || entity)}`);
      }),
    };

    vi.spyOn(AppDataSource, 'transaction').mockImplementation(async (callback: any) => callback(manager));

    const result = await service.resetConfirmationCodeByStore(order.id, 'store-1', {
      reason: 'Cliente confirmou codigo',
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: order.id,
      deliveryStatus: 'IN_TRANSIT',
      confirmationCodeAttempts: 0,
      confirmationCodeBlockedAt: null,
    });
    expect(delivery.confirmationCodeAttempts).toBe(0);
    expect(delivery.confirmationCodeBlockedAt).toBeNull();
    expect(deliverySave).toHaveBeenCalledWith(delivery);
    expect(eventSave).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: order.id,
        actorType: 'STORE',
        fromStatus: 'IN_TRANSIT',
        toStatus: 'CONFIRMATION_CODE_RESET',
        metadata: expect.objectContaining({
          previousAttempts: 3,
          wasBlocked: true,
        }),
      })
    );
  });
});
