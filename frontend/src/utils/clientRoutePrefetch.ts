import { loadOrderTrackingPage } from './orderTrackingPrefetch';
import { loadStorePage } from './adminRoutePrefetch';

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

let marketplacePagePromise: Promise<any> | null = null;
let hubHighlightsPagePromise: Promise<any> | null = null;
let destinationsPagePromise: Promise<any> | null = null;
let destinationDetailPagePromise: Promise<any> | null = null;
let destinationPartnerRequestPagePromise: Promise<any> | null = null;
let destinationInviteRedirectPagePromise: Promise<any> | null = null;
let hospitalityPlacePagePromise: Promise<any> | null = null;
let hospitalityServiceRoutePagePromise: Promise<any> | null = null;
let clientAccountPagePromise: Promise<any> | null = null;
let clientOrdersPagePromise: Promise<any> | null = null;
let addressDistancePagePromise: Promise<any> | null = null;
let notificationsPagePromise: Promise<any> | null = null;

export const loadMarketplacePage = () => {
  marketplacePagePromise ||= import('../pages/MarketplacePage');
  return marketplacePagePromise;
};

export const loadHubHighlightsPage = () => {
  hubHighlightsPagePromise ||= import('../pages/HubHighlightsPage');
  return hubHighlightsPagePromise;
};

export const loadDestinationsPage = () => {
  destinationsPagePromise ||= import('../pages/DestinationsPage');
  return destinationsPagePromise;
};

export const loadDestinationDetailPage = () => {
  destinationDetailPagePromise ||= import('../pages/DestinationDetailPage');
  return destinationDetailPagePromise;
};

export const loadDestinationPartnerRequestPage = () => {
  destinationPartnerRequestPagePromise ||= import('../pages/DestinationPartnerRequestPage');
  return destinationPartnerRequestPagePromise;
};

export const loadDestinationInviteRedirectPage = () => {
  destinationInviteRedirectPagePromise ||= import('../pages/DestinationInviteRedirectPage');
  return destinationInviteRedirectPagePromise;
};

export const loadHospitalityPlacePage = () => {
  hospitalityPlacePagePromise ||= import('../pages/HospitalityPlacePage');
  return hospitalityPlacePagePromise;
};

export const loadHospitalityServiceRoutePage = () => {
  hospitalityServiceRoutePagePromise ||= import('../pages/HospitalityServiceRoutePage');
  return hospitalityServiceRoutePagePromise;
};

export const loadClientAccountPage = () => {
  clientAccountPagePromise ||= import('../pages/ClientAccount');
  return clientAccountPagePromise;
};

export const loadClientOrdersPage = () => {
  clientOrdersPagePromise ||= import('../pages/ClientOrders');
  return clientOrdersPagePromise;
};

export const loadAddressDistancePage = () => {
  addressDistancePagePromise ||= import('../pages/AddressDistance');
  return addressDistancePagePromise;
};

export const loadNotificationsPage = () => {
  notificationsPagePromise ||= import('../pages/NotificationsPage');
  return notificationsPagePromise;
};

const safePrefetch = (loader: () => Promise<any>) => {
  void loader().catch(() => undefined);
};

export const prefetchRouteByPath = (path: string) => {
  const pathname = String(path || '').split('?')[0].split('#')[0];
  if (!pathname) return;

  if (pathname === '/hub' || pathname === '/' || pathname === '/marketplace' || pathname === '/descobrir' || pathname === '/praca') {
    safePrefetch(loadMarketplacePage);
    return;
  }

  if (pathname === '/hub/destaques') {
    safePrefetch(loadHubHighlightsPage);
    return;
  }

  if (pathname === '/destinos') {
    safePrefetch(loadDestinationsPage);
    return;
  }

  if (pathname === '/destinos/cadastrar') {
    safePrefetch(loadDestinationPartnerRequestPage);
    return;
  }

  if (pathname.startsWith('/destinos/') && pathname.includes('/chales/') && pathname.endsWith('/rota')) {
    safePrefetch(loadHospitalityServiceRoutePage);
    return;
  }

  if (pathname.startsWith('/destinos/') && pathname.includes('/chales/')) {
    safePrefetch(loadHospitalityPlacePage);
    return;
  }

  if (pathname.startsWith('/destinos/')) {
    safePrefetch(loadDestinationDetailPage);
    return;
  }

  if (pathname.startsWith('/convite/')) {
    safePrefetch(loadDestinationInviteRedirectPage);
    return;
  }

  if (pathname === '/cliente/conta') {
    safePrefetch(loadClientAccountPage);
    return;
  }

  if (pathname === '/cliente/pedidos') {
    safePrefetch(loadClientOrdersPage);
    return;
  }

  if (pathname === '/cliente/enderecos') {
    safePrefetch(loadAddressDistancePage);
    return;
  }

  if (pathname === '/notificacoes') {
    safePrefetch(loadNotificationsPage);
    return;
  }

  if (pathname.startsWith('/pedido/')) {
    safePrefetch(loadOrderTrackingPage);
    return;
  }

  if (
    pathname !== '/admin' &&
    pathname !== '/superadmin' &&
    pathname !== '/cliente' &&
    pathname !== '/motoboy/login' &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/motoboy') &&
    !pathname.startsWith('/superadmin') &&
    !pathname.startsWith('/admin')
  ) {
    safePrefetch(loadStorePage);
  }
};

export const prefetchHubAdjacentRoutes = () => {
  safePrefetch(loadClientOrdersPage);
  safePrefetch(loadClientAccountPage);
  safePrefetch(loadHubHighlightsPage);
  safePrefetch(loadDestinationsPage);
  safePrefetch(loadStorePage);
};

export const prefetchDestinationAdjacentRoutes = () => {
  safePrefetch(loadDestinationDetailPage);
  safePrefetch(loadHospitalityPlacePage);
  safePrefetch(loadHospitalityServiceRoutePage);
};

export const prefetchClientAccountAdjacentRoutes = () => {
  safePrefetch(loadMarketplacePage);
  safePrefetch(loadClientOrdersPage);
  safePrefetch(loadClientAccountPage);
  safePrefetch(loadAddressDistancePage);
  safePrefetch(loadNotificationsPage);
};

export const scheduleIdlePrefetch = (callback: () => void, timeout = 1400) => {
  if (typeof window === 'undefined') return () => undefined;
  const win = window as IdleWindow;

  if (typeof win.requestIdleCallback === 'function') {
    const handle = win.requestIdleCallback(callback, { timeout });
    return () => win.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, Math.min(timeout, 650));
  return () => window.clearTimeout(handle);
};

export const scheduleRouteWarmup = (pathname: string) =>
  scheduleIdlePrefetch(() => {
    if (pathname === '/hub' || pathname === '/' || pathname === '/marketplace') {
      prefetchHubAdjacentRoutes();
      return;
    }

    if (pathname.startsWith('/destinos')) {
      prefetchDestinationAdjacentRoutes();
      return;
    }

    if (pathname.startsWith('/cliente') || pathname === '/notificacoes') {
      prefetchClientAccountAdjacentRoutes();
      return;
    }

    if (!pathname.startsWith('/admin') && !pathname.startsWith('/superadmin') && !pathname.startsWith('/motoboy')) {
      safePrefetch(loadMarketplacePage);
    }
  });

export const prefetchStorePage = () => safePrefetch(loadStorePage);
