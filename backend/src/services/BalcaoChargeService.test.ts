import { describe, it, expect } from 'vitest';
import {
  BALCAO_PRESELECT_MAP,
  buildPointReceiptContent,
  normalizeChargeAmount,
  resolveBalcaoPixPayerEmail,
  resolvePointOrderOutcome,
} from './BalcaoChargeService';

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

describe('resolvePointOrderOutcome (vocabulário da Orders API — bug de prod 31/08)', () => {
  const mpOrder = (payment: any, orderExtras: any = {}) => ({
    status: 'open',
    transactions: { payments: [payment] },
    ...orderExtras,
  });

  it('payment processed + accredited = PAGO (formato real observado em prod)', () => {
    const outcome = resolvePointOrderOutcome(
      mpOrder({ status: 'processed', status_detail: 'accredited' })
    );
    expect(outcome).toBe('paid');
  });

  it('processed + accredited_pending_funds também é pago (dinheiro a creditar)', () => {
    const outcome = resolvePointOrderOutcome(
      mpOrder({ status: 'processed', status_detail: 'accredited_pending_funds' })
    );
    expect(outcome).toBe('paid');
  });

  it('approved legado (Payments API) continua pago', () => {
    expect(resolvePointOrderOutcome(mpOrder({ status: 'approved' }))).toBe('paid');
  });

  it('sem status no payment, cai pro status da order (processed/accredited)', () => {
    const outcome = resolvePointOrderOutcome({
      status: 'processed',
      status_detail: 'accredited',
      transactions: { payments: [{ amount: '1.00' }] },
    });
    expect(outcome).toBe('paid');
  });

  it('rejected/cancelled/failed = falha (payment ou order)', () => {
    expect(resolvePointOrderOutcome(mpOrder({ status: 'rejected' }))).toBe('failed');
    expect(resolvePointOrderOutcome(mpOrder({ status: 'canceled' }))).toBe('failed');
    expect(resolvePointOrderOutcome(mpOrder(null, { status: 'cancelled' }))).toBe('failed');
  });

  it('order expirada sem pagamento = expired', () => {
    expect(resolvePointOrderOutcome(mpOrder(null, { status: 'expired' }))).toBe('expired');
  });

  it('aberto sem pagamento ainda = pending (não fecha, não falha)', () => {
    expect(resolvePointOrderOutcome(mpOrder({ status: 'processed', status_detail: '' }, { status: 'open' }))).toBe('pending');
    expect(resolvePointOrderOutcome(null)).toBe('pending');
  });
});

describe('buildPointReceiptContent (comprovante na maquininha — PO 31/08)', () => {
  const base = {
    storeName: 'Gustavao Espetos',
    orderId: 'c97079eb-b9a8-4a40-94a2-9cfb72f57939',
    items: [
      { name: 'Espetinho Carne', quantity: 3 },
      { name: 'Coca-Cola Lata', quantity: 2 },
    ],
    total: 39.97,
    methodLabel: 'Pago na maquininha (cartao)',
    paidAt: new Date('2026-08-31T17:28:25Z'),
  };

  it('monta com as tags do Point dentro do range exigido (100–4096)', () => {
    const content = buildPointReceiptContent(base);
    expect(content).toContain('{w}{b}GUSTAVAO ESPETOS');
    expect(content).toContain('Pedido: C97079EB');
    expect(content).toContain('Espetinho Carne x3');
    expect(content).toContain('TOTAL: R$ 39,97');
    expect(content.length).toBeGreaterThanOrEqual(100);
    expect(content.length).toBeLessThanOrEqual(4096);
  });

  it('trunca itens/nomes longos e suporta pedido sem itens sem estourar o limite', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ name: `Item numero bem longo numero ${i}`, quantity: 2 }));
    const content = buildPointReceiptContent({ ...base, items: many });
    expect(content).not.toContain('Item numero bem longo numero 25'); // cap 20 itens
    expect(content.length).toBeLessThanOrEqual(4096);
    const empty = buildPointReceiptContent({ ...base, items: [] });
    expect(empty).toContain('(sem itens)');
    expect(empty.length).toBeGreaterThanOrEqual(100);
  });
});
