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
import QRCode from 'qrcode';
import { env } from '../config/env';
import { MercadoPagoService } from './MercadoPagoService';
import { OrderDeliveryRepository } from '../repositories/OrderDeliveryRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderReviewRepository } from '../repositories/OrderReviewRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { saveBase64Image } from '../utils/imageStorage';

type SubmitReviewInput = {
  storeRating: number;
  deliveryRating?: number | null;
  comment?: string | null;
  storeTags?: string[];
  deliveryTags?: string[];
  tipAmount?: number | null;
};

type MarkTipPayoutInput = {
  payoutStatus?: 'PENDING' | 'PAID';
  payoutProofFile?: string | null;
  payoutProofUrl?: string | null;
  payoutNotes?: string | null;
};

export class OrderReviewService {
  private mercadoPagoService = new MercadoPagoService();
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

  private async ensureTipPayment(order: any, review: any) {
    const tipAmount = Number(review?.tipAmount || 0);
    if (!(tipAmount > 0)) {
      review.tipStatus = 'NONE';
      review.tipProvider = null;
      review.tipProviderId = null;
      review.tipPaymentLink = null;
      review.tipQrCodeBase64 = null;
      review.tipQrCodeText = null;
      review.tipExpiresAt = null;
      review.tipPaidAt = null;
      return this.orderReviewRepository.saveReview(review);
    }

    if (
      String(review.tipStatus || '').toUpperCase() === 'PENDING' &&
      review.tipQrCodeText &&
      review.tipExpiresAt &&
      new Date(review.tipExpiresAt).getTime() > Date.now()
    ) {
      return review;
    }

    const description = `Gorjeta do pedido ${order.id.slice(0, 8)} - ${order.store?.name || 'Loja'}`;
    const externalReference = `review_tip:${review.id}`;
    const payerEmail = String(order?.store?.owner?.email || order?.customerName || 'cliente@janocaminho.com.br')
      .trim()
      .toLowerCase();
    const payerName = String(order?.customerName || 'Cliente').trim() || 'Cliente';

    let paymentLink: string | null = null;
    let qrCodeBase64: string | null = null;
    let qrCodeText: string | null = null;
    let provider = 'MOCK';
    let providerId: string | null = null;
    let expiresAt: Date | null = new Date(Date.now() + 30 * 60 * 1000);

    if (env.mercadoPago.accessToken) {
      const mp = await this.mercadoPagoService.createPayment({
        amount: tipAmount,
        method: 'PIX',
        description,
        externalReference,
        payer: {
          email: payerEmail.includes('@') ? payerEmail : 'cliente@janocaminho.com.br',
          name: payerName,
        },
      });
      if (mp) {
        provider = 'MERCADO_PAGO';
        providerId = mp.providerId || null;
        paymentLink = mp.paymentLink || null;
        qrCodeBase64 = mp.qrCodeBase64 ? (mp.qrCodeBase64.startsWith('data:image') ? mp.qrCodeBase64 : `data:image/png;base64,${mp.qrCodeBase64}`) : null;
        qrCodeText = mp.qrCodeText || null;
        expiresAt = (mp as any)?.expiresAt ? new Date((mp as any).expiresAt) : expiresAt;
      }
    }

    if (!qrCodeText) {
      const payload = `PIX GORJETA | Store: ${order.store?.name || 'Loja'} | Amount: ${tipAmount.toFixed(2)} | Review:${review.id}`;
      qrCodeText = payload;
      qrCodeBase64 = await QRCode.toDataURL(payload);
    }

    review.tipStatus = 'PENDING';
    review.tipProvider = provider;
    review.tipProviderId = providerId;
    review.tipPaymentLink = paymentLink;
    review.tipQrCodeBase64 = qrCodeBase64;
    review.tipQrCodeText = qrCodeText;
    review.tipExpiresAt = expiresAt;
    review.tipPaidAt = null;
    return this.orderReviewRepository.saveReview(review);
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

    const normalizedOrderType = String(order.type || '').trim().toLowerCase();
    const delivery = await this.orderDeliveryRepository.findByOrderId(order.id);
    const isDeliveryOrder = normalizedOrderType === 'delivery' || Boolean(delivery);
    const motoboyId = delivery?.motoboyId || null;

    const review = await this.orderReviewRepository.saveReview({
      orderId: order.id,
      storeId: order.store.id,
      motoboyId,
      customerName: order.customerName || null,
      customerPhone: order.phone || null,
      storeRating: Number(storeRating),
      deliveryRating: isDeliveryOrder ? deliveryRating : null,
      comment: cleanComment,
      storeTags: this.sanitizeTags(input.storeTags),
      deliveryTags: isDeliveryOrder ? this.sanitizeTags(input.deliveryTags) : [],
      tipAmount: Number(tipAmount.toFixed(2)),
    });
    return this.ensureTipPayment(order, review);
  }

  async getByOrderId(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    const review = await this.orderReviewRepository.findByOrderId(order.id);
    const normalizedOrderType = String(order.type || '').trim().toLowerCase();
    const delivery = await this.orderDeliveryRepository.findByOrderId(order.id);
    return {
      orderId: order.id,
      canReview: [ 'done', 'delivered', 'finished' ].includes(String(order.status || '').toLowerCase()),
      isDelivery: normalizedOrderType === 'delivery' || Boolean(delivery),
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

  async listTipPayoutsByStoreId(storeId: string, authStoreId?: string, limit = 300) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);
    return this.orderReviewRepository.listTipPayoutsByStoreId(store.id, limit);
  }

  async listTipPayoutsByMotoboyId(motoboyId: string, limit = 300) {
    return this.orderReviewRepository.listTipPayoutsByMotoboyId(motoboyId, limit);
  }

  async markTipPayoutByStoreId(
    storeId: string,
    reviewId: string,
    authStoreId: string | undefined,
    actorUserId: string | undefined,
    input: MarkTipPayoutInput
  ) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);

    const review = await this.orderReviewRepository.findById(reviewId);
    if (!review || review.storeId !== store.id) throw new AppError('ORDER-001', 404);

    const tipAmount = Number(review.tipAmount || 0);
    if (!(tipAmount > 0)) throw new AppError('REVIEW-003', 400);
    if (String(review.tipStatus || '').toUpperCase() !== 'PAID') throw new AppError('REVIEW-004', 400);

    const nextStatus = String(input?.payoutStatus || 'PAID').toUpperCase() === 'PENDING' ? 'PENDING' : 'PAID';
    const proofUrl = String(input?.payoutProofUrl || '').trim() || null;
    const notes = String(input?.payoutNotes || '').trim().slice(0, 240) || null;

    let uploadedProofUrl: string | null = null;
    const proofFile = String(input?.payoutProofFile || '').trim();
    if (proofFile) {
      const saved = await saveBase64Image(proofFile, `tip-payout-${review.id}`, 'tips');
      uploadedProofUrl = saved || null;
    }

    review.tipPayoutStatus = nextStatus;
    review.tipPayoutNotes = notes;
    review.tipPayoutByUserId = actorUserId || null;

    if (nextStatus === 'PAID') {
      review.tipPayoutAt = review.tipPayoutAt || new Date();
      review.tipPayoutProofUrl = uploadedProofUrl || proofUrl || review.tipPayoutProofUrl || null;
    } else {
      review.tipPayoutAt = null;
      review.tipPayoutProofUrl = uploadedProofUrl || proofUrl || null;
    }

    return this.orderReviewRepository.saveReview(review);
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

  async markTipPaidFromWebhook(reviewId: string, mpPayment: any) {
    const review = await this.orderReviewRepository.findById(reviewId);
    if (!review) return null;
    review.tipStatus = 'PAID';
    review.tipProvider = 'MERCADO_PAGO';
    review.tipProviderId = mpPayment?.id ? String(mpPayment.id) : review.tipProviderId;
    review.tipPaymentLink = review.tipPaymentLink || mpPayment?.transaction_details?.external_resource_url || null;
    review.tipQrCodeText =
      review.tipQrCodeText || mpPayment?.point_of_interaction?.transaction_data?.qr_code || null;
    const mpQrBase64 = mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64;
    if (!review.tipQrCodeBase64 && mpQrBase64) {
      review.tipQrCodeBase64 = String(mpQrBase64).startsWith('data:image')
        ? String(mpQrBase64)
        : `data:image/png;base64,${String(mpQrBase64)}`;
    }
    review.tipPaidAt = new Date();
    return this.orderReviewRepository.saveReview(review);
  }

  async markTipFailedFromWebhook(reviewId: string, mpPayment: any) {
    const review = await this.orderReviewRepository.findById(reviewId);
    if (!review) return null;
    review.tipStatus = 'FAILED';
    review.tipProvider = 'MERCADO_PAGO';
    review.tipProviderId = mpPayment?.id ? String(mpPayment.id) : review.tipProviderId;
    review.tipPaymentLink = review.tipPaymentLink || mpPayment?.transaction_details?.external_resource_url || null;
    return this.orderReviewRepository.saveReview(review);
  }
}
