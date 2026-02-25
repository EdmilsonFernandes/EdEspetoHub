import { getModifiersTotal } from "./productModifiers";

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveSaleBaseUnit = (item: any) => {
  const promoActive = Boolean(item?.promoActive);
  const promoPrice = toNumber(item?.promoPrice, 0);
  const regularPrice = toNumber(item?.originalPrice ?? item?.price, 0);
  if (promoActive && promoPrice > 0) return promoPrice;
  return regularPrice;
};

export const getBundleDiscountForCartItem = (item: any) => {
  if (!item) return 0;
  const bundleActive = Boolean(item?.bundlePromoActive);
  const bundleQty = Math.floor(toNumber(item?.bundlePromoQty, 0));
  const bundlePrice = toNumber(item?.bundlePromoPrice, 0);
  const qty = Math.max(0, Math.floor(toNumber(item?.qty, 0)));
  if (!bundleActive || bundleQty < 2 || bundlePrice <= 0 || qty < bundleQty) return 0;

  const baseUnit = resolveSaleBaseUnit(item);
  if (baseUnit <= 0) return 0;

  const groups = Math.floor(qty / bundleQty);
  if (groups <= 0) return 0;

  const regularGroupPrice = baseUnit * bundleQty;
  const discountPerGroup = Math.max(0, regularGroupPrice - bundlePrice);
  if (discountPerGroup <= 0) return 0;

  const modifiersTotal = getModifiersTotal(item?.selectedModifiers || []);
  const lineSubtotal = (baseUnit + modifiersTotal) * qty;
  const grossDiscount = discountPerGroup * groups;
  const safeDiscount = Math.min(grossDiscount, lineSubtotal);

  return Number(safeDiscount.toFixed(2));
};

export const getCartPricing = (cart: Record<string, any>) => {
  const items = Object.values(cart || {});
  const subtotal = items.reduce((acc, item: any) => acc + toNumber(item?.price, 0) * toNumber(item?.qty, 0), 0);
  const discountTotal = items.reduce((acc, item: any) => acc + getBundleDiscountForCartItem(item), 0);
  const discountedSubtotal = Math.max(0, subtotal - discountTotal);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    discountedSubtotal: Number(discountedSubtotal.toFixed(2)),
  };
};

