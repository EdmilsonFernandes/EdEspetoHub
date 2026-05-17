const APPROVED_STATUS = 'approved';
const FAILED_STATUSES = new Set(['rejected', 'cancelled', 'charged_back', 'refunded', 'failed']);

export const normalizeMercadoPagoStatus = (status?: string | null) =>
  String(status || '').trim().toLowerCase();

export const isMercadoPagoApprovedStatus = (status?: string | null) =>
  normalizeMercadoPagoStatus(status) === APPROVED_STATUS;

export const isMercadoPagoFailedStatus = (status?: string | null) =>
  FAILED_STATUSES.has(normalizeMercadoPagoStatus(status));

export const isMercadoPagoPendingStatus = (status?: string | null) => {
  const normalized = normalizeMercadoPagoStatus(status);
  return Boolean(normalized) && normalized !== APPROVED_STATUS && !FAILED_STATUSES.has(normalized);
};
