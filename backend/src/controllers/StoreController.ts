import { Request, Response } from 'express';
import { StoreService } from '../services/StoreService';
import { SubscriptionService } from '../services/SubscriptionService';

const storeService = new StoreService();
const subscriptionService = new SubscriptionService();

export class StoreController {
  static async getBySlug(req: Request, res: Response) {
    try {
      const store = await storeService.getBySlug(req.params.slug);
      if (!store) return res.status(404).json({ message: 'Loja não encontrada' });
      const subscription = await subscriptionService.getCurrentByStore(store.id);
      return res.json({ ...store, subscription });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const store = await storeService.update(req.params.id, req.body);
      return res.json(store);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const store = await storeService.setStatus(req.params.id, req.body.open);
      return res.json(store);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
