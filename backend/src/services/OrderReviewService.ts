/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderReviewService.ts
 * @Date: 2026-02-13
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppError } from '../errors/AppError';
import { OrderDeliveryRepository } from '../repositories/OrderDeliveryRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderReviewRepository } from '../repositories/OrderReviewRepository';
import { StoreRepository } from '../repositories/StoreRepository';

type SubmitReviewInput = {
  storeRating: number;
  deliveryRating?: number | null;
  comment?: string | null;
  storeTags?: string[];
  deliveryTags?: string[];
  tipAmount?: number | null;
};

export class OrderReviewService {
  private orderRepository = new OrderRepository();
  private storeRepository = new StoreRepository();
  private orderDeliveryRepository = new OrderDeliveryRepository();
  private orderReviewRepository = new OrderReviewRepository();

  private ensureStoreAccess(storeId: string, authStoreId?: string) {
    if (!authStoreId) return;
    if (storeId !== authStoreId) {
      throw new AppError('AUTH-003', 403);
    }
  }

  private sanitizeTags(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  private normalizeRating(value: unknown, field: string, required = false) {
    if (value === undefined || value === null || value === '') {
      if (required) throw new AppError('REVIEW-001', 400, { field });
      return null;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      throw new AppError('REVIEW-001', 400, { field });
    }
    return Math.round(n);
  }

  async submitByOrderId(orderId: string, input: SubmitReviewInput) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);

    const status = String(order.status || '').toLowerCase();
    const isFinished = [ 'done', 'delivered', 'finished' ].includes(status);
    if (!isFinished) {
      throw new AppError('REVIEW-002', 400);
    }

    const storeRating = this.normalizeRating(input.storeRating, 'storeRating', true);
    const deliveryRating = this.normalizeRating(input.deliveryRating, 'deliveryRating', false);
    const cleanComment = String(input.comment || '').trim().slice(0, 240) || null;
    const tipAmountRaw = Number(input.tipAmount ?? 0);
    const tipAmount = Number.isFinite(tipAmountRaw) ? Math.max(0, Math.min(500, tipAmountRaw)) : 0;

    const delivery = await this.orderDeliveryRepository.findByOrderId(order.id);
    const motoboyId = delivery?.motoboyId || null;

    return this.orderReviewRepository.saveReview({
      orderId: order.id,
      storeId: order.store.id,
      motoboyId,
      customerName: order.customerName || null,
      customerPhone: order.phone || null,
      storeRating: Number(storeRating),
      deliveryRating: order.type === 'delivery' ? deliveryRating : null,
      comment: cleanComment,
      storeTags: this.sanitizeTags(input.storeTags),
      deliveryTags: order.type === 'delivery' ? this.sanitizeTags(input.deliveryTags) : [],
      tipAmount: Number(tipAmount.toFixed(2)),
    });
  }

  async getByOrderId(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    const review = await this.orderReviewRepository.findByOrderId(order.id);
    return {
      orderId: order.id,
      canReview: [ 'done', 'delivered', 'finished' ].includes(String(order.status || '').toLowerCase()),
      isDelivery: String(order.type || '') === 'delivery',
      review,
    };
  }

  async listByStoreId(storeId: string, authStoreId?: string, limit = 100) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);
    return this.orderReviewRepository.listByStoreId(store.id, limit);
  }

  async summaryByStoreId(storeId: string, authStoreId?: string) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);
    return this.orderReviewRepository.getStoreSummary(store.id);
  }

  async publicSummaryByStoreId(storeId: string) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    const { summary } = await this.orderReviewRepository.getStoreSummary(store.id);
    return {
      totalReviews: Number(summary?.total_reviews || 0),
      avgStoreRating: Number(summary?.store_avg_rating || 0),
      totalDeliveryReviews: Number(summary?.total_delivery_reviews || 0),
      avgDeliveryRating: Number(summary?.delivery_avg_rating || 0),
    };
  }
}
