/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PaymentController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from '../services/PaymentService';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentMethod } from '../entities/Payment';
import { env } from '../config/env';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

const paymentService = new PaymentService();
const subscriptionService = new SubscriptionService();
const paymentEventRepository = new PaymentEventRepository();
const log = logger.child({ scope: 'PaymentController' });

/**
 * Represents PaymentController.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PaymentController {
  /**
   * Executes confirm logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async confirm(req: Request, res: Response) {
    const { paymentId } = req.body;
    if (!paymentId) return respondWithError(req, res, new AppError('PAY-006', 400), 400);

    try {
      log.info('Payment confirm request', { paymentId });
      const payment = await paymentService.confirmPayment(paymentId);
      log.info('Payment confirmed', { paymentId, status: payment.status });
      return res.json({
        payment: {
          id: payment.id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
        },
        subscriptionStatus: payment.subscription.status,
        storeStatus: payment.store.open ? 'ACTIVE' : 'PENDING_PAYMENT',
      });
    } catch (error: any) {
      log.warn('Payment confirm failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Executes mercado pago webhook logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async mercadoPagoWebhook(req: Request, res: Response) {
    if (env.mercadoPago.webhookSecret) {
      const signature = req.headers['x-signature'] as string | undefined;
      const requestId = req.headers['x-request-id'] as string | undefined;
      const dataId = req.body?.data?.id;

      if (!signature || !requestId || !dataId) {
        return respondWithError(req, res, new AppError('PAY-007', 401), 401);
      }

      const parts = signature.split(',').reduce((acc, chunk) => {
        const [key, value] = chunk.split('=');
        acc[key?.trim()] = value?.trim();
        return acc;
      }, {} as Record<string, string>);

      const ts = parts.ts;
      const hash = parts.v1;

      if (!ts || !hash) {
        return respondWithError(req, res, new AppError('PAY-008', 401), 401);
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const expected = crypto
        .createHmac('sha256', env.mercadoPago.webhookSecret)
        .update(manifest)
        .digest('hex');

      if (expected !== hash) {
        return respondWithError(req, res, new AppError('PAY-008', 401), 401);
      }
    }

    const payload = req.body || {};
    const paymentId = payload?.data?.id;
    if (!paymentId) {
      return respondWithError(req, res, new AppError('PAY-009', 200), 200);
    }

    try {
      log.info('Mercado Pago webhook received', { paymentId });
      const result = await paymentService.confirmMercadoPagoPayment(String(paymentId));
      log.info('Mercado Pago webhook processed', { paymentId });
      return res.json({ status: 'ok', result });
    } catch (error: any) {
      log.warn('Mercado Pago webhook failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Gets by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async getById(req: Request, res: Response) {
    const { paymentId } = req.params;

    try {
      log.debug('Payment get request', { paymentId });
      const payment = await paymentService.findById(paymentId);
      if (!payment) return respondWithError(req, res, new AppError('PAY-001', 404), 404);

      return res.json({
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: Number(payment.amount),
        qrCodeBase64: payment.qrCodeBase64,
        qrCodeText: payment.qrCodeText,
        paymentLink: payment.paymentLink,
        provider: payment.provider,
        providerId: payment.providerId,
        expiresAt: payment.expiresAt,
        storeId: payment.store?.id || null,
        storeSlug: payment.store?.slug || null,
        storeName: payment.store?.name || null,
        subscriptionId: payment.subscription?.id || null,
        planId: payment.subscription?.plan?.id || null,
        emailVerified: payment.user?.emailVerified ?? false,
      });
    } catch (error: any) {
      log.warn('Payment get failed', { paymentId, error });
      return respondWithError(req, res, error, 500);
    }
  }

  /**
   * Gets events.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async getEvents(req: Request, res: Response) {
    const { paymentId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    try {
      log.debug('Payment events request', { paymentId, limit, offset });
      const events = await paymentEventRepository.findByPaymentId(paymentId, limit, offset);
      const payload = events.map((event) => ({
        id: event.id,
        status: event.status,
        provider: event.provider,
        createdAt: event.createdAt,
        payload: event.payload || null,
      }));
      return res.json(payload);
    } catch (error: any) {
      log.warn('Payment events failed', { paymentId, error });
      return respondWithError(req, res, error, 500);
    }
  }

  /**
   * Executes reprocess logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async reprocess(req: Request, res: Response) {
    const { paymentId } = req.params;
    const { providerId } = req.body || {};

    try {
      log.info('Payment reprocess request', { paymentId, providerId });
      const result = await paymentService.reprocessByPaymentId(paymentId, providerId);
      log.info('Payment reprocess success', { paymentId });
      return res.json({ status: 'ok', result });
    } catch (error: any) {
      log.warn('Payment reprocess failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Creates a new renewal payment from a failed/expired payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async renewFromPayment(req: Request, res: Response) {
    const { paymentId } = req.params;
    const { paymentMethod } = req.body || {};

    try {
      const payment = await paymentService.findById(paymentId);
      if (!payment) {
        return respondWithError(req, res, new AppError('PAY-001', 404), 404);
      }

      const now = new Date();
      const isExpired = payment.expiresAt ? payment.expiresAt <= now : false;
      if (!isExpired && payment.status !== 'FAILED') {
        return res.json(payment);
      }

      const method = (paymentMethod || payment.method || 'PIX') as PaymentMethod;
      const planId = payment.subscription?.plan?.id;
      const storeId = payment.store?.id;
      if (!planId || !storeId) {
        return respondWithError(req, res, new AppError('PAY-008', 400), 400);
      }

      const newPayment = await subscriptionService.createRenewalPayment(storeId, {
        planId,
        paymentMethod: method,
      });

      return res.json(newPayment);
    } catch (error: any) {
      log.warn('Payment renew failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
