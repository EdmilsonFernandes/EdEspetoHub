// @ts-nocheck
import React from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';

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
  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="mx-auto p-4 space-y-6">
        {showHeader && <AdminHeader contextLabel={contextLabel} />}
        {children}
      </div>
    </div>
  );
}
