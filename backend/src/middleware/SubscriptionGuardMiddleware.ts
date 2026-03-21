import { Request, Response, NextFunction } from 'express';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { SubscriptionDao } from '../database/dao/SubscriptionDao';
import { StoreDao } from '../database/dao/StoreDao';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';

@Provide(Tokens.Middleware.SubscriptionGuard)
export class SubscriptionGuardMiddleware {
  constructor(
    @Inject(Tokens.Common.DataLayer.SubscriptionDao) private readonly subscriptionDao: SubscriptionDao,
    @Inject(Tokens.Common.DataLayer.StoreDao) private readonly storeDao: StoreDao
  ) {}

  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    const storeId = req.auth?.storeId || req.params.storeId;
    if (!storeId) {
      return next();
    }

    try {
      const subscription = await this.subscriptionDao.findCurrentByStoreId(storeId);
      const store = await this.storeDao.getById(storeId);
      
      if ((store as any)?.settings?.planExempt) {
        return next();
      }
      
      if (!subscription || subscription.status !== 'ACTIVE') {
        respondWithError(req, res, new AppError('SUB-001', 403), 403);
        return;
      }
      
      return next();
    } catch (error) {
      return next(error);
    }
  }
}
