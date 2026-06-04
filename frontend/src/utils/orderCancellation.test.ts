import { describe, expect, it } from 'vitest';
import { getFriendlyCancellationReason } from './orderCancellation';

describe('getFriendlyCancellationReason', () => {
  it('humaniza motivo de estoque indisponivel', () => {
    expect(getFriendlyCancellationReason('acabou tudo')).toContain('não tinha todos os itens');
    expect(getFriendlyCancellationReason('wcaboubtudo')).toContain('não tinha todos os itens');
  });

  it('nao exibe texto cru quando parece ruído sem sentido', () => {
    expect(getFriendlyCancellationReason('xptoabc123')).toBe('Sentimos muito. Este pedido foi cancelado pela loja antes da conclusão.');
  });

  it('mantem motivo legivel quando nao cai em categoria conhecida', () => {
    expect(getFriendlyCancellationReason('Cancelamento combinado pelo WhatsApp')).toBe('Cancelamento combinado pelo WhatsApp');
  });
});
