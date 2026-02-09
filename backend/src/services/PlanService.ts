/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PlanService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { PlanRepository } from '../repositories/PlanRepository';
import { Plan, PlanName } from '../entities/Plan';

const BASIC_MONTHLY = 49.9;
const PRO_MONTHLY = 79.9;
const YEARLY_DISCOUNT = 0.25;

const round2 = (value: number) => Math.round(value * 100) / 100;

const yearlyFull = (monthly: number) => round2(monthly * 12);
const yearlyPromo = (monthly: number) => round2(monthly * 12 * (1 - YEARLY_DISCOUNT));

const DEFAULT_PLANS: Array<Pick<Plan, 'name' | 'displayName' | 'price' | 'promoPrice' | 'durationDays' | 'enabled'>> = [
  { name: 'basic_monthly', displayName: 'Basic Mensal', price: BASIC_MONTHLY, promoPrice: null, durationDays: 30, enabled: true },
  { name: 'pro_monthly', displayName: 'Pro Mensal', price: PRO_MONTHLY, promoPrice: null, durationDays: 30, enabled: true },
  // No plano anual o valor cheio = mensal * 12 e o promo_price = -25%.
  { name: 'basic_yearly', displayName: 'Basic Anual', price: yearlyFull(BASIC_MONTHLY), promoPrice: yearlyPromo(BASIC_MONTHLY), durationDays: 365, enabled: true },
  { name: 'pro_yearly', displayName: 'Pro Anual', price: yearlyFull(PRO_MONTHLY), promoPrice: yearlyPromo(PRO_MONTHLY), durationDays: 365, enabled: true },
];

const DISABLED_PLANS: PlanName[] = ['premium_monthly', 'premium_yearly'];

const LEGACY_PLANS: PlanName[] = ['monthly', 'yearly'];
/**
 * Provides PlanService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PlanService {
  private planRepository = new PlanRepository();
  /**
   * Lists enabled.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async listEnabled() {
    await this.ensureSeededPlans();
    return this.planRepository.findEnabled();
  }

  /**
   * Ensures seeded plans.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async ensureSeededPlans() {
    const existing = await this.planRepository.findAll();
    /**
     * Handles by name.
     *
     * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
     * @date 2025-12-17
     */
    const byName = new Map(existing.map((plan) => [plan.name, plan]));

    for (const seed of DEFAULT_PLANS) {
      const planExists = byName.get(seed.name);
      if (!planExists) {
        const plan = this.planRepository.create(seed as Plan);
        await this.planRepository.save(plan);
        continue;
      }

      // Keep plans consistent across rebuilds/deploys (business rule).
      const nextPrice = Number(seed.price) || 0;
      const nextPromo = seed.promoPrice == null ? null : Number(seed.promoPrice) || null;

      const currentPrice = Number((planExists as any).price) || 0;
      const currentPromoRaw = (planExists as any).promoPrice ?? null;
      const currentPromo = currentPromoRaw == null ? null : Number(currentPromoRaw) || null;

      const needsUpdate =
        planExists.displayName !== seed.displayName ||
        currentPrice !== nextPrice ||
        currentPromo !== nextPromo ||
        planExists.durationDays !== seed.durationDays ||
        planExists.enabled !== seed.enabled;

      if (needsUpdate) {
        planExists.displayName = seed.displayName;
        (planExists as any).price = nextPrice;
        (planExists as any).promoPrice = nextPromo;
        planExists.durationDays = seed.durationDays;
        planExists.enabled = seed.enabled;
        await this.planRepository.save(planExists);
      }
    }

    // Disable deprecated plans (we keep rows to avoid breaking foreign keys).
    for (const name of DISABLED_PLANS) {
      const existingPlan = byName.get(name);
      if (existingPlan && existingPlan.enabled) {
        existingPlan.enabled = false;
        await this.planRepository.save(existingPlan);
      }
    }

    return this.planRepository.findEnabled();
  }
}
