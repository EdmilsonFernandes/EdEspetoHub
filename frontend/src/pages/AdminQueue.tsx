// @ts-nocheck
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminHeader } from '../components/Admin/AdminHeader';

export function AdminQueue() {
  const { auth } = useAuth();

  if (!auth?.store) {
    return <div style={{ padding: 24 }}>Carregando fila da loja...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminHeader contextLabel="Fila de Produção" />

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <GrillQueue />
        </div>
      </div>
    </div>
  );
}
