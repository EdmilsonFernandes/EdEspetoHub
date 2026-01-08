// @ts-nocheck
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage, CreateStore, AdminLogin, StorePage, OrdersQueue, AdminDashboard, AdminOrders, AdminQueue, AdminRenewal, AdminDemo, PaymentPage, SuperAdmin, ForgotPassword, ResetPassword, VerifyEmail, TermsOfUse } from './pages';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminRoute } from './components/Admin/AdminRoute';
import { AdminLayout } from './components/Admin/AdminLayout';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
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
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </AdminRoute>
                </AppErrorBoundary>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AppErrorBoundary>
                  <AdminRoute>
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
                    <AdminLayout>
                      <AdminQueue />
                    </AdminLayout>
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
            <Route path="/chamanoespeto/:storeSlug" element={<StorePage />} />
            <Route path="/chamanoespeto/:storeSlug/orders" element={<OrdersQueue />} />
            <Route path="/payment/:paymentId" element={<PaymentPage />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
