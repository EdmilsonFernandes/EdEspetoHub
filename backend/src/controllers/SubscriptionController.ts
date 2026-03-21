/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: SubscriptionController.ts
 */

import { Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentDao } from '../database/dao/PaymentDao';
import { StoreDao } from '../database/dao/StoreDao';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Get, Post, Authorize, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

const log = logger.child({ scope: 'SubscriptionController' });

@RouterController(Tokens.Common.Controller.SubscriptionController)
export class SubscriptionController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.SubscriptionService) private subscriptionService: SubscriptionService,
    @Inject(Tokens.Common.DataLayer.PaymentRepository) private paymentDao: PaymentDao,
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao
  ) {
    super('/subscriptions');
  }

  @Post('/')
  async create(req: Request, res: Response) {
    try {
      const subscription = await this.subscriptionService.create(req.body);
      return this.created(res, subscription);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/store/:storeId')
  @Authorize()
  async getByStore(req: Request, res: Response) {
    try {
      const subscription = await this.subscriptionService.getCurrentByStore(req.params.storeId);
      const store = await this.storeDao.getById(req.params.storeId);
      const planExempt = Boolean(store?.settings?.planExempt);
      const planExemptLabel = store?.settings?.planExemptLabel || 'Cliente VIP';
      
      if (!subscription && !planExempt) {
        return this.notFound(res, 'Subscription not found');
      }
      
      const latestPaidPayment = await this.paymentDao.findLatestPaidByStoreId(req.params.storeId);
      const payload = planExempt
        ? {
            id: `vip-${req.params.storeId}`,
            status: 'ACTIVE',
            startDate: store?.createdAt ?? null,
            endDate: null,
            autoRenew: false,
            plan: { id: 'vip', name: 'vip', displayName: planExemptLabel, price: 0, durationDays: null },
          }
        : subscription;
        
      return this.ok(res, {
        ...payload,
        planExempt,
        planExemptLabel: planExempt ? planExemptLabel : null,
        latestPaymentAt: latestPaidPayment?.createdAt ?? null,
        latestPaymentStatus: latestPaidPayment?.status ?? null,
        latestPaymentAmount: latestPaidPayment?.amount ?? null,
      });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/:id/renew')
  @Authorize()
  async renew(req: Request, res: Response) {
    try {
      const subscription = await this.subscriptionService.renew(req.params.id, req.body);
      return this.ok(res, subscription);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/renewal-payment/:storeId')
  @Authorize()
  async createRenewalPayment(req: Request, res: Response) {
    try {
      const payment = await this.subscriptionService.createRenewalPayment(
        req.params.storeId,
        req.body,
        req.auth?.storeId
      );
      return this.created(res, payment);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
