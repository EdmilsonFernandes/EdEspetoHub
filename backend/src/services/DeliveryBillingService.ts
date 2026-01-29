/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: DeliveryBillingService.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
import { DeliveryBillingCharge } from '../entities/DeliveryBillingCharge';
import { DeliveryBillingCycle } from '../entities/DeliveryBillingCycle';
import { Order } from '../entities/Order';
import { SettingsService } from './SettingsService';
import { StoreRepository } from '../repositories/StoreRepository';
import { MercadoPagoService } from './MercadoPagoService';
import { logger } from '../utils/logger';

type BillingConfig = {
  feeRate: number;
  minFee: number;
  cycleDays: number;
  penaltyDailyRate: number;
  penaltyCapRate: number;
};

/**
 * Provides DeliveryBillingService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class DeliveryBillingService {
  private settingsService = new SettingsService();
  private storeRepository = new StoreRepository();
  private mpService = new MercadoPagoService();
  private log = logger.child({ scope: 'DeliveryBillingService' });

  private async getConfig(): Promise<BillingConfig> {
    return {
      feeRate: await this.settingsService.getNumber('delivery_fee_rate', 0.03),
      minFee: await this.settingsService.getNumber('delivery_min_fee', 0.5),
      cycleDays: await this.settingsService.getNumber('delivery_cycle_days', 30),
      penaltyDailyRate: await this.settingsService.getNumber('delivery_penalty_daily_rate', 0.04),
      penaltyCapRate: await this.settingsService.getNumber('delivery_penalty_cap_rate', 1),
    };
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private calculatePenalty(subtotal: number, overdueDays: number, cfg: BillingConfig) {
    if (overdueDays <= 0 || subtotal <= 0) return 0;
    const raw = subtotal * cfg.penaltyDailyRate * overdueDays;
    const cap = subtotal * cfg.penaltyCapRate;
    return Math.min(raw, cap);
  }

  private async getOpenCycle(storeId: string) {
    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    return repo.findOne({ where: { storeId, status: 'OPEN' }, order: { createdAt: 'DESC' } });
  }

  private async createCycle(storeId: string, cfg: BillingConfig, now: Date) {
    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    const cycle = repo.create({
      storeId,
      status: 'OPEN',
      startDate: now,
      endDate: this.addDays(now, cfg.cycleDays),
      feeRate: cfg.feeRate,
      minFee: cfg.minFee,
      cycleDays: cfg.cycleDays,
      penaltyDailyRate: cfg.penaltyDailyRate,
      penaltyCapRate: cfg.penaltyCapRate,
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING',
      subtotal: 0,
      totalDue: 0,
      penaltyAmount: 0,
      deliveryCount: 0,
    });
    return repo.save(cycle);
  }

  private async closeCycleIfNeeded(cycle: DeliveryBillingCycle, now: Date) {
    if (cycle.status !== 'OPEN') return cycle;
    if (now <= cycle.endDate) return cycle;
    cycle.status = 'PENDING_PAYMENT';
    cycle.closedAt = now;
    cycle = await this.updatePenalty(cycle, now);
    return this.ensurePayment(cycle);
  }

  private async updatePenalty(cycle: DeliveryBillingCycle, now: Date) {
    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    const cfg = await this.getConfig();
    const overdueDays = Math.floor((now.getTime() - cycle.endDate.getTime()) / (24 * 60 * 60 * 1000));
    const penalty = this.calculatePenalty(Number(cycle.subtotal), overdueDays, cfg);
    cycle.penaltyAmount = Number(penalty.toFixed(2));
    cycle.totalDue = Number((Number(cycle.subtotal) + cycle.penaltyAmount).toFixed(2));
    if (overdueDays > 0 && cycle.status !== 'PAID') {
      cycle.status = 'OVERDUE';
    }
    return repo.save(cycle);
  }

  private async ensurePayment(cycle: DeliveryBillingCycle) {
    if (cycle.paymentStatus === 'PAID') return cycle;
    if (cycle.paymentLink || cycle.qrCodeText || cycle.providerId) return cycle;

    const store = await this.storeRepository.findByIdWithOwner(cycle.storeId);
    if (!store || !store.owner?.email) return cycle;

    const amount = Number(cycle.totalDue || cycle.subtotal || 0);
    if (amount <= 0) return cycle;

    const mpPayment = await this.mpService.createPayment({
      amount,
      method: 'PIX',
      description: `Taxa de entregas - ${store.name}`,
      externalReference: `delivery_cycle:${cycle.id}`,
      payer: {
        email: store.owner.email,
        name: store.owner.fullName || store.name,
      },
    });

    if (mpPayment) {
      const rawExpires =
        'expiresAt' in mpPayment ? mpPayment.expiresAt || null : null;
      const expiresAt =
        typeof rawExpires === 'string'
          ? new Date(rawExpires)
          : rawExpires instanceof Date
          ? rawExpires
          : null;
      cycle.provider = 'MERCADO_PAGO';
      cycle.providerId = mpPayment.providerId || null;
      cycle.paymentLink = mpPayment.paymentLink || null;
      cycle.qrCodeBase64 = mpPayment.qrCodeBase64 || null;
      cycle.qrCodeText = mpPayment.qrCodeText || null;
      cycle.expiresAt = expiresAt;
    }

    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    return repo.save(cycle);
  }

  async recordDelivery(order: Order) {
    if (!order || order.type !== 'delivery') return;

    const cfg = await this.getConfig();
    const now = new Date();
    const deliveryFee = Number(order.deliveryFee || 0);
    const chargeAmount = Math.max(deliveryFee * cfg.feeRate, cfg.minFee);

    await AppDataSource.transaction(async (manager) => {
      const cycleRepo = manager.getRepository(DeliveryBillingCycle);
      const chargeRepo = manager.getRepository(DeliveryBillingCharge);

      let cycle = await cycleRepo.findOne({ where: { storeId: order.store.id, status: 'OPEN' }, order: { createdAt: 'DESC' } });
      if (!cycle || now > cycle.endDate) {
        if (cycle) {
          cycle.status = 'PENDING_PAYMENT';
          cycle.closedAt = now;
          cycle = await cycleRepo.save(cycle);
        }
        cycle = await this.createCycle(order.store.id, cfg, now);
      }

      const existing = await chargeRepo.findOne({ where: { orderId: order.id } });
      if (existing) return;

      const charge = chargeRepo.create({
        cycleId: cycle.id,
        orderId: order.id,
        deliveryFee,
        chargeAmount: Number(chargeAmount.toFixed(2)),
      });
      await chargeRepo.save(charge);

      cycle.deliveryCount = Number(cycle.deliveryCount || 0) + 1;
      cycle.subtotal = Number((Number(cycle.subtotal || 0) + charge.chargeAmount).toFixed(2));
      cycle.totalDue = Number((Number(cycle.subtotal) + Number(cycle.penaltyAmount || 0)).toFixed(2));
      await cycleRepo.save(cycle);
    });

    const openCycle = await this.getOpenCycle(order.store.id);
    if (openCycle) {
      await this.closeCycleIfNeeded(openCycle, now);
    }
  }

  async getCurrentCycle(storeId: string) {
    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    return repo.findOne({ where: { storeId }, order: { createdAt: 'DESC' } });
  }

  async ensurePaymentForCycle(storeId: string) {
    const cycle = await this.getCurrentCycle(storeId);
    if (!cycle) return null;
    const now = new Date();
    if (now > cycle.endDate && cycle.status === 'OPEN') {
      await this.closeCycleIfNeeded(cycle, now);
    }
    if (cycle.status !== 'PAID') {
      await this.updatePenalty(cycle, now);
    }
    const updated = await this.getCurrentCycle(storeId);
    if (!updated) return null;
    return this.ensurePayment(updated);
  }

  async markPaidFromWebhook(cycleId: string, mpPayment: any) {
    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    const cycle = await repo.findOne({ where: { id: cycleId } });
    if (!cycle) return null;
    cycle.paymentStatus = 'PAID';
    cycle.status = 'PAID';
    cycle.paidAt = new Date();
    cycle.provider = 'MERCADO_PAGO';
    cycle.providerId = mpPayment?.id ? String(mpPayment.id) : cycle.providerId;
    return repo.save(cycle);
  }

  async markFailedFromWebhook(cycleId: string, mpPayment: any) {
    const repo = AppDataSource.getRepository(DeliveryBillingCycle);
    const cycle = await repo.findOne({ where: { id: cycleId } });
    if (!cycle) return null;
    cycle.paymentStatus = 'FAILED';
    cycle.status = 'OVERDUE';
    cycle.provider = 'MERCADO_PAGO';
    cycle.providerId = mpPayment?.id ? String(mpPayment.id) : cycle.providerId;
    return repo.save(cycle);
  }

  async isStoreBlocked(storeId: string) {
    const cycle = await this.getCurrentCycle(storeId);
    if (!cycle) return false;
    const now = new Date();
    if (cycle.status === 'PAID') return false;
    if (now <= cycle.endDate) return false;
    await this.updatePenalty(cycle, now);
    const refreshed = await this.getCurrentCycle(storeId);
    return Boolean(refreshed && refreshed.status !== 'PAID');
  }
}
