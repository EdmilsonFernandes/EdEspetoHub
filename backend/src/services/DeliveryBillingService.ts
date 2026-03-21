/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: DeliveryBillingService.ts
 */

import { AppError } from '../errors/AppError';
import { StoreDao } from '../database/dao/StoreDao';
import { DeliveryBillingCycleDao } from '../database/dao/DeliveryBillingCycleDao';
import { DeliveryBillingChargeDao } from '../database/dao/DeliveryBillingChargeDao';
import { SettingsService } from './SettingsService';
import { MercadoPagoService } from './MercadoPagoService';
import { Order } from '../entities/Order';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.DeliveryBillingService)
export class DeliveryBillingService {
  constructor(
    @Inject(Tokens.Common.Service.SettingsService) private settingsService: SettingsService,
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.Service.MercadoPagoService) private mpService: MercadoPagoService,
    @Inject(Tokens.Common.DataLayer.DeliveryBillingCycleRepository) private cycleDao: DeliveryBillingCycleDao,
    @Inject(Tokens.Common.DataLayer.DeliveryBillingChargeRepository) private chargeDao: DeliveryBillingChargeDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async recordDelivery(order: Order) {
    if (order.type !== 'delivery') return;
    // Implementation
  }

  async markPaidFromWebhook(cycleId: string, payload: any) {
    // Implementation
  }

  async markFailedFromWebhook(cycleId: string, payload: any) {
    // Implementation
  }
}
