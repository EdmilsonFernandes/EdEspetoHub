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

import { MoreThanOrEqual } from 'typeorm';
import { PlanRepository } from '../repositories/PlanRepository';
import { Plan, PlanName } from '../entities/Plan';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { Store } from '../entities/Store';
import { SettingsService } from './SettingsService';
import { resolveFounderVipPromotion } from '../utils/founderVipPromotion';
import {
  FOUNDER_BASIC_MONTHLY_DEFAULT,
  FOUNDER_MONTHLY_SEEDS,
  FOUNDER_PRO_MONTHLY_DEFAULT,
  isFounderPlanName,
  isFounderStore,
} from '../utils/founderPlans';

const BASIC_MONTHLY_DEFAULT = 89.9;
const PRO_MONTHLY_DEFAULT = 149.9;
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
  private settingsService = new SettingsService();

    /**
   * Executes resolve monthly price business logic.
   *
   * @author Edmilson Lopes
   */
private resolveMonthlyPrice(byName: Map<string, Plan>, planName: PlanName, fallback: number) {
    const existing = byName.get(planName);
    const value = Number((existing as any)?.price);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  /**
   * Lists enabled plans públicos (variantes fundador ficam fora da listagem geral).
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async listEnabled() {
    await this.ensureSeededPlans();
    const plans = await this.planRepository.findEnabled();
    return plans.filter((plan) => !isFounderPlanName(plan.name));
  }

  /**
   * Planos visíveis para uma loja específica: loja fundadora enxerga também as
   * variantes fundador (preço vitalício travado) além da tabela pública.
   */
  async listForStore(storeId: string) {
    await this.ensureSeededPlans();
    const plans = await this.planRepository.findEnabled();
    const store = await AppDataSource.getRepository(Store).findOne({
      where: { id: storeId },
      relations: ['settings'],
    });
    const founder = isFounderStore(store);
    return {
      founder,
      plans: plans.filter((plan) => !isFounderPlanName(plan.name)),
      founderPlans: founder ? plans.filter((plan) => isFounderPlanName(plan.name)) : [],
    };
  }

  /**
   * Contagem de lojas válida para a campanha fundador: quando founder_vip_count_from
   * está definido, conta apenas lojas criadas a partir da ativação (as lojas pré-campanha
   * não ocupam vaga nem recebem a condição).
   */
  async countCampaignStores() {
    const countFromRaw = await this.settingsService.getValue('founder_vip_count_from');
    const repo = AppDataSource.getRepository(Store);
    if (countFromRaw) {
      const countFrom = new Date(String(countFromRaw));
      if (!Number.isNaN(countFrom.getTime())) {
        return repo.count({ where: { createdAt: MoreThanOrEqual(countFrom) } });
      }
    }
    return repo.count();
  }

  async getSignupPromotionStatus() {
    const [enabledValue, limitValue, daysValue, labelValue, fallbackTrialDays, existingStoresCount] = await Promise.all([
      this.settingsService.getValue('founder_vip_enabled'),
      this.settingsService.getValue('founder_vip_store_limit'),
      this.settingsService.getValue('founder_vip_days'),
      this.settingsService.getValue('founder_vip_label'),
      this.settingsService.getNumber('trial_days', env.trialDays),
      this.countCampaignStores(),
    ]);
    const promotion = resolveFounderVipPromotion({
      enabledValue,
      limitValue,
      daysValue,
      labelValue,
      existingStoresCount,
      fallbackTrialDays,
    });
    const used = Math.min(existingStoresCount, promotion.limit);
    const remaining = promotion.enabled ? Math.max(0, promotion.limit - existingStoresCount) : 0;

    return {
      enabled: promotion.enabled,
      applies: promotion.applies,
      limit: promotion.limit,
      used,
      remaining,
      promoDays: promotion.promoDays,
      trialDays: promotion.trialDays,
      fallbackTrialDays,
      label: promotion.label,
      nextPosition: promotion.position,
    };
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
    // Variantes fundador seguem a mesma regra: preço vitalício definido uma vez, nunca regravado.
    for (const seed of [...MONTHLY_SEEDS, ...FOUNDER_MONTHLY_SEEDS]) {
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
    const founderBasicMonthly = this.resolveMonthlyPrice(byName, 'founder_basic_monthly', FOUNDER_BASIC_MONTHLY_DEFAULT);
    const founderProMonthly = this.resolveMonthlyPrice(byName, 'founder_pro_monthly', FOUNDER_PRO_MONTHLY_DEFAULT);
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
      {
        name: 'founder_basic_yearly',
        displayName: 'Basic Anual Fundador',
        price: yearlyFull(founderBasicMonthly),
        promoPrice: yearlyPromo(founderBasicMonthly),
        durationDays: 365,
        enabled: true,
      },
      {
        name: 'founder_pro_yearly',
        displayName: 'Pro Anual Fundador',
        price: yearlyFull(founderProMonthly),
        promoPrice: yearlyPromo(founderProMonthly),
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
