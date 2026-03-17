// @ts-nocheck
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, SignOut, SquaresFour } from '@phosphor-icons/react';

export function AdminQueue() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR' || userRole === 'CHURRASQUEIRO';
  const storeSlug = String(auth?.store?.slug || '').trim();
  const forcedTab = (() => {
    const tab = String((location.state as any)?.activeTab || '').toLowerCase();
    if (tab === 'completed' || tab === 'inroute' || tab === 'queue') return tab;
    return 'queue';
  })();

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
        <AdminHeader />
        <div className="hidden lg:flex items-center justify-between gap-3">
          {isOperatorUser ? (
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => navigate('/admin/queue')}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
              >
                Pedidos
              </button>
              <button
                type="button"
                onClick={() => {
                  if (storeSlug) {
                    navigate(`/${storeSlug}`);
                    return;
                  }
                  navigate('/admin/queue');
                }}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <BookOpen size={14} weight="duotone" />
                Catálogo
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="inline-flex items-center gap-2">
            {!isOperatorUser && (
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard', { state: { activeTab: 'resumo' } })}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <SquaresFour size={14} weight="duotone" />
                Abrir painel completo
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/admin');
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
              aria-label="Sair da conta"
              title="Sair"
            >
              <SignOut size={14} weight="bold" />
              Sair
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden">
          <GrillQueue forcedTab={forcedTab as 'queue' | 'inroute' | 'completed'} />
        </div>
      </div>
    </AdminLayout>
  );
}

