import { PlanRepository } from '../repositories/PlanRepository';
import { Plan, PlanName } from '../entities/Plan';

const DEFAULT_PRICES: Record<PlanName, number> = {
  monthly: 49.9,
  yearly: 499,
};

const DEFAULT_DURATIONS: Record<PlanName, number> = {
  monthly: 30,
  yearly: 365,
};

export class PlanService {
  private planRepository = new PlanRepository();

  async listEnabled() {
    await this.ensureSeededPlans();
    return this.planRepository.findEnabled();
  }

  async ensureSeededPlans() {
    const existing = await this.planRepository.findAll();
    if (existing.length >= 2) return existing;

    const plansToEnsure: PlanName[] = ['monthly', 'yearly'];
    for (const name of plansToEnsure) {
      const planExists = await this.planRepository.findByName(name);
      if (!planExists) {
        const plan = this.planRepository.create({
          name,
          price: DEFAULT_PRICES[name],
          durationDays: DEFAULT_DURATIONS[name],
          enabled: true,
        } as Plan);
        await this.planRepository.save(plan);
      }
    }

    return this.planRepository.findEnabled();
  }
}
