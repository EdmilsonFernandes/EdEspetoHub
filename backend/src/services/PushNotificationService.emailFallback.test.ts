import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDataSource } from '../config/database';
import { PushNotificationService } from './PushNotificationService';

describe('PushNotificationService email fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds and sends the transactional customer order email', async () => {
    const service = new PushNotificationService() as any;
    service.emailService = {
      sendCustomerOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(AppDataSource, 'query').mockResolvedValue([
      {
        email: 'cliente@teste.com',
        full_name: 'Cliente Teste',
        customer_name: 'Cliente do Pedido',
        status: 'preparing',
        store_name: 'Loja Teste',
      },
    ] as any);

    await service.sendCustomerOrderEmailFallback('customer-1', {
      title: 'Pedido atualizado',
      body: 'Loja Teste: Pedido #12345678 está sendo preparado.',
      data: { orderId: 'order-1', status: 'preparing' },
    });

    expect(service.emailService.sendCustomerOrderStatusUpdate).toHaveBeenCalledWith({
      email: 'cliente@teste.com',
      customerName: 'Cliente Teste',
      storeName: 'Loja Teste',
      orderId: 'order-1',
      statusLabel: 'Pedido em preparo',
      statusMessage: 'Loja Teste: Pedido #12345678 está sendo preparado.',
    });
  });

  it('uses email fallback when no push was effectively delivered', async () => {
    const service = new PushNotificationService() as any;
    service.dispatchByOwner = vi.fn().mockResolvedValue({ ok: true, sent: 0, skipped: true });
    service.sendCustomerOrderEmailFallback = vi.fn().mockResolvedValue(undefined);

    await service.notifyCustomerOrderUpdate('customer-1', {
      title: 'Pedido atualizado',
      body: 'Pedido atualizado.',
      data: { orderId: 'order-1', status: 'preparing' },
    });

    expect(service.sendCustomerOrderEmailFallback).toHaveBeenCalledWith('customer-1', {
      title: 'Pedido atualizado',
      body: 'Pedido atualizado.',
      data: { orderId: 'order-1', status: 'preparing' },
    });
  });

  it('does not duplicate the update by email when at least one push was delivered', async () => {
    const service = new PushNotificationService() as any;
    service.dispatchByOwner = vi.fn().mockResolvedValue({ ok: true, sent: 1 });
    service.sendCustomerOrderEmailFallback = vi.fn().mockResolvedValue(undefined);

    await service.notifyCustomerOrderUpdate('customer-1', {
      title: 'Pedido atualizado',
      body: 'Pedido atualizado.',
      data: { orderId: 'order-1', status: 'preparing' },
    });

    expect(service.sendCustomerOrderEmailFallback).not.toHaveBeenCalled();
  });
});
