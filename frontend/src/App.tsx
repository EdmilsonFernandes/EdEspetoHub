import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage, CreateStore, AdminLogin, StorePage, OrdersQueue } from './pages';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateStore />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="/chamanoespeto/:storeSlug" element={<StorePage />} />
          <Route path="/chamanoespeto/:storeSlug/orders" element={<OrdersQueue />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
