import { Plan } from '../entities/Plan';

export const FOUNDER_PLAN_PREFIX = 'founder_';

// Apenas os planos regulares de venda pública têm variante fundador.
const FOUNDER_ELIGIBLE_PLAN_NAMES = ['basic_monthly', 'pro_monthly', 'basic_yearly', 'pro_yearly'];

export const FOUNDER_BASIC_MONTHLY_DEFAULT = 69.9;
export const FOUNDER_PRO_MONTHLY_DEFAULT = 119.9;

export const FOUNDER_MONTHLY_SEEDS: Array<
  Pick<Plan, 'name' | 'displayName' | 'price' | 'promoPrice' | 'durationDays' | 'enabled'>
> = [
  {
    name: 'founder_basic_monthly',
    displayName: 'Basic Mensal Fundador',
    price: FOUNDER_BASIC_MONTHLY_DEFAULT,
    promoPrice: null,
    durationDays: 30,
    enabled: true,
  },
  {
    name: 'founder_pro_monthly',
    displayName: 'Pro Mensal Fundador',
    price: FOUNDER_PRO_MONTHLY_DEFAULT,
    promoPrice: null,
    durationDays: 30,
    enabled: true,
  },
];

export const isFounderPlanName = (name?: string | null): boolean =>
  typeof name === 'string' && name.startsWith(FOUNDER_PLAN_PREFIX);

/**
 * Nome da variante fundador de um plano regular (idempotente: já-fundador devolve o próprio nome).
 * Retorna null para nomes fora do catálogo regular (ex.: 'monthly' legado, 'vip' sintético).
 */
export const toFounderPlanName = (name?: string | null): string | null => {
  if (!name) return null;
  if (isFounderPlanName(name)) return name;
  return FOUNDER_ELIGIBLE_PLAN_NAMES.includes(name) ? `${FOUNDER_PLAN_PREFIX}${name}` : null;
};

/**
 * Nome regular equivalente a um plano fundador ('founder_pro_monthly' -> 'pro_monthly').
 * Nomes não-fundador voltam inalterados.
 */
export const fromFounderPlanName = (name?: string | null): string | null => {
  if (!name) return null;
  return isFounderPlanName(name) ? name.slice(FOUNDER_PLAN_PREFIX.length) : name;
};

/**
 * Loja fundadora = attribution persistida no signup (vitalícia, sobrevive ao esgotamento da campanha).
 * Nunca confundir com getSignupPromotionStatus().applies (estado da campanha no momento).
 */
export const isFounderStore = (store?: { settings?: any } | null): boolean => {
  const attribution = store?.settings?.acquisitionAttribution;
  return Boolean(
    attribution &&
      typeof attribution === 'object' &&
      (attribution as any).founderVipPromotion?.applied === true
  );
};
