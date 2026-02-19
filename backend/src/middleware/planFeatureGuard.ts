import { NextFunction, Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';
import { PlanFeatureKey, resolvePlanFeatures } from '../config/planFeatures';
import { StoreRepository } from '../repositories/StoreRepository';
import { SubscriptionService } from '../services/SubscriptionService';

const storeRepository = new StoreRepository();
const subscriptionService = new SubscriptionService();

const resolveStoreId = (req: Request): string | null => {
  const fromParams = String(req.params?.storeId || '').trim();
  if (fromParams) return fromParams;
  const fromAuth = String(req.auth?.storeId || '').trim();
  if (fromAuth) return fromAuth;
  const fromBody = String(req.body?.storeId || '').trim();
  if (fromBody) return fromBody;
  const fromQuery = String(req.query?.storeId || '').trim();
  if (fromQuery) return fromQuery;
  return null;
};

export const requirePlanFeature = (feature: PlanFeatureKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.auth?.role === 'SUPER_ADMIN') return next();

      const storeId = resolveStoreId(req);
      if (!storeId) {
        return respondWithError(req, res, new AppError('GEN-002', 400), 400);
      }

      const store = await storeRepository.findById(storeId);
      if (!store) {
        return respondWithError(req, res, new AppError('STORE-001', 404), 404);
      }

      const planExempt = Boolean(store.settings?.planExempt);
      const subscription = await subscriptionService.getCurrentByStore(store.id);
      const features = resolvePlanFeatures({
        planName: subscription?.plan?.name,
        planExempt,
      });

      if (features[feature]) return next();

      return respondWithError(
        req,
        res,
        new AppError('AUTH-003', 403, {
          requiredFeature: feature,
          plan: subscription?.plan?.name || null,
          planExempt,
        }),
        403
      );
    } catch (error: any) {
      return respondWithError(req, res, error, 500);
    }
  };
};

