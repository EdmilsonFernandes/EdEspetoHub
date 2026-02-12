export interface ProductModifierOption {
  id: string;
  name: string;
  price: number;
  active?: boolean;
}

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeId = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizePrice = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Number(numeric.toFixed(2));
};

export const normalizeProductModifiers = (value: unknown): ProductModifierOption[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: ProductModifierOption[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index] as any;
    const name = normalizeText(raw?.name);
    const price = normalizePrice(raw?.price);
    if (!name || price === null) continue;
    const fallbackId = normalizeId(`${name}-${index + 1}`);
    const id = normalizeId(raw?.id) || fallbackId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      name,
      price,
      active: raw?.active !== false,
    });
  }
  return list;
};

export const normalizeSelectedModifiers = (
  selected: unknown,
  available?: ProductModifierOption[] | null
): ProductModifierOption[] => {
  const base = normalizeProductModifiers(selected);
  if (!available || available.length === 0) return base;
  const activeById = new Map<string, ProductModifierOption>();
  for (const option of available) {
    if (option.active === false) continue;
    activeById.set(option.id, option);
  }
  const unique = new Set<string>();
  const result: ProductModifierOption[] = [];
  for (const item of base) {
    const match = activeById.get(item.id);
    if (!match || unique.has(match.id)) continue;
    unique.add(match.id);
    result.push({
      id: match.id,
      name: match.name,
      price: match.price,
      active: true,
    });
  }
  return result;
};

export const getModifiersTotal = (selected: unknown) =>
  normalizeProductModifiers(selected).reduce((sum, item) => sum + Number(item.price || 0), 0);

export const getModifiersSignature = (selected: unknown) => {
  const list = normalizeProductModifiers(selected)
    .map((item) => `${item.id}:${Number(item.price || 0).toFixed(2)}`)
    .sort();
  return list.join('|');
};

export const formatSelectedModifiers = (selected: unknown) =>
  normalizeProductModifiers(selected).map((item) => item.name);
