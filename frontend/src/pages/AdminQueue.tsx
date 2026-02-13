// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Browsers, ChefHat } from '@phosphor-icons/react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

export function AdminQueue() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const storeSlug = auth?.store?.slug;
  const storeLogo = resolveAssetUrl(auth?.store?.settings?.logoUrl || auth?.store?.logoUrl || '');
  const storeName = String(auth?.store?.name || 'Minha loja');

  if (!auth?.store) {
    return <div style={{ padding: 24 }}>Carregando fila da loja...</div>;
  }

  return (
    <AdminLayout contextLabel="Fila de Pedidos" showHeader={false}>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-sm overflow-hidden border border-slate-200">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <ChefHat size={20} weight="duotone" />
                )}
              </span>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">Fila de Pedidos</h1>
                <p className="text-xs text-slate-500 truncate">{storeName}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 whitespace-nowrap"
              >
                <Browsers size={15} weight="duotone" />
                Painel admin
              </button>
              <button
                type="button"
                onClick={() => {
                  if (storeSlug) navigate(`/${storeSlug}`);
                }}
                disabled={!storeSlug}
                className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookOpen size={15} weight="duotone" />
                Cardápio
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden">
          <GrillQueue />
        </div>
      </div>
    </AdminLayout>
  );
}
