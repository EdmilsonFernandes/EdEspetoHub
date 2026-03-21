export type PlanTier = 'basic' | 'pro' | 'vip';

export type PlanFeatureKey =
  | 'motoboyManagement'
  | 'tipPayouts'
  | 'advancedDashboard'
  | 'pickupMode'
  | 'deliveryMode';

export type PlanFeatures = Record<PlanFeatureKey, boolean>;
export type SubscriptionStatusLike =
  | 'TRIAL'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | string
  | null
  | undefined;

const FEATURES_BY_TIER: Record<PlanTier, PlanFeatures> = {
  basic: {
    motoboyManagement: false,
    tipPayouts: false,
    advancedDashboard: false,
    pickupMode: true,
    deliveryMode: false,
  },
  pro: {
    motoboyManagement: true,
    tipPayouts: true,
    advancedDashboard: true,
    pickupMode: true,
    deliveryMode: true,
  },
  vip: {
    motoboyManagement: true,
    tipPayouts: true,
    advancedDashboard: true,
    pickupMode: true,
    deliveryMode: true,
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
  subscriptionStatus?: SubscriptionStatusLike;
}): PlanFeatures => {
  const status = normalize(params.subscriptionStatus).toUpperCase();
  if (status === 'TRIAL') {
    return FEATURES_BY_TIER.pro;
  }
  const tier = resolvePlanTier(params.planName, params.planExempt);
  return FEATURES_BY_TIER[tier];
};
