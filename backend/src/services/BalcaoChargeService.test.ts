import { describe, it, expect } from 'vitest';
import { BALCAO_PRESELECT_MAP, normalizeChargeAmount, resolveBalcaoPixPayerEmail } from './BalcaoChargeService';

/**
 * SDD cobranca-balcao — purezas do momento do pagamento no balcão.
 * A orquestração completa (MP + banco) é validada no smoke com a Point Pro 3
 * (specs/cobranca-balcao/test_plan.md) — aqui ficam as regras de valor e
 * pré-seleção, que são as que protegem dinheiro (REQ-16) e UX (design D7).
 */
describe('normalizeChargeAmount (REQ-16)', () => {
  it('aceita número e string com vírgula, 2 decimais', () => {
    expect(normalizeChargeAmount(47.5)).toBe(47.5);
    expect(normalizeChargeAmount('47,50')).toBe(47.5);
    expect(normalizeChargeAmount('47.50')).toBe(47.5);
    expect(normalizeChargeAmount(0.01)).toBe(0.01);
  });

  it('usa default (sem valor) sem passar por aqui — mas rejeita vazio/inválido quando chamado', () => {
    expect(normalizeChargeAmount('')).toBeNull();
    expect(normalizeChargeAmount(null)).toBeNull();
    expect(normalizeChargeAmount(undefined)).toBeNull();
    expect(normalizeChargeAmount('abc')).toBeNull();
  });

  it('rejeita zero, negativo e mais de 2 decimais', () => {
    expect(normalizeChargeAmount(0)).toBeNull();
    expect(normalizeChargeAmount(-10)).toBeNull();
    expect(normalizeChargeAmount(47.555)).toBeNull();
  });
});

describe('BALCAO_PRESELECT_MAP (design D7 — continuidade com o checkout)', () => {
  it('métodos presenciais escolhidos no checkout pré-selecionam a forma no balcão', () => {
    expect(BALCAO_PRESELECT_MAP.pix_loja).toBe('pix');
    expect(BALCAO_PRESELECT_MAP.pix).toBe('pix');
    expect(BALCAO_PRESELECT_MAP.dinheiro).toBe('cash');
    expect(BALCAO_PRESELECT_MAP.debito_presencial).toBe('point');
    expect(BALCAO_PRESELECT_MAP.credito_presencial).toBe('point');
  });

  it('método online desconhecido não pré-seleciona nada', () => {
    expect(BALCAO_PRESELECT_MAP['boleto'] || null).toBeNull();
    expect(BALCAO_PRESELECT_MAP[''] || null).toBeNull();
  });
});

describe('resolveBalcaoPixPayerEmail (anti-4390 — self-pay proibido pelo MP)', () => {
  const owner = 'dono@gustavao.com.br';

  it('NUNCA devolve o e-mail do dono da loja — sem cliente, endereço neutro do pedido', () => {
    const email = resolveBalcaoPixPayerEmail(null, owner, 'abc12345-xxxx');
    expect(email).toBe('balcao-abc12345@pedidos.janocaminho.com.br');
    expect(email).not.toContain(owner);
  });

  it('e-mail do dono como "cliente" também vira neutro (auto-pagamento bloqueado)', () => {
    expect(resolveBalcaoPixPayerEmail(owner.toUpperCase(), owner, 'abc12345')).not.toContain(owner);
  });

  it('cliente real e diferente do dono é usado normalmente', () => {
    expect(resolveBalcaoPixPayerEmail('cliente@email.com', owner, 'abc')).toBe('cliente@email.com');
  });
});
