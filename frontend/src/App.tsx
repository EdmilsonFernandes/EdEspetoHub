// @ts-nocheck
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
    import { LandingPage, CreateStore, AdminLogin, StorePage, OrdersQueue, AdminDashboard, AdminOrders, AdminQueue, AdminUsers, AdminRenewal, AdminDemo, PaymentPage, SuperAdmin, ForgotPassword, ResetPassword, VerifyEmail, TermsOfUse, OrderTracking, AddressDistance, AdminMotoboys, MotoboyAvailable, MotoboyCurrent, MotoboyHistory, MotoboyProfile, MotoboyDone, MotoboyLogin, MotoboyRegister, MotoboyHome, MotoboyEarnings, ArchitecturePage } from './pages';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminRoute } from './components/Admin/AdminRoute';
import { MotoboyRoute } from './components/Motoboy/MotoboyRoute';
import { AdminLayout } from './components/Admin/AdminLayout';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import './index.css';
import { PortfolioPage } from './pages/PortfolioPage';
import { MotoboyLayout } from './layouts/MotoboyLayout';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/arquitetura" element={<ArchitecturePage />} />
            <Route path="/create" element={<CreateStore />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route
              path="/admin/dashboard"
              element={
                <AppErrorBoundary>
                  <AdminRoute>
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
                    <AdminLayout>
                      <AdminOrders />
                    </AdminLayout>
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
                    <AdminLayout>
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
                    <AdminUsers />
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
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
