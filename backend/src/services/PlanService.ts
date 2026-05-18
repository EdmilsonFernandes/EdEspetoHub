/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: PlanService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { PlanRepository } from '../repositories/PlanRepository';
import { Plan, PlanName } from '../entities/Plan';

const BASIC_MONTHLY_DEFAULT = 69.9;
const PRO_MONTHLY_DEFAULT = 119.9;
const YEARLY_DISCOUNT = 0.15;

const round2 = (value: number) => Math.round(value * 100) / 100;

const yearlyFull = (monthly: number) => round2(monthly * 12);
const yearlyPromo = (monthly: number) => round2(monthly * 12 * (1 - YEARLY_DISCOUNT));

const MONTHLY_SEEDS: Array<Pick<Plan, 'name' | 'displayName' | 'price' | 'promoPrice' | 'durationDays' | 'enabled'>> = [
  { name: 'basic_monthly', displayName: 'Basic Mensal', price: BASIC_MONTHLY_DEFAULT, promoPrice: null, durationDays: 30, enabled: true },
  { name: 'pro_monthly', displayName: 'Pro Mensal', price: PRO_MONTHLY_DEFAULT, promoPrice: null, durationDays: 30, enabled: true },
];

const DISABLED_PLANS: PlanName[] = ['premium_monthly', 'premium_yearly'];

const LEGACY_PLANS: PlanName[] = ['monthly', 'yearly'];
/**
 * Provides PlanService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class PlanService {
  private planRepository = new PlanRepository();

    /**
   * Executes resolve monthly price business logic.
   *
   * @author Edmilson Lopes
   */
private resolveMonthlyPrice(byName: Map<string, Plan>, planName: 'basic_monthly' | 'pro_monthly', fallback: number) {
    const existing = byName.get(planName);
    const value = Number((existing as any)?.price);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  /**
   * Lists enabled.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async listEnabled() {
    await this.ensureSeededPlans();
    return this.planRepository.findEnabled();
  }

  /**
   * Ensures seeded plans.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async ensureSeededPlans() {
    const existing = await this.planRepository.findAll();
    /**
     * Handles by name.
     *
     * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
     * @date 2025-12-17
     */
    const byName = new Map(existing.map((plan) => [plan.name, plan]));

    // 1) Guarantee monthly plans exist, but NEVER overwrite monthly DB prices.
    for (const seed of MONTHLY_SEEDS) {
      const planExists = byName.get(seed.name);
      if (!planExists) {
        const plan = this.planRepository.create(seed as Plan);
        await this.planRepository.save(plan);
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
      }
    }

    return this.planRepository.findEnabled();
  }
}
