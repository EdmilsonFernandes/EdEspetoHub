import { Request, Response, NextFunction } from 'express';
import { Provide } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import * as crypto from 'crypto';
import { requestContextStore } from '../utils/request-context.store';

@Provide(Tokens.Middleware.RequestContext)
export class RequestContextMiddleware {
  public handle(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

    const store = {
      requestId,
      route: req.originalUrl
    };

    requestContextStore.run(store, () => {
      next();
    });
  }
}
