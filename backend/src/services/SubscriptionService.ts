/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: SubscriptionService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { CreateSubscriptionDto } from '../dto/CreateSubscriptionDto';
import { RenewSubscriptionDto } from '../dto/RenewSubscriptionDto';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { PlanRepository } from '../repositories/PlanRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { env } from '../config/env';
import { EmailService } from './EmailService';
import { AppDataSource } from '../config/database';
import { PaymentService } from './PaymentService';
import { PaymentMethod } from '../entities/Payment';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

/**
 * Represents SubscriptionService.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class SubscriptionService {
  private planRepository = new PlanRepository();
  private storeRepository = new StoreRepository();
  private subscriptionRepository = new SubscriptionRepository();
  private emailService = new EmailService();
  private paymentService = new PaymentService();
  private paymentRepository = new PaymentRepository();
  private log = logger.child({ scope: 'SubscriptionService' });

  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async create(input: CreateSubscriptionDto) {
    this.log.info('Create subscription', { storeId: input.storeId, planId: input.planId });
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new AppError('STORE-001', 404);

    const plan = await this.planRepository.findById(input.planId);
    const resolvedPlan = plan || (await this.planRepository.findAll()).find((p) => p.id === input.planId);
    if (!resolvedPlan) throw new AppError('SUB-003', 400);

    if (!resolvedPlan.enabled) {
      throw new AppError('SUB-004', 400);
    }

    const now = input.startDate || new Date();
    const endDate = input.endDate || this.addDays(now, resolvedPlan.durationDays);

    const subscription = this.subscriptionRepository.create({
      store,
      plan: resolvedPlan,
      startDate: now,
      endDate,
      status: input.status || 'ACTIVE',
      autoRenew: input.autoRenew ?? false,
    } as Subscription);

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Gets current by store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async getCurrentByStore(storeId: string) {
    const subscription = await this.subscriptionRepository.findLatestByStoreId(storeId);
    if (!subscription) return null;

    const status = this.resolveStatus(subscription);
    if (status !== subscription.status) {
      subscription.status = status;
      await this.subscriptionRepository.save(subscription);
    }

    const isActive = this.isSubscriptionActive(subscription);

    if (isActive && subscription.store && !subscription.store.open) {
      subscription.store.open = true;
      await this.storeRepository.save(subscription.store);
    }

    if (!isActive && subscription.store?.open) {
      subscription.store.open = false;
      await this.storeRepository.save(subscription.store);
    }

    return subscription;
  }

  /**
   * Gets current by store slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async getCurrentByStoreSlug(slug: string) {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) return null;
    return this.getCurrentByStore(store.id);
  }

  /**
   * Executes renew logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async renew(subscriptionId: string, input: RenewSubscriptionDto) {
    this.log.info('Renew subscription', { subscriptionId, planId: input.planId });
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new AppError('SUB-001', 404);

    if (subscription.status === 'SUSPENDED') {
      throw new AppError('SUB-005', 400);
    }

    let plan = subscription.plan;
    if (input.planId && input.planId !== subscription.plan.id) {
      const otherPlan = await this.planRepository.findById(input.planId);
      const resolved = otherPlan || (await this.planRepository.findAll()).find((p) => p.id === input.planId);
      if (!resolved || !resolved.enabled) throw new AppError('SUB-003', 400);
      plan = resolved;
    }

    const now = new Date();
    const baseDate = subscription.endDate > now ? subscription.endDate : now;
    subscription.startDate = now;
    subscription.endDate = this.addDays(baseDate, plan.durationDays);
    subscription.status = 'ACTIVE';
    subscription.autoRenew = input.autoRenew ?? subscription.autoRenew;
    subscription.plan = plan;
    subscription.reminderStage = 0;

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Creates renewal payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async createRenewalPayment(storeId: string, input: RenewSubscriptionDto, authStoreId?: string) {
    this.log.info('Create renewal payment', { storeId, planId: input.planId, paymentMethod: input.paymentMethod });
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (authStoreId && store.id !== authStoreId) throw new AppError('AUTH-003', 403);

    const now = new Date();
    const existingPending = await this.paymentRepository.findLatestPendingByStoreId(storeId);
    if (existingPending) {
      if (!existingPending.expiresAt || existingPending.expiresAt > now) {
        return existingPending;
      }
      existingPending.status = 'FAILED';
      await this.paymentRepository.save(existingPending);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.paymentRepository.countRecentByStoreId(storeId, since);
    if (recentCount >= 3) {
      throw new AppError('SUB-006', 429);
    }

    const plan = input.planId
      ? await this.planRepository.findById(input.planId)
      : null;
    const resolvedPlan =
      plan || (await this.planRepository.findAll()).find((p) => p.id === input.planId);
    if (!resolvedPlan || !resolvedPlan.enabled) throw new AppError('SUB-003', 400);

    const paymentMethod = (input.paymentMethod || 'PIX') as PaymentMethod;

    return AppDataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(Subscription);
      const subscription = subscriptionRepo.create({
        store,
        plan: resolvedPlan,
        startDate: now,
        endDate: now,
        status: 'PENDING',
        autoRenew: false,
        paymentMethod,
      } as Subscription);
      await subscriptionRepo.save(subscription);

      return this.paymentService.createPayment(manager, {
        user: store.owner,
        store,
        subscription,
        plan: resolvedPlan,
        method: paymentMethod,
      });
    });
  }

  /**
   * Updates statuses for all.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async updateStatusesForAll() {
    const subscriptions = await this.subscriptionRepository.findAll();
    const updates: Subscription[] = [];
    const pendingCutoff = new Date(Date.now() - env.pendingSignupTtlDays * 24 * 60 * 60 * 1000);

    for (const sub of subscriptions) {
      const endDate = new Date(sub.endDate);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (sub.status === 'PENDING' && sub.createdAt < pendingCutoff) {
        sub.status = 'CANCELLED';
        updates.push(sub);
        if (sub.store?.open) {
          sub.store.open = false;
          await this.storeRepository.save(sub.store);
        }
        continue;
      }

      const status = this.resolveStatus(sub);
      if (status !== sub.status) {
        sub.status = status;
        updates.push(sub);
      }
      if (!this.isSubscriptionActive(sub) && sub.store?.open) {
        sub.store.open = false;
        await this.storeRepository.save(sub.store);
      }

      if (sub.store?.owner?.email && sub.status !== 'PENDING' && sub.status !== 'CANCELLED' && sub.status !== 'SUSPENDED') {
        const nextStage =
          diffDays <= 0 ? 3 : diffDays <= 1 ? 2 : diffDays <= 3 ? 1 : 0;
        if (nextStage > 0 && sub.reminderStage < nextStage) {
          await this.emailService.sendSubscriptionReminder(
            sub.store.owner.email,
            sub.store.name,
            sub.store.slug,
            diffDays <= 0 ? 0 : diffDays
          );
          sub.reminderStage = nextStage;
          updates.push(sub);
        }
      }
    }

    if (updates.length) {
      await Promise.all(updates.map((s) => this.subscriptionRepository.save(s)));
      this.log.info('Subscription statuses updated', { total: updates.length });
    }

    return updates;
  }

  /**
   * Executes suspend logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async suspend(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new AppError('SUB-001', 404);
    subscription.status = 'SUSPENDED';
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Executes activate logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async activate(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new AppError('SUB-001', 404);
    subscription.status = this.resolveStatus(subscription);
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Executes assert store is active logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async assertStoreIsActive(storeId: string) {
    const subscription = await this.getCurrentByStore(storeId);
    return subscription ? this.isSubscriptionActive(subscription) : false;
  }

  /**
   * Executes is active subscription logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Checks active subscription.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  isActiveSubscription(subscription?: Subscription | null) {
    return subscription ? this.isSubscriptionActive(subscription) : false;
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
   * Resolves status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private resolveStatus(subscription: Subscription): SubscriptionStatus {
    if (subscription.status === 'PENDING') return 'PENDING';
    if (subscription.status === 'SUSPENDED') return 'SUSPENDED';
    if (subscription.status === 'CANCELLED') return 'CANCELLED';

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (now > endDate) return 'EXPIRED';

    if (subscription.status === 'TRIAL') return 'TRIAL';

    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 5) return 'EXPIRING';

    return 'ACTIVE';
  }

  /**
   * Executes is subscription active logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Checks subscription active.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private isSubscriptionActive(subscription: Subscription) {
    const now = new Date();
    /**
     * Executes return logic.
     *
     * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
     * @date 2025-12-17
     */
    return (
      new Date(subscription.endDate).getTime() >= now.getTime() &&
      subscription.status !== 'PENDING' &&
      subscription.status !== 'EXPIRED' &&
      subscription.status !== 'CANCELLED'
    );
  }
}
