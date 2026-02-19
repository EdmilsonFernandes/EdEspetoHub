export type PlanTier = 'basic' | 'pro' | 'vip';

export type PlanFeatureKey =
  | 'motoboyManagement'
  | 'tipPayouts'
  | 'advancedDashboard';

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

const FEATURES_BY_TIER: Record<PlanTier, PlanFeatures> = {
  basic: {
    motoboyManagement: false,
    tipPayouts: false,
    advancedDashboard: false,
  },
  pro: {
    motoboyManagement: true,
    tipPayouts: true,
    advancedDashboard: true,
  },
  vip: {
    motoboyManagement: true,
    tipPayouts: true,
    advancedDashboard: true,
  },
};

const normalize = (value?: string | null) => String(value || '').trim().toLowerCase();

export const resolvePlanTier = (planName?: string | null, planExempt?: boolean): PlanTier => {
  if (planExempt) return 'vip';
  const normalized = normalize(planName);
  if (!normalized) return 'basic';
  if (normalized.includes('pro')) return 'pro';
  if (normalized.includes('vip')) return 'vip';
  return 'basic';
};

export const resolvePlanFeatures = (params: {
  planName?: string | null;
  planExempt?: boolean;
}): PlanFeatures => {
  const tier = resolvePlanTier(params.planName, params.planExempt);
  return FEATURES_BY_TIER[tier];
};

