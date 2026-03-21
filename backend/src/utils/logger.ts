<<<<<<< HEAD
import { Tokens } from '../ioc/injectiontokens';
import { LogLevel } from '../models/logger-types.model';
import { LogFormatter } from './log-formater.service';
import { FileTransport } from './logger-transporter.service';
import { Inject, Provide } from '../ioc/ioc';
import { requestContextStore } from './request-context.store';

@Provide(Tokens.Utils.LoggerService)
export class LoggerService {

  private readonly activeLevel: number;
  private readonly fileLoggingEnabled: boolean;

  private readonly levelRank: Record<LogLevel, number> = {
    debug: 10, info: 20, warn: 30, error: 40,
  };

  constructor(
    @Inject(Tokens.Utils.FileTransport) private readonly fileTransport: FileTransport
  ) {

    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.activeLevel = this.levelRank[envLevel] || 20;

    this.fileLoggingEnabled = (process.env.LOG_TO_FILE || '').toLowerCase() === 'true';
  }

  /**
   * Pega o contexto atual da "Nuvem" do AsyncLocalStorage.
   * Se não tiver contexto (ex: script rodando fora de req), retorna vazio.
   */
  private getCurrentContext(): Record<string, any> {
    const store = requestContextStore.getStore();
    if (!store) return { context: 'system' }; // Fallback se não houver request ativa

    return {
      context: 'request',
      requestId: store.requestId,
      userId: store.userId,
      route: store.route
    };
  }

  public createChild(contextOverride: string, meta: Record<string, any> = {}): ChildLogger {
    return new ChildLogger(this, contextOverride, meta);
  }

  // --- Logging Methods ---

  public debug(message: string, meta?: Record<string, any>): void {
    this.dispatch('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.dispatch('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.dispatch('warn', message, meta);
  }

  public error(message: string, meta?: Record<string, any> | Error): void {
    let finalMeta = meta;
    if (meta instanceof Error) {
      finalMeta = { error: meta };
    }
    this.dispatch('error', message, finalMeta as Record<string, any>);
  }


  public dispatch(level: LogLevel, message: string, meta: Record<string, any> = {}, explicitContext?: string): void {
    // 0. Check Level (Fail fast)
    if (this.levelRank[level] < this.activeLevel) return;

    // 1. Pega o contexto automático da Request (Aqui é a chamada que faltava/estava errada)
    const dynamicContext = this.getCurrentContext();

    const finalContextLabel = explicitContext || dynamicContext.context || 'app';

    const { context: _, ...cleanDynamicContext } = dynamicContext;

    const finalMeta = {
        ...cleanDynamicContext,
        ...meta
    };

    const payload = LogFormatter.format(level, message, finalContextLabel, finalMeta);

    this.writeToConsole(level, payload);

    if (this.fileLoggingEnabled && this.fileTransport) {
      this.fileTransport.writePayload(level, payload);
    }
  }

  private writeToConsole(level: LogLevel, payload: string) {
    if (level === 'error') console.error(payload);
    else if (level === 'warn') console.warn(payload);
    else console.log(payload);
  }
}

export class ChildLogger {
  constructor(private parent: LoggerService, private context: string, private meta: Record<string, any>) {}

  debug(message: string, meta: Record<string, any> = {}) {
    this.parent.dispatch('debug', message, { ...this.meta, ...meta }, this.context);
  }
  info(message: string, meta: Record<string, any> = {}) {
    this.parent.dispatch('info', message, { ...this.meta, ...meta }, this.context);
  }
  warn(message: string, meta: Record<string, any> = {}) {
    this.parent.dispatch('warn', message, { ...this.meta, ...meta }, this.context);
  }
  error(message: string, meta: Record<string, any> = {}) {
    this.parent.dispatch('error', message, { ...this.meta, ...meta }, this.context);
  }
}
=======
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
/**
 * Handles resolve level.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
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
 * Handles write to file.
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
 * Handles normalize error.
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
 * Handles sanitize meta.
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
 * Provides Logger functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-09
 */
export class Logger {
  private context?: string;
  private baseMeta: Record<string, any>;
  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  constructor(context?: string, baseMeta: Record<string, any> = {}) {
    this.context = context;
    this.baseMeta = baseMeta;
  }

  /**
   * Handles child.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  child(meta: Record<string, any> = {}, context?: string) {
    const merged = { ...this.baseMeta, ...meta };
    return new Logger(context || this.context, merged);
  }

  /**
   * Handles log.
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
   * Handles debug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  /**
   * Handles info.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  /**
   * Handles warn.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  /**
   * Handles error.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-09
   */
  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger('app');
>>>>>>> main
