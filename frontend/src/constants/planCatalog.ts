export type PlanTierKey = 'basic' | 'pro';

export type PlanFeature = {
  label: string;
  benefit: string;
};

export type PlanTier = {
  key: PlanTierKey;
  label: string;
  features: PlanFeature[];
  popular?: boolean;
};

export const PLAN_TIERS: PlanTier[] = [
  {
    key: 'basic',
    label: '🥩 Plano Basic',
    features: [
      { label: 'Site e vitrine online', benefit: 'Sua loja com presença digital completa e profissional.' },
      { label: 'Pedidos ilimitados', benefit: 'Receba quantos pedidos quiser, sem limites ou taxas extras por pedido.' },
      { label: 'Retirada no balcão', benefit: 'Ofereça a opção de retirada e aumente a conveniência para seus clientes.' },
      { label: 'Sem entregador próprio', benefit: 'Ideal para quem faz entregas por conta própria ou atende presencialmente.' },
      { label: 'Sem push promocional e destaques', benefit: 'Recursos essenciais para começar a vender online e organizar seus pedidos.' },
      { label: 'Suporte padrão', benefit: 'Conte com nosso suporte para garantir o funcionamento básico da plataforma.' },
    ],
  },
  {
    key: 'pro',
    label: '🔥 Plano Pro',
    features: [
      { label: 'Tudo do Basic', benefit: 'Todos os benefícios do plano Basic, e muito mais funcionalidades para crescer!' },
      { label: 'Retirada no balcão', benefit: 'Mantenha a opção de retirada e flexibilize a entrega para seus clientes.' },
      { label: 'Gestão de entregadores', benefit: 'Controle total sobre sua equipe de entregas, otimizando rotas e tempo para maior eficiência.' },
      { label: 'Push promocional', benefit: 'Lance campanhas de marketing diretas e atraia mais clientes com notificações exclusivas.' },
      { label: 'Destaques de produtos', benefit: 'Coloque seus produtos mais populares ou em promoção em evidência para turbinar as vendas.' },
      { label: 'Repasse de gorjetas', benefit: 'Incentive e valorize sua equipe com o repasse transparente e automático de gorjetas.' },
      { label: 'Suporte prioritário', benefit: 'Atendimento rápido e dedicado para todas as suas necessidades, com prioridade máxima.' },
    ],
    popular: true,
  },
];

export const BILLING_OPTIONS = {
  monthly: {
    label: 'Mensal',
    period: '/mês',
    priceByTier: {
      basic: 89.9,
      pro: 149.9,
    },
  },
  yearly: {
    label: 'Anual',
    period: '/ano',
    savings: 'Economize 15%',
    priceByTier: {
      basic: 1078.8,
      pro: 1798.8,
    },
  },
};

// Condição Fundador (campanha 50 primeiras lojas): preço vitalício travado.
export const FOUNDER_PRICE_BY_TIER = {
  basic: 69.9,
  pro: 119.9,
} as const;

export const isFounderPlanName = (name?: string | null) =>
  typeof name === 'string' && name.startsWith('founder_');

export const toFounderPlanName = (tierKey: string, billing: 'monthly' | 'yearly') =>
  `founder_${getPlanName(tierKey, billing)}`;

export const getPlanName = (tierKey: string, billing: 'monthly' | 'yearly') =>
  `${tierKey}_${billing}`;

export const YEARLY_DISCOUNT_RATE = 0.15;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const resolveAnnualPromoTotal = (annualFull: number) =>
  round2(Number(annualFull || 0) * (1 - YEARLY_DISCOUNT_RATE));

export const resolveMonthlyEquivalent = (annualTotal: number) =>
  round2(Number(annualTotal || 0) / 12);

export const getPlanFeatureLabel = (feature: PlanFeature | string) =>
  typeof feature === 'string' ? feature : feature.label;

export const getPlanFeatureBenefit = (feature: PlanFeature | string) =>
  typeof feature === 'string' ? feature : feature.benefit;
