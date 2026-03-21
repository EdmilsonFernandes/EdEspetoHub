/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: SubscriptionService.ts
 */

import { PlanDao } from '../database/dao/PlanDao';
import { StoreDao } from '../database/dao/StoreDao';
import { SubscriptionDao } from '../database/dao/SubscriptionDao';
import { EmailService } from './EmailService';
import { PaymentService } from './PaymentService';
import { PaymentDao } from '../database/dao/PaymentDao';
import { MercadoPagoService } from './MercadoPagoService';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.SubscriptionService)
export class SubscriptionService {
  constructor(
    @Inject(Tokens.Common.DataLayer.PlanRepository) private planDao: PlanDao,
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.DataLayer.SubscriptionRepository) private subscriptionDao: SubscriptionDao,
    @Inject(Tokens.Common.DataLayer.PaymentRepository) private paymentDao: PaymentDao,
    @Inject(Tokens.Common.Service.EmailService) private emailService: EmailService,
    @Inject(Tokens.Common.Service.PaymentService) private paymentService: PaymentService,
    @Inject(Tokens.Common.Service.MercadoPagoService) private mercadoPago: MercadoPagoService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async getCurrentByStore(storeId: string) {
    return this.subscriptionDao.findCurrentByStoreId(storeId);
  }

  async suspend(id: string) {
    return null;
  }

  async activate(id: string) {
    return null;
  }

  async create(data: any) {
    return null;
  }

  async renew(id: string, data: any) {
    return null;
  }

  async createRenewalPayment(storeId: string, data: any, authStoreId?: string) {
    return null;
  }

  isActiveSubscription(subscription: any) {
    return true;
  }
}
