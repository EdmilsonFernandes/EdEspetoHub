import { Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentRepository } from '../repositories/PaymentRepository';

const subscriptionService = new SubscriptionService();
const paymentRepository = new PaymentRepository();

export class SubscriptionController {
  static async create(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.create(req.body);
      return res.status(201).json(subscription);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async getByStore(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.getCurrentByStore(req.params.storeId);
      if (!subscription) return res.status(404).json({ message: 'Assinatura não encontrada' });
      const latestPayment = await paymentRepository.findLatestByStoreId(req.params.storeId);
      return res.json({
        ...subscription,
        latestPaymentAt: latestPayment?.createdAt ?? null,
        latestPaymentStatus: latestPayment?.status ?? null,
        latestPaymentAmount: latestPayment?.amount ?? null,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async renew(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.renew(req.params.id, req.body);
      return res.json(subscription);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { status } = req.body;
    try {
      if (status === 'SUSPENDED') {
        const subscription = await subscriptionService.suspend(req.params.id);
        return res.json(subscription);
      }
      const subscription = await subscriptionService.activate(req.params.id);
      return res.json(subscription);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
