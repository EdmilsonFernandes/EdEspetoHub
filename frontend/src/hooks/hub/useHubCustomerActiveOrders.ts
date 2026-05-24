import { useCallback, useEffect, useRef, useState } from 'react';
import { customerAccountService } from '../../services/customerAccountService';

const ACTIVE_ORDER_ALERT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const hasCustomerSession = () => {
  try {
    const raw = localStorage.getItem('customerSession');
    const parsed = JSON.parse(raw || 'null');
    return Boolean(parsed?.token);
  } catch {
    return false;
  }
};

export function useHubCustomerActiveOrders(isCustomerLogged: boolean) {
  const activeOrdersLoadInFlightRef = useRef(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  const loadActiveOrders = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (activeOrdersLoadInFlightRef.current) return;
    if (!hasCustomerSession()) {
      setActiveOrders([]);
      return;
    }

    activeOrdersLoadInFlightRef.current = true;
    try {
      const result = await customerAccountService.listOrders({ limit: 20 });
      const active = result?.data || [];
      setActiveOrders(
        active
          .filter((order: any) => {
            const status = String(order.status || '').toLowerCase();
            const createdAt = new Date(order?.createdAt || 0).getTime();
            const isRecentEnough = Number.isFinite(createdAt)
              ? Date.now() - createdAt < ACTIVE_ORDER_ALERT_MAX_AGE_MS
              : true;
            return isRecentEnough && !['done', 'delivered', 'finished', 'cancelled', 'rejected'].includes(status);
          })
          .slice(0, 3)
      );
    } catch {
      // keep current state on transient failures
    } finally {
      activeOrdersLoadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isCustomerLogged) {
      setActiveOrders([]);
      return;
    }

    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadActiveOrders();
    };

    const timer = window.setTimeout(refreshIfVisible, 1200);
    const interval = window.setInterval(refreshIfVisible, 10000);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('jnc:app-foreground', refreshIfVisible as EventListener);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('jnc:app-foreground', refreshIfVisible as EventListener);
    };
  }, [isCustomerLogged, loadActiveOrders]);

  return activeOrders;
}
