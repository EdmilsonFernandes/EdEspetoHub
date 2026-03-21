import { Tokens } from '../ioc/injectiontokens';
import { Inject, Provide } from '../ioc/ioc';
import { requestContextStore } from './request-context.store';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Provide(Tokens.Utils.LoggerService)
export class LoggerService {
  private readonly activeLevel: number;
  private readonly levelRank: Record<LogLevel, number> = {
    debug: 10, info: 20, warn: 30, error: 40,
  };

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.activeLevel = this.levelRank[envLevel] || 20;
  }

  private getCurrentContext(): Record<string, any> {
    const store = requestContextStore.getStore();
    if (!store) return { context: 'system' };

    return {
      context: 'request',
      requestId: store.requestId,
      userId: store.userId,
      route: store.route
    };
  }

  public child(meta: Record<string, any> = {}, contextOverride?: string): ChildLogger {
    return new ChildLogger(this, contextOverride || 'app', meta);
  }

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
    if (this.levelRank[level] < this.activeLevel) return;

    const dynamicContext = this.getCurrentContext();
    const finalContextLabel = explicitContext || dynamicContext.context || 'app';
    const { context: _, ...cleanDynamicContext } = dynamicContext;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: finalContextLabel,
      ...cleanDynamicContext,
      ...meta
    };

    const payload = JSON.stringify(entry);
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

  child(meta: Record<string, any> = {}, context?: string) {
    return new ChildLogger(this.parent, context || this.context, { ...this.meta, ...meta });
  }
}

// Export a singleton instance for non-IoC usage and to fix the TS error
export const logger = new LoggerService();
