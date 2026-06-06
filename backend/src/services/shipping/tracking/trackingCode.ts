export const CORREIOS_TRACKING_CODE_RE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
export const GENERIC_TRACKING_CODE_RE = /^[A-Z0-9][A-Z0-9._-]{5,39}$/;

export const normalizeTrackingCode = (value: unknown) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toUpperCase()
    .slice(0, 40);

export const isCorreiosTrackingCode = (value: unknown) =>
  CORREIOS_TRACKING_CODE_RE.test(normalizeTrackingCode(value));

export const isValidTrackingCode = (value: unknown) => {
  const normalized = normalizeTrackingCode(value);
  return CORREIOS_TRACKING_CODE_RE.test(normalized) || GENERIC_TRACKING_CODE_RE.test(normalized);
};

export const buildCorreiosTrackingUrl = (trackingCode: string) => {
  const normalized = normalizeTrackingCode(trackingCode);
  if (!normalized) return null;
  return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(normalized)}`;
};
