export type PushClickTarget =
  | { kind: 'internal'; value: string }
  | { kind: 'external'; value: string }
  | { kind: 'notifications'; value: '/notificacoes' };

const INTERNAL_PATH_PATTERN = /^\/[A-Za-z0-9/_?=&%#.,:+-]*$/;
const APP_HOSTS = new Set(['janocaminho.com.br', 'www.janocaminho.com.br']);

export const normalizeInternalPushPath = (rawTarget?: unknown): string | null => {
  const raw = String(rawTarget || '').trim();
  if (!raw) return null;

  if (raw.startsWith('/')) {
    return INTERNAL_PATH_PATTERN.test(raw) ? raw : null;
  }

  if (raw.startsWith('janocaminho://')) {
    const value = raw.replace('janocaminho://', '').trim();
    const normalized = value ? (value.startsWith('/') ? value : `/${value}`) : '/hub';
    return INTERNAL_PATH_PATTERN.test(normalized) ? normalized : null;
  }

  try {
    const parsed = new URL(raw);
    const host = String(parsed.host || '').toLowerCase();
    if (parsed.protocol === 'https:' && APP_HOSTS.has(host)) {
      const path = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
      return INTERNAL_PATH_PATTERN.test(path) ? path : null;
    }
  } catch {
    // Non-URL values are not treated as routes unless they start with '/'.
  }

  return null;
};

export const resolvePushClickTarget = (rawTarget?: unknown): PushClickTarget => {
  const internal = normalizeInternalPushPath(rawTarget);
  if (internal) return { kind: 'internal', value: internal };

  const raw = String(rawTarget || '').trim();
  if (/^https?:\/\//i.test(raw)) return { kind: 'external', value: raw };

  return { kind: 'notifications', value: '/notificacoes' };
};
