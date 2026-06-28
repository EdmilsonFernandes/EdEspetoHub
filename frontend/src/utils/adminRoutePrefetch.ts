let adminDashboardPromise: Promise<any> | null = null;
let adminQueuePromise: Promise<any> | null = null;
let adminOrdersPromise: Promise<any> | null = null;
let adminHighlightsPromise: Promise<any> | null = null;
let storePagePromise: Promise<any> | null = null;

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

export const loadAdminDashboardPage = () => {
  adminDashboardPromise ||= import('../pages/AdminDashboard');
  return adminDashboardPromise;
};

export const loadAdminQueuePage = () => {
  adminQueuePromise ||= import('../pages/AdminQueue');
  return adminQueuePromise;
};

export const loadAdminOrdersPage = () => {
  adminOrdersPromise ||= import('../pages/AdminOrders');
  return adminOrdersPromise;
};

export const loadAdminHighlightsPage = () => {
  adminHighlightsPromise ||= import('../pages/AdminHighlights');
  return adminHighlightsPromise;
};

export const loadStorePage = () => {
  storePagePromise ||= import('../pages/StorePage');
  return storePagePromise;
};

const warmAdminProductCatalog = () => {
  void import('../services/productService')
    .then(({ productService }) => productService.list())
    .catch(() => undefined);
};

const shouldAvoidAdminPrefetch = () => {
  if (typeof window === 'undefined') return true;

  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (connection?.saveData) return true;
  if (connection?.effectiveType && ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) return true;

  return window.matchMedia('(max-width: 767px)').matches;
};

export const prefetchAdminLandingRoutes = () => {
  if (shouldAvoidAdminPrefetch()) return;
  void loadAdminDashboardPage().catch(() => undefined);
  void loadAdminQueuePage().catch(() => undefined);
  void loadAdminOrdersPage().catch(() => undefined);
  warmAdminProductCatalog();
};

export const scheduleAdminRoutePrefetch = () => {
  if (typeof window === 'undefined') return () => undefined;
  if (shouldAvoidAdminPrefetch()) return () => undefined;
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.requestIdleCallback === 'function') {
    const handle = win.requestIdleCallback(prefetchAdminLandingRoutes, { timeout: 1200 });
    return () => win.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(prefetchAdminLandingRoutes, 450);
  return () => window.clearTimeout(handle);
};
