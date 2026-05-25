import { describe, expect, it } from 'vitest';
import { extractPushTargetCandidate, normalizeInternalPushPath, resolvePushClickTarget } from './pushNavigation';

describe('pushNavigation', () => {
  it('normaliza rotas internas absolutas do app', () => {
    expect(normalizeInternalPushPath('/hub')).toBe('/hub');
    expect(normalizeInternalPushPath('/cliente/pedidos?status=active')).toBe('/cliente/pedidos?status=active');
  });

  it('normaliza deeplinks e URLs oficiais como rota interna', () => {
    expect(normalizeInternalPushPath('janocaminho://cliente/conta')).toBe('/cliente/conta');
    expect(normalizeInternalPushPath('https://janocaminho.com.br/destinos')).toBe('/destinos');
  });

  it('mantem URL externa como destino externo', () => {
    expect(resolvePushClickTarget('https://wa.me/5512999990000')).toEqual({
      kind: 'external',
      value: 'https://wa.me/5512999990000',
    });
  });

  it('usa central de notificacoes quando nao ha direcionamento', () => {
    expect(resolvePushClickTarget('')).toEqual({ kind: 'notifications', value: '/notificacoes' });
    expect(resolvePushClickTarget(undefined)).toEqual({ kind: 'notifications', value: '/notificacoes' });
  });

  it('extrai destino usando chaves redundantes do payload nativo', () => {
    expect(extractPushTargetCandidate({ targetUrl: '/cliente/pedidos' })).toBe('/cliente/pedidos');
    expect(extractPushTargetCandidate({ deepLink: 'janocaminho://destinos' })).toBe('janocaminho://destinos');
    expect(extractPushTargetCandidate({ route: '/hub/destaques' })).toBe('/hub/destaques');
  });
});
