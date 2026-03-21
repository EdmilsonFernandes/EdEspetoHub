import { Tokens } from '../ioc/injectiontokens';
import { Provide } from '../ioc/ioc';
import { LogLevel } from '../models/logger-types.model';

@Provide(Tokens.Utils.LogFormatter)
export class LogFormatter {
    private static redactKeys = new Set([
      'password', 'token', 'secret', 'authorization', 'document',
      'cpf', 'cnpj', 'smtp_pass', 'mp_access_token'
    ]);

    public static format(level: LogLevel, message: string, context?: string, meta: Record<string, any> = {}): string {
      const entry: any = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        ...this.sanitizeMeta(meta),
      };
      return JSON.stringify(entry);
    }

    private static sanitizeMeta(meta: Record<string, any>) {
      if (!meta) return {};
      const cleaned: Record<string, any> = {};

      for (const [key, value] of Object.entries(meta)) {
        if (this.redactKeys.has(key.toLowerCase())) {
          cleaned[key] = '[REDACTED]';
          continue;
        }
        if (value instanceof Error) {
          cleaned[key] = this.normalizeError(value);
          continue;
        }
        if (typeof value === 'object' && value !== null) {
          // Recursive sanitization for nested objects can be added here if needed
          cleaned[key] = value;
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    }

    private static normalizeError(value: Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
  }