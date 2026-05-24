import { beforeEach, describe, expect, it } from 'vitest';
import { runClientFreshStart } from './clientFreshStart';

describe('clientFreshStart', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('preserva chaves solicitadas durante limpeza não bloqueante do login', async () => {
    localStorage.setItem('adminSession', '{"token":"token"}');
    localStorage.setItem('auth:last-admin-identifier', 'loja@teste.com');
    localStorage.setItem('stale-key', 'remove-me');
    sessionStorage.setItem('admin:activeTab', 'fila');
    sessionStorage.setItem('temp-flow', 'remove-me');

    await runClientFreshStart({
      maxAgeMs: 1,
      currentBuildId: 'build-admin-test',
      preserveLocalStorageKeys: ['adminSession', 'auth:last-admin-identifier'],
      preserveSessionStorageKeys: ['admin:activeTab'],
    });

    expect(localStorage.getItem('adminSession')).toBe('{"token":"token"}');
    expect(localStorage.getItem('auth:last-admin-identifier')).toBe('loja@teste.com');
    expect(localStorage.getItem('stale-key')).toBeNull();
    expect(sessionStorage.getItem('admin:activeTab')).toBe('fila');
    expect(sessionStorage.getItem('temp-flow')).toBeNull();
  });
});
