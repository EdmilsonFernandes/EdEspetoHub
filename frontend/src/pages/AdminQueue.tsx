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
    <AdminLayout contextLabel="Central de Pedidos" showHeader={false}>
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/98 backdrop-blur px-4 py-3 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.26)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,157,247,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(95,211,90,0.1),transparent_44%)]" />
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-xl bg-white text-white grid place-items-center shadow-sm overflow-hidden border border-slate-200">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <span className="h-full w-full grid place-items-center rounded-2xl bg-[linear-gradient(120deg,#2f9df7,#5fd35a)]">
                    <ChefHat size={20} weight="duotone" />
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Central de Pedidos</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500 truncate max-w-[38ch]">{storeName}</p>
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
                    Operação ao vivo
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                <Browsers size={15} weight="duotone" />
                Painel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (storeSlug) navigate(`/${storeSlug}`);
                }}
                disabled={!storeSlug}
                className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookOpen size={15} weight="duotone" />
                Vitrine
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

