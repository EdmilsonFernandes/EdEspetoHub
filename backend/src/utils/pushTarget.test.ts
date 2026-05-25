import { describe, expect, it } from 'vitest';
import { buildBroadcastPushPayload, normalizeInternalPushPath, truncatePushText } from './pushTarget';

describe('pushTarget', () => {
  it('normalizes internal app routes from path, deeplink and official URL', () => {
    expect(normalizeInternalPushPath('/cliente/pedidos')).toBe('/cliente/pedidos');
    expect(normalizeInternalPushPath('janocaminho://destinos')).toBe('/destinos');
    expect(normalizeInternalPushPath('https://janocaminho.com.br/hub/destaques')).toBe('/hub/destaques');
  });

  it('keeps external URL as external broadcast target', () => {
    const payload = buildBroadcastPushPayload({
      title: 'Oferta',
      body: 'Mensagem completa',
      url: 'https://wa.me/551239334979',
    });

    expect(payload.data.targetType).toBe('external');
    expect(payload.data.url).toBe('https://wa.me/551239334979');
    expect(payload.data.link).toBe('https://wa.me/551239334979');
  });

  it('adds redundant route fields for native app cold-start navigation', () => {
    const payload = buildBroadcastPushPayload({
      title: 'Pedido atualizado',
      body: 'Veja seus pedidos no app.',
      url: '/cliente/pedidos',
    });

    expect(payload.data.targetType).toBe('internal');
    expect(payload.data.url).toBe('/cliente/pedidos');
    expect(payload.data.path).toBe('/cliente/pedidos');
    expect(payload.data.route).toBe('/cliente/pedidos');
    expect(payload.data.deepLink).toBe('janocaminho://cliente/pedidos');
  });

  it('keeps full message in data and truncates only the operating-system banner copy', () => {
    const longBody = 'A'.repeat(180);
    const payload = buildBroadcastPushPayload({
      title: 'Título grande demais para o banner do celular',
      body: longBody,
      url: '',
    });

    expect(payload.body.length).toBeLessThanOrEqual(140);
    expect(payload.data.fullBody).toBe(longBody);
    expect(payload.data.targetType).toBe('notification_detail');
  });

  it('truncates text with readable suffix', () => {
    expect(truncatePushText('1234567890', 8)).toBe('12345...');
  });
});
