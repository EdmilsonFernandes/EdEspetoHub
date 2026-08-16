// @ts-nocheck
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminRoute } from './components/Admin/AdminRoute';
import { MotoboyRoute } from './components/Motoboy/MotoboyRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { NativePushPermissionBanner } from './components/common/NativePushPermissionBanner';
import { NativeAppNavigator } from './components/common/NativeAppNavigator';
import { OfflineAlert } from './components/common/OfflineAlert';
import { PremiumSplashScreen } from './components/common/PremiumSplashScreen';
import { AppRobotLoader } from './components/common/AppRobotLoader';
import { AdminLogin } from './pages/AdminLogin';
import { ClientAuth } from './pages/ClientAuth';
import { CondominiumLogin } from './pages/CondominiumLogin';
import { ForgotPassword } from './pages/ForgotPassword';
import { MotoboyLogin } from './pages/MotoboyLogin';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import './index.css';
import { MotoboyLayout } from './layouts/MotoboyLayout';
import { loadOrderTrackingPage } from './utils/orderTrackingPrefetch';
import { isStaleBuildErrorMessage, recoverFromStaleBuild } from './utils/staleBuildRecovery';
import { installTextInputAssistance } from './utils/inputAssist';
import { clearAllCustomerSessions } from './utils/customerSessionStorage';
import {
  loadAdminDashboardPage,
  loadAdminHighlightsPage,
  loadAdminOrdersPage,
  loadAdminQueuePage,
  loadStorePage,
} from './utils/adminRoutePrefetch';
import {
  loadAddressDistancePage,
  loadClientAccountPage,
  loadClientOrdersPage,
  loadDestinationDetailPage,
  loadDestinationInviteRedirectPage,
  loadDestinationPartnerRequestPage,
  loadDestinationsPage,
  loadHospitalityPlacePage,
  loadHospitalityServiceRoutePage,
  loadHubHighlightsPage,
  loadMarketplacePage,
  loadNotificationsPage,
  scheduleRouteWarmup,
} from './utils/clientRoutePrefetch';

const lazyPage = (loader: () => Promise<any>, exportName: string) =>
  React.lazy(() =>
    loader()
      .then((module) => ({ default: module[exportName] }))
      .catch((error) => {
        const message = error instanceof Error ? `${error.name} ${error.message}` : String(error || '');
        if (isStaleBuildErrorMessage(message)) {
          void recoverFromStaleBuild();
        }
        throw error;
      })
  );

const LandingPage = lazyPage(() => import('./pages/LandingPage'), 'LandingPage');
const CreateStore = lazyPage(() => import('./pages/CreateStore'), 'CreateStore');
const StorePage = lazyPage(loadStorePage, 'StorePage');
const OrdersQueue = lazyPage(() => import('./pages/OrdersQueue'), 'OrdersQueue');
const AdminDashboard = lazyPage(loadAdminDashboardPage, 'AdminDashboard');
const AdminOrders = lazyPage(loadAdminOrdersPage, 'AdminOrders');
const AdminQueue = lazyPage(loadAdminQueuePage, 'AdminQueue');
const AdminRenewal = lazyPage(() => import('./pages/AdminRenewal'), 'AdminRenewal');
const AdminCoupons = lazyPage(() => import('./pages/AdminCoupons'), 'AdminCoupons');
const AdminDemo = lazyPage(() => import('./pages/AdminDemo'), 'AdminDemo');
const PaymentPage = lazyPage(() => import('./pages/PaymentPage'), 'PaymentPage');
const SuperAdmin = lazyPage(() => import('./pages/SuperAdmin'), 'SuperAdmin');
const SuperAdminCondominiums = lazyPage(() => import('./pages/SuperAdminCondominiums'), 'SuperAdminCondominiums');
const SuperAdminDestinations = lazyPage(() => import('./pages/SuperAdminDestinations'), 'SuperAdminDestinations');
const SuperAdminHomeConfig = lazyPage(() => import('./pages/SuperAdminHomeConfig'), 'SuperAdminHomeConfig');
const SuperAdminEmailTemplates = lazyPage(() => import('./pages/SuperAdminEmailTemplates'), 'SuperAdminEmailTemplates');
const EmailUnsubscribePage = lazyPage(() => import('./pages/EmailUnsubscribePage'), 'EmailUnsubscribePage');
const DestinationsPage = lazyPage(loadDestinationsPage, 'DestinationsPage');
const DestinationDetailPage = lazyPage(loadDestinationDetailPage, 'DestinationDetailPage');
const DestinationPartnerRequestPage = lazyPage(loadDestinationPartnerRequestPage, 'DestinationPartnerRequestPage');
const DestinationInviteRedirectPage = lazyPage(loadDestinationInviteRedirectPage, 'DestinationInviteRedirectPage');
const DestinationPartnerPortal = lazyPage(() => import('./pages/DestinationPartnerPortal'), 'DestinationPartnerPortal');
const DestinationPartnerActivate = lazyPage(() => import('./pages/DestinationPartnerActivate'), 'DestinationPartnerActivate');
const HospitalityPlacePage = lazyPage(loadHospitalityPlacePage, 'HospitalityPlacePage');
const HospitalityServiceRoutePage = lazyPage(loadHospitalityServiceRoutePage, 'HospitalityServiceRoutePage');
const TermsOfUse = lazyPage(() => import('./pages/TermsOfUse'), 'TermsOfUse');
const OrderTracking = lazyPage(loadOrderTrackingPage, 'OrderTracking');
const AddressDistance = lazyPage(loadAddressDistancePage, 'AddressDistance');
const AdminMotoboys = lazyPage(() => import('./pages/AdminMotoboys'), 'AdminMotoboys');
const MotoboyAvailable = lazyPage(() => import('./pages/MotoboyAvailable'), 'MotoboyAvailable');
const MotoboyCurrent = lazyPage(() => import('./pages/MotoboyCurrent'), 'MotoboyCurrent');
const MotoboyHome = lazyPage(() => import('./pages/MotoboyHome'), 'MotoboyHome');
const MotoboyEarnings = lazyPage(() => import('./pages/MotoboyEarnings'), 'MotoboyEarnings');
const MotoboyDone = lazyPage(() => import('./pages/MotoboyDone'), 'MotoboyDone');
const MotoboyRegister = lazyPage(() => import('./pages/MotoboyRegister'), 'MotoboyRegister');
const MotoboyProfile = lazyPage(() => import('./pages/MotoboyProfile'), 'MotoboyProfile');
const ArchitecturePage = lazyPage(() => import('./pages/ArchitecturePage'), 'ArchitecturePage');
const InstallAppPage = lazyPage(() => import('./pages/InstallAppPage'), 'InstallAppPage');
const ClientAccount = lazyPage(loadClientAccountPage, 'ClientAccount');
const ClientOrders = lazyPage(loadClientOrdersPage, 'ClientOrders');
const NotificationsPage = lazyPage(loadNotificationsPage, 'NotificationsPage');
const MarketplacePage = lazyPage(loadMarketplacePage, 'MarketplacePage');
const HubHighlightsPage = lazyPage(loadHubHighlightsPage, 'HubHighlightsPage');
const CondominiumAccessRequest = lazyPage(() => import('./pages/CondominiumAccessRequest'), 'CondominiumAccessRequest');
const CondominiumDashboard = lazyPage(() => import('./pages/CondominiumDashboard'), 'CondominiumDashboard');
const AdminHighlights = lazyPage(loadAdminHighlightsPage, 'AdminHighlights');
const SystemGuidePage = lazyPage(() => import('./pages/SystemGuidePage'), 'SystemGuidePage');

const AppRouteFallback = () => (
  <AppRobotLoader
    fullScreen
    title="Abrindo a próxima tela"
    subtitle="Carregando a experiência sem perder o contexto do app."
  />
);

const AppRouteWarmup = () => {
  const location = useLocation();

  useEffect(() => scheduleRouteWarmup(location.pathname), [location.pathname]);

  return null;
};

const AppRouteScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.hash) return;
    if ((location.state as any)?.preserveScroll) return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    window.requestAnimationFrame(scrollToTop);
    const timeoutId = window.setTimeout(scrollToTop, 80);
    return () => window.clearTimeout(timeoutId);
  }, [location.hash, location.pathname, location.search, location.state]);

  return null;
};

// Sessão do cliente validada no boot (sliding session): token morto é limpo antes de qualquer tela
// assumir "logado" — antes o token expirado só era descoberto quando o 1º request falhava (auditoria 16/08).
const CustomerSessionBootValidator = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    try {
      if (!localStorage.getItem('customerSession')) return;
    } catch {
      return;
    }
    import('./services/customerAccountService').then(({ customerAccountService }) => {
      customerAccountService.me().catch((error: any) => {
        const status = Number(error?.status || 0);
        if (!cancelled && (status === 401 || status === 403)) {
          clearAllCustomerSessions();
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
};

function App() {
  useEffect(() => installTextInputAssistance(), []);

  return (
    <ThemeProvider>
      <PremiumSplashScreen />
      <CustomerSessionBootValidator />
      <ToastProvider>
        <Router>
          <AppRouteWarmup />
          <AppRouteScrollToTop />
          <OfflineAlert />
          <NativePushPermissionBanner />
          <NativeAppNavigator />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/hub" element={<MarketplacePage />} />
              <Route path="/hub/destaques" element={<HubHighlightsPage />} />
              <Route path="/destinos" element={<DestinationsPage />} />
              <Route path="/destinos/cadastrar" element={<DestinationPartnerRequestPage />} />
              <Route path="/parceiro" element={<DestinationPartnerPortal />} />
              <Route path="/parceiro/ativar" element={<DestinationPartnerActivate />} />
              <Route path="/destinos/:destinationSlug" element={<DestinationDetailPage />} />
              <Route path="/destinos/:destinationSlug/chales/:placeSlug" element={<HospitalityPlacePage />} />
              <Route path="/destinos/:destinationSlug/chales/:placeSlug/rota" element={<HospitalityServiceRoutePage />} />
              <Route path="/convite/loja/:destinationSlug/:listingId" element={<DestinationInviteRedirectPage kind="listing" />} />
              <Route path="/convite/chale/:destinationSlug/:placeSlug" element={<DestinationInviteRedirectPage kind="hospitality" />} />
              <Route path="/marketplace" element={<Navigate to="/hub" replace />} />
              <Route path="/descobrir" element={<Navigate to="/hub" replace />} />
              <Route path="/praca" element={<Navigate to="/hub" replace />} />
              <Route path="/portfolio" element={<Navigate to="/hub" replace />} />
              <Route path="/arquitetura" element={<ArchitecturePage />} />
              <Route path="/instalar" element={<InstallAppPage />} />
              <Route path="/guia" element={<SystemGuidePage />} />
              <Route path="/docs" element={<Navigate to="/guia" replace />} />
              <Route path="/create" element={<CreateStore />} />
              <Route path="/entrar" element={<Navigate to="/cliente?mode=login" replace />} />
              <Route path="/login" element={<Navigate to="/cliente?mode=login" replace />} />
              <Route path="/cliente" element={<ClientAuth />} />
              <Route path="/cliente/login" element={<Navigate to="/cliente?mode=login" replace />} />
              <Route path="/cliente/cadastro" element={<Navigate to="/cliente?mode=register" replace />} />
              <Route path="/cliente/conta" element={<ClientAccount />} />
              <Route path="/cliente/pedidos" element={<ClientOrders />} />
              <Route path="/notificacoes" element={<NotificationsPage />} />
              <Route path="/cliente/enderecos" element={<AddressDistance />} />
              <Route path="/condominio/login" element={<CondominiumLogin />} />
              <Route path="/condominio/solicitar" element={<CondominiumAccessRequest />} />
              <Route path="/condominio" element={<CondominiumDashboard />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/email/unsubscribe" element={<EmailUnsubscribePage />} />
              <Route
                path="/admin/dashboard"
                element={
                  <AppErrorBoundary>
                    <AdminRoute allowedRoles={['ADMIN', 'OPERATOR', 'LOJISTA']} fallbackTo="/admin/queue">
                      <AdminDashboard />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <AppErrorBoundary>
                    <AdminRoute allowedRoles={['ADMIN']}>
                      <AdminOrders />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/queue"
                element={
                  <AppErrorBoundary>
                    <AdminRoute>
                      <AdminQueue />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/motoboys"
                element={
                  <AppErrorBoundary>
                    <AdminRoute allowedRoles={['ADMIN']}>
                      <AdminLayout contextLabel="Entregadores">
                        <AdminMotoboys />
                      </AdminLayout>
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AppErrorBoundary>
                    <AdminRoute allowedRoles={['ADMIN']}>
                      <Navigate to="/admin/dashboard" replace state={{ activeTab: 'usuarios' }} />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/renewal"
                element={
                  <AppErrorBoundary>
                    <AdminRoute>
                      <AdminRenewal />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/coupons"
                element={
                  <AppErrorBoundary>
                    <AdminRoute allowedRoles={['ADMIN', 'OPERATOR', 'LOJISTA']}>
                      <AdminCoupons />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/highlights"
                element={
                  <AppErrorBoundary>
                    <AdminRoute allowedRoles={['ADMIN', 'OPERATOR', 'LOJISTA']}>
                      <AdminHighlights />
                    </AdminRoute>
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/admin/demo"
                element={
                  <AppErrorBoundary>
                    <AdminDemo />
                  </AppErrorBoundary>
                }
              />
              <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
              <Route path="/store/:storeSlug" element={<StorePage />} />
              <Route path="/:storeSlug" element={<StorePage />} />
              <Route path="/janocaminho/:storeSlug" element={<StorePage />} />
              <Route path="/janocaminho/:storeSlug/orders" element={<OrdersQueue />} />
              <Route path="/chamanoespeto/:storeSlug" element={<StorePage />} />
              <Route path="/chamanoespeto/:storeSlug/orders" element={<OrdersQueue />} />
              <Route path="/pedido/:orderId" element={<OrderTracking />} />
              <Route path="/payment/:paymentId" element={<PaymentPage />} />
              <Route path="/superadmin" element={<SuperAdmin />} />
              <Route
                path="/superadmin/condominiums"
                element={
                  <AppErrorBoundary>
                    <SuperAdminCondominiums />
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/superadmin/destinations"
                element={
                  <AppErrorBoundary>
                    <SuperAdminDestinations />
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/superadmin/home-config"
                element={
                  <AppErrorBoundary>
                    <SuperAdminHomeConfig />
                  </AppErrorBoundary>
                }
              />
              <Route
                path="/superadmin/email-templates"
                element={
                  <AppErrorBoundary>
                    <SuperAdminEmailTemplates />
                  </AppErrorBoundary>
                }
              />
              <Route path="/superadmin/highlights" element={<Navigate to="/superadmin" replace />} />
              <Route path="/maps" element={<AddressDistance />} />
              <Route path="/motoboy/login" element={<MotoboyLogin />} />
              <Route path="/motoboy/register" element={<MotoboyRegister />} />
              <Route
                path="/motoboy"
                element={
                  <AppErrorBoundary>
                    <MotoboyRoute>
                      <MotoboyLayout />
                    </MotoboyRoute>
                  </AppErrorBoundary>
                }
              >
                <Route index element={<Navigate to="/motoboy/home" replace />} />
                <Route path="home" element={<MotoboyHome />} />
                <Route path="available" element={<MotoboyAvailable />} />
                <Route path="delivery" element={<MotoboyCurrent />} />
                <Route path="done" element={<MotoboyDone />} />
                <Route path="history" element={<Navigate to="/motoboy/earnings" replace />} />
                <Route path="earnings" element={<MotoboyEarnings />} />
                <Route path="profile" element={<MotoboyProfile />} />
              </Route>
              <Route path="/motoboy/current" element={<Navigate to="/motoboy/delivery" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
