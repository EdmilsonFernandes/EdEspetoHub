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
      basic: 39.9,
      pro: 79.9,
    },
  },
  yearly: {
    label: 'Anual',
    period: '/ano (R$ 29,93/mês)',
    savings: 'Economize 25%',
    priceByTier: {
      basic: 359.1,
      pro: 719.1,
    },
  },
};

export const getPlanName = (tierKey: string, billing: 'monthly' | 'yearly') =>
  `${tierKey}_${billing}`;
