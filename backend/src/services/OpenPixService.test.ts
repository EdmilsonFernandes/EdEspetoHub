import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// WAVE 1 OpenPix — unit test (mock de fetch global, sem DB/rede):
//   1. createCharge ok: corpo da charge (brCode + qrCodeImage NO CORPO, não no
//      endpoint /api/image/qrcode/base64 que devolve not found p/ DYNAMIC);
//   2. comment SEMPRE ASCII (OpenPix rejeita não-ASCII — até travessão —
//      "Emoji não é permitido", provado ao vivo no Dr. Exame 02/10);
//   3. getCharge p/ polling por correlationID.
// env é lida no import do módulo → setar ANTES do dynamic import (beforeAll).

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

let OpenPixService: typeof import('./OpenPixService').OpenPixService;
let sanitizeToOpenPixAscii: typeof import('./OpenPixService').sanitizeToOpenPixAscii;
let toOpenPixCents: typeof import('./OpenPixService').toOpenPixCents;

beforeAll(async () => {
  process.env.OPENPIX_APP_ID = 'Application test-app-id';
  process.env.PAYMENT_PROVIDER_DEFAULT = 'openpix';
  const mod = await import('./OpenPixService');
  OpenPixService = mod.OpenPixService;
  sanitizeToOpenPixAscii = mod.sanitizeToOpenPixAscii;
  toOpenPixCents = mod.toOpenPixCents;
});

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as any;

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('OpenPixService.createCharge', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('cria charge: brCode do corpo + QR imagem baixada do paymentMethods.pix.qrCodeImage', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          charge: {
            correlationID: 'featured_request:abc-123',
            status: 'GENERATED',
            brCode: '00020126BR.GOV.BCB.PIX-TESTE-EMV',
            paymentMethods: { pix: { qrCodeImage: 'https://qrsandbox.openpix.com.br/qr/abc.png' } },
          },
          expiresAt: '2026-10-02T12:30:00.000Z',
        })
      )
      // download best-effort do PNG público
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => pngBytes.buffer } as any);

    const service = new OpenPixService();
    const result = await service.createCharge({
      correlationID: 'featured_request:abc-123',
      valueBrlCents: 2990,
      expiresInSec: 1800,
      comment: 'Destaque Hub WEEK - Loja Teste',
    });

    expect(result.providerId).toBe('featured_request:abc-123');
    expect(result.brCode).toBe('00020126BR.GOV.BCB.PIX-TESTE-EMV');
    expect(result.qrCodeImageBase64).toBe(
      `data:image/png;base64,${Buffer.from(pngBytes).toString('base64')}`
    );
    expect(result.expiresAt?.toISOString()).toBe('2026-10-02T12:30:00.000Z');
    expect(result.paymentLink).toBeNull();

    // POST /api/v1/charge com value em CENTAVOS e header Authorization = appId cru
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.openpix.com.br/api/v1/charge');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Application test-app-id');
    const body = JSON.parse(init.body);
    expect(body.correlationID).toBe('featured_request:abc-123');
    expect(body.value).toBe(2990);
    expect(body.expiresIn).toBe(1800);
    // QR imagem veio do CORPO da charge — não do endpoint /api/image/qrcode/base64
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://qrsandbox.openpix.com.br/qr/abc.png');
  });

  it('comment é sanitizado p/ ASCII (travessão/acentos/emoji removidos — OpenPix rejeita)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        charge: { correlationID: 'review_tip:t1', brCode: 'EMV1', paymentMethods: {} },
      })
    );

    const service = new OpenPixService();
    await service.createCharge({
      correlationID: 'review_tip:t1',
      valueBrlCents: 500,
      comment: 'Gorjeta — Açaí & Café 10,5% 🔥',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.comment).toBe('Gorjeta Acai & Cafe 10,5%');
  });

  it('propaga erro claro quando a API rejeita a charge', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'bad' }, false, 400));

    const service = new OpenPixService();
    await expect(
      service.createCharge({ correlationID: 'x', valueBrlCents: 100, comment: 'ok' })
    ).rejects.toMatchObject({ code: 'PAY-015' });
  });
});

describe('OpenPixService.getCharge (polling)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('busca por correlationID e devolve body.charge', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ charge: { correlationID: 'promo_push:p1', status: 'COMPLETED', value: 490 } })
    );

    const service = new OpenPixService();
    const charge = await service.getCharge('promo_push:p1');

    expect(charge?.status).toBe('COMPLETED');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/charge?correlationID=promo_push%3Ap1');
    expect(init.method).toBeUndefined(); // GET
  });

  it('retorna null em 404 (correlationID desconhecido)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not found' }, false, 404));
    const service = new OpenPixService();
    expect(await service.getCharge('promo_push:inexistente')).toBeNull();
  });
});

describe('sanitizeToOpenPixAscii / toOpenPixCents', () => {
  it('strip diacríticos, travessão, emoji; mantém ASCII imprimível', () => {
    expect(sanitizeToOpenPixAscii('Assinatura Plano Premium — Loja João 🔥')).toBe(
      'Assinatura Plano Premium Loja Joao'
    );
    // travessão (U+2014) é REMOVIDO, não virado hífen — regra provada ao vivo
    expect(sanitizeToOpenPixAscii('a—b')).toBe('ab');
    expect(sanitizeToOpenPixAscii('çãõéêíóú')).toBe('caoeeiou');
    expect(sanitizeToOpenPixAscii('')).toBe('');
    expect(sanitizeToOpenPixAscii('   x   y  ')).toBe('x y');
  });

  it('converte BRL p/ centavos com arredondamento seguro (float)', () => {
    expect(toOpenPixCents(29.9)).toBe(2990);
    expect(toOpenPixCents(19.99)).toBe(1999);
    expect(toOpenPixCents(4.9)).toBe(490);
    expect(toOpenPixCents(0)).toBe(0);
    expect(toOpenPixCents(NaN)).toBe(0);
  });
});
