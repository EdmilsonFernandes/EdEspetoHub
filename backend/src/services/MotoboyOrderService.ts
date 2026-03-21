/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: MotoboyOrderService.ts
 */

import { AppError } from '../errors/AppError';
import { OrderDao } from '../database/dao/OrderDao';
import { OrderDeliveryDao } from '../database/dao/OrderDeliveryDao';
import { MotoboyStoreDao } from '../database/dao/MotoboyStoreDao';
import { DeliveryBillingService } from './DeliveryBillingService';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.MotoboyOrderService)
export class MotoboyOrderService {
  constructor(
    @Inject(Tokens.Common.DataLayer.OrderDao) private orderDao: OrderDao,
    @Inject(Tokens.Common.DataLayer.OrderDeliveryDao) private orderDeliveryDao: OrderDeliveryDao,
    @Inject(Tokens.Common.DataLayer.MotoboyStoreDao) private motoboyStoreDao: MotoboyStoreDao,
    @Inject(Tokens.Common.Service.DeliveryBillingService) private deliveryBillingService: DeliveryBillingService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async listActiveByMotoboy(motoboyId: string) {
    return this.orderDeliveryDao.findActiveByMotoboyId(motoboyId);
  }
}
