import { describe, it, expect, vi, afterEach } from 'vitest';
import { MercadoPagoPointService } from './MercadoPagoPointService';
import { AppError } from '../errors/AppError';

/**
 * SDD cobranca-balcao (T2) — adapter da Orders API do Point.
 * Garante o contrato do dinheiro: body correto, idempotency-key estável,
 * expiração PT5M e mensagens de erro acionáveis (REQ-6/9/10/18/23).
 */
const service = new MercadoPagoPointService();

const stubFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) =>
  vi.stubGlobal('fetch', vi.fn(impl));

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createPointCharge (REQ-6)', () => {
  const baseInput = {
    storeId: 'store-1',
    accessToken: 'APP_USR-test',
    amount: 47.5,
    terminalId: 'NEWLAND_N950__N950NCB801293324',
    externalReference: 'order_payment:abc',
    description: 'Pedido abc12345 - Loja',
  };

  it('monta body da order point com type/terminal/PT5M/valor 2 decimais e idempotency-key estável', async () => {
    let captured: { url: string; init?: RequestInit } | null = null;
    stubFetch(async (url, init) => {
      captured = { url: String(url), init };
      return jsonResponse(201, { id: '01JSPOINTORDER1', status: 'OPEN' });
    });

    const result = await service.createPointCharge(baseInput);

    expect(captured!.url).toContain('/v1/orders');
    const body = JSON.parse(String(captured!.init!.body));
    expect(body.type).toBe('point');
    expect(body.external_reference).toBe('order_payment:abc');
    expect(body.expiration_time).toBe('PT5M');
    expect(body.transactions.payments[0].amount).toBe(47.5);
    expect(body.transactions.payments[0].description).toBe(baseInput.description);
    expect(body.config.point.terminal_id).toBe(baseInput.terminalId);
    const headers = captured!.init!.headers as Record<string, string>;
    expect(headers['X-Idempotency-Key']).toContain('point:order_payment:abc:4750');

    expect(result.orderId).toBe('01JSPOINTORDER1');
    // expira local em ~5min (REQ-5)
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 4 * 60 * 1000);
    expect(result.expiresAt.getTime()).toBeLessThan(Date.now() + 6 * 60 * 1000);
  });

  it('idempotency-key muda com o valor — desconto gera chave nova (sem colisão de retry)', async () => {
    const keys: string[] = [];
    stubFetch(async (_url, init) => {
      keys.push((init!.headers as Record<string, string>)['X-Idempotency-Key']);
      return jsonResponse(201, { id: 'ord-1', status: 'OPEN' });
    });
    await service.createPointCharge(baseInput);
    await service.createPointCharge({ ...baseInput, amount: 40 });
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('403 do MP vira PAY-018 com dica de reconexão (REQ-10)', async () => {
    stubFetch(async () => jsonResponse(403, { message: 'forbidden' }));
    await expect(service.createPointCharge(baseInput)).rejects.toMatchObject({
      code: 'PAY-018',
      status: 502,
    });
  });

  it('404 do MP vira PAY-018 com dica de modo PDV (REQ-9)', async () => {
    stubFetch(async () => jsonResponse(404, { message: 'not found' }));
    const error = await service
      .createPointCharge(baseInput)
      .catch((error: AppError) => error);
    expect(error.code).toBe('PAY-018');
    expect(String((error.details as any)?.message || error.message)).toContain('PDV');
  });

  it('falha de rede vira PAY-018 sem estourar fetch cru (REQ-23)', async () => {
    stubFetch(async () => {
      throw new Error('network down');
    });
    await expect(service.createPointCharge(baseInput)).rejects.toMatchObject({ code: 'PAY-018' });
  });
});

describe('cancelPointCharge (REQ-18)', () => {
  it('chama POST /v1/orders/{id}/cancel com idempotency-key', async () => {
    let captured: { url: string; method?: string; headers?: Record<string, string> } | null = null;
    stubFetch(async (url, init) => {
      captured = { url: String(url), method: init?.method, headers: init?.headers as Record<string, string> };
      return jsonResponse(200, { id: 'ord-1', status: 'canceled' });
    });
    const ok = await service.cancelPointCharge('APP_USR-test', 'ord-1');
    expect(ok).toBe(true);
    expect(captured!.url).toContain('/v1/orders/ord-1/cancel');
    expect(captured!.method).toBe('POST');
    expect(captured!.headers!['X-Idempotency-Key']).toBe('pointcancel:ord-1');
  });

  it('recusa do cancel é best-effort (false), nunca explode', async () => {
    stubFetch(async () => jsonResponse(409, { message: 'already processed' }));
    expect(await service.cancelPointCharge('APP_USR-test', 'ord-1')).toBe(false);
  });
});

describe('getPointOrder (REQ-8/21)', () => {
  it('retorna a order processada com o pagamento dentro', async () => {
    stubFetch(async () =>
      jsonResponse(200, {
        id: 'ord-1',
        status: 'processed',
        transactions: { payments: [{ id: 'pay-1', status: 'approved' }] },
      })
    );
    const order = await service.getPointOrder('APP_USR-test', 'ord-1');
    expect(order.transactions.payments[0].status).toBe('approved');
  });

  it('MP fora/404 devolve null (reconcile segue com estado local)', async () => {
    stubFetch(async () => jsonResponse(404, {}));
    expect(await service.getPointOrder('APP_USR-test', 'ord-x')).toBeNull();
  });
});
