// @ts-nocheck
import React from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';

interface AdminLayoutProps {
  children: React.ReactNode;
  contextLabel?: string;
  showHeader?: boolean;
  fluid?: boolean;
}

export function AdminLayout({
  children,
  contextLabel = 'Painel',
  showHeader = true,
  fluid = false,
}: AdminLayoutProps) {
  return (
    <div className="ds-admin-bg overflow-x-clip pb-24 lg:pb-0">
      <div
        className={
          fluid
            ? 'w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-10 lg:py-4 xl:px-12 2xl:px-14 space-y-3 sm:space-y-4'
            : 'w-full max-w-[1600px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 xl:px-8 space-y-3 sm:space-y-4'
        }
      >
        {showHeader && (
          <AdminHeader contextLabel={contextLabel} />
        )}
        {children}
      </div>
      <AdminMobileBottomNav />
    </div>
  );
}
