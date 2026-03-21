/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: PlatformAdminController.ts
 */

import { Request, Response } from 'express';
import { StoreDao } from '../database/dao/StoreDao';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentDao } from '../database/dao/PaymentDao';
import { PaymentEventDao } from '../database/dao/PaymentEventDao';
import { OrderDao } from '../database/dao/OrderDao';
import { SubscriptionDao } from '../database/dao/SubscriptionDao';
import { AccessLogDao } from '../database/dao/AccessLogDao';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Get, Post, Authorize, Roles, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { DatabaseService } from '../database/data-base.service';
import { SettingsService } from '../services/SettingsService';

const log = logger.child({ scope: 'PlatformAdminController' });

@RouterController(Tokens.Common.Controller.PlatformAdminController)
export class PlatformAdminController extends BaseController {
  constructor(
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.Service.SubscriptionService) private subscriptionService: SubscriptionService,
    @Inject(Tokens.Common.DataLayer.PaymentRepository) private paymentDao: PaymentDao,
    @Inject(Tokens.Common.DataLayer.PaymentEventRepository) private paymentEventDao: PaymentEventDao,
    @Inject(Tokens.Common.DataLayer.OrderRepository) private orderDao: OrderDao,
    @Inject(Tokens.Common.DataLayer.SubscriptionRepository) private subscriptionDao: SubscriptionDao,
    @Inject(Tokens.Common.DataLayer.AccessLogRepository) private accessLogDao: AccessLogDao,
    @Inject(Tokens.Common.Service.SettingsService) private settingsService: SettingsService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {
    super('/admin/platform');
  }

  private buildVipSubscription(store: any) {
    const label = store?.settings?.planExemptLabel || 'Cliente VIP';
    return {
      id: `vip-${store?.id || 'store'}`,
      status: 'ACTIVE',
      startDate: store?.createdAt || null,
      endDate: null,
      autoRenew: false,
      plan: {
        id: 'vip',
        name: 'vip',
        displayName: label,
        price: 0,
        durationDays: null,
      },
      planExempt: true,
      planExemptLabel: label,
    };
  }

  @Get('/stores')
  @Authorize()
  @Roles('SUPER_ADMIN')
  async listStores(req: Request, res: Response) {
    try {
      const stores = await this.storeDao.readAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await this.subscriptionService.getCurrentByStore(store.id);
          const latestPayment = await this.paymentDao.findLatestByStoreId(store.id);
          const vipSubscription = (store as any).settings?.planExempt
            ? this.buildVipSubscription(store)
            : null;
          return {
            ...store,
            subscription: vipSubscription || subscription,
            latestPayment,
          };
        })
      );
      return this.ok(res, enriched);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/overview')
  @Authorize()
  @Roles('SUPER_ADMIN')
  async overview(req: Request, res: Response) {
    try {
      const stores = await this.storeDao.readAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await this.subscriptionService.getCurrentByStore(store.id);
          const latestPayment = await this.paymentDao.findLatestByStoreId(store.id);
          const vipSubscription = (store as any).settings?.planExempt
            ? this.buildVipSubscription(store)
            : null;
          return { ...store, subscription: vipSubscription || subscription, latestPayment };
        })
      );

      const paidPayments = await this.paymentDao.countByStatus('PAID');
      const pendingPayments = await this.paymentDao.countByStatus('PENDING');
      const paidRevenue = await this.paymentDao.sumPaidAmounts();
      
      const summary = {
        totalStores: enriched.length,
        paidPayments,
        pendingPayments,
        paidRevenue,
      };

      return this.ok(res, {
        summary,
        stores: enriched,
      });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/store/:storeId/suspend')
  @Authorize()
  @Roles('SUPER_ADMIN')
  async suspendStore(req: Request, res: Response) {
    try {
      const subscription = await this.subscriptionService.suspend(req.params.storeId);
      return this.ok(res, subscription);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/store/:storeId/reactivate')
  @Authorize()
  @Roles('SUPER_ADMIN')
  async reactivateStore(req: Request, res: Response) {
    try {
      const subscription = await this.subscriptionService.activate(req.params.storeId);
      return this.ok(res, subscription);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
