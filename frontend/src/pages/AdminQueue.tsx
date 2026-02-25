// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Browsers } from '@phosphor-icons/react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const segmentLabelMap: Record<string, string> = {
  restaurante: 'Restaurante',
  hamburgueria: 'Hamburgueria',
  lanchonete: 'Lanchonete',
  pizzaria: 'Pizzaria',
  adega: 'Adega',
  mercado: 'Mercado',
  hortifruti: 'Hortifruti',
  farmacia: 'Farmácia',
  confeitaria: 'Confeitaria',
  outros: 'Comércio',
};

export function AdminQueue() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const storeSlug = auth?.store?.slug;
  const storeLogo = resolveAssetUrl(auth?.store?.settings?.logoUrl || auth?.store?.logoUrl || '');
  const storeName = String(auth?.store?.name || 'Minha loja');
  const segment =
    segmentLabelMap[String(auth?.store?.settings?.segment || 'outros').toLowerCase()] || 'Comércio';
  const city = [auth?.store?.settings?.city, String(auth?.store?.settings?.state || '').toUpperCase()].filter(Boolean).join(' • ');

  if (!auth?.store) {
    return <div style={{ padding: 24 }}>Carregando fila da loja...</div>;
  }

  return (
    <AdminLayout contextLabel="Central de Pedidos" showHeader={false}>
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <header className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-[0_20px_48px_-30px_rgba(2,6,23,0.66)]">
          <div className="px-3 sm:px-4 lg:px-5 py-3">
            <div className="flex items-center gap-3 min-h-[44px]">
              <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-600 bg-slate-800 overflow-hidden flex items-center justify-center">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-white">JC</span>
                )}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-base sm:text-lg font-black leading-tight truncate">{storeName}</h1>
                <p className="text-xs truncate mt-0.5 text-slate-300">Central de Pedidos</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <span className="inline-flex whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                Operação ao vivo
              </span>
              <span className="inline-flex whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                {segment}
              </span>
              {!!city && (
                <span className="inline-flex whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                  {city}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/90 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
              >
                <Browsers size={14} weight="duotone" />
                Painel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (storeSlug) navigate(`/${storeSlug}`);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/90 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
              >
                <BookOpen size={14} weight="duotone" />
                Vitrine
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-sky-400/50 bg-sky-500/20 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 transition"
              >
                Modo foco
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden">
          <GrillQueue />
        </div>
      </div>
    </AdminLayout>
  );
}

