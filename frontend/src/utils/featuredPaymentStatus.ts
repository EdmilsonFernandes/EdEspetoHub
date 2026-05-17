export const FEATURED_PAYMENT_POLL_FALLBACK_MS = 30 * 60 * 1000;

export const normalizeFeaturedPaymentStatus = (value?: string | null) =>
  String(value || '').trim().toUpperCase();

export const getFeaturedPaymentStatusLabel = (value?: string | null) => {
  const status = normalizeFeaturedPaymentStatus(value);
  if (status === 'PAID') return 'Pago';
  if (status === 'FAILED' || status === 'PAYMENT_FAILED') return 'Falhou';
  if (status === 'PENDING' || status === 'PENDING_PAYMENT' || !status) return 'Aguardando pagamento';
  return status;
};

export const isFeaturedPaymentPaid = (value?: string | null) =>
  normalizeFeaturedPaymentStatus(value) === 'PAID';

export const isFeaturedPaymentFailed = (value?: string | null) => {
  const status = normalizeFeaturedPaymentStatus(value);
  return status === 'FAILED' || status === 'PAYMENT_FAILED';
};

export const isFeaturedRequestTerminal = (value?: string | null) => {
  const status = normalizeFeaturedPaymentStatus(value);
  return status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED';
};

export const getFeaturedPaymentRemainingMs = (
  expiresAt?: string | Date | null,
  nowMs = Date.now(),
  fallbackMs = FEATURED_PAYMENT_POLL_FALLBACK_MS
) => {
  if (expiresAt) {
    const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    const expiryMs = parsed.getTime();
    if (Number.isFinite(expiryMs)) return Math.max(0, expiryMs - nowMs);
  }

  return Math.max(0, fallbackMs);
};

export const shouldPollFeaturedPayment = (request?: {
  status?: string | null;
  paymentStatus?: string | null;
} | null) => {
  if (!request) return false;
  if (isFeaturedRequestTerminal(request.status)) return false;
  if (isFeaturedPaymentPaid(request.paymentStatus)) return false;
  if (isFeaturedPaymentFailed(request.paymentStatus)) return false;
  return true;
};
