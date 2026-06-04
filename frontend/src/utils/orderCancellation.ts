const normalizeCancellationReason = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');

const STOCK_TERMS = [
  'acabou',
  'estoque',
  'sem item',
  'sem produto',
  'indisponivel',
  'falta',
  'faltou',
  'esgotado',
  'nao tem',
  'nao temos',
  'wcaboub',
  'wcabou',
];

const STORE_CLOSED_TERMS = [
  'fechado',
  'encerrado',
  'fora do horario',
  'sem atendimento',
];

const CUSTOMER_REQUEST_TERMS = [
  'cliente',
  'desistiu',
  'desistencia',
  'cancelou',
  'pediu cancelamento',
];

export const getFriendlyCancellationReason = (reason?: string | null) => {
  const normalized = normalizeCancellationReason(reason);

  if (!normalized) {
    return 'Sentimos muito. Este pedido foi cancelado antes de ser finalizado pela loja.';
  }

  if (STOCK_TERMS.some((term) => normalized.includes(term))) {
    return 'Infelizmente, a loja não tinha todos os itens do pedido disponíveis neste momento.';
  }

  if (STORE_CLOSED_TERMS.some((term) => normalized.includes(term))) {
    return 'A loja precisou encerrar o atendimento antes de preparar este pedido.';
  }

  if (CUSTOMER_REQUEST_TERMS.some((term) => normalized.includes(term))) {
    return 'Este pedido foi cancelado conforme solicitação registrada no atendimento.';
  }

  if (normalized.length < 8 || (!normalized.includes(' ') && /^[a-z0-9]{8,}$/.test(normalized))) {
    return 'Sentimos muito. Este pedido foi cancelado pela loja antes da conclusão.';
  }

  return reason?.trim() || 'Sentimos muito. Este pedido foi cancelado antes da conclusão.';
};
