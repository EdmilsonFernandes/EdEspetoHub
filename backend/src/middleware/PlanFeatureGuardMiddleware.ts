import { Request, Response, NextFunction } from 'express';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { StoreDao } from '../database/dao/StoreDao';
import { SubscriptionService } from '../services/SubscriptionService';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';
import { resolvePlanFeatures, PlanFeatureKey } from '../config/planFeatures';

@Provide(Tokens.Middleware.PlanFeatureGuard)
export class PlanFeatureGuardMiddleware {
  constructor(
    @Inject(Tokens.Common.DataLayer.StoreRepository) private readonly storeDao: StoreDao,
    @Inject(Tokens.Common.Service.SubscriptionService) private readonly subscriptionService: SubscriptionService
  ) {}

  public handle(feature: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const storeId = req.auth?.storeId || req.params.storeId;
      if (!storeId) {
        return next();
      }

      try {
        const store = await this.storeDao.getById(storeId);
        if (!store) {
          respondWithError(req, res, new AppError('STORE-001', 404), 404);
          return;
        }

        const subscription = await this.subscriptionService.getCurrentByStore(storeId);
        
        const features = resolvePlanFeatures({
          planName: (subscription as any)?.plan?.name,
          planExempt: (store as any)?.settings?.planExempt,
          subscriptionStatus: (subscription as any)?.status,
        });

        // Map simplified names to internal keys if necessary
        let featureKey = feature as PlanFeatureKey;
        if (feature === 'delivery') featureKey = 'deliveryMode';
        if (feature === 'pickup') featureKey = 'pickupMode';

        if (!features[featureKey]) {
          respondWithError(req, res, new AppError('PLAN-001', 403), 403);
          return;
        }
        
        return next();
      } catch (error) {
        return next(error);
      }
    };
  }
}
