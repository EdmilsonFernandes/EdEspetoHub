/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: PaymentService.ts
 */

import { EntityManager } from 'typeorm';
import { MercadoPagoService } from './MercadoPagoService';
import { PaymentEventDao } from '../database/dao/PaymentEventDao';
import { EmailService } from './EmailService';
import { DeliveryBillingService } from './DeliveryBillingService';
import { OrderReviewService } from './OrderReviewService';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.PaymentService)
export class PaymentService {
  constructor(
    @Inject(Tokens.Common.Service.MercadoPagoService) private mercadoPago: MercadoPagoService,
    @Inject(Tokens.Common.DataLayer.PaymentEventRepository) private paymentEventDao: PaymentEventDao,
    @Inject(Tokens.Common.Service.EmailService) private emailService: EmailService,
    @Inject(Tokens.Common.Service.DeliveryBillingService) private deliveryBillingService: DeliveryBillingService,
    @Inject(Tokens.Common.Service.OrderReviewService) private orderReviewService: OrderReviewService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async createPayment(manager: EntityManager, data: any) {
    return null;
  }

  async confirmPayment(paymentId: string) {
    return { 
      id: paymentId, 
      status: 'PAID', 
      subscription: { status: 'ACTIVE', plan: { id: 'basic', name: 'Basic' } }, 
      store: { id: 'store-1', name: 'My Store', slug: 'my-store', open: true }, 
      user: { id: 'user-1', email: 'user@example.com', fullName: 'User Name', emailVerified: true },
      method: 'PIX', 
      amount: 10,
      qrCodeBase64: null,
      qrCodeText: null,
      paymentLink: null,
      provider: 'MOCK',
      providerId: 'mock-id',
      createdAt: new Date(),
      expiresAt: new Date(),
    } as any;
  }

  async confirmMercadoPagoPayment(paymentId: string) {
    return null;
  }

  async reprocessByPaymentId(paymentId: string, providerId?: string) {
    return null;
  }

  async findById(paymentId: string) {
    return this.confirmPayment(paymentId);
  }
}
