const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getOrderItemQuantity = (item: any) => Math.max(1, Number(item?.quantity ?? item?.qty ?? 1));

export const getOrderItemLineTotal = (item: any) => {
  const explicitLineTotal = toFiniteNumber(item?.lineTotal ?? item?.line_total);
  if (explicitLineTotal !== null && explicitLineTotal >= 0) return explicitLineTotal;

  const quantity = getOrderItemQuantity(item);
  const explicitUnitPrice = toFiniteNumber(item?.unitPrice ?? item?.unit_price);
  if (explicitUnitPrice !== null && explicitUnitPrice >= 0) {
    return explicitUnitPrice * quantity;
  }

  const rawPrice = toFiniteNumber(item?.price);
  if (rawPrice === null) return 0;

  const comparableUnitPrices = [
    item?.promoPrice,
    item?.product?.promoPrice,
    item?.originalPrice,
    item?.product?.price,
  ]
    .map((value) => toFiniteNumber(value))
    .filter((value): value is number => value !== null);

  if (quantity > 1 && comparableUnitPrices.some((unitPrice) => Math.abs(rawPrice - unitPrice) < 0.0001)) {
    return rawPrice * quantity;
  }

  return rawPrice;
};

export const getOrderItemOriginalLineTotal = (item: any) => {
  const explicitOriginalLineTotal = toFiniteNumber(item?.originalLineTotal ?? item?.original_line_total);
  if (explicitOriginalLineTotal !== null && explicitOriginalLineTotal >= 0) return explicitOriginalLineTotal;

  const originalUnitPrice = toFiniteNumber(item?.originalPrice ?? item?.product?.price);
  if (originalUnitPrice === null || originalUnitPrice < 0) return null;

  return originalUnitPrice * getOrderItemQuantity(item);
};
