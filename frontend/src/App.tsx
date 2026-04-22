// @ts-nocheck
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import './index.css';
import { MotoboyLayout } from './layouts/MotoboyLayout';

const lazyPage = (loader: () => Promise<any>, exportName: string) =>
  React.lazy(() => loader().then((module) => ({ default: module[exportName] })));

const LandingPage = lazyPage(() => import('./pages/LandingPage'), 'LandingPage');
const CreateStore = lazyPage(() => import('./pages/CreateStore'), 'CreateStore');
const AdminLogin = lazyPage(() => import('./pages/AdminLogin'), 'AdminLogin');
const StorePage = lazyPage(() => import('./pages/StorePage'), 'StorePage');
const OrdersQueue = lazyPage(() => import('./pages/OrdersQueue'), 'OrdersQueue');
const AdminDashboard = lazyPage(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const AdminOrders = lazyPage(() => import('./pages/AdminOrders'), 'AdminOrders');
const AdminQueue = lazyPage(() => import('./pages/AdminQueue'), 'AdminQueue');
const AdminRenewal = lazyPage(() => import('./pages/AdminRenewal'), 'AdminRenewal');
const AdminDemo = lazyPage(() => import('./pages/AdminDemo'), 'AdminDemo');
const PaymentPage = lazyPage(() => import('./pages/PaymentPage'), 'PaymentPage');
const SuperAdmin = lazyPage(() => import('./pages/SuperAdmin'), 'SuperAdmin');
const SuperAdminCondominiums = lazyPage(() => import('./pages/SuperAdminCondominiums'), 'SuperAdminCondominiums');
const ForgotPassword = lazyPage(() => import('./pages/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyPage(() => import('./pages/ResetPassword'), 'ResetPassword');
const VerifyEmail = lazyPage(() => import('./pages/VerifyEmail'), 'VerifyEmail');
const TermsOfUse = lazyPage(() => import('./pages/TermsOfUse'), 'TermsOfUse');
const OrderTracking = lazyPage(() => import('./pages/OrderTracking'), 'OrderTracking');
const AddressDistance = lazyPage(() => import('./pages/AddressDistance'), 'AddressDistance');
const AdminMotoboys = lazyPage(() => import('./pages/AdminMotoboys'), 'AdminMotoboys');
const MotoboyAvailable = lazyPage(() => import('./pages/MotoboyAvailable'), 'MotoboyAvailable');
const MotoboyCurrent = lazyPage(() => import('./pages/MotoboyCurrent'), 'MotoboyCurrent');
const MotoboyHome = lazyPage(() => import('./pages/MotoboyHome'), 'MotoboyHome');
const MotoboyEarnings = lazyPage(() => import('./pages/MotoboyEarnings'), 'MotoboyEarnings');
const MotoboyDone = lazyPage(() => import('./pages/MotoboyDone'), 'MotoboyDone');
const MotoboyLogin = lazyPage(() => import('./pages/MotoboyLogin'), 'MotoboyLogin');
const MotoboyRegister = lazyPage(() => import('./pages/MotoboyRegister'), 'MotoboyRegister');
const MotoboyProfile = lazyPage(() => import('./pages/MotoboyProfile'), 'MotoboyProfile');
const ArchitecturePage = lazyPage(() => import('./pages/ArchitecturePage'), 'ArchitecturePage');
const InstallAppPage = lazyPage(() => import('./pages/InstallAppPage'), 'InstallAppPage');
const ClientAuth = lazyPage(() => import('./pages/ClientAuth'), 'ClientAuth');
const ClientAccount = lazyPage(() => import('./pages/ClientAccount'), 'ClientAccount');
const ClientOrders = lazyPage(() => import('./pages/ClientOrders'), 'ClientOrders');
const MarketplacePage = lazyPage(() => import('./pages/MarketplacePage'), 'MarketplacePage');
const CondominiumLogin = lazyPage(() => import('./pages/CondominiumLogin'), 'CondominiumLogin');
const CondominiumDashboard = lazyPage(() => import('./pages/CondominiumDashboard'), 'CondominiumDashboard');
const AdminHighlights = lazyPage(() => import('./pages/AdminHighlights'), 'AdminHighlights');
const SystemGuidePage = lazyPage(() => import('./pages/SystemGuidePage'), 'SystemGuidePage');

const AppRouteFallback = () => (
  <div className="min-h-screen bg-[#EEF2F7] px-4 py-[max(2rem,env(safe-area-inset-top))] text-slate-900">
    <div className="mx-auto max-w-[430px] space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.055)]" />
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="h-12 animate-pulse rounded-[18px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.055)]" />
      <div className="grid gap-3">
        <div className="h-28 animate-pulse rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.055)]" />
        <div className="h-24 animate-pulse rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.055)]" />
      </div>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <PremiumSplashScreen />
      <ToastProvider>
        <Router>
          <OfflineAlert />
          <NativePushPermissionBanner />
          <NativeAppNavigator />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/hub" element={<MarketplacePage />} />
              <Route path="/marketplace" element={<Navigate to="/hub" replace />} />
              <Route path="/descobrir" element={<Navigate to="/hub" replace />} />
              <Route path="/praca" element={<Navigate to="/hub" replace />} />
              <Route path="/portfolio" element={<Navigate to="/hub" replace />} />
              <Route path="/arquitetura" element={<ArchitecturePage />} />
              <Route path="/instalar" element={<InstallAppPage />} />
              <Route path="/guia" element={<SystemGuidePage />} />
              <Route path="/docs" element={<Navigate to="/guia" replace />} />
              <Route path="/create" element={<CreateStore />} />
              <Route path="/cliente" element={<ClientAuth />} />
              <Route path="/cliente/login" element={<Navigate to="/cliente?mode=login" replace />} />
              <Route path="/cliente/cadastro" element={<Navigate to="/cliente?mode=register" replace />} />
              <Route path="/cliente/conta" element={<ClientAccount />} />
              <Route path="/cliente/pedidos" element={<ClientOrders />} />
              <Route path="/cliente/enderecos" element={<AddressDistance />} />
              <Route path="/condominio/login" element={<CondominiumLogin />} />
              <Route path="/condominio" element={<CondominiumDashboard />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/terms" element={<TermsOfUse />} />
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
