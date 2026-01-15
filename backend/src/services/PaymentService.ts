/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PaymentService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
import { env } from '../config/env';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { EmailService } from './EmailService';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

/**
 * Represents PaymentService.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PaymentService {
  private mercadoPago = new MercadoPagoService();
  private paymentEventRepository = new PaymentEventRepository();
  private emailService = new EmailService();
  private log = logger.child({ scope: 'PaymentService' });
  /**
   * Normalizes qr code.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private normalizeQrCode(qrCode?: string | null) {
    if (!qrCode) return null;
    if (qrCode.startsWith('data:image')) return qrCode;
    return `data:image/png;base64,${qrCode}`;
  }
  /**
   * Sends activation email.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private async sendActivationEmail(email: string, slug: string) {
    await this.emailService.sendActivationEmail(email, slug);
  }

  /**
   * Creates payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
        ? 'https://pay.chamanoespeto.com/boleto'
        : 'https://pay.chamanoespeto.com/checkout';
    const paymentLink =
      data.method === 'CREDIT_CARD' || data.method === 'BOLETO'
        ? `${mockLinkBase}/${data.subscription.id}`
        : null;

    let payment = paymentRepo.create({
      user: data.user,
      store: data.store,
      subscription: data.subscription,
      method: data.method,
      status: 'PENDING',
      amount: Number(data.plan.price),
      expiresAt,
      qrCodeBase64: null,
      qrCodeText: null,
      paymentLink,
      provider: 'MOCK',
    } as Payment);

    const chargeAmount = Number(data.plan.price);
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

    return payment;
  }

  /**
   * Executes confirm payment logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Executes confirm mercado pago payment logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async confirmMercadoPagoPayment(mercadoPagoPaymentId: string) {
    this.log.info('Confirm Mercado Pago payment', { mercadoPagoPaymentId });
    if (!env.mercadoPago.accessToken) {
      throw new AppError('PAY-003', 400);
    }

    const mpPayment = await this.mercadoPago.getPayment(mercadoPagoPaymentId);
    if (!mpPayment) {
      throw new AppError('PAY-004', 404);
    }

    return this.applyMercadoPagoStatus(mpPayment);
  }

  /**
   * Executes reprocess by payment id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async reprocessByPaymentId(paymentId: string, providerId?: string) {
    this.log.info('Reprocess payment', { paymentId, providerId });
    if (!env.mercadoPago.accessToken) {
      throw new AppError('PAY-003', 400);
    }

    const paymentRepo = AppDataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new AppError('PAY-001', 404);
    }

    const mpId = providerId || payment.providerId;
    if (!mpId) {
      throw new AppError('PAY-005', 400);
    }

    const mpPayment = await this.mercadoPago.getPayment(mpId);
    if (!mpPayment) {
      throw new AppError('PAY-004', 404);
    }

    return this.applyMercadoPagoStatus(mpPayment);
  }

  /**
   * Updates payment status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Executes apply mercado pago status logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private async applyMercadoPagoStatus(mpPayment: any) {
    if (mpPayment.external_reference) {
      const paymentId = String(mpPayment.external_reference);
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
      }
      return { status: mpPayment.status };
    }

    const internalId = mpPayment.external_reference;
    if (!internalId) {
      throw new AppError('GEN-002', 400);
    }

    return this.confirmPayment(String(internalId));
  }

  /**
   * Executes add days logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Executes find by id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
