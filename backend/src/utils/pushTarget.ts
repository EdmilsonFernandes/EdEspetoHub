const INTERNAL_PATH_PATTERN = /^\/[A-Za-z0-9/_?=&%#.,:+-]*$/;
const APP_HOSTS = new Set(['janocaminho.com.br', 'www.janocaminho.com.br']);

export const truncatePushText = (value: unknown, maxLength: number) => {
  const text = String(value || '').trim();
  const limit = Math.max(1, Number(maxLength || 1));
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(1, limit - 3)).trimEnd()}...`;
};

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
    // Plain text is not a route unless it starts with '/'.
  }

  return null;
};

export const buildBroadcastPushPayload = (input: {
  title: string;
  body: string;
  url?: string | null;
}) => {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  const rawTarget = String(input.url || '').trim();
  const internalPath = normalizeInternalPushPath(rawTarget);
  const data: Record<string, string> = {
    notificationType: 'global_broadcast',
    fullTitle: title,
    fullBody: body,
  };

  if (internalPath) {
    data.url = internalPath;
    data.path = internalPath;
    data.route = internalPath;
    data.targetUrl = internalPath;
    data.deepLink = `janocaminho://${internalPath.replace(/^\//, '')}`;
    data.targetType = 'internal';
  } else if (/^https?:\/\//i.test(rawTarget)) {
    data.url = rawTarget;
    data.targetUrl = rawTarget;
    data.link = rawTarget;
    data.targetType = 'external';
  } else {
    data.targetType = 'notification_detail';
  }

  return {
    title: truncatePushText(title, 48),
    body: truncatePushText(body, 140),
    data,
  };
};
