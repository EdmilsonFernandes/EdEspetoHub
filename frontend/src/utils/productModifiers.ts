export interface ProductModifierOption {
  id: string;
  name: string;
  price: number;
  active?: boolean;
  quantity?: number;
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

const normalizeQuantity = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  const rounded = Math.floor(numeric);
  if (rounded < 1) return 1;
  if (rounded > 20) return 20;
  return rounded;
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
  if (!available || available.length === 0) {
    return (Array.isArray(selected) ? selected : base)
      .map((raw: any, index: number) => {
        const normalized = normalizeProductModifiers([raw])[0];
        if (!normalized) return null;
        return {
          ...normalized,
          id: normalized.id || `modifier-${index + 1}`,
          quantity: normalizeQuantity(raw?.quantity ?? raw?.qty ?? 1),
        };
      })
      .filter(Boolean) as ProductModifierOption[];
  }
  const activeById = new Map<string, ProductModifierOption>();
  for (const option of available) {
    if (option.active === false) continue;
    activeById.set(option.id, option);
  }
  const withQty = new Map<string, ProductModifierOption>();
  const result: ProductModifierOption[] = [];
  for (const item of Array.isArray(selected) ? selected : base) {
    const normalized = normalizeProductModifiers([item])[0];
    if (!normalized) continue;
    const qty = normalizeQuantity((item as any)?.quantity ?? (item as any)?.qty ?? 1);
    const match = activeById.get(normalized.id);
    const byName = !match
      ? Array.from(activeById.values()).find(
          (entry) => entry.name.trim().toLowerCase() === normalized.name.trim().toLowerCase()
        )
      : null;
    const resolved = match || byName;
    if (!resolved) continue;
    const current = withQty.get(resolved.id);
    withQty.set(resolved.id, {
      id: resolved.id,
      name: resolved.name,
      price: resolved.price,
      active: true,
      quantity: (current?.quantity || 0) + qty,
    });
  }
  withQty.forEach((entry) =>
    result.push({
      ...entry,
      quantity: normalizeQuantity(entry.quantity || 1),
    })
  );
  return result;
};

export const getModifiersTotal = (selected: unknown) =>
  normalizeSelectedModifiers(selected).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

export const getModifiersSignature = (selected: unknown) => {
  const list = normalizeSelectedModifiers(selected)
    .map((item) => `${item.id}:${Number(item.price || 0).toFixed(2)}:q${Number(item.quantity || 1)}`)
    .sort();
  return list.join('|');
};

export const formatSelectedModifiers = (selected: unknown) =>
  normalizeSelectedModifiers(selected).map((item) =>
    Number(item.quantity || 1) > 1 ? `${item.name} x${item.quantity}` : item.name
  );
