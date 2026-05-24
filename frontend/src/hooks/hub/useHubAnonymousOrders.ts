import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { orderService } from '../../services/orderService';
import { primeOrderTrackingNavigation } from '../../utils/orderTrackingPrefetch';

export type HubActiveAnonymousOrder = {
  id: string;
  storeSlug: string;
  createdAt: number;
  status?: string;
  storeName?: string;
  accessToken?: string;
  type?: string;
  paymentStatus?: string;
};

const DISMISSED_ANONYMOUS_ORDERS_KEY = 'hub:dismissed-anonymous-orders';
const ORDER_EXPIRATION_MS = 3 * 60 * 60 * 1000;

const readDismissedAnonymousOrderIds = () => {
  try {
    const raw =
      localStorage.getItem(DISMISSED_ANONYMOUS_ORDERS_KEY) ||
      sessionStorage.getItem(DISMISSED_ANONYMOUS_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const isTerminalRecentOrder = (entry?: {
  status?: string;
  paymentStatus?: string;
}) => {
  const status = String(entry?.status || '').trim().toLowerCase();
  const paymentStatus = String(entry?.paymentStatus || '').trim().toUpperCase();
  if (['done', 'delivered', 'finished', 'cancelled', 'rejected'].includes(status)) return true;
  if (!status && paymentStatus === 'PAID') return true;
  if (paymentStatus === 'PAID' && ['ready', 'dispatched'].includes(status)) return true;
  return false;
};

const clearAnonymousOrderCache = (orderIds: string[]) => {
  const ids = orderIds.map((item) => String(item || '').trim()).filter(Boolean);
  if (!ids.length) return;

  try {
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith('lastOrders:')) return;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.filter((entry) => !ids.includes(String(entry?.id || '').trim()));
      if (next.length > 0) {
        localStorage.setItem(key, JSON.stringify(next));
      } else {
        localStorage.removeItem(key);
      }
    });
    ids.forEach((id) => localStorage.removeItem(`orderAccess:${id}`));
    ids.forEach((id) => sessionStorage.removeItem(`orderAccess:${id}`));
  } catch {
    // ignore storage failures
  }
};

export function useHubAnonymousOrders(isCustomerLogged: boolean) {
  const anonymousOrdersHydrationInFlightRef = useRef(false);
  const [activeAnonymousOrders, setActiveAnonymousOrders] = useState<HubActiveAnonymousOrder[]>([]);
  const [dismissedAnonymousOrderIds, setDismissedAnonymousOrderIds] = useState<string[]>(
    readDismissedAnonymousOrderIds
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateOrders = async () => {
      if (anonymousOrdersHydrationInFlightRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      anonymousOrdersHydrationInFlightRef.current = true;
      const now = Date.now();
      const found: HubActiveAnonymousOrder[] = [];

      try {
        Object.keys(localStorage).forEach((key) => {
          if (!key.startsWith('lastOrders:')) return;
          const slug = key.replace('lastOrders:', '');
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return;

          parsed.forEach((order) => {
            const createdAt = Number(order.createdAt || 0);
            if (!createdAt || now - createdAt >= ORDER_EXPIRATION_MS) return;

            const orderId = String(order?.id || '').trim();
            if (!orderId) return;
            const persistedAccessToken = String(
              order?.accessToken || localStorage.getItem(`orderAccess:${orderId}`) || ''
            ).trim();

            found.push({
              id: orderId,
              storeSlug: slug,
              createdAt,
              status: order?.status ? String(order.status) : undefined,
              accessToken: persistedAccessToken || undefined,
              type: order?.type ? String(order.type) : undefined,
              paymentStatus: order?.paymentStatus ? String(order.paymentStatus) : undefined,
            });
          });
        });

        const checked = await Promise.all(
          found
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
            .map(async (entry) => {
              try {
                const data = await orderService.getPublicById(entry.id);
                return {
                  ...entry,
                  status: String(data?.status || entry.status || '').trim() || undefined,
                  type: String(data?.type || entry.type || '').trim() || undefined,
                  paymentStatus: String(data?.paymentStatus || entry.paymentStatus || '').trim() || undefined,
                };
              } catch {
                return entry;
              }
            })
        );

        const active = checked.filter((entry) => !isTerminalRecentOrder(entry));
        if (!cancelled) setActiveAnonymousOrders(active);
      } catch (error) {
        console.error('Erro ao carregar pedidos anônimos', error);
      } finally {
        anonymousOrdersHydrationInFlightRef.current = false;
      }
    };

    void hydrateOrders();
    const interval = window.setInterval(() => {
      void hydrateOrders();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(dismissedAnonymousOrderIds));
      sessionStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(dismissedAnonymousOrderIds));
    } catch {
      // ignore storage failures
    }
  }, [dismissedAnonymousOrderIds]);

  const visibleActiveAnonymousOrders = useMemo(
    () => activeAnonymousOrders.filter((order) => !dismissedAnonymousOrderIds.includes(String(order?.id || '').trim())),
    [activeAnonymousOrders, dismissedAnonymousOrderIds]
  );

  const dismissVisibleAnonymousOrders = useCallback(() => {
    const ids = visibleActiveAnonymousOrders.map((order) => String(order?.id || '').trim()).filter(Boolean);
    const next = Array.from(new Set([...dismissedAnonymousOrderIds, ...ids]));
    try {
      localStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(next));
      sessionStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
    setDismissedAnonymousOrderIds(next);
    clearAnonymousOrderCache(ids);
    setActiveAnonymousOrders([]);
  }, [dismissedAnonymousOrderIds, visibleActiveAnonymousOrders]);

  useEffect(() => {
    const nextOrder = visibleActiveAnonymousOrders[0];
    if (!isCustomerLogged && nextOrder?.id) {
      primeOrderTrackingNavigation(nextOrder.id, nextOrder.accessToken);
    }
  }, [isCustomerLogged, visibleActiveAnonymousOrders]);

  useEffect(() => {
    if (isCustomerLogged) setActiveAnonymousOrders([]);
  }, [isCustomerLogged]);

  return {
    visibleActiveAnonymousOrders,
    dismissVisibleAnonymousOrders,
  };
}
