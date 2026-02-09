export const PLAN_TIERS = [
  {
    key: 'basic',
    label: '🥩 Plano Basic',
    features: ['Site ativo', 'Pedidos ilimitados', 'Suporte básico'],
  },
  {
    key: 'pro',
    label: '🔥 Plano Pro',
    features: ['Tudo do plano basic', 'Prioridade no suporte', 'Selo "Plano Pro" no admin'],
    popular: true,
  },
];

export const BILLING_OPTIONS = {
  monthly: {
    label: 'Mensal',
    period: '/mês',
    priceByTier: {
      basic: 49.9,
      pro: 79.9,
    },
  },
  yearly: {
    label: 'Anual',
    period: '/ano',
    savings: 'Economize 15%',
    priceByTier: {
      basic: 598.8,
      pro: 958.8,
    },
  },
};

export const getPlanName = (tierKey: string, billing: 'monthly' | 'yearly') =>
  `${tierKey}_${billing}`;

export const YEARLY_DISCOUNT_RATE = 0.15;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const resolveAnnualPromoTotal = (annualFull: number) =>
  round2(Number(annualFull || 0) * (1 - YEARLY_DISCOUNT_RATE));

export const resolveMonthlyEquivalent = (annualTotal: number) =>
  round2(Number(annualTotal || 0) / 12);
