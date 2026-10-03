import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Wave Asaas (03/10) — unit test (mock de fetch global, sem DB/rede):
//   1. createPixCharge: customer (POST /v3/customers) + pagamento (POST /v3/payments
//      com value EM REAIS float + dueDate +1d) + QR (GET /pixQrCode);
//   2. cache de customer: 2ª charge do mesmo pagador NÃO cria customer novo;
//   3. QR demora ~3s: 1ª consulta falha → retry 1x após delay → ok;
//   4. createCardCharge: billingType CREDIT_CARD, sem QR;
//   5. getCharge p/ polling;
//   6. resolvePlatformPixChain: asaas → [asaas (≥R$5), openpix, mp].
// env é lida no import do módulo → setar ANTES do dynamic import (beforeAll).

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

let AsaasService: typeof import('./AsaasService').AsaasService;
let resolvePlatformPixChain: typeof import('./AsaasService').resolvePlatformPixChain;
let ASAAS_MIN_PIX_BRL: typeof import('./AsaasService').ASAAS_MIN_PIX_BRL;
let env: typeof import('../config/env').env;

beforeAll(async () => {
  process.env.ASAAS_API_KEY = 'test-asaas-key';
  process.env.PAYMENT_PROVIDER_DEFAULT = 'mp';
  process.env.OPENPIX_APP_ID = 'Application test-openpix';
  const mod = await import('./AsaasService');
  AsaasService = mod.AsaasService;
  resolvePlatformPixChain = mod.resolvePlatformPixChain;
  ASAAS_MIN_PIX_BRL = mod.ASAAS_MIN_PIX_BRL;
  env = (await import('../config/env')).env;
});

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as any;

const CUSTOMER = { name: 'Loja Teste LTDA', email: 'loja@teste.com' };

/** Sequência feliz: customers → payments → pixQrCode (1ª tentativa). */
function mockHappyFlow(opts: { paymentId?: string; qrFirstFails?: boolean } = {}) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ id: 'cus_abc123' })) // POST /customers
    .mockResolvedValueOnce(
      jsonResponse({ id: opts.paymentId ?? 'pay_xyz789', status: 'PENDING', value: 29.9 })
    ); // POST /payments
  if (opts.qrFirstFails) {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errors: [{ code: 'payment_not_ready' }] }, false, 404))
      .mockResolvedValueOnce(
        jsonResponse({ payload: '00020126ASAAS-EMV-TESTE', encodedImage: 'aW1hZ2UtYjY0' })
      ); // retry do QR
  } else {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ payload: '00020126ASAAS-EMV-TESTE', encodedImage: 'aW1hZ2UtYjY0' })
      ); // GET /pixQrCode
  }
}

describe('AsaasService.createPixCharge', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('cria customer + pagamento PIX (value em REAIS float, dueDate +1d) + QR', async () => {
    mockHappyFlow();

    const service = new AsaasService();
    const result = await service.createPixCharge({
      externalReference: 'order_payment:abc-123',
      valueBrl: 29.9,
      customer: CUSTOMER,
      description: 'Assinatura Plano Premium - Loja Teste',
      qrRetryDelayMs: 0,
    });

    expect(result.providerId).toBe('pay_xyz789');
    expect(result.customerId).toBe('cus_abc123');
    expect(result.brCode).toBe('00020126ASAAS-EMV-TESTE');
    expect(result.qrCodeImageBase64).toBe('data:image/png;base64,aW1hZ2UtYjY0');
    expect(result.expiresAt).toBeInstanceOf(Date);

    // POST /v3/customers — header access_token CRU (sem Bearer)
    const [custUrl, custInit] = fetchMock.mock.calls[0];
    expect(String(custUrl)).toBe('https://api.asaas.com/v3/customers');
    expect(custInit.method).toBe('POST');
    expect((custInit.headers as any).access_token).toBe('test-asaas-key');
    expect((custInit.headers as any).Authorization).toBeUndefined();
    expect(JSON.parse(custInit.body)).toMatchObject({ name: 'Loja Teste LTDA', email: 'loja@teste.com' });

    // POST /v3/payments — value EM REAIS (float), NÃO centavos
    const [payUrl, payInit] = fetchMock.mock.calls[1];
    expect(String(payUrl)).toBe('https://api.asaas.com/v3/payments');
    expect(payInit.method).toBe('POST');
    expect((payInit.headers as any).access_token).toBe('test-asaas-key');
    const payBody = JSON.parse(payInit.body);
    expect(payBody).toMatchObject({
      customer: 'cus_abc123',
      billingType: 'PIX',
      value: 29.9,
      externalReference: 'order_payment:abc-123',
      description: 'Assinatura Plano Premium - Loja Teste',
    });
    // dueDate = amanhã, formato YYYY-MM-DD
    expect(payBody.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(payBody.dueDate).toBe(tomorrow);

    // GET /v3/payments/{id}/pixQrCode
    expect(String(fetchMock.mock.calls[2][0])).toBe('https://api.asaas.com/v3/payments/pay_xyz789/pixQrCode');
  });

  it('cache de customer: 2ª charge do mesmo pagador NÃO cria outro customer', async () => {
    const service = new AsaasService();
    // 1ª charge
    mockHappyFlow();
    await service.createPixCharge({
      externalReference: 'ref-1',
      valueBrl: 10,
      customer: CUSTOMER,
      qrRetryDelayMs: 0,
    });
    fetchMock.mockReset();
    // 2ª charge mesmo pagador: SEM POST /customers
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'pay_2', status: 'PENDING', value: 10 }))
      .mockResolvedValueOnce(jsonResponse({ payload: 'EMV-2' }));

    await service.createPixCharge({
      externalReference: 'ref-2',
      valueBrl: 10,
      customer: CUSTOMER,
      qrRetryDelayMs: 0,
    });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.endsWith('/customers'))).toBe(false); // veio do cache
    expect(urls[0]).toBe('https://api.asaas.com/v3/payments'); // direto no pagamento
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).customer).toBe('cus_abc123'); // mesmo customer
  });

  it('QR demora ~3s: 1ª consulta falha → retry 1x após delay → payload ok', async () => {
    mockHappyFlow({ qrFirstFails: true });

    const service = new AsaasService();
    const result = await service.createPixCharge({
      externalReference: 'ref-3',
      valueBrl: 5,
      customer: CUSTOMER,
      qrRetryDelayMs: 5, // delay curto p/ teste (prod = 3000)
    });

    expect(result.brCode).toBe('00020126ASAAS-EMV-TESTE');
    const qrCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/pixQrCode'));
    expect(qrCalls).toHaveLength(2); // 1ª falhou, retry ok
  });

  it('QR indisponível nas 2 tentativas → erro PAY-024', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'cus_1' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'pay_1', status: 'PENDING', value: 10 }))
      .mockResolvedValueOnce(jsonResponse({ error: 'not ready' }, false, 404))
      .mockResolvedValueOnce(jsonResponse({ error: 'not ready' }, false, 404));

    const service = new AsaasService();
    await expect(
      service.createPixCharge({ externalReference: 'ref-4', valueBrl: 10, customer: CUSTOMER, qrRetryDelayMs: 0 })
    ).rejects.toMatchObject({ code: 'PAY-024' });
  });

  it('API rejeita o pagamento → erro claro PAY-023', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'cus_1' }))
      .mockResolvedValueOnce(jsonResponse({ errors: [{ code: 'invalid_value' }] }, false, 400));

    const service = new AsaasService();
    await expect(
      service.createPixCharge({ externalReference: 'ref-5', valueBrl: 10, customer: CUSTOMER, qrRetryDelayMs: 0 })
    ).rejects.toMatchObject({ code: 'PAY-023' });
  });
});

describe('AsaasService.createCardCharge', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('cria cobrança CREDIT_CARD (sem QR) e devolve providerId', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'cus_card' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'pay_card_1', status: 'PENDING', value: 49.9 }));

    const service = new AsaasService();
    const result = await service.createCardCharge({
      externalReference: 'pay-uuid-1',
      valueBrl: 49.9,
      customer: CUSTOMER,
      description: 'Assinatura cartão',
    });

    expect(result.providerId).toBe('pay_card_1');
    expect(result.brCode).toBeNull();
    const [payUrl, payInit] = fetchMock.mock.calls[1];
    expect(String(payUrl)).toBe('https://api.asaas.com/v3/payments');
    const body = JSON.parse(payInit.body);
    expect(body.billingType).toBe('CREDIT_CARD');
    expect(body.value).toBe(49.9); // REAIS float
    expect(body.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('AsaasService.getCharge (polling)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('busca pagamento por id e devolve o body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 'pay_xyz789', status: 'RECEIVED', value: 29.9, externalReference: 'pay-uuid-1' })
    );

    const service = new AsaasService();
    const charge = await service.getCharge('pay_xyz789');

    expect(charge?.status).toBe('RECEIVED');
    expect(charge?.externalReference).toBe('pay-uuid-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.asaas.com/v3/payments/pay_xyz789');
    expect((init.headers as any).access_token).toBe('test-asaas-key');
  });

  it('retorna null em 404 (id desconhecido)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not found' }, false, 404));
    const service = new AsaasService();
    expect(await service.getCharge('pay_inexistente')).toBeNull();
  });
});

describe('resolvePlatformPixChain (fallback)', () => {
  let originalEnv: { provider: string; asaasKey: string; openpixKey: string } | null = null;

  beforeEach(() => {
    if (!originalEnv) {
      originalEnv = {
        provider: env.payments.providerDefault,
        asaasKey: env.asaas.apiKey,
        openpixKey: env.openpix.appId,
      };
    }
    env.payments.providerDefault = 'mp';
    env.asaas.apiKey = 'test-asaas-key';
    env.openpix.appId = 'Application test-openpix';
  });

  it('PAYMENT_PROVIDER=asaas + valor ≥R$5 → [asaas, openpix, mp]', () => {
    env.payments.providerDefault = 'asaas';
    expect(resolvePlatformPixChain(29.9)).toEqual(['asaas', 'openpix', 'mp']);
    expect(resolvePlatformPixChain(ASAAS_MIN_PIX_BRL)).toEqual(['asaas', 'openpix', 'mp']); // limite inclusivo
  });

  it('PAYMENT_PROVIDER=asaas + valor <R$5 → Asaas PULADO (mínimo do provedor)', () => {
    env.payments.providerDefault = 'asaas';
    expect(resolvePlatformPixChain(4.99)).toEqual(['openpix', 'mp']);
  });

  it('PAYMENT_PROVIDER=asaas + Asaas sem key → [openpix, mp]', () => {
    env.payments.providerDefault = 'asaas';
    env.asaas.apiKey = '';
    expect(resolvePlatformPixChain(29.9)).toEqual(['openpix', 'mp']);
  });

  it('PAYMENT_PROVIDER=asaas + nada configurado além do MP → só [mp]', () => {
    env.payments.providerDefault = 'asaas';
    env.asaas.apiKey = '';
    env.openpix.appId = '';
    expect(resolvePlatformPixChain(29.9)).toEqual(['mp']);
  });

  it('PAYMENT_PROVIDER=openpix → [openpix, mp] (Waves 1/2 inalteradas); mp default → [mp]', () => {
    env.payments.providerDefault = 'openpix';
    expect(resolvePlatformPixChain(29.9)).toEqual(['openpix', 'mp']);
    env.payments.providerDefault = 'mp';
    expect(resolvePlatformPixChain(29.9)).toEqual(['mp']);
  });

  afterAll(() => {
    // restaura env original (outros testes do repo dependem dela)
    if (originalEnv) {
      env.payments.providerDefault = originalEnv.provider as typeof env.payments.providerDefault;
      env.asaas.apiKey = originalEnv.asaasKey;
      env.openpix.appId = originalEnv.openpixKey;
    }
  });
});
