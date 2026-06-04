import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDataSource } from '../config/database';
import { PushNotificationService } from './PushNotificationService';

describe('PushNotificationService email fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends transactional email when customer has no active push token', async () => {
    const service = new PushNotificationService() as any;
    service.hasActiveCustomerTokens = vi.fn().mockResolvedValue(false);
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

  it('does not send email when customer already has active push token', async () => {
    const service = new PushNotificationService() as any;
    service.hasActiveCustomerTokens = vi.fn().mockResolvedValue(true);
    service.emailService = {
      sendCustomerOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
    };
    const querySpy = vi.spyOn(AppDataSource, 'query');

    await service.sendCustomerOrderEmailFallback('customer-1', {
      title: 'Pedido atualizado',
      body: 'Pedido atualizado.',
      data: { orderId: 'order-1', status: 'preparing' },
    });

    expect(querySpy).not.toHaveBeenCalled();
    expect(service.emailService.sendCustomerOrderStatusUpdate).not.toHaveBeenCalled();
  });
});
