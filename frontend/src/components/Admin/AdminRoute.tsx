// @ts-nocheck
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { consumeManualLogoutRedirect } from '../../utils/sessionRedirect';

type AdminAllowedRole = 'ADMIN' | 'OPERATOR' | 'LOJISTA';

export function AdminRoute({
  children,
  allowedRoles,
  fallbackTo = '/admin/queue',
}: {
  children: React.ReactNode;
  allowedRoles?: AdminAllowedRole[];
  fallbackTo?: string;
}) {
  const { auth, hydrated } = useAuth();
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-sm font-medium">Restaurando sessão...</div>
      </div>
    );
  }

  const role = String(auth?.user?.role || '').toUpperCase() as AdminAllowedRole;
  const hasSession = Boolean(auth?.token && auth?.store);
  const hasAdminContext = role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA';
  if (!hasSession || !hasAdminContext) {
    const manualLogoutRedirect = consumeManualLogoutRedirect('admin');
    return <Navigate to={manualLogoutRedirect || '/admin'} replace />;
  }
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={fallbackTo} replace state={{ accessDenied: true }} />;
  }

  const subscriptionStatus = auth?.subscription?.status;
  if (subscriptionStatus === 'EXPIRED' && location.pathname !== '/admin/renewal') {
    return <Navigate to="/admin/renewal" replace />;
  }

  return <>{children}</>;
}
