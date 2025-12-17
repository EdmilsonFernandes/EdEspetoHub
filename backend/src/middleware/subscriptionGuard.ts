import { NextFunction, Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';

const subscriptionService = new SubscriptionService();

const resolveStoreId = (req: Request) => {
  return (
    (req.params.storeId as string) ||
    (req.params.id as string) ||
    (req.body?.storeId as string) ||
    (req.query.storeId as string) ||
    null
  );
};

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const storeId = resolveStoreId(req);
  if (!storeId) return res.status(400).json({ message: 'Loja não informada' });

  try {
    const subscription = await subscriptionService.getCurrentByStore(storeId);
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
