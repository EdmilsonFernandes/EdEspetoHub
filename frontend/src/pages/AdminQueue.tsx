// @ts-nocheck
import React from 'react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';

export function AdminQueue() {
  const { auth } = useAuth();

  if (!auth?.store) {
    return (
      <div className="p-6 space-y-3">
        <div className="ds-skeleton h-16 w-full" />
        <div className="ds-skeleton h-20 w-full" />
        <div className="ds-skeleton h-20 w-full" />
      </div>
    );
  }

  return (
    <AdminLayout contextLabel="Central de Pedidos" showHeader={false}>
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden">
          <GrillQueue />
        </div>
      </div>
    </AdminLayout>
  );
}

