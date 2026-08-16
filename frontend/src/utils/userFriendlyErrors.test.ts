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

  it('humaniza credenciais invalidas', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('Credenciais inválidas'), { status: 401 }))).toBe(
      'E-mail, usuário ou senha incorretos. Confira os dados e tente de novo.'
    );
  });

  it('trata login do parceiro (DPARTNER-004) como credenciais, nao sessao expirada', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('DPARTNER-004'), { status: 401, code: 'DPARTNER-004' }))).toBe(
      'E-mail, usuário ou senha incorretos. Confira os dados e tente de novo.'
    );
    expect(normalizeUserFacingError(Object.assign(new Error('AUTH-004'), { status: 401, code: 'AUTH-004' }))).toBe(
      'E-mail, usuário ou senha incorretos. Confira os dados e tente de novo.'
    );
  });

  it('nao confunde conta sem ativacao com senha errada', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('E-mail não verificado.'), { status: 401, code: 'AUTH-005' }))).toBe(
      'Sua conta ainda precisa ser ativada. Reenvie o código e confirme o e-mail para continuar.'
    );
  });

  it('traduz AUTH-022 (sem loja vinculada) em vez de dizer sessao expirada', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('Usuário sem loja vinculada.'), { status: 403, code: 'AUTH-022' }))).toBe(
      'Esta conta não tem loja vinculada. Entre com a conta do lojista da loja ou peça acesso ao responsável.'
    );
  });

  it('humaniza token ou sessao expirada', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('jwt expired'), { status: 401 }))).toBe(
      'Sua sessão expirou. Entre novamente para continuar.'
    );
  });

  it('humaniza link ou codigo expirado sem tratar como login', () => {
    expect(normalizeUserFacingError(Object.assign(new Error('Token inválido.'), { status: 400 }))).toBe(
      'Esse link ou código expirou. Solicite um novo e tente novamente.'
    );
  });

  it('identifica falhas transitórias para polling silencioso', () => {
    expect(isTransientConnectionError(Object.assign(new Error('Backend is unavailable'), { status: 502 }))).toBe(true);
  });
});
