type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLevel = (): LogLevel => {
  const raw = (process.env.LOG_LEVEL || '').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return 'info';
};

const activeLevel = resolveLevel();

const redactKeys = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'document',
  'cpf',
  'cnpj',
  'smtp_pass',
  'mp_access_token',
]);

const normalizeError = (value: unknown) => {
  if (!value || !(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
  };
};

const sanitizeMeta = (meta?: Record<string, any>) => {
  if (!meta) return undefined;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (redactKeys.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
      continue;
    }
    if (value instanceof Error) {
      cleaned[key] = normalizeError(value);
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
};

export class Logger {
  private context?: string;
  private baseMeta: Record<string, any>;

  constructor(context?: string, baseMeta: Record<string, any> = {}) {
    this.context = context;
    this.baseMeta = baseMeta;
  }

  child(meta: Record<string, any> = {}, context?: string) {
    const merged = { ...this.baseMeta, ...meta };
    return new Logger(context || this.context, merged);
  }

  log(level: LogLevel, message: string, meta?: Record<string, any>) {
    if (levelRank[level] < levelRank[activeLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...sanitizeMeta(this.baseMeta),
      ...sanitizeMeta(meta),
    };

    const payload = JSON.stringify(entry);
    if (level === 'error') {
      console.error(payload);
      return;
    }
    if (level === 'warn') {
      console.warn(payload);
      return;
    }
    console.log(payload);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger('app');
