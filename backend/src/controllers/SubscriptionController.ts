import { Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

const subscriptionService = new SubscriptionService();
const paymentRepository = new PaymentRepository();
const log = logger.child({ scope: 'SubscriptionController' });

export class SubscriptionController {
  static async create(req: Request, res: Response) {
    try {
      log.info('Subscription create request', { storeId: req.body?.storeId, planId: req.body?.planId });
      const subscription = await subscriptionService.create(req.body);
      log.info('Subscription created', { subscriptionId: subscription?.id, storeId: req.body?.storeId });
      return res.status(201).json(subscription);
    } catch (error: any) {
      log.warn('Subscription create failed', { storeId: req.body?.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async getByStore(req: Request, res: Response) {
    try {
      log.debug('Subscription get request', { storeId: req.params.storeId });
      const subscription = await subscriptionService.getCurrentByStore(req.params.storeId);
      if (!subscription) return respondWithError(req, res, new AppError('SUB-001', 404), 404);
      const latestPayment = await paymentRepository.findLatestByStoreId(req.params.storeId);
      return res.json({
        ...subscription,
        latestPaymentAt: latestPayment?.createdAt ?? null,
        latestPaymentStatus: latestPayment?.status ?? null,
        latestPaymentAmount: latestPayment?.amount ?? null,
      });
    } catch (error: any) {
      log.warn('Subscription get failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async renew(req: Request, res: Response) {
    try {
      log.info('Subscription renew request', { subscriptionId: req.params.id, planId: req.body?.planId });
      const subscription = await subscriptionService.renew(req.params.id, req.body);
      log.info('Subscription renewed', { subscriptionId: subscription?.id });
      return res.json(subscription);
    } catch (error: any) {
      log.warn('Subscription renew failed', { subscriptionId: req.params.id, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { status } = req.body;
    try {
      log.info('Subscription status update request', { subscriptionId: req.params.id, status });
      if (status === 'SUSPENDED') {
        const subscription = await subscriptionService.suspend(req.params.id);
        return res.json(subscription);
      }
      const subscription = await subscriptionService.activate(req.params.id);
      return res.json(subscription);
    } catch (error: any) {
      log.warn('Subscription status update failed', { subscriptionId: req.params.id, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async createRenewalPayment(req: Request, res: Response) {
    try {
      log.info('Renewal payment request', { storeId: req.params.storeId, planId: req.body?.planId });
      const payment = await subscriptionService.createRenewalPayment(
        req.params.storeId,
        req.body,
        req.auth?.storeId
      );
      log.info('Renewal payment created', { paymentId: payment?.id, storeId: req.params.storeId });
      return res.status(201).json(payment);
    } catch (error: any) {
      log.warn('Renewal payment failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
