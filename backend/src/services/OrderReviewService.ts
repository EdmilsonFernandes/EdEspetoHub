/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: OrderReviewService.ts
 */

import { AppError } from '../errors/AppError';
import { OrderDao } from '../database/dao/OrderDao';
import { StoreDao } from '../database/dao/StoreDao';
import { SubscriptionDao } from '../database/dao/SubscriptionDao';
import { OrderDeliveryDao } from '../database/dao/OrderDeliveryDao';
import { OrderReviewDao } from '../database/dao/OrderReviewDao';
import { MercadoPagoService } from './MercadoPagoService';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.OrderReviewService)
export class OrderReviewService {
  constructor(
    @Inject(Tokens.Common.Service.MercadoPagoService) private mercadoPagoService: MercadoPagoService,
    @Inject(Tokens.Common.DataLayer.OrderDao) private orderDao: OrderDao,
    @Inject(Tokens.Common.DataLayer.StoreDao) private storeDao: StoreDao,
    @Inject(Tokens.Common.DataLayer.SubscriptionDao) private subscriptionDao: SubscriptionDao,
    @Inject(Tokens.Common.DataLayer.OrderDeliveryDao) private orderDeliveryDao: OrderDeliveryDao,
    @Inject(Tokens.Common.DataLayer.OrderReviewDao) private orderReviewDao: OrderReviewDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async createReview(orderId: string, input: { rating: number; comment?: string }) {
    const order = await this.orderDao.getById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);

    const review = await this.orderReviewDao.create({
      order,
      store: (order as any).store,
      rating: input.rating,
      comment: input.comment || null,
    } as any);

    return this.orderReviewDao.save(review);
  }

  async getReviewByOrderId(orderId: string) {
    return this.orderReviewDao.findByOrderId(orderId);
  }

  async createTipPayment(reviewId: string, amount: number) {
    return null;
  }

  async markTipPaidFromWebhook(reviewId: string, payload: any) {
    const review = await this.orderReviewDao.getById(reviewId);
    if (review) {
      (review as any).tipPaidAt = new Date();
      await this.orderReviewDao.save(review);
    }
  }

  async markTipFailedFromWebhook(reviewId: string, payload: any) {
    // Implementation
  }
}
