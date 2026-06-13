export const PAYMENT_AUDIT_FLOW = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  ORDER: 'ORDER',
  TIP: 'TIP',
  FEATURED_REQUEST: 'FEATURED_REQUEST',
  DELIVERY_CYCLE: 'DELIVERY_CYCLE',
  DESTINATION_PROMO: 'DESTINATION_PROMO',
} as const;

export const PAYMENT_AUDIT_ENTITY = {
  PAYMENT: 'PAYMENT',
  ORDER_PAYMENT: 'ORDER_PAYMENT',
  ORDER_REVIEW: 'ORDER_REVIEW',
  FEATURED_REQUEST: 'FEATURED_REQUEST',
  DELIVERY_BILLING_CYCLE: 'DELIVERY_BILLING_CYCLE',
  DESTINATION_PROMO: 'DESTINATION_PROMO',
} as const;

export const PAYMENT_AUDIT_STAGE = {
  PROVIDER_REQUEST: 'PROVIDER_REQUEST',
  PROVIDER_LOOKUP: 'PROVIDER_LOOKUP',
  MANUAL_REFRESH: 'MANUAL_REFRESH',
  WEBHOOK_LOOKUP: 'WEBHOOK_LOOKUP',
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  STATUS_APPLIED: 'STATUS_APPLIED',
  ERROR: 'ERROR',
} as const;

const FLOW_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Assinatura de Plano',
  ORDER: 'Pagamento de Pedido',
  TIP: 'Gorjeta',
  FEATURED_REQUEST: 'Destaque de Produto',
  DELIVERY_CYCLE: 'Ciclo de Entrega',
  DESTINATION_PROMO: 'Destaque de Destino',
};

const ENTITY_LABELS: Record<string, string> = {
  PAYMENT: 'Pagamento Comercial',
  ORDER_PAYMENT: 'Pagamento de Pedido',
  ORDER_REVIEW: 'Avaliação de Pedido',
  FEATURED_REQUEST: 'Solicitação de Destaque',
  DELIVERY_BILLING_CYCLE: 'Faturamento de Entregas',
  DESTINATION_PROMO: 'Promoção de Destino',
};

const STAGE_LABELS: Record<string, string> = {
  PROVIDER_REQUEST: 'Solicitação enviada ao banco',
  PROVIDER_LOOKUP: 'Verificação de status (automática)',
  MANUAL_REFRESH: 'Atualização solicitada pelo lojista',
  WEBHOOK_LOOKUP: 'Verificação via notificação (webhook)',
  WEBHOOK_RECEIVED: 'Notificação recebida do Mercado Pago',
  STATUS_APPLIED: 'Status atualizado no sistema',
  ERROR: 'Falha técnica no processamento',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  authorized: 'Autorizado',
  paid: 'Pago',
  pending: 'Aguardando Pagamento',
  in_process: 'Em análise pelo banco',
  in_mediation: 'Em disputa/mediação',
  rejected: 'Recusado pelo banco',
  cancelled: 'Cancelado',
  charged_back: 'Contestação (Chargeback)',
  refunded: 'Estornado/Devolvido',
  failed: 'Falha na transação',
};

const STATUS_DETAIL_LABELS: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido',
  cc_rejected_bad_filled_date: 'Data de validade incorreta',
  cc_rejected_bad_filled_other: 'Dados do cartão inconsistentes',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido',
  cc_rejected_blacklist: 'Transação bloqueada por segurança',
  cc_rejected_call_for_authorize: 'O banco requer autorização por telefone',
  cc_rejected_card_disabled: 'O cartão informado está desativado',
  cc_rejected_duplicated_payment: 'Pagamento identificado como duplicado',
  cc_rejected_high_risk: 'Recusado pelo sistema antifraude',
  cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente',
  cc_rejected_invalid_installments: 'Quantidade de parcelas inválida',
  cc_rejected_max_attempts: 'Limite de tentativas excedido',
  cc_rejected_other_reason: 'Recusado pela operadora do cartão',
  pending_contingency: 'Pagamento em processamento tardio',
  pending_review_manual: 'Pagamento aguardando revisão manual',
  pending_waiting_payment: 'Aguardando ação do cliente (Pagamento pendente)',
  pending_waiting_transfer: 'Aguardando compensação bancária',
  rejected_insufficient_data: 'Dados incompletos para processar a transação',
};

const REDACTED = '[RESERVADO]';
const QR_OMITTED = '[QR CODE OMITIDO NO LOG]';

const shouldRedactKey = (key: string, parentKey?: string | null) => {
  const normalized = String(key || '').trim().toLowerCase();
  if (!normalized) return false;
  if ([ 'authorization', 'access_token', 'refresh_token', 'token', 'cvv', 'security_code' ].includes(normalized)) {
    return true;
  }
  if ([ 'card_number', 'pan' ].includes(normalized)) return true;
  if (parentKey === 'identification' && normalized === 'number') return true;
  return false;
};

const shouldOmitKey = (key: string) => {
  const normalized = String(key || '').trim().toLowerCase();
  return [ 'qr_code_base64', 'payment_qr_code_base64' ].includes(normalized);
};

const sanitizeRecursive = (value: any, parentKey?: string | null): any => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeRecursive(entry, parentKey));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce<Record<string, any>>((acc, [ key, entryValue ]) => {
    if (shouldRedactKey(key, parentKey)) {
      acc[key] = REDACTED;
      return acc;
    }
    if (shouldOmitKey(key)) {
      acc[key] = QR_OMITTED;
      return acc;
    }
    acc[key] = sanitizeRecursive(entryValue, key);
    return acc;
  }, {});
};

export const sanitizePaymentAuditPayload = (payload: any) => {
  if (payload === null || payload === undefined) return null;
  if (typeof payload !== 'object') return payload;
  return sanitizeRecursive(payload);
};

export const resolvePaymentAuditFlowLabel = (flow?: string | null) => {
  const normalized = String(flow || '').trim().toUpperCase();
  return FLOW_LABELS[normalized] || normalized;
};

export const resolvePaymentAuditEntityLabel = (entity?: string | null) => {
  const normalized = String(entity || '').trim().toUpperCase();
  return ENTITY_LABELS[normalized] || normalized;
};

export const resolvePaymentAuditStageLabel = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toUpperCase();
  return STAGE_LABELS[normalized] || normalized;
};

export const resolveMercadoPagoStatusLabel = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  return STATUS_LABELS[normalized] || (normalized ? normalized.replace(/_/g, ' ') : 'Pendente');
};

export const resolveMercadoPagoStatusDetailLabel = (statusDetail?: string | null) => {
  const normalized = String(statusDetail || '').trim().toLowerCase();
  return STATUS_DETAIL_LABELS[normalized] || (normalized ? normalized.replace(/_/g, ' ') : null);
};

