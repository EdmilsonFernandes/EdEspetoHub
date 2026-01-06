import { Request, Response } from 'express';
import { StoreRepository } from '../repositories/StoreRepository';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';

const storeRepository = new StoreRepository();
const subscriptionService = new SubscriptionService();
const paymentRepository = new PaymentRepository();
const paymentEventRepository = new PaymentEventRepository();

export class PlatformAdminController {
  static async listStores(_req: Request, res: Response) {
    try {
      const stores = await storeRepository.findAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const latestPayment = await paymentRepository.findLatestByStoreId(store.id);
          return {
            ...store,
            subscription,
            latestPayment,
          };
        })
      );
      return res.json(enriched);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async overview(_req: Request, res: Response) {
    try {
      const stores = await storeRepository.findAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const latestPayment = await paymentRepository.findLatestByStoreId(store.id);
          return { ...store, subscription, latestPayment };
        })
      );

      const paidPayments = await paymentRepository.countByStatus('PAID');
      const pendingPayments = await paymentRepository.countByStatus('PENDING');
      const paidRevenue = await paymentRepository.sumPaidAmounts();

      const summary = enriched.reduce(
        (acc, store) => {
          const subscription = store.subscription;
          if (subscription?.status === 'ACTIVE') acc.activeSubscriptions += 1;
          if (subscription?.status === 'EXPIRING') acc.expiringSubscriptions += 1;
          if (subscription?.status === 'EXPIRED') acc.expiredSubscriptions += 1;
          if (subscription?.plan?.name === 'monthly') acc.monthlyPlans += 1;
          if (subscription?.plan?.name === 'yearly') acc.yearlyPlans += 1;
          if (subscription?.plan?.price) {
            const price = Number(subscription.plan.price);
            if (subscription.plan.name === 'yearly') {
              acc.mrrProjected += price / 12;
            } else {
              acc.mrrProjected += price;
            }
          }
          return acc;
        },
        {
          totalStores: enriched.length,
          activeSubscriptions: 0,
          expiringSubscriptions: 0,
          expiredSubscriptions: 0,
          monthlyPlans: 0,
          yearlyPlans: 0,
          mrrProjected: 0,
        }
      );

      const recentPayments = await paymentRepository.findRecent(50);
      const paymentEvents = await paymentEventRepository.findRecent(50);

      return res.json({
        summary: {
          ...summary,
          paidPayments,
          pendingPayments,
          paidRevenue,
        },
        stores: enriched,
        payments: recentPayments,
        paymentEvents,
      });
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

  static async listPaymentEvents(req: Request, res: Response) {
    const paymentId = req.query.paymentId as string | undefined;
    const storeId = req.query.storeId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    try {
      const events = paymentId
        ? await paymentEventRepository.findByPaymentId(paymentId, limit, offset)
        : storeId
          ? await paymentEventRepository.findByStoreId(storeId, limit, offset)
          : await paymentEventRepository.findRecent(limit, offset);
      return res.json(events);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
