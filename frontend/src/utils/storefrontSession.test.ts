import { describe, expect, it } from 'vitest';
import {
  getOperationalSessionStoreSlug,
  isOperationalSessionForStore,
  isOperationalStoreSession,
  isPublicStorefrontNavigation,
} from './storefrontSession';

const session = (storeSlug: string, role = 'LOJISTA') => ({
  token: 'token',
  user: { id: 'user-1', role },
  store: { id: 'store-1', slug: storeSlug },
});

describe('storefrontSession', () => {
  it('reconhece sessão operacional apenas para a mesma loja da rota', () => {
    expect(isOperationalSessionForStore(session('gustavao-espetos'), 'gustavao-espetos')).toBe(true);
    expect(isOperationalSessionForStore(session('gustavao-espetos'), 'datony')).toBe(false);
  });

  it('normaliza slug com maiúsculas e espaços para evitar falso negativo', () => {
    expect(isOperationalSessionForStore(session(' Gustavao-ESPETOS '), 'gustavao-espetos')).toBe(true);
  });

  it('não trata cliente, motoboy ou super admin como operador da vitrine', () => {
    expect(isOperationalStoreSession(session('datony', 'CUSTOMER'))).toBe(false);
    expect(isOperationalStoreSession(session('datony', 'MOTOBOY'))).toBe(false);
    expect(isOperationalStoreSession(session('datony', 'SUPER_ADMIN'))).toBe(false);
  });

  it('extrai slug de formatos alternativos de sessão sem liberar loja errada', () => {
    const nestedSession = {
      token: 'token',
      user: { id: 'user-1', role: 'OPERATOR', store: { slug: 'datony' } },
    };

    expect(getOperationalSessionStoreSlug(nestedSession)).toBe('datony');
    expect(isOperationalSessionForStore(nestedSession, 'datony')).toBe(true);
    expect(isOperationalSessionForStore(nestedSession, 'gustavao-espetos')).toBe(false);
  });

  it('marca navegação vinda do hub como vitrine pública/cliente', () => {
    expect(isPublicStorefrontNavigation({ storefrontMode: 'customer' })).toBe(true);
    expect(isPublicStorefrontNavigation({ storefrontMode: 'public' })).toBe(true);
    expect(isPublicStorefrontNavigation({ fromHub: true })).toBe(true);
    expect(isPublicStorefrontNavigation({ storefrontMode: 'admin' })).toBe(false);
  });
});
