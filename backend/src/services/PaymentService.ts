/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: PaymentService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { EntityManager } from 'typeorm';
import QRCode from 'qrcode';
import { Payment, PaymentMethod } from '../entities/Payment';
import { Subscription } from '../entities/Subscription';
import { Plan } from '../entities/Plan';
import { User } from '../entities/User';
import { Store } from '../entities/Store';
import { AppDataSource } from '../config/database';
import { MercadoPagoService } from './MercadoPagoService';
import { DestinationPromotionService } from './DestinationPromotionService';
import { env } from '../config/env';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { EmailService } from './EmailService';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { DeliveryBillingService } from './DeliveryBillingService';
import { OrderReviewService } from './OrderReviewService';
import { FeaturedProductService } from './FeaturedProductService';
import { OrderPaymentService } from './OrderPaymentService';
import { StorePaymentAccountService } from './StorePaymentAccountService';
import { MotoboyPaymentAccountService } from './MotoboyPaymentAccountService';
import { PaymentAuditService } from './PaymentAuditService';
import { PAYMENT_AUDIT_ENTITY, PAYMENT_AUDIT_FLOW, PAYMENT_AUDIT_STAGE } from '../utils/paymentAudit';
import { AuditNotificationService } from './AuditNotificationService';
import { isMercadoPagoApprovedStatus, isMercadoPagoFailedStatus, isMercadoPagoPendingStatus } from '../utils/mercadoPagoStatus';
/**
 * Provides PaymentService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class PaymentService {
  private mercadoPago = new MercadoPagoService();
  private paymentEventRepository = new PaymentEventRepository();
  private emailService = new EmailService();
  private deliveryBillingService = new DeliveryBillingService();
  private orderReviewService = new OrderReviewService();
  private featuredProductService = new FeaturedProductService();
  private destinationPromotionService = new DestinationPromotionService();
  private orderPaymentService = new OrderPaymentService();
  private accountService = new StorePaymentAccountService();
  private motoboyPaymentAccountService = new MotoboyPaymentAccountService();
  private paymentAuditService = new PaymentAuditService();
  private auditNotificationService = new AuditNotificationService();
  private log = logger.child({ scope: 'PaymentService' });
  /**
   * Normalizes QR payload to Data URL format for consistent client rendering.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private normalizeQrCode(qrCode?: string | null) {
    if (!qrCode) return null;
    if (qrCode.startsWith('data:image')) return qrCode;
    return `data:image/png;base64,${qrCode}`;
  }

  private async getMercadoPagoPaymentAnyAccessToken(mercadoPagoPaymentId: string) {
    const [storeAccounts, motoboyAccounts] = await Promise.all([
      this.accountService.listActiveAccessTokens(),
      this.motoboyPaymentAccountService.listActiveAccessTokens(),
    ]);
    const candidates = [
      ...(env.mercadoPago.accessToken ? [ { accessToken: undefined as string | undefined, scope: 'platform' } ] : []),
      ...storeAccounts.map((account) => ({
        accessToken: account.accessToken,
        scope: 'store',
        storeId: account.storeId,
      })),
      ...motoboyAccounts.map((account) => ({
        accessToken: account.accessToken,
        scope: 'motoboy',
        motoboyId: account.motoboyId,
      })),
    ];

    if (!candidates.length) {
      throw new AppError('PAY-003', 400);
    }

    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        return await this.mercadoPago.getPayment(mercadoPagoPaymentId, candidate.accessToken);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    throw new AppError('PAY-004', 404);
  }

    /**
   * Resolves effective plan charge amount considering promotional pricing.
   *
   * @author Edmilson Lopes
   */
private resolvePlanChargeAmount(plan: Plan) {
    const fullPrice = Number((plan as any)?.price) || 0;
    const promoPrice = Number((plan as any)?.promoPrice) || 0;
    if (promoPrice > 0 && promoPrice < fullPrice) {
      return promoPrice;
    }
    return fullPrice;
  }



  /**
   * Sends activation email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async sendActivationEmail(email: string, slug: string) {
    await this.emailService.sendActivationEmail(email, slug);
  }

  private async notifySubscriptionCreated(payment: Payment, data: {
    user: User;
    store: Store;
    subscription: Subscription;
    plan: Plan;
  }) {
    await this.auditNotificationService.notifySubscriptionEvent({
      stage: 'created',
      user: {
        id: data.user.id,
        fullName: data.user.fullName,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.userRole,
      },
      store: {
        id: data.store.id,
        name: data.store.name,
        slug: data.store.slug,
      },
      subscription: {
        paymentId: payment.id,
        subscriptionId: data.subscription.id,
        planName: data.plan.displayName || data.plan.name,
        status: payment.status,
        paymentMethod: payment.method,
        provider: payment.provider,
        amount: Number(payment.amount || 0),
      },
      metadata: {
        paymentLink: payment.paymentLink || null,
        providerId: payment.providerId || null,
      },
    });
  }

  private async notifySubscriptionConfirmed(payment: Payment) {
    await this.auditNotificationService.notifySubscriptionEvent({
      stage: 'confirmed',
      user: {
        id: payment.user?.id,
        fullName: payment.user?.fullName,
        email: payment.user?.email,
        phone: payment.user?.phone,
        role: payment.user?.userRole,
      },
      store: {
        id: payment.store?.id,
        name: payment.store?.name,
        slug: payment.store?.slug,
      },
      subscription: {
        paymentId: payment.id,
        subscriptionId: payment.subscription?.id,
        planName: payment.subscription?.plan?.displayName || payment.subscription?.plan?.name || null,
        status: payment.subscription?.status || payment.status,
        paymentMethod: payment.method,
        provider: payment.provider,
        amount: Number(payment.amount || 0),
      },
      metadata: {
        providerId: payment.providerId || null,
      },
    });
  }




  /**
   * Creates payment record and optionally provisions provider checkout artifacts.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async createPayment(
    manager: EntityManager,
    data: {
      user: User;
      store: Store;
      subscription: Subscription;
      plan: Plan;
      method: PaymentMethod;
    }
  ) {
    const paymentRepo = manager.getRepository(Payment);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const mockLinkBase =
      data.method === 'BOLETO'
        ? 'https://pay.janocaminho.com/boleto'
        : 'https://pay.janocaminho.com/checkout';
    const paymentLink =
      data.method === 'CREDIT_CARD' || data.method === 'BOLETO'
        ? `${mockLinkBase}/${data.subscription.id}`
        : null;

    const chargeAmount = this.resolvePlanChargeAmount(data.plan);

    let payment = paymentRepo.create({
      user: data.user,
      store: data.store,
      subscription: data.subscription,
      method: data.method,
      status: 'PENDING',
      amount: chargeAmount,
      expiresAt,
      qrCodeBase64: null,
      qrCodeText: null,
      paymentLink,
      provider: 'MOCK',
    } as Payment);

    payment.amount = chargeAmount;

    payment = await paymentRepo.save(payment);

    const planLabel = data.plan.displayName || data.plan.name;
    const description = `Assinatura ${planLabel} - ${data.store.name}`;
    const mercadoPagoEnabled = Boolean(env.mercadoPago.accessToken);

    if (mercadoPagoEnabled) {
      try {
        const mpPayment = await this.mercadoPago.createPayment({
          amount: chargeAmount,
          method: data.method,
          description,
          externalReference: payment.id,
          payer: {
            email: data.user.email,
            name: data.user.fullName,
          },
          auditContext: {
            flowType: PAYMENT_AUDIT_FLOW.SUBSCRIPTION,
            entityType: PAYMENT_AUDIT_ENTITY.PAYMENT,
            entityId: payment.id,
            storeId: data.store.id,
            externalReference: payment.id,
            eventStage: PAYMENT_AUDIT_STAGE.PROVIDER_REQUEST,
          },
        });

        if (mpPayment?.paymentLink) {
          payment.paymentLink = mpPayment.paymentLink;
        }

        payment.provider = 'MERCADO_PAGO';
        payment.providerId = mpPayment?.providerId || payment.providerId;
        const expiresAt = (mpPayment as any)?.expiresAt;
        if (expiresAt) {
          const parsed = new Date(expiresAt);
          if (!Number.isNaN(parsed.getTime())) {
            payment.expiresAt = parsed;
          }
        }

        if (mpPayment?.qrCodeBase64 && payment.method === 'PIX') {
          payment.qrCodeBase64 = this.normalizeQrCode(mpPayment.qrCodeBase64);
        }
        if (mpPayment?.qrCodeText && payment.method === 'PIX') {
          payment.qrCodeText = mpPayment.qrCodeText;
        }

        await paymentRepo.save(payment);
        await this.notifySubscriptionCreated(payment, data);
        return payment;
      } catch (error) {
        this.log.warn('Mercado Pago failed, using fallback', { error });
      }
    }

    if (payment.method === 'PIX') {
      const qrPayload = `PIX FAKE | Store: ${data.store.name} | Amount: ${Number(
        chargeAmount
      ).toFixed(2)} | PaymentId: ${payment.id}`;
      payment.qrCodeBase64 = await QRCode.toDataURL(qrPayload);
      payment.qrCodeText = qrPayload;
      await paymentRepo.save(payment);
    }

    await this.notifySubscriptionCreated(payment, data);
    return payment;
  }

  /**
   * Confirms payment and activates subscription/store access atomically.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async confirmPayment(paymentId: string) {
    this.log.info('Confirm payment start', { paymentId });
    return AppDataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const lockedPayment = await paymentRepo
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id: paymentId })
        .getOne();

      if (!lockedPayment) throw new AppError('PAY-001', 404);
      if (lockedPayment.status === 'FAILED') throw new AppError('PAY-002', 400);

      const payment = await paymentRepo.findOne({
        where: { id: paymentId },
        relations: ['subscription', 'subscription.plan', 'store', 'user'],
      });
      if (!payment) throw new AppError('PAY-001', 404);
      const alreadyPaid = payment.status === 'PAID';
      if (alreadyPaid && payment.user?.emailVerified !== true) {
        return payment;
      }
      if (alreadyPaid && payment.subscription.status === 'ACTIVE' && payment.store.open) {
        return payment;
      }

      const subscription = payment.subscription;
      const store = payment.store;
      const plan = subscription.plan;
      const now = new Date();
      const endDate = this.addDays(now, plan.durationDays);

      if (!alreadyPaid) {
        payment.status = 'PAID';
      }
      subscription.status = 'ACTIVE';
      subscription.startDate = now;
      subscription.endDate = endDate;
      subscription.reminderStage = 0;
      store.open = true;

      await manager.save(subscription);
      await manager.save(store);
      await manager.save(payment);
      await this.sendActivationEmail(payment.user.email, store.slug);
      await this.notifySubscriptionConfirmed(payment);
      this.log.info('Payment confirmed', {
        paymentId,
        storeId: store.id,
        subscriptionId: subscription.id,
        status: payment.status,
      });

      return payment;
    });
  }

  /**
   * Confirms payment using Mercado Pago provider ID and syncs local state.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async confirmMercadoPagoPayment(mercadoPagoPaymentId: string) {
    this.log.info('Confirm Mercado Pago payment', { mercadoPagoPaymentId });
    const mpPayment = await this.getMercadoPagoPaymentAnyAccessToken(mercadoPagoPaymentId);
    if (!mpPayment) {
      throw new AppError('PAY-004', 404);
    }

    return this.applyMercadoPagoStatus(mpPayment);
  }

  /**
   * Forces provider status refresh and reprocessing for an existing payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async reprocessByPaymentId(paymentId: string, providerId?: string) {
    this.log.info('Reprocess payment', { paymentId, providerId });
    const paymentRepo = AppDataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new AppError('PAY-001', 404);
    }

    const mpId = providerId || payment.providerId;
    if (!mpId) {
      throw new AppError('PAY-005', 400);
    }

    const mpPayment = await this.getMercadoPagoPaymentAnyAccessToken(mpId);
    if (!mpPayment) {
      throw new AppError('PAY-004', 404);
    }

    return this.applyMercadoPagoStatus(mpPayment);
  }




  /**
   * Fetches provider status and updates payment state machine.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async updatePaymentStatus(paymentId: string, providerStatus?: string) {
    const paymentRepo = AppDataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment || payment.status === 'PAID') return;

    const failedStatuses = ['rejected', 'cancelled', 'charged_back', 'refunded', 'failed'];
    if (providerStatus && failedStatuses.includes(providerStatus)) {
      payment.status = 'FAILED';
      await paymentRepo.save(payment);
      this.log.warn('Payment marked as failed', { paymentId, providerStatus });
    }
  }




  /**
   * Maps Mercado Pago status to local payment/subscription transitions.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async applyMercadoPagoStatus(mpPayment: any) {
    if (mpPayment.external_reference) {
      const paymentId = String(mpPayment.external_reference);
      const auditByReference = async (flowType: string, entityType: string, entityId: string, storeId?: string | null) => {
        await this.paymentAuditService.record({
          provider: 'MERCADO_PAGO',
          flowType,
          eventStage: PAYMENT_AUDIT_STAGE.WEBHOOK_RECEIVED,
          entityType,
          entityId,
          storeId: storeId || null,
          externalReference: paymentId,
          providerPaymentId: mpPayment?.id ? String(mpPayment.id) : null,
          providerStatus: mpPayment?.status || null,
          providerStatusDetail: mpPayment?.status_detail || null,
          responsePayload: mpPayment || null,
          success: String(mpPayment?.status || '').toLowerCase() === 'approved',
        });
      };
      if (paymentId.startsWith('delivery_cycle:')) {
        const cycleId = paymentId.replace('delivery_cycle:', '');
        await auditByReference(PAYMENT_AUDIT_FLOW.DELIVERY_CYCLE, PAYMENT_AUDIT_ENTITY.DELIVERY_BILLING_CYCLE, cycleId);
        if (isMercadoPagoApprovedStatus(mpPayment.status)) {
          await this.deliveryBillingService.markPaidFromWebhook(cycleId, mpPayment);
        } else if (isMercadoPagoFailedStatus(mpPayment.status)) {
          await this.deliveryBillingService.markFailedFromWebhook(cycleId, mpPayment);
        }
        return { status: mpPayment.status };
      }
      if (paymentId.startsWith('review_tip:')) {
        const reviewId = paymentId.replace('review_tip:', '');
        await auditByReference(PAYMENT_AUDIT_FLOW.TIP, PAYMENT_AUDIT_ENTITY.ORDER_REVIEW, reviewId);
        const tipStatus = String(mpPayment?.status || '').toLowerCase();
        const failedTipStatuses = new Set(['rejected', 'cancelled', 'charged_back', 'refunded', 'failed']);
        if (tipStatus === 'approved') {
          await this.orderReviewService.markTipPaidFromWebhook(reviewId, mpPayment);
        } else if (failedTipStatuses.has(tipStatus)) {
          await this.orderReviewService.markTipFailedFromWebhook(reviewId, mpPayment);
        } else {
          this.log.debug('Ignoring non-terminal Mercado Pago tip status', {
            reviewId,
            providerStatus: tipStatus,
            externalReference: paymentId,
          });
        }
        return { status: mpPayment.status };
      }
      if (paymentId.startsWith('featured_request:')) {
        const requestId = paymentId.replace('featured_request:', '');
        await auditByReference(PAYMENT_AUDIT_FLOW.FEATURED_REQUEST, PAYMENT_AUDIT_ENTITY.FEATURED_REQUEST, requestId);
        if (isMercadoPagoApprovedStatus(mpPayment.status)) {
          await this.featuredProductService.markPaidFromWebhook(requestId, mpPayment);
        } else if (isMercadoPagoFailedStatus(mpPayment.status)) {
          await this.featuredProductService.markFailedFromWebhook(requestId, mpPayment);
        } else if (isMercadoPagoPendingStatus(mpPayment.status)) {
          await this.featuredProductService.markPendingFromProvider(requestId, mpPayment);
        }
        return { status: mpPayment.status };
      }
      if (paymentId.startsWith('destination_promo:')) {
        const promoId = paymentId.replace('destination_promo:', '');
        await auditByReference(PAYMENT_AUDIT_FLOW.DESTINATION_PROMO, PAYMENT_AUDIT_ENTITY.DESTINATION_PROMO, promoId);
        if (isMercadoPagoApprovedStatus(mpPayment.status)) {
          await this.destinationPromotionService.markPaidFromWebhook(promoId, mpPayment);
        } else if (isMercadoPagoFailedStatus(mpPayment.status)) {
          await this.destinationPromotionService.markFailedFromWebhook(promoId, mpPayment);
        } else if (isMercadoPagoPendingStatus(mpPayment.status)) {
          await this.destinationPromotionService.markPendingFromProvider(promoId, mpPayment);
        }
        return { status: mpPayment.status };
      }
      if (paymentId.startsWith('order_payment:')) {
        const orderPaymentId = paymentId.replace('order_payment:', '');
        await auditByReference(PAYMENT_AUDIT_FLOW.ORDER, PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT, orderPaymentId);
        if (isMercadoPagoApprovedStatus(mpPayment.status)) {
          await this.orderPaymentService.markPaidFromWebhook(orderPaymentId, mpPayment);
        } else if (isMercadoPagoFailedStatus(mpPayment.status)) {
          await this.orderPaymentService.markFailedFromWebhook(orderPaymentId, mpPayment);
        }
        return { status: mpPayment.status };
      }
      await auditByReference(PAYMENT_AUDIT_FLOW.SUBSCRIPTION, PAYMENT_AUDIT_ENTITY.PAYMENT, paymentId);
      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          payment: { id: paymentId } as any,
          provider: 'MERCADO_PAGO',
          status: mpPayment.status || 'unknown',
          payload: mpPayment as any,
        })
      );

      const paymentRepo = AppDataSource.getRepository(Payment);
      const payment = await paymentRepo.findOne({ where: { id: paymentId } });
      if (payment) {
        const qrCode = mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64;
        const paymentLink = mpPayment?.transaction_details?.external_resource_url;
        const providerId = mpPayment?.id ? String(mpPayment.id) : null;

        let hasChanges = false;
        if (payment.provider !== 'MERCADO_PAGO') {
          payment.provider = 'MERCADO_PAGO';
          hasChanges = true;
        }
        if (providerId && !payment.providerId) {
          payment.providerId = providerId;
          hasChanges = true;
        }
        if (qrCode && !payment.qrCodeBase64) {
          payment.qrCodeBase64 = this.normalizeQrCode(qrCode);
          hasChanges = true;
        }
        if (paymentLink && !payment.paymentLink) {
          payment.paymentLink = paymentLink;
          hasChanges = true;
        }
        if (hasChanges) {
          await paymentRepo.save(payment);
        }
      }
    }

    if (mpPayment.status !== 'approved') {
      if (mpPayment.external_reference) {
        await this.updatePaymentStatus(String(mpPayment.external_reference), mpPayment.status);
        await this.paymentAuditService.record({
          provider: 'MERCADO_PAGO',
          flowType: PAYMENT_AUDIT_FLOW.SUBSCRIPTION,
          eventStage: PAYMENT_AUDIT_STAGE.STATUS_APPLIED,
          entityType: PAYMENT_AUDIT_ENTITY.PAYMENT,
          entityId: String(mpPayment.external_reference),
          externalReference: String(mpPayment.external_reference),
          providerPaymentId: mpPayment?.id ? String(mpPayment.id) : null,
          providerStatus: mpPayment?.status || null,
          providerStatusDetail: mpPayment?.status_detail || null,
          responsePayload: {
            localPaymentStatus: 'FAILED',
          },
          success: false,
        });
      }
      return { status: mpPayment.status };
    }

    const internalId = mpPayment.external_reference;
    if (!internalId) {
      throw new AppError('GEN-002', 400);
    }

    const confirmed = await this.confirmPayment(String(internalId));
    await this.paymentAuditService.record({
      provider: 'MERCADO_PAGO',
      flowType: PAYMENT_AUDIT_FLOW.SUBSCRIPTION,
      eventStage: PAYMENT_AUDIT_STAGE.STATUS_APPLIED,
      entityType: PAYMENT_AUDIT_ENTITY.PAYMENT,
      entityId: String(internalId),
      storeId: confirmed?.store?.id || null,
      externalReference: String(internalId),
      providerPaymentId: mpPayment?.id ? String(mpPayment.id) : null,
      providerStatus: mpPayment?.status || null,
      providerStatusDetail: mpPayment?.status_detail || null,
      responsePayload: {
        localPaymentStatus: confirmed?.status || 'PAID',
        subscriptionStatus: confirmed?.subscription?.status || null,
      },
      success: true,
    });
    return confirmed;
  }

  /**
   * Adds days.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Retrieves payment by ID with related entities for diagnostics.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async findById(paymentId: string) {
    const paymentRepo = AppDataSource.getRepository(Payment);
    return paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['store', 'user', 'subscription', 'subscription.plan'],
    });
  }
}
