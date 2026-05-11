import { slugify } from './slugify';

export const DESTINATION_PARTNER_TYPES = [ 'HOSPITALITY', 'SERVICE_PROVIDER' ] as const;
export const HOSPITALITY_PLACE_TYPES = [ 'CHALE', 'POUSADA', 'HOTEL', 'CABANA', 'CASA_TEMPORADA', 'OUTRO' ] as const;
export const DESTINATION_LISTING_CATEGORIES = [
  'PASSEIO',
  'MASSAGEM',
  'RESTAURANTE_VISITAR',
  'NOITE',
  'ATRATIVO',
  'SERVICO',
  'LOJA',
] as const;

export type DestinationPartnerType = (typeof DESTINATION_PARTNER_TYPES)[number];
export type HospitalityPlaceType = (typeof HOSPITALITY_PLACE_TYPES)[number];
export type DestinationListingCategory = (typeof DESTINATION_LISTING_CATEGORIES)[number];

const normalizeToken = (value?: string | null) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeDestinationSlug = (value?: string | null) => slugify(String(value || '').trim());

export const normalizeDestinationPartnerType = (value?: string | null): DestinationPartnerType => {
  const normalized = normalizeToken(value);
  return DESTINATION_PARTNER_TYPES.includes(normalized as DestinationPartnerType)
    ? (normalized as DestinationPartnerType)
    : 'HOSPITALITY';
};

export const normalizeHospitalityPlaceType = (value?: string | null): HospitalityPlaceType => {
  const normalized = normalizeToken(value);
  return HOSPITALITY_PLACE_TYPES.includes(normalized as HospitalityPlaceType)
    ? (normalized as HospitalityPlaceType)
    : 'CHALE';
};

export const normalizeDestinationListingCategory = (value?: string | null): DestinationListingCategory => {
  const normalized = normalizeToken(value);
  return DESTINATION_LISTING_CATEGORIES.includes(normalized as DestinationListingCategory)
    ? (normalized as DestinationListingCategory)
    : 'SERVICO';
};

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const toOptionalText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};
