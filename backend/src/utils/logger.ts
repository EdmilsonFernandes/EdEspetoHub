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
const fileLoggingEnabled = (process.env.LOG_TO_FILE || '').toLowerCase() === 'true';
const logDir = process.env.LOG_DIR || 'logs';

let currentDate = new Date().toISOString().slice(0, 10);
let appStream: import('fs').WriteStream | null = null;
let errorStream: import('fs').WriteStream | null = null;

const ensureStreams = async () => {
  if (!fileLoggingEnabled) return;
  const fs = await import('fs');
  const path = await import('path');
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDate || !appStream || !errorStream) {
    currentDate = today;
    if (appStream) appStream.end();
    if (errorStream) errorStream.end();
    fs.mkdirSync(logDir, { recursive: true });
    appStream = fs.createWriteStream(path.join(logDir, `app-${currentDate}.log`), { flags: 'a' });
    errorStream = fs.createWriteStream(path.join(logDir, `error-${currentDate}.log`), { flags: 'a' });
  }
};

const writeToFile = async (level: LogLevel, payload: string) => {
  if (!fileLoggingEnabled) return;
  try {
    await ensureStreams();
    appStream?.write(`${payload}\n`);
    if (levelRank[level] >= levelRank.warn) {
      errorStream?.write(`${payload}\n`);
    }
  } catch {
    // Ignore file logging errors to avoid breaking runtime flow.
  }
};

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
      void writeToFile(level, payload);
      return;
    }
    if (level === 'warn') {
      console.warn(payload);
      void writeToFile(level, payload);
      return;
    }
    console.log(payload);
    void writeToFile(level, payload);
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
