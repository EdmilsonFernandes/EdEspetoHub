import { describe, it, expect } from 'vitest';
import { resolveNotificationUrl } from './MercadoPagoService';

/**
 * Regressão do bug do QR Pix "errado" em destaques/push (2026-06-13).
 *
 * Causa raiz: o backend enviava `notification_url = http://localhost:4000/...`
 * ao Mercado Pago, que rejeita qualquer URL não-pública com o erro
 * 4020 ("notification_url attribute must be url valid"). O `catch {}` então
 * engolia o erro e gerava um QR fake (`PIX DESTAQUE HUB | ...`) que nenhum
 * banco consegue pagar.
 *
 * Correção: só enviar notification_url quando for https pública válida.
 * Este teste garante que localhost/http/inválido JAMAIS sejam enviados.
 */
describe('resolveNotificationUrl — regressão PIX 4020 (webhook inválido)', () => {
  it('omite localhost (causa direta do erro 4020)', () => {
    expect(resolveNotificationUrl('http://localhost:4000/api/webhooks/mercadopago')).toBeUndefined();
    expect(resolveNotificationUrl('https://localhost/api/webhooks/mercadopago')).toBeUndefined();
  });

  it('omite IPs locais (127.0.0.1, 0.0.0.0, ::1)', () => {
    expect(resolveNotificationUrl('https://127.0.0.1/api/webhooks/mercadopago')).toBeUndefined();
    expect(resolveNotificationUrl('https://0.0.0.0/api/webhooks/mercadopago')).toBeUndefined();
    expect(resolveNotificationUrl('https://[::1]/api/webhooks/mercadopago')).toBeUndefined();
  });

  it('omite http (MP exige https), vazios e inválidos', () => {
    expect(resolveNotificationUrl('http://www.janocaminho.com.br/api/wh')).toBeUndefined();
    expect(resolveNotificationUrl('')).toBeUndefined();
    expect(resolveNotificationUrl('   ')).toBeUndefined();
    expect(resolveNotificationUrl('nao-e-uma-url')).toBeUndefined();
    expect(resolveNotificationUrl(undefined as any)).toBeUndefined();
  });

  it('retorna URL https pública válida sem alterar', () => {
    const url = 'https://www.janocaminho.com.br/api/webhooks/mercadopago';
    expect(resolveNotificationUrl(url)).toBe(url);
  });

  it('nunca devolve valor contendo localhost ou http:// (garantia absoluta)', () => {
    const casos = [
      'http://localhost:4000/api/webhooks/mercadopago',
      'https://localhost/api/wh',
      'https://127.0.0.1/api/wh',
      'http://exemplo.com/api/wh',
      '',
      'qualquer-coisa',
    ];
    for (const c of casos) {
      const saida = resolveNotificationUrl(c);
      // undefined = URL corretamente omitida (já é seguro). Se houver valor, que não seja proibido.
      if (saida !== undefined) {
        expect(saida, `entrada=${c}`).not.toMatch(/localhost|127\.0\.0\.1|^http:\/\//i);
      }
    }
  });
});
