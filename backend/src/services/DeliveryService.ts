/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: DeliveryService.ts
 */

import { Order } from '../entities/Order';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.DeliveryService)
export class DeliveryService {
  constructor(
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async ensureQueueDelivery(order: Order) {
    return null;
  }

  async acceptDelivery(orderId: string, motoboy: any) {
    return null;
  }

  async pickup(orderId: string, motoboy: any) {
    return null;
  }

  async start(orderId: string, motoboy: any) {
    return null;
  }

  async complete(orderId: string, motoboy: any) {
    return null;
  }

  async cancelByStore(orderId: string, storeId: string, reason?: string) {
    return null;
  }

  async stats(motoboy: any, range: string) {
    return {};
  }
}
