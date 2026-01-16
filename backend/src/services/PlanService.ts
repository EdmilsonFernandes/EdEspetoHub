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

const DEFAULT_PLANS: Array<Pick<Plan, 'name' | 'displayName' | 'price' | 'durationDays' | 'enabled'>> = [
  { name: 'basic_monthly', displayName: 'Plano Basico Mensal', price: 39.9, durationDays: 30, enabled: true },
  { name: 'pro_monthly', displayName: 'Plano Pro Mensal', price: 79.9, durationDays: 30, enabled: true },
  { name: 'premium_monthly', displayName: 'Plano Premium Mensal', price: 149.9, durationDays: 30, enabled: true },
  { name: 'basic_yearly', displayName: 'Plano Basico Anual', price: 359.1, durationDays: 365, enabled: true },
  { name: 'pro_yearly', displayName: 'Plano Pro Anual', price: 719.1, durationDays: 365, enabled: true },
  { name: 'premium_yearly', displayName: 'Plano Premium Anual', price: 1349.1, durationDays: 365, enabled: true },
];

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
      }
    }

    return this.planRepository.findEnabled();
  }
}