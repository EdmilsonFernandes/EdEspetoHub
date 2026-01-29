import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motoboyService } from '../../services/motoboyService';

export function MotoboyRoute({ children }: { children: React.ReactNode }) {
  const { auth, hydrated } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!auth?.token) {
      setAllowed(false);
      return;
    }
    if (String(auth?.user?.role || '').toUpperCase() !== 'MOTOBOY') {
      setAllowed(false);
      return;
    }

    const check = async () => {
      try {
        await motoboyService.listStoreRequests();
        setAllowed(true);
      } catch (error: any) {
        if (error?.status === 403) {
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      }
    };

    check();
  }, [auth?.token, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-sm font-medium">Carregando...</div>
      </div>
    );
  }

  if (allowed === false) {
    return <Navigate to="/motoboy/login" replace />;
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
