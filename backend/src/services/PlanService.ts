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

<<<<<<< HEAD
const DEFAULT_PLANS: Array<Pick<Plan, 'name' | 'displayName' | 'price' | 'durationDays' | 'enabled'>> = [
  { name: 'basic_monthly', displayName: 'Plano Basico Mensal', price: 39.9, durationDays: 30, enabled: true },
  { name: 'pro_monthly', displayName: 'Plano Pro Mensal', price: 79.9, durationDays: 30, enabled: true },
  { name: 'premium_monthly', displayName: 'Plano Premium Mensal', price: 149.9, durationDays: 30, enabled: true },
  { name: 'basic_yearly', displayName: 'Plano Basico Anual', price: 359.1, durationDays: 365, enabled: true },
  { name: 'pro_yearly', displayName: 'Plano Pro Anual', price: 719.1, durationDays: 365, enabled: true },
  { name: 'premium_yearly', displayName: 'Plano Premium Anual', price: 1349.1, durationDays: 365, enabled: true },
];

=======
const BASIC_MONTHLY_DEFAULT = 49.9;
const PRO_MONTHLY_DEFAULT = 79.9;
const YEARLY_DISCOUNT = 0.15;

const round2 = (value: number) => Math.round(value * 100) / 100;

const yearlyFull = (monthly: number) => round2(monthly * 12);
const yearlyPromo = (monthly: number) => round2(monthly * 12 * (1 - YEARLY_DISCOUNT));

const MONTHLY_SEEDS: Array<Pick<Plan, 'name' | 'displayName' | 'price' | 'promoPrice' | 'durationDays' | 'enabled'>> = [
  { name: 'basic_monthly', displayName: 'Basic Mensal', price: BASIC_MONTHLY_DEFAULT, promoPrice: null, durationDays: 30, enabled: true },
  { name: 'pro_monthly', displayName: 'Pro Mensal', price: PRO_MONTHLY_DEFAULT, promoPrice: null, durationDays: 30, enabled: true },
];

const DISABLED_PLANS: PlanName[] = ['premium_monthly', 'premium_yearly'];

>>>>>>> main
const LEGACY_PLANS: PlanName[] = ['monthly', 'yearly'];
/**
 * Provides PlanService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PlanService {
  private planRepository = new PlanRepository();
<<<<<<< HEAD
=======

  private resolveMonthlyPrice(byName: Map<string, Plan>, planName: 'basic_monthly' | 'pro_monthly', fallback: number) {
    const existing = byName.get(planName);
    const value = Number((existing as any)?.price);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
>>>>>>> main
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

<<<<<<< HEAD
    for (const seed of DEFAULT_PLANS) {
=======
    // 1) Guarantee monthly plans exist, but NEVER overwrite monthly DB prices.
    for (const seed of MONTHLY_SEEDS) {
>>>>>>> main
      const planExists = byName.get(seed.name);
      if (!planExists) {
        const plan = this.planRepository.create(seed as Plan);
        await this.planRepository.save(plan);
<<<<<<< HEAD
=======
        byName.set(seed.name, plan);
      } else {
        const needsMetaUpdate =
          planExists.displayName !== seed.displayName ||
          planExists.durationDays !== seed.durationDays ||
          planExists.enabled !== seed.enabled;

        if (needsMetaUpdate) {
          planExists.displayName = seed.displayName;
          planExists.durationDays = seed.durationDays;
          planExists.enabled = seed.enabled;
          await this.planRepository.save(planExists);
        }
      }
    }

    // 2) Yearly is derived from current monthly DB prices (single source of truth).
    const basicMonthly = this.resolveMonthlyPrice(byName, 'basic_monthly', BASIC_MONTHLY_DEFAULT);
    const proMonthly = this.resolveMonthlyPrice(byName, 'pro_monthly', PRO_MONTHLY_DEFAULT);
    const yearlySeeds: Array<Pick<Plan, 'name' | 'displayName' | 'price' | 'promoPrice' | 'durationDays' | 'enabled'>> = [
      {
        name: 'basic_yearly',
        displayName: 'Basic Anual',
        price: yearlyFull(basicMonthly),
        promoPrice: yearlyPromo(basicMonthly),
        durationDays: 365,
        enabled: true,
      },
      {
        name: 'pro_yearly',
        displayName: 'Pro Anual',
        price: yearlyFull(proMonthly),
        promoPrice: yearlyPromo(proMonthly),
        durationDays: 365,
        enabled: true,
      },
    ];

    for (const seed of yearlySeeds) {
      const planExists = byName.get(seed.name);
      if (!planExists) {
        const plan = this.planRepository.create(seed as Plan);
        await this.planRepository.save(plan);
        byName.set(seed.name, plan);
        continue;
      }

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
>>>>>>> main
      }
    }

    return this.planRepository.findEnabled();
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> main
