import { PlanRepository } from '../repositories/PlanRepository';
import { Plan, PlanName } from '../entities/Plan';

const DEFAULT_PLANS: Array<Pick<Plan, 'name' | 'price' | 'durationDays' | 'enabled'>> = [
  { name: 'basic_monthly', price: 39.9, durationDays: 30, enabled: true },
  { name: 'pro_monthly', price: 79.9, durationDays: 30, enabled: true },
  { name: 'premium_monthly', price: 149.9, durationDays: 30, enabled: true },
  { name: 'basic_yearly', price: 359.1, durationDays: 365, enabled: true },
  { name: 'pro_yearly', price: 719.1, durationDays: 365, enabled: true },
  { name: 'premium_yearly', price: 1349.1, durationDays: 365, enabled: true },
];

const LEGACY_PLANS: PlanName[] = ['monthly', 'yearly'];

export class PlanService {
  private planRepository = new PlanRepository();

  async listEnabled() {
    await this.ensureSeededPlans();
    return this.planRepository.findEnabled();
  }

  async ensureSeededPlans() {
    const existing = await this.planRepository.findAll();
    const byName = new Map(existing.map((plan) => [plan.name, plan]));

    for (const seed of DEFAULT_PLANS) {
      const planExists = byName.get(seed.name);
      if (!planExists) {
        const plan = this.planRepository.create(seed as Plan);
        await this.planRepository.save(plan);
      } else {
        const shouldUpdate =
          Number(planExists.price) !== seed.price ||
          planExists.durationDays !== seed.durationDays ||
          planExists.enabled !== seed.enabled;
        if (shouldUpdate) {
          await this.planRepository.save({ ...planExists, ...seed });
        }
      }
    }

    for (const legacy of LEGACY_PLANS) {
      const legacyPlan = byName.get(legacy);
      if (legacyPlan && legacyPlan.enabled) {
        await this.planRepository.save({ ...legacyPlan, enabled: false });
      }
    }

    return this.planRepository.findEnabled();
  }
}
