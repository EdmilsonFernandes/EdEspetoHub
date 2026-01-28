/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: SubscriptionController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

const subscriptionService = new SubscriptionService();
const paymentRepository = new PaymentRepository();
const storeRepository = new StoreRepository();
const log = logger.child({ scope: 'SubscriptionController' });
/**
 * Provides SubscriptionController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class SubscriptionController {
  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
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




  /**
   * Gets by store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async getByStore(req: Request, res: Response) {
    try {
      log.debug('Subscription get request', { storeId: req.params.storeId });
      const subscription = await subscriptionService.getCurrentByStore(req.params.storeId);
      const store = await storeRepository.findById(req.params.storeId);
      const planExempt = Boolean(store?.settings?.planExempt);
      const planExemptLabel = store?.settings?.planExemptLabel || 'Cliente VIP';
      if (!subscription && !planExempt) {
        return respondWithError(req, res, new AppError('SUB-001', 404), 404);
      }
      const latestPayment = await paymentRepository.findLatestByStoreId(req.params.storeId);
      const payload = subscription || {
        id: `vip-${req.params.storeId}`,
        status: 'ACTIVE',
        startDate: store?.createdAt ?? null,
        endDate: null,
        autoRenew: false,
        plan: { id: 'vip', name: 'vip', displayName: planExemptLabel, price: 0, durationDays: null },
      };
      return res.json({
        ...payload,
        planExempt,
        planExemptLabel: planExempt ? planExemptLabel : null,
        latestPaymentAt: latestPayment?.createdAt ?? null,
        latestPaymentStatus: latestPayment?.status ?? null,
        latestPaymentAmount: latestPayment?.amount ?? null,
      });
    } catch (error: any) {
      log.warn('Subscription get failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes renew logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
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




  /**
   * Updates status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
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




  /**
   * Creates renewal payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
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
