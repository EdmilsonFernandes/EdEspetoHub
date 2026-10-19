import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * WAVE ASAAS (19/10) — checkout PIX do pedido honra a cadeia COMPLETA
 * resolvePlatformPixChain: Asaas (≥R$5) → OpenPix → Mercado Pago da loja.
 * Contrato do dinheiro (pedido do dono):
 * - PAYMENT_PROVIDER_DEFAULT=asaas + valor ≥R$5 → charge ASAAS com
 *   externalReference `order_payment:{id}` (dinheiro na plataforma, repasse
 *   à loja depois) — janela LOCAL de 30min, NÃO o dueDate do Asaas (+1d);
 * - valor <R$5 → Asaas pulado, OpenPix assume (mesma chain);
 * - erro no Asaas → próximo da cadeia (OpenPix), depois MP (intacto);
 * - tudo falha + loja sem MP → linha removida, sem PENDING fantasma;
 * - polling refreshFromProvider: ASAAS RECEIVED/CONFIRMED → PAGO;
 * - cartão NUNCA migra (permanece MP).
 */

const { repoMock, mpCreatePayment, accountGetToken, openPixPostBodies, asaasCalls, savedRows, lockRow } = vi.hoisted(() => {
  const lockRow: any = { value: null };
  const chainable = () => {
    const b: any = {};
    b.setLock = vi.fn(() => b);
    b.where = vi.fn(() => b);
    b.update = vi.fn(() => b);
    b.set = vi.fn(() => b);
    b.execute = vi.fn(async () => ({ affected: 1 }));
    b.getOne = vi.fn(async () => lockRow.value);
    return b;
  };
  return {
    repoMock: {
      create: (data: any) => ({ ...data }),
      save: vi.fn(async (row: any) => {
        if (!row.id) row.id = 'op-1';
        savedRows.push(row);
        return row;
      }),
      delete: vi.fn(async () => undefined),
      findOne: vi.fn(async () => null),
      update: vi.fn(async () => ({ affected: 1 })),
      createQueryBuilder: vi.fn(() => chainable()),
    },
    mpCreatePayment: vi.fn(),
    accountGetToken: vi.fn(),
    openPixPostBodies: [] as any[],
    asaasCalls: [] as any[],
    savedRows: [] as any[],
    lockRow,
  };
});

vi.mock('../config/env', () => ({
  env: {
    payments: { providerDefault: 'asaas' },
    asaas: { apiKey: 'test-asaas-key', apiBaseUrl: 'https://asaas.test/v3' },
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

/**
 * Fetch stub duplo Asaas+OpenPix. opts.failAsaas derruba o POST /customers do
 * Asaas (primeira chamada da charge) p/ forçar a cadeia pro próximo.
 */
const stubPlatformFetch = (opts: { failAsaas?: boolean } = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href.startsWith('https://asaas.test/v3')) {
        asaasCalls.push({ href, method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
        if (opts.failAsaas && href.endsWith('/customers') && init?.method === 'POST') {
          return jsonResponse(500, { errors: [{ code: 'asaas_down' }] });
        }
        if (href.endsWith('/customers') && init?.method === 'POST') {
          return jsonResponse(200, { id: 'cus_abc123' });
        }
        if (href.endsWith('/payments') && init?.method === 'POST') {
          return jsonResponse(200, { id: 'pay_xyz789', status: 'PENDING', value: 29.9 });
        }
        if (href.endsWith('/pixQrCode')) {
          return jsonResponse(200, { payload: '00020126ASAAS-EMV', encodedImage: 'aW1hZ2UtYjY0' });
        }
        if (/\/payments\/pay_/.test(href)) {
          return jsonResponse(200, {
            id: 'pay_xyz789',
            status: 'RECEIVED',
            value: 29.9,
            externalReference: 'order_payment:op-1',
          });
        }
        return jsonResponse(404, {});
      }
      if (href === 'https://openpix.test/api/v1/charge' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        openPixPostBodies.push(body);
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
    name: 'Cantina do Açaí',
    owner: { email: 'dono@loja.com' },
  },
  customerUser: { email: 'cliente@x.com' },
  customerName: 'Cliente Teste',
};

beforeEach(() => {
  vi.clearAllMocks();
  openPixPostBodies.length = 0;
  asaasCalls.length = 0;
  savedRows.length = 0;
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

describe('createForOrderIfEnabled — WAVE ASAAS (cadeia completa no checkout)', () => {
  it('PIX ≥R$5 com asaas ativo gera charge ASAAS da plataforma (externalReference = order_payment:{id})', async () => {
    stubPlatformFetch();
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row?.provider).toBe('ASAAS');
    expect(row?.providerId).toBe('pay_xyz789');
    expect(row?.qrCodeText).toBe('00020126ASAAS-EMV');
    expect(row?.qrCodeBase64).toBe('data:image/png;base64,aW1hZ2UtYjY0');
    // Janela LOCAL de 30min — o dueDate do Asaas (+1d) NÃO governa o ciclo.
    expect(row?.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 25 * 60 * 1000);
    expect(row?.expiresAt?.getTime()).toBeLessThan(Date.now() + 35 * 60 * 1000);

    // POST /payments: value EM REAIS float (não centavos) + externalReference.
    const payCall = asaasCalls.find((c) => c.href.endsWith('/payments') && c.method === 'POST');
    expect(payCall?.body).toMatchObject({
      customer: 'cus_abc123',
      billingType: 'PIX',
      value: 29.9,
      externalReference: 'order_payment:op-1',
    });

    // Plataforma cobra: NEM OpenPix NEM MP da loja.
    expect(openPixPostBodies).toHaveLength(0);
    expect(mpCreatePayment).not.toHaveBeenCalled();
    expect(accountGetToken).not.toHaveBeenCalled();
  });

  it('pedido <R$5 pula o Asaas (mínimo do provedor) e cai no OpenPix', async () => {
    stubPlatformFetch();
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled({ ...order, total: 3 });

    expect(row?.provider).toBe('OPENPIX');
    expect(asaasCalls).toHaveLength(0);
    expect(openPixPostBodies).toHaveLength(1);
    expect(openPixPostBodies[0].value).toBe(300); // 3 BRL → centavos
  });

  it('erro no Asaas → próximo da cadeia (OpenPix assume)', async () => {
    stubPlatformFetch({ failAsaas: true });
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row?.provider).toBe('OPENPIX');
    expect(openPixPostBodies).toHaveLength(1);
    expect(mpCreatePayment).not.toHaveBeenCalled();
  });

  it('erro no Asaas E no OpenPix → fallback Mercado Pago OAuth da loja (fluxo intacto)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const href = String(url);
        if (href.startsWith('https://asaas.test/v3/customers') && init?.method === 'POST') {
          return jsonResponse(500, { errors: [{ code: 'asaas_down' }] });
        }
        if (href === 'https://openpix.test/api/v1/charge' && init?.method === 'POST') {
          return jsonResponse(500, { error: 'openpix down' });
        }
        return jsonResponse(404, {});
      })
    );
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row?.provider).toBe('MERCADO_PAGO');
    expect(row?.qrCodeText).toBe('mp-pix-payload');
    expect(mpCreatePayment).toHaveBeenCalledTimes(1);
    expect(mpCreatePayment.mock.calls[0][0].accessToken).toBe('STORE_MP_TOKEN');
    expect(mpCreatePayment.mock.calls[0][0].method).toBe('PIX');
  });

  it('cadeia inteira falha + loja sem MP conectado → remove a linha e devolve null (sem PENDING fantasma)', async () => {
    accountGetToken.mockResolvedValue(null);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { error: 'down' }))
    );
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled(order);

    expect(row).toBeNull();
    expect(repoMock.delete).toHaveBeenCalledWith('op-1');
    expect(mpCreatePayment).not.toHaveBeenCalled();
  });

  it('cartão NUNCA migra — permanece Mercado Pago mesmo com asaas ativo', async () => {
    stubPlatformFetch();
    const service = new OrderPaymentService();
    const row = await service.createForOrderIfEnabled({ ...order, paymentMethod: 'credito' });

    expect(row?.provider).toBe('MERCADO_PAGO');
    expect(asaasCalls).toHaveLength(0);
    expect(openPixPostBodies).toHaveLength(0);
    expect(mpCreatePayment).toHaveBeenCalledTimes(1);
    expect(mpCreatePayment.mock.calls[0][0].method).toBe('CREDIT_CARD');
  });
});

describe('refreshFromProvider — polling ASAAS', () => {
  it('RECEIVED no Asaas → marca PAGO e promove awaiting_payment → pending', async () => {
    stubPlatformFetch();
    const asaasRow: any = {
      id: 'op-1',
      orderId: 'order-abcd1234',
      storeId: 'store-1',
      amount: 29.9,
      provider: 'ASAAS',
      providerId: 'pay_xyz789',
      paymentStatus: 'PENDING',
      store: order.store,
    };
    repoMock.findOne.mockResolvedValue(asaasRow);
    lockRow.value = { ...asaasRow };
    const service = new OrderPaymentService();
    await service.refreshFromProvider('op-1');

    const paidRow = savedRows.find((r) => r.paymentStatus === 'PAID');
    expect(paidRow?.id).toBe('op-1');
    expect(paidRow?.providerPayload?.status_detail).toBe('asaas_received');
    expect(repoMock.update).toHaveBeenCalledWith(
      { id: 'order-abcd1234' },
      { paymentStatus: 'PAID' }
    );
  });

  it('status pendente no Asaas (PENDING) → não transiciona nada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = String(url);
        if (/\/payments\/pay_/.test(href)) {
          return jsonResponse(200, { id: 'pay_xyz789', status: 'PENDING', value: 29.9 });
        }
        return jsonResponse(404, {});
      })
    );
    const asaasRow: any = {
      id: 'op-1',
      orderId: 'order-abcd1234',
      storeId: 'store-1',
      provider: 'ASAAS',
      providerId: 'pay_xyz789',
      paymentStatus: 'PENDING',
      store: order.store,
    };
    repoMock.findOne.mockResolvedValue(asaasRow);
    const service = new OrderPaymentService();
    await service.refreshFromProvider('op-1');

    expect(savedRows.find((r) => r.paymentStatus === 'PAID')).toBeUndefined();
  });
});
