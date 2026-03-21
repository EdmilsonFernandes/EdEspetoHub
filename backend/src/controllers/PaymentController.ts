/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: PaymentController.ts
 */

import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentEventDao } from '../database/dao/PaymentEventDao';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Get, Post, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { DatabaseService } from '../database/data-base.service';

const log = logger.child({ scope: 'PaymentController' });

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gestão de pagamentos
 */
@RouterController(Tokens.Common.Controller.PaymentController, 'v1')
export class PaymentController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.PaymentService) private paymentService: PaymentService,
    @Inject(Tokens.Common.Service.SubscriptionService) private subscriptionService: SubscriptionService,
    @Inject(Tokens.Common.DataLayer.PaymentEventDao) private paymentEventDao: PaymentEventDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {
    super('/payments', 'v1');
  }

  /**
   * @swagger
   * /payments/confirm:
   *   post:
   *     summary: Confirma um pagamento
   *     tags: [Payments]
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/confirm')
  async confirm(req: Request, res: Response) {
    const { paymentId } = req.body;
    if (!paymentId) return this.clientError(res, 'PaymentId is required');

    try {
      const payment = await this.paymentService.confirmPayment(paymentId);
      return this.ok(res, {
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
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /payments/{paymentId}:
   *   get:
   *     summary: Busca detalhes de um pagamento
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: paymentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: OK
   */
  @Get('/:paymentId')
  async getById(req: Request, res: Response) {
    try {
      const payment = await this.paymentService.findById(req.params.paymentId);
      if (!payment) return this.notFound(res, 'Payment not found');

      return this.ok(res, {
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: Number(payment.amount),
        qrCodeBase64: payment.qrCodeBase64,
        qrCodeText: payment.qrCodeText,
        paymentLink: payment.paymentLink,
        provider: payment.provider,
        providerId: payment.providerId,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        storeId: payment.store?.id || null,
        storeSlug: payment.store?.slug || null,
        storeName: payment.store?.name || null,
        subscriptionId: payment.subscription?.id || null,
        planId: payment.subscription?.plan?.id || null,
        emailVerified: (payment as any).user?.emailVerified ?? false,
      });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
