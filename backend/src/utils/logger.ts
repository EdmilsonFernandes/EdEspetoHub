/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: logger.ts
 * @Date: 2026-01-09
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

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

/**
 * Ensures streams.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
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

/**
 * Executes write to file logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
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

/**
 * Normalizes error.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
const normalizeError = (value: unknown) => {
  if (!value || !(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
  };
};

/**
 * Executes sanitize meta logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
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

/**
 * Represents Logger.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
export class Logger {
  private context?: string;
  private baseMeta: Record<string, any>;

  /**
   * Creates a new Logger.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  constructor(context?: string, baseMeta: Record<string, any> = {}) {
    this.context = context;
    this.baseMeta = baseMeta;
  }

  /**
   * Executes child logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  child(meta: Record<string, any> = {}, context?: string) {
    const merged = { ...this.baseMeta, ...meta };
    return new Logger(context || this.context, merged);
  }

  /**
   * Executes log logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
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

  /**
   * Executes debug logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  /**
   * Executes info logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  /**
   * Executes warn logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  /**
   * Executes error logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger('app');
