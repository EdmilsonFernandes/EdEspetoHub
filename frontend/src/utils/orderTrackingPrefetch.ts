import { orderService } from '../services/orderService';

let orderTrackingPagePromise: Promise<any> | null = null;

const normalizeOrderId = (orderId?: string | number | null) => String(orderId || '').trim();

export const loadOrderTrackingPage = () => {
  if (!orderTrackingPagePromise) {
    orderTrackingPagePromise = import('../pages/OrderTracking');
  }
  return orderTrackingPagePromise;
};

export const buildOrderTrackingPath = (orderId?: string | number | null, accessToken?: string | null) => {
  const normalizedOrderId = normalizeOrderId(orderId);
  if (!normalizedOrderId) return '/pedido';
  const normalizedToken = String(accessToken || '').trim();
  return normalizedToken
    ? `/pedido/${normalizedOrderId}?ot=${encodeURIComponent(normalizedToken)}`
    : `/pedido/${normalizedOrderId}`;
};

export const primeOrderTrackingNavigation = (orderId?: string | number | null, accessToken?: string | null) => {
  const normalizedOrderId = normalizeOrderId(orderId);
  if (!normalizedOrderId) return;

  const normalizedToken = String(accessToken || '').trim();
  if (normalizedToken && typeof window !== 'undefined') {
    localStorage.setItem(`orderAccess:${normalizedOrderId}`, normalizedToken);
  }

  void loadOrderTrackingPage();
  void orderService.prefetchPublicById(normalizedOrderId).catch(() => undefined);
};
