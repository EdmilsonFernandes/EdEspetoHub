const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

const stripApiSuffix = (value: string) =>
  value.replace(/\/+$/, '').replace(/\/api$/, '');

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  if (!normalized.startsWith('/uploads/')) {
    return normalized;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  if (!apiBase || apiBase === '/api') {
    return normalized;
  }

  try {
    const parsed = new URL(apiBase, window.location.origin);
    const base = stripApiSuffix(`${parsed.origin}${parsed.pathname}`);
    return `${base}${normalized}`;
  } catch {
    return `${stripApiSuffix(apiBase)}${normalized}`;
  }
};
