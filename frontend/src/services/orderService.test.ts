import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../config/apiClient';
import { orderService } from './orderService';

vi.mock('../config/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('orderService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it('uses a checkout timeout when creating an order by store slug', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'order-1' });

    await orderService.createBySlug(
      { customerName: 'Cliente Teste', items: [] },
      'loja-teste',
      { authMode: 'customer', timeoutMs: 18000 }
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/stores/slug/loja-teste/orders',
      { customerName: 'Cliente Teste', items: [] },
      { authMode: 'customer', timeoutMs: 18000 }
    );
  });

  it('keeps the existing auto auth default when no options are provided', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'order-2' });

    await orderService.createBySlug({ customerName: 'Cliente Teste', items: [] }, 'loja-teste');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/stores/slug/loja-teste/orders',
      { customerName: 'Cliente Teste', items: [] },
      { authMode: 'auto' }
    );
  });
});
