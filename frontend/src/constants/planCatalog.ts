export const PLAN_TIERS = [
  {
    key: 'basic',
    label: '🥩 Plano Basic',
    features: [
      'Site e vitrine online',
      'Pedidos ilimitados',
      'Retirada no balcão',
      'Sem entregador próprio',
      'Sem push promocional e destaques',
      'Suporte padrão',
    ],
  },
  {
    key: 'pro',
    label: '🔥 Plano Pro',
    features: [
      'Tudo do Basic',
      'Retirada no balcão',
      'Gestão de entregadores',
      'Push promocional',
      'Destaques de produtos',
      'Repasse de gorjetas',
      'Suporte prioritário',
    ],
    popular: true,
  },
];

export const BILLING_OPTIONS = {
  monthly: {
    label: 'Mensal',
    period: '/mês',
    priceByTier: {
      basic: 69.9,
      pro: 119.9,
    },
  },
  yearly: {
    label: 'Anual',
    period: '/ano',
    savings: 'Economize 15%',
    priceByTier: {
      basic: 838.8,
      pro: 1438.8,
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
