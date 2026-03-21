export const PLAN_TIERS = [
  {
    key: 'basic',
    label: '🥩 Plano Basic',
<<<<<<< HEAD
    features: ['Site ativo', 'Pedidos ilimitados', 'Suporte básico'],
=======
    features: [
      'Site e vitrine online',
      'Pedidos ilimitados',
      'Retirada no balcão',
      'Sem entregas e gorjetas',
      'Suporte padrão',
    ],
>>>>>>> main
  },
  {
    key: 'pro',
    label: '🔥 Plano Pro',
<<<<<<< HEAD
    features: ['Tudo do plano basic', 'Prioridade no suporte', 'Selo "Plano Pro" no admin'],
=======
    features: [
      'Tudo do Basic',
      'Retirada no balcão',
      'Gestão de entregadores',
      'Repasse de gorjetas',
      'Suporte prioritário',
    ],
>>>>>>> main
    popular: true,
  },
];

export const BILLING_OPTIONS = {
  monthly: {
    label: 'Mensal',
    period: '/mês',
    priceByTier: {
<<<<<<< HEAD
      basic: 39.9,
=======
      basic: 49.9,
>>>>>>> main
      pro: 79.9,
    },
  },
  yearly: {
    label: 'Anual',
<<<<<<< HEAD
    period: '/ano (R$ 29,93/mês)',
    savings: 'Economize 25%',
    priceByTier: {
      basic: 359.1,
      pro: 719.1,
=======
    period: '/ano',
    savings: 'Economize 15%',
    priceByTier: {
      basic: 598.8,
      pro: 958.8,
>>>>>>> main
    },
  },
};

export const getPlanName = (tierKey: string, billing: 'monthly' | 'yearly') =>
  `${tierKey}_${billing}`;
<<<<<<< HEAD
=======

export const YEARLY_DISCOUNT_RATE = 0.15;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const resolveAnnualPromoTotal = (annualFull: number) =>
  round2(Number(annualFull || 0) * (1 - YEARLY_DISCOUNT_RATE));

export const resolveMonthlyEquivalent = (annualTotal: number) =>
  round2(Number(annualTotal || 0) / 12);
>>>>>>> main
