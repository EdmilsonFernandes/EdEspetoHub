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
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { saveBase64Image } from '../utils/imageStorage';
import { resolvePlanFeatures } from '../config/planFeatures';
import { verifyOrderAccessToken } from '../utils/orderAccessToken';
import { StorePaymentAccountService } from './StorePaymentAccountService';
import { logger } from '../utils/logger';

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
  private accountService = new StorePaymentAccountService();
  private orderRepository = new OrderRepository();
  private storeRepository = new StoreRepository();
  private subscriptionRepository = new SubscriptionRepository();
  private orderDeliveryRepository = new OrderDeliveryRepository();
  private orderReviewRepository = new OrderReviewRepository();
  private log = logger.child({ scope: 'OrderReviewService' });

  private normalizeQrCode(qrCode?: string | null) {
    if (!qrCode) return null;
    if (qrCode.startsWith('data:image')) return qrCode;
    return `data:image/png;base64,${qrCode}`;
  }

    /**
   * Executes resolve store review features business logic.
   *
   * @author Edmilson Lopes
   */
private async resolveStoreReviewFeatures(storeId: string) {
    const store = await this.storeRepository.findById(storeId);
    const subscription = await this.subscriptionRepository.findLatestByStoreId(storeId);
    const features = resolvePlanFeatures({
      planName: subscription?.plan?.name,
      planExempt: Boolean(store?.settings?.planExempt),
      subscriptionStatus: subscription?.status,
    });
    const deliveryFeedbackEnabled = Boolean(features.motoboyManagement);
    const tipEnabled = Boolean(features.tipPayouts && deliveryFeedbackEnabled);
    return { deliveryFeedbackEnabled, tipEnabled };
  }

    /**
   * Executes ensure store access business logic.
   *
   * @author Edmilson Lopes
   */
private ensureStoreAccess(storeId: string, authStoreId?: string) {
    if (!authStoreId) return;
    if (storeId !== authStoreId) {
      throw new AppError('AUTH-003', 403);
    }
  }

    /**
   * Executes sanitize tags business logic.
   *
   * @author Edmilson Lopes
   */
private sanitizeTags(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 8);
  }

    /**
   * Executes ensure order access business logic.
   *
   * @author Edmilson Lopes
   */
private ensureOrderAccess(orderId: string, accessToken?: string | null) {
    const ok = verifyOrderAccessToken(String(accessToken || ''), orderId);
    if (!ok) {
      throw new AppError('AUTH-003', 403, { reason: 'order_access_required' });
    }
  }

    /**
   * Executes ensure tip payment business logic.
   *
   * @author Edmilson Lopes
   */
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
    const payerEmail = String((order as any)?.customerUser?.email || '')
      .trim()
      .toLowerCase();
    const payerName = String(order?.customerName || 'Cliente').trim() || 'Cliente';
    const connectedAccessToken = order?.store?.id
      ? await this.accountService.getActiveAccessToken(order.store.id)
      : null;

    let paymentLink: string | null = null;
    let qrCodeBase64: string | null = null;
    let qrCodeText: string | null = null;
    let provider = 'MOCK';
    let providerId: string | null = null;
    let expiresAt: Date | null = new Date(Date.now() + 30 * 60 * 1000);

    if (connectedAccessToken || env.mercadoPago.accessToken) {
      try {
        const mp = await this.mercadoPagoService.createPayment({
          amount: tipAmount,
          method: 'PIX',
          description,
          externalReference,
          payer: {
            email: payerEmail.includes('@') ? payerEmail : 'cliente@janocaminho.com.br',
            name: payerName,
          },
          accessToken: connectedAccessToken || undefined,
        });
        if (mp) {
          provider = 'MERCADO_PAGO';
          providerId = mp.providerId || null;
          paymentLink = mp.paymentLink || null;
          qrCodeBase64 = this.normalizeQrCode(mp.qrCodeBase64);
          qrCodeText = mp.qrCodeText || null;
          expiresAt = (mp as any)?.expiresAt ? new Date((mp as any).expiresAt) : expiresAt;
        }
      } catch (error) {
        this.log.warn('Tip PIX generation failed', {
          reviewId: review.id,
          orderId: order.id,
          storeId: order?.store?.id || null,
          hasConnectedMercadoPago: Boolean(connectedAccessToken),
          error,
        });
        throw new AppError('PAY-004', 400, {
          message: 'Nao foi possivel gerar o Pix da gorjeta agora. Tente novamente em instantes.',
        });
      }
    }

    if (!qrCodeText && !qrCodeBase64 && !paymentLink) {
      this.log.warn('Tip PIX falling back to mock payload', {
        reviewId: review.id,
        orderId: order.id,
        storeId: order?.store?.id || null,
      });
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

    /**
   * Executes normalize rating business logic.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Executes submit by order id business logic.
   *
   * @author Edmilson Lopes
   */
async submitByOrderId(orderId: string, input: SubmitReviewInput, accessToken?: string | null) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureOrderAccess(order.id, accessToken);

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
    const storeFeatures = await this.resolveStoreReviewFeatures(order.store.id);
    const canUseDeliveryFeedback = isDeliveryOrder && storeFeatures.deliveryFeedbackEnabled;
    const canUseTip = canUseDeliveryFeedback && storeFeatures.tipEnabled;
    const motoboyId = canUseDeliveryFeedback ? (delivery?.motoboyId || null) : null;
    const normalizedTipAmount = canUseTip ? Number(tipAmount.toFixed(2)) : 0;

    const review = await this.orderReviewRepository.saveReview({
      orderId: order.id,
      storeId: order.store.id,
      motoboyId,
      customerName: order.customerName || null,
      customerPhone: order.phone || null,
      storeRating: Number(storeRating),
      deliveryRating: canUseDeliveryFeedback ? deliveryRating : null,
      comment: cleanComment,
      storeTags: this.sanitizeTags(input.storeTags),
      deliveryTags: canUseDeliveryFeedback ? this.sanitizeTags(input.deliveryTags) : [],
      tipAmount: normalizedTipAmount,
    });
    return this.ensureTipPayment(order, review);
  }

    /**
   * Retrieves data for get by order id.
   *
   * @author Edmilson Lopes
   */
async getByOrderId(orderId: string, accessToken?: string | null) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureOrderAccess(order.id, accessToken);
    const review = await this.orderReviewRepository.findByOrderId(order.id);
    const normalizedOrderType = String(order.type || '').trim().toLowerCase();
    const delivery = await this.orderDeliveryRepository.findByOrderId(order.id);
    const storeFeatures = await this.resolveStoreReviewFeatures(order.store.id);
    const canUseDeliveryFeedback = (normalizedOrderType === 'delivery' || Boolean(delivery)) && storeFeatures.deliveryFeedbackEnabled;
    const canUseTip = canUseDeliveryFeedback && storeFeatures.tipEnabled;
    const sanitizedReview = review
      ? {
          ...review,
          deliveryRating: canUseDeliveryFeedback ? review.deliveryRating : null,
          deliveryTags: canUseDeliveryFeedback ? review.deliveryTags : [],
          tipAmount: canUseTip ? review.tipAmount : 0,
          tipStatus: canUseTip ? review.tipStatus : 'NONE',
          tipProvider: canUseTip ? review.tipProvider : null,
          tipProviderId: canUseTip ? review.tipProviderId : null,
          tipPaymentLink: canUseTip ? review.tipPaymentLink : null,
          tipQrCodeBase64: canUseTip ? review.tipQrCodeBase64 : null,
          tipQrCodeText: canUseTip ? review.tipQrCodeText : null,
          tipExpiresAt: canUseTip ? review.tipExpiresAt : null,
          tipPaidAt: canUseTip ? review.tipPaidAt : null,
          tipPayoutStatus: canUseTip ? review.tipPayoutStatus : null,
          tipPayoutAt: canUseTip ? review.tipPayoutAt : null,
        }
      : null;
    return {
      orderId: order.id,
      canReview: [ 'done', 'delivered', 'finished' ].includes(String(order.status || '').toLowerCase()),
      isDelivery: canUseDeliveryFeedback,
      features: {
        deliveryFeedbackEnabled: canUseDeliveryFeedback,
        tipEnabled: canUseTip,
      },
      review: sanitizedReview,
    };
  }

    /**
   * Lists records for list by store id.
   *
   * @author Edmilson Lopes
   */
async listByStoreId(storeId: string, authStoreId?: string, limit = 100) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);
    return this.orderReviewRepository.listByStoreId(store.id, limit);
  }

    /**
   * Executes summary by store id business logic.
   *
   * @author Edmilson Lopes
   */
async summaryByStoreId(storeId: string, authStoreId?: string) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);
    return this.orderReviewRepository.getStoreSummary(store.id);
  }

    /**
   * Lists records for list tip payouts by store id.
   *
   * @author Edmilson Lopes
   */
async listTipPayoutsByStoreId(storeId: string, authStoreId?: string, limit = 300) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);
    return this.orderReviewRepository.listTipPayoutsByStoreId(store.id, limit);
  }

    /**
   * Lists records for list tip payouts by motoboy id.
   *
   * @author Edmilson Lopes
   */
async listTipPayoutsByMotoboyId(motoboyId: string, limit = 300) {
    return this.orderReviewRepository.listTipPayoutsByMotoboyId(motoboyId, limit);
  }

    /**
   * Marks workflow state for mark tip payout by store id.
   *
   * @author Edmilson Lopes
   */
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
    const storeFeatures = await this.resolveStoreReviewFeatures(store.id);
    if (!storeFeatures.tipEnabled) throw new AppError('AUTH-003', 403, { requiredFeature: 'tipPayouts' });

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

    /**
   * Executes public summary by store id business logic.
   *
   * @author Edmilson Lopes
   */
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

  async publicSummariesByStoreIds(storeIds: string[]) {
    const uniqueStoreIds = Array.from(new Set(storeIds.map((storeId) => String(storeId || '').trim()).filter(Boolean)));
    const rows = await this.orderReviewRepository.getPublicSummariesByStoreIds(uniqueStoreIds);
    return uniqueStoreIds.reduce((acc, storeId) => {
      const summary = rows.get(storeId);
      acc.set(storeId, {
        totalReviews: Number(summary?.total_reviews || 0),
        avgStoreRating: Number(summary?.store_avg_rating || 0),
        totalDeliveryReviews: Number(summary?.total_delivery_reviews || 0),
        avgDeliveryRating: Number(summary?.delivery_avg_rating || 0),
      });
      return acc;
    }, new Map<string, { totalReviews: number; avgStoreRating: number; totalDeliveryReviews: number; avgDeliveryRating: number }>());
  }

    /**
   * Marks workflow state for mark tip paid from webhook.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Marks workflow state for mark tip failed from webhook.
   *
   * @author Edmilson Lopes
   */
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
