// @ts-nocheck
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { auth, hydrated } = useAuth();

  useEffect(() => {
    console.count('AdminRoute render effect');
  }, [hydrated, auth]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-sm font-medium">Restaurando sessão...</div>
      </div>
    );
  }

  if (!auth?.token || auth?.user?.role !== 'ADMIN' || !auth?.store) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
