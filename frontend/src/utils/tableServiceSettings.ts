export const TABLE_SERVICE_CATEGORY = 'Atendimento na mesa';

export type TableServiceSettings = {
  couvertEnabled: boolean;
  couvertLabel: string;
  couvertPrice: number;
  serviceChargeEnabled: boolean;
  serviceChargeLabel: string;
  serviceChargePercent: number;
};

export const DEFAULT_TABLE_SERVICE_SETTINGS: TableServiceSettings = {
  couvertEnabled: false,
  couvertLabel: 'Couvert artístico',
  couvertPrice: 0,
  serviceChargeEnabled: false,
  serviceChargeLabel: 'Taxa de serviço',
  serviceChargePercent: 10,
};

const normalizeLabel = (value: unknown, fallback: string) => {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
};

export const parseCurrencyValue = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Number(parsed.toFixed(2)));
};

export const parsePercentValue = (value: unknown, fallback = 10) => {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(30, Math.max(0, Number(parsed.toFixed(2))));
};

export const normalizeTableServiceSettings = (value: unknown): TableServiceSettings => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    couvertEnabled: Boolean(source.couvertEnabled),
    couvertLabel: normalizeLabel(source.couvertLabel, DEFAULT_TABLE_SERVICE_SETTINGS.couvertLabel),
    couvertPrice: parseCurrencyValue(source.couvertPrice),
    serviceChargeEnabled: Boolean(source.serviceChargeEnabled),
    serviceChargeLabel: normalizeLabel(source.serviceChargeLabel, DEFAULT_TABLE_SERVICE_SETTINGS.serviceChargeLabel),
    serviceChargePercent: parsePercentValue(
      source.serviceChargePercent,
      DEFAULT_TABLE_SERVICE_SETTINGS.serviceChargePercent
    ),
  };
};

export const roundCurrency = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
};

export const normalizeTableText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const isTableServiceCategory = (value: unknown) =>
  normalizeTableText(value) === normalizeTableText(TABLE_SERVICE_CATEGORY);

export const calculateTableServiceCharge = (
  items: unknown[],
  percent: number,
  isTableServiceItem: (item: any) => boolean
) => {
  const subtotal = (Array.isArray(items) ? items : []).reduce<number>((sum, item: any) => {
    if (isTableServiceItem(item)) return sum;
    const qty = Math.max(0, Number(item?.qty ?? item?.quantity ?? 0));
    const unit = Number(
      item?.unitPrice ??
        (item?.price && qty ? Number(item.price) / qty : undefined) ??
        item?.price ??
        0
    );
    if (!Number.isFinite(unit) || qty <= 0) return sum;
    return sum + unit * qty;
  }, 0);

  return {
    subtotal: roundCurrency(subtotal),
    amount: roundCurrency(subtotal * (parsePercentValue(percent, 0) / 100)),
  };
};
