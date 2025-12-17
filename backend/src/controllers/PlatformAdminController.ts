import { Request, Response } from 'express';
import { StoreRepository } from '../repositories/StoreRepository';
import { SubscriptionService } from '../services/SubscriptionService';

const storeRepository = new StoreRepository();
const subscriptionService = new SubscriptionService();

export class PlatformAdminController {
  static async listStores(_req: Request, res: Response) {
    try {
      const stores = await storeRepository.findAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          return {
            ...store,
            subscription,
          };
        })
      );
      return res.json(enriched);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async suspendStore(req: Request, res: Response) {
    const subscriptionId = (req.body?.subscriptionId as string) || req.params.storeId;
    try {
      const subscription = await subscriptionService.suspend(subscriptionId);
      return res.json(subscription);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async reactivateStore(req: Request, res: Response) {
    const subscriptionId = (req.body?.subscriptionId as string) || req.params.storeId;
    try {
      const subscription = await subscriptionService.activate(subscriptionId);
      return res.json(subscription);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
