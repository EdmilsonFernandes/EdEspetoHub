import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeToOpenPixAscii } from './OpenPixService';

/**
 * WAVE 2 OpenPix — checkout PIX do pedido migra para a plataforma.
 * Contrato do dinheiro (autorizado pelo dono, 03/10):
 * - PAYMENT_PROVIDER_DEFAULT=openpix → charge OpenPix com correlationID
 *   `order_payment:{id}` (dinheiro na plataforma, repasse à loja depois);
 * - erro no OpenPix → fallback MP OAuth da loja (fluxo intacto);
 * - OpenPix fora + loja sem MP → linha removida, pedido segue sem pagamento
 *   online (semântica de "loja sem gateway" preservada);
 * - cartão NUNCA migra (permanece MP).
 */

const { repoMock, mpCreatePayment, accountGetToken, openPixPostBodies } = vi.hoisted(() => ({
  repoMock: {
    create: (data: any) => ({ ...data }),
    save: vi.fn(async (row: any) => {
      if (!row.id) row.id = 'op-1';
      return row;
    }),
    delete: vi.fn(async () => undefined),
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => ({ affected: 1 })),
    createQueryBuilder: vi.fn(),
  },
  mpCreatePayment: vi.fn(),
  accountGetToken: vi.fn(),
  openPixPostBodies: [] as any[],
}));

vi.mock('../config/env', () => ({
  env: {
    payments: { providerDefault: 'openpix' },
    openpix: { appId: 'test-openpix-app-id', apiBaseUrl: 'https://openpix.test' },
    mercadoPago: { apiBaseUrl: 'https://api.mp.test' },
  },
}));

vi.mock('../config/database', () => ({
  AppDataSource: {
    manager: { getRepository: () => repoMock },
    getRepository: () => repoMock,
    transaction: async (fn: any) => fn({ getRepository: () => repoMock }),
    query: async () => [],
  },
}));

vi.mock('./MercadoPagoService', () => ({
  MercadoPagoService: class {
    createPayment = mpCreatePayment;
    getPayment = vi.fn();
    refundPayment = vi.fn();
  },
}));

vi.mock('./StorePaymentAccountService', () => ({
  StorePaymentAccountService: class {
    getActiveAccessToken = accountGetToken;
    listActiveAccessTokens = vi.fn(async () => []);
  },
}));

vi.mock('./PaymentAuditService', () => ({
  PaymentAuditService: class {
    record = vi.fn(async () => undefined);
    listByEntity = vi.fn(async () => []);
    buildOverview = vi.fn(() => ({}));
  },
}));

vi.mock('./PushNotificationService', () => ({
  PushNotificationService: class {
    notifyCustomerOrderUpdate = vi.fn(async () => undefined);
    notifyGuestOrderUpdate = vi.fn(async () => undefined);
  },
}));

import { OrderPaymentService } from './OrderPaymentService';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** POST /charge ok (ou 500 p/ forçar fallback) + download best-effort da imagem do QR. */
const stubOpenPixFetch = (opts: { failCharge?: boolean } = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === 'https://openpix.test/api/v1/charge' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        openPixPostBodies.push(body);
        if (opts.failCharge) return jsonResponse(500, { error: 'openpix down' });
        return jsonResponse(200, {
          charge: {
            correlationID: body.correlationID,
            brCode: `00020126BRCODE.${body.correlationID}`,
            paymentMethods: { pix: { qrCodeImage: 'https://img.test/qr.png' } },
          },
          expiresAt: new Date(Date.now() + 1800_000).toISOString(),
        });
      }
      if (href === 'https://img.test/qr.png') {
        return new Response(new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]), { status: 200 });
      }
      return jsonResponse(404, {});
    })
  );

const order: any = {
  id: 'order-abcd1234',
  total: 29.9,
  paymentMethod: 'pix',
  store: {
    id: 'store-1',
    name: 'Cantina do Açaí — Pão de Queijo',
    owner: { email: 'dono@loja.com' },
  },
  customerUser: { email: 'cliente@x.com' },
  customerName: 'Cliente Teste',
};

beforeEach(() => {
  vi.clearAllMocks();
  openPixPostBodies.length = 0;
  mpCreatePayment.mockImplementation(async () => ({
    providerId: 'mp-123',
    paymentLink: 'https://mp.test/checkout',
    qrCodeBase64: 'QUJD',
    qrCodeText: 'mp-pix-payload',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }));
  accountGetToken.mockResolvedValue('STORE_MP_TOKEN');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createForOrderIfEnabled — WAVE 2 OpenPix (checkout PIX)', () => {
  it('PIX com toggle ativo gera charge OpenPix da plataforma (correlationID = order_payment:{id})', async () => {
    stubOpenPixFetch();
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row?.provider).toBe('OPENPIX');
    expect(row?.providerId).toBe('order_payment:op-1');
    expect(row?.qrCodeText).toBe('00020126BRCODE.order_payment:op-1');
    expect(row?.qrCodeBase64?.startsWith('data:image/png;base64,')).toBe(true);
    expect(row?.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 25 * 60 * 1000);

    expect(openPixPostBodies).toHaveLength(1);
    expect(openPixPostBodies[0].correlationID).toBe('order_payment:op-1');
    expect(openPixPostBodies[0].value).toBe(2990); // BRL → CENTAVOS
    expect(openPixPostBodies[0].expiresIn).toBe(1800); // mesma janela de 30min do MP

    // Plataforma cobra: NÃO exige OAuth MP da loja nem chama o MP.
    expect(accountGetToken).not.toHaveBeenCalled();
    expect(mpCreatePayment).not.toHaveBeenCalled();
  });

  it('comment da charge é ASCII puro (OpenPix rejeita acento/emoji/travessão)', async () => {
    stubOpenPixFetch();
    const service = new OrderPaymentService();
    await service.createForOrderIfEnabled(order);

    const description = `Pedido ${String(order.id).slice(0, 8)} - ${order.store.name}`;
    const expectedComment = sanitizeToOpenPixAscii(description);
    expect(openPixPostBodies[0].comment).toBe(expectedComment);
    // prova concreta: nome com Açaí/travessão/Pão entra sanitizado
    expect(expectedComment).not.toContain('Açaí');
    expect(expectedComment).not.toContain('—');
    expect(expectedComment).not.toMatch(/[^\x20-\x7E]/);
  });

  it('erro no OpenPix → fallback Mercado Pago OAuth da loja (fluxo intacto)', async () => {
    stubOpenPixFetch({ failCharge: true });
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row?.provider).toBe('MERCADO_PAGO');
    expect(row?.qrCodeText).toBe('mp-pix-payload');
    expect(row?.paymentLink).toBe('https://mp.test/checkout');
    expect(mpCreatePayment).toHaveBeenCalledTimes(1);
    expect(mpCreatePayment.mock.calls[0][0].accessToken).toBe('STORE_MP_TOKEN');
    expect(mpCreatePayment.mock.calls[0][0].externalReference).toBe('order_payment:op-1');
    expect(mpCreatePayment.mock.calls[0][0].method).toBe('PIX');
  });

  it('erro no OpenPix + loja sem MP conectado → remove a linha e devolve null (sem PENDING fantasma)', async () => {
    stubOpenPixFetch({ failCharge: true });
    accountGetToken.mockResolvedValue(null);
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row).toBeNull();
    expect(repoMock.delete).toHaveBeenCalledWith('op-1');
    expect(mpCreatePayment).not.toHaveBeenCalled();
  });

  it('cartão NUNCA migra — permanece Mercado Pago mesmo com toggle OpenPix ativo', async () => {
    stubOpenPixFetch();
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled({ ...order, paymentMethod: 'credito' });

    expect(row?.provider).toBe('MERCADO_PAGO');
    expect(openPixPostBodies).toHaveLength(0);
    expect(mpCreatePayment).toHaveBeenCalledTimes(1);
    expect(mpCreatePayment.mock.calls[0][0].method).toBe('CREDIT_CARD');
    expect(mpCreatePayment.mock.calls[0][0].accessToken).toBe('STORE_MP_TOKEN');
  });
});
