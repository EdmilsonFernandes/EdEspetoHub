import { describe, expect, it } from 'vitest';
import { isTransientConnectionError, normalizeUserFacingError } from './userFriendlyErrors';

describe('userFriendlyErrors', () => {
  it('traduz erro cru de fetch para mensagem de usuário', () => {
    expect(normalizeUserFacingError(new TypeError('Failed to fetch'))).toBe(
      'Conexão instável. Verifique sua internet e tente novamente.'
    );
  });

  it('mantem mensagens de regra de negócio', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('Produto indisponível.'), { status: 400 }))).toBe(
      'Produto indisponível.'
    );
  });

  it('não trata qualquer erro sem status como falha de conexão', () => {
    expect(isTransientConnectionError(new Error('Produto indisponível.'))).toBe(false);
  });

  it('oculta erro técnico de servidor', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('Internal server error'), { status: 500 }))).toBe(
      'Encontramos uma instabilidade no sistema. Tente novamente em instantes.'
    );
  });

  it('oculta mensagem genérica técnica do backend', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('Erro inesperado. Tente novamente.'), { status: 400, code: 'GEN-001' }))).toBe(
      'Encontramos uma instabilidade no sistema. Tente novamente em instantes.'
    );
  });

  it('identifica falhas transitórias para polling silencioso', () => {
    expect(isTransientConnectionError(Object.assign(new Error('Backend is unavailable'), { status: 502 }))).toBe(true);
  });
});
