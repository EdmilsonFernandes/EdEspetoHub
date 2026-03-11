// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { SignOut } from '@phosphor-icons/react';

interface AdminLayoutProps {
  children: React.ReactNode;
  contextLabel?: string;
  showHeader?: boolean;
}

export function AdminLayout({
  children,
  contextLabel = 'Painel',
  showHeader = true,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="ds-admin-bg overflow-x-clip pb-24 lg:pb-0">
      <div className="w-full max-w-[1560px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 xl:px-8 space-y-3 sm:space-y-4">
        {showHeader && (
          <AdminHeader contextLabel={contextLabel} />
        )}
        {children}
      </div>
      <button
        type="button"
        onClick={() => {
          logout();
          navigate('/admin');
        }}
        className="lg:hidden fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+4.9rem)] z-[320] inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-2 text-[11px] font-extrabold text-rose-700 shadow-[0_16px_30px_-24px_rgba(244,63,94,0.7)]"
        aria-label="Sair da conta"
      >
        <SignOut size={14} weight="bold" />
        Sair
      </button>
      <AdminMobileBottomNav />
    </div>
  );
}
