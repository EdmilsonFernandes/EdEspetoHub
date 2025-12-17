import { NextFunction, Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';

const subscriptionService = new SubscriptionService();

const resolveStoreParams = (req: Request) => {
  const storeId =
    (req.params.storeId as string) ||
    (req.params.id as string) ||
    (req.body?.storeId as string) ||
    (req.query.storeId as string) ||
    null;

  const slug = (req.params.slug as string) || (req.body?.storeSlug as string) || null;

  return { storeId, slug };
};

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const { storeId, slug } = resolveStoreParams(req);
  if (!storeId && !slug) return res.status(400).json({ message: 'Loja não informada' });

  try {
    const subscription = storeId
      ? await subscriptionService.getCurrentByStore(storeId)
      : await subscriptionService.getCurrentByStoreSlug(slug!);
    if (!subscription || subscription.status !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Assinatura inativa. Renove para continuar.',
        subscription,
      });
    }
    return next();
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
