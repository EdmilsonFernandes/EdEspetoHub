export const PAYMENT_AUDIT_FLOW = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  ORDER: 'ORDER',
  TIP: 'TIP',
  FEATURED_REQUEST: 'FEATURED_REQUEST',
  DELIVERY_CYCLE: 'DELIVERY_CYCLE',
} as const;

export const PAYMENT_AUDIT_ENTITY = {
  PAYMENT: 'PAYMENT',
  ORDER_PAYMENT: 'ORDER_PAYMENT',
  ORDER_REVIEW: 'ORDER_REVIEW',
  FEATURED_REQUEST: 'FEATURED_REQUEST',
  DELIVERY_BILLING_CYCLE: 'DELIVERY_BILLING_CYCLE',
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

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  authorized: 'Autorizado',
  paid: 'Pago',
  pending: 'Pendente',
  in_process: 'Em análise',
  in_mediation: 'Em mediação',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  charged_back: 'Contestação / chargeback',
  refunded: 'Estornado',
  failed: 'Falhou',
};

const STATUS_DETAIL_LABELS: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido',
  cc_rejected_bad_filled_date: 'Validade do cartão incorreta',
  cc_rejected_bad_filled_other: 'Dados do cartão inválidos',
  cc_rejected_bad_filled_security_code: 'CVV incorreto',
  cc_rejected_blacklist: 'Pagamento bloqueado por segurança',
  cc_rejected_call_for_authorize: 'O banco pediu autorização do pagamento',
  cc_rejected_card_disabled: 'Cartão desabilitado',
  cc_rejected_duplicated_payment: 'Pagamento duplicado',
  cc_rejected_high_risk: 'Pagamento barrado pelo antifraude',
  cc_rejected_insufficient_amount: 'Cartão com saldo insuficiente',
  cc_rejected_invalid_installments: 'Parcelamento inválido',
  cc_rejected_max_attempts: 'Limite de tentativas excedido',
  cc_rejected_other_reason: 'Pagamento recusado pelo banco',
  pending_contingency: 'Pagamento em análise',
  pending_review_manual: 'Pagamento em análise manual',
  pending_waiting_payment: 'Aguardando pagamento',
  pending_waiting_transfer: 'Aguardando compensação',
  rejected_insufficient_data: 'Dados insuficientes para processar o pagamento',
};

const REDACTED = '[redacted]';
const QR_OMITTED = '[omitted]';

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

export const resolveMercadoPagoStatusLabel = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  return STATUS_LABELS[normalized] || (normalized ? normalized.replace(/_/g, ' ') : null);
};

export const resolveMercadoPagoStatusDetailLabel = (statusDetail?: string | null) => {
  const normalized = String(statusDetail || '').trim().toLowerCase();
  return STATUS_DETAIL_LABELS[normalized] || (normalized ? normalized.replace(/_/g, ' ') : null);
};
