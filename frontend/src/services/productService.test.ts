import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../config/apiClient';
import { productService } from './productService';

vi.mock('../config/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('productService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('passes timeout to public product refresh requests', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 'prod-1', name: 'Espeto', price: 12, imageUrl: '' },
    ]);

    await productService.listPublicBySlug('loja-teste', {
      forceRefresh: true,
      timeoutMs: 10000,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/public\/stores\/slug\/loja-teste\/products\?t=\d+$/),
      {
        authMode: 'none',
        timeoutMs: 10000,
        headers: { 'Cache-Control': 'no-cache' },
      }
    );
  });
});
