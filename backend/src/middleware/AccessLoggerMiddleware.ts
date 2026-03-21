import { Request, Response, NextFunction } from 'express';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { AccessLogDao } from '../database/dao/AccessLogDao';

@Provide(Tokens.Middleware.AccessLogger)
export class AccessLoggerMiddleware {
  constructor(
    @Inject(Tokens.Common.DataLayer.AccessLogRepository) private readonly accessLogDao: AccessLogDao
  ) {}

  public handle(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', () => {
      if (req.auth) {
        this.accessLogDao.save({
          userId: req.auth.sub,
          storeId: req.auth.storeId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
        } as any);
      }
    });

    next();
  }
}
