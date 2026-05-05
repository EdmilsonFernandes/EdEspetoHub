import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database (must be before any import that touches AppDataSource)
const mockFindOne = vi.fn();
const mockUpdate = vi.fn();
vi.mock('../database', () => ({
  AppDataSource: {
    getRepository: () => ({ findOne: mockFindOne, update: mockUpdate }),
    query: vi.fn(),
  },
}));

// Mock config/env
vi.mock('../config/env', () => ({
  env: {
    mercadoPago: { apiBaseUrl: 'https://api.mercadopago.com', accessToken: 'test' },
    database: { host: 'localhost', port: 5432, username: 'test', password: 'test', database: 'test' },
    jwtSecret: 'test-secret',
  },
}));

// Mock MercadoPagoService
const mockRefundPayment = vi.fn();
vi.mock('./MercadoPagoService', () => ({
  MercadoPagoService: class {
    refundPayment = mockRefundPayment;
  },
}));

// Mock StorePaymentAccountService
const mockGetActiveAccessToken = vi.fn();
vi.mock('./StorePaymentAccountService', () => ({
  StorePaymentAccountService: class {
    getActiveAccessToken = mockGetActiveAccessToken;
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({ logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) } }));

// Mock PaymentAuditService
vi.mock('./PaymentAuditService', () => ({ PaymentAuditService: class { record = vi.fn(); } }));

// Mock AppError
vi.mock('../errors/AppError', () => ({
  AppError: class AppError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, statusCode: number, message?: string) {
      super(message || code);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

import { OrderPaymentService } from './OrderPaymentService';

const service = new OrderPaymentService();

describe('OrderPaymentService — refundOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const paidPayment = {
    id: 'pay-1',
    orderId: 'order-1',
    storeId: 'store-1',
    paymentStatus: 'PAID',
    amount: 50,
    providerId: 'mp-123',
    refundStatus: null,
  };

  it('rejects if payment not found', async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(service.refundOrder('order-1', 'store-1', 'motivo')).rejects.toThrow('Pagamento');
  });

  it('rejects if store does not own the payment', async () => {
    mockFindOne.mockResolvedValue({ ...paidPayment, storeId: 'other-store' });
    await expect(service.refundOrder('order-1', 'store-1', 'motivo')).rejects.toThrow('Acesso');
  });

  it('rejects if payment is not PAID', async () => {
    mockFindOne.mockResolvedValue({ ...paidPayment, paymentStatus: 'PENDING' });
    await expect(service.refundOrder('order-1', 'store-1', 'motivo')).rejects.toThrow('confirmados');
  });

  it('rejects if already refunded', async () => {
    mockFindOne.mockResolvedValue({ ...paidPayment, refundStatus: 'REFUNDED' });
    await expect(service.refundOrder('order-1', 'store-1', 'motivo')).rejects.toThrow('reembolsado');
  });

  it('rejects if no provider ID', async () => {
    mockFindOne.mockResolvedValue({ ...paidPayment, providerId: null });
    await expect(service.refundOrder('order-1', 'store-1', 'motivo')).rejects.toThrow('provedor');
  });

  it('rejects if no access token available', async () => {
    mockFindOne.mockResolvedValue(paidPayment);
    mockGetActiveAccessToken.mockResolvedValue(null);
    await expect(service.refundOrder('order-1', 'store-1', 'motivo')).rejects.toThrow('token');
  });

  it('processes full refund successfully', async () => {
    mockFindOne.mockResolvedValue(paidPayment);
    mockGetActiveAccessToken.mockResolvedValue('token-abc');
    mockRefundPayment.mockResolvedValue({ id: 'refund-1', status: 'approved' });
    mockUpdate.mockResolvedValue({});

    const result = await service.refundOrder('order-1', 'store-1', 'Pedido cancelado');

    expect(mockRefundPayment).toHaveBeenCalledWith('mp-123', 'token-abc', undefined);
    expect(mockUpdate).toHaveBeenCalledWith('pay-1', expect.objectContaining({
      refundStatus: 'REFUNDED',
      refundAmount: 50,
      refundReason: 'Pedido cancelado',
      refundProviderId: 'refund-1',
    }));
    expect(result.refundStatus).toBe('REFUNDED');
    expect(result.refundAmount).toBe(50);
  });

  it('processes partial refund when amount < total', async () => {
    mockFindOne.mockResolvedValue(paidPayment);
    mockGetActiveAccessToken.mockResolvedValue('token-abc');
    mockRefundPayment.mockResolvedValue({ id: 'refund-2', status: 'approved' });
    mockUpdate.mockResolvedValue({});

    const result = await service.refundOrder('order-1', 'store-1', 'Item faltando', 20);

    expect(mockRefundPayment).toHaveBeenCalledWith('mp-123', 'token-abc', 20);
    expect(mockUpdate).toHaveBeenCalledWith('pay-1', expect.objectContaining({
      refundStatus: 'PARTIALLY_REFUNDED',
      refundAmount: 20,
    }));
    expect(result.refundStatus).toBe('PARTIALLY_REFUNDED');
    expect(result.refundAmount).toBe(20);
  });
});
