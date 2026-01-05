// @ts-nocheck
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage, CreateStore, AdminLogin, StorePage, OrdersQueue, AdminDashboard, PaymentPage } from './pages';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminRoute } from './components/Admin/AdminRoute';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateStore />} />
          <Route path="/admin" element={<AdminLogin />} />
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
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="/chamanoespeto/:storeSlug" element={<StorePage />} />
          <Route path="/chamanoespeto/:storeSlug/orders" element={<OrdersQueue />} />
          <Route path="/payment/:paymentId" element={<PaymentPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
