import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motoboyService } from '../../services/motoboyService';
import { consumeManualLogoutRedirect, forceLogoutAndRedirect, isSessionAuthError } from '../../utils/sessionRedirect';

export function MotoboyRoute({ children }: { children: React.ReactNode }) {
  const { auth, hydrated } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const motoboySession = (() => {
    try {
      const raw = localStorage.getItem('motoboySession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const motoboyToken = motoboySession?.token;
  const motoboyRole = String(motoboySession?.user?.role || '').toUpperCase();

  useEffect(() => {
    if (!hydrated) return;
    const token = motoboyToken || auth?.token;
    const role = motoboyToken ? motoboyRole : String(auth?.user?.role || '').toUpperCase();
    if (!token) {
      setAllowed(false);
      return;
    }
    if (role !== 'MOTOBOY') {
      setAllowed(false);
      return;
    }

    const check = async () => {
      try {
        await motoboyService.listStoreRequests();
        setAllowed(true);
      } catch (error: any) {
        if (isSessionAuthError(error?.status, error?.message, error?.code)) {
          forceLogoutAndRedirect('motoboy');
          setAllowed(false);
          return;
        }
        if (error?.status === 403) {
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      }
    };

    check();
  }, [auth?.token, hydrated, motoboyToken, motoboyRole]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-sm font-medium">Carregando...</div>
      </div>
    );
  }

  if (allowed === false) {
    const manualLogoutRedirect = consumeManualLogoutRedirect('motoboy');
    return <Navigate to={manualLogoutRedirect || '/motoboy/login'} replace />;
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-sm font-medium">Validando acesso...</div>
      </div>
    );
  }

  return <>{children}</>;
}
