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