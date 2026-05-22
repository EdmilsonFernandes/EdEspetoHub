const DEFAULT_LIMIT = 50;
const DEFAULT_DAYS = 90;
const DEFAULT_LABEL = 'Campanha fundador - 3 meses de acesso VIP';

const parseBoolean = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'sim', 'on', 'enabled', 'ativo'].includes(normalized);
};

const parsePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export type FounderVipPromotionInput = {
  enabledValue?: string | null;
  limitValue?: string | null;
  daysValue?: string | null;
  labelValue?: string | null;
  existingStoresCount: number;
  fallbackTrialDays: number;
};

export const resolveFounderVipPromotion = (input: FounderVipPromotionInput) => {
  const enabled = parseBoolean(input.enabledValue);
  const limit = parsePositiveInteger(input.limitValue, DEFAULT_LIMIT);
  const promoDays = parsePositiveInteger(input.daysValue, DEFAULT_DAYS);
  const fallbackTrialDays = parsePositiveInteger(input.fallbackTrialDays, 7);
  const existingStoresCount = Math.max(0, Math.floor(Number(input.existingStoresCount) || 0));
  const applies = enabled && existingStoresCount < limit;
  const label = String(input.labelValue || '').trim() || DEFAULT_LABEL;

  return {
    enabled,
    applies,
    limit,
    promoDays,
    trialDays: applies ? promoDays : fallbackTrialDays,
    label,
    position: existingStoresCount + 1,
  };
};
