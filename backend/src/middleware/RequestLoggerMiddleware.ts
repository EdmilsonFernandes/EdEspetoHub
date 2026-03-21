import { Request, Response, NextFunction } from 'express';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { LoggerService } from '../utils/logger';

@Provide(Tokens.Middleware.RequestLogger)
export class RequestLoggerMiddleware {
  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly logger: LoggerService
  ) {}

  public handle(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const httpLogger = this.logger.child({ scope: 'http' });

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      
      httpLogger.dispatch(level as any, 'HTTP request', {
        method: req.method,
        path: req.originalUrl,
        status,
        durationMs,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    });

    next();
  }
}
