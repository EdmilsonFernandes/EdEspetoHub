/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: PlatformPublicController.ts
 */

import { Request, Response } from 'express';
import { StoreDao } from '../database/dao/StoreDao';
import { SubscriptionDao } from '../database/dao/SubscriptionDao';
import { OrderDao } from '../database/dao/OrderDao';
import { BaseController } from './BaseController';
import { Get, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.PlatformPublicController)
export class PlatformPublicController extends BaseController {
  constructor(
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.DataLayer.SubscriptionRepository) private subscriptionDao: SubscriptionDao,
    @Inject(Tokens.Common.DataLayer.OrderRepository) private orderDao: OrderDao
  ) {
    super('/platform/public');
  }

  @Get('/stats')
  async getStats(req: Request, res: Response) {
    try {
      const activeStores = await this.subscriptionDao.countByStatuses(['ACTIVE', 'TRIAL']);
      const totalOrders = await this.orderDao.countAll();
      return this.ok(res, { activeStores, totalOrders });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
