let adminDashboardPromise: Promise<any> | null = null;
let adminQueuePromise: Promise<any> | null = null;
let adminOrdersPromise: Promise<any> | null = null;
let adminHighlightsPromise: Promise<any> | null = null;
let storePagePromise: Promise<any> | null = null;

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

export const prefetchAdminLandingRoutes = () => {
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches;

  if (isMobile) {
    void loadStorePage().catch(() => undefined);
    void loadAdminQueuePage().catch(() => undefined);
    warmAdminProductCatalog();
    return;
  }

  void loadAdminDashboardPage().catch(() => undefined);
  void loadAdminQueuePage().catch(() => undefined);
  void loadAdminOrdersPage().catch(() => undefined);
  warmAdminProductCatalog();
};

export const scheduleAdminRoutePrefetch = () => {
  if (typeof window === 'undefined') return () => undefined;
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
