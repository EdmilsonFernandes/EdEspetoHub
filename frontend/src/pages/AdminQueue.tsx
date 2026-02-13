// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Browsers, ChefHat, Eye, EyeSlash, Sparkle } from '@phosphor-icons/react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';

export function AdminQueue() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const storeSlug = auth?.store?.slug;
  const [focusMode, setFocusMode] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('adminHeader:visible') === 'false';
  });
  const [showQuickLinks, setShowQuickLinks] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('adminQueue:showQuickLinks');
    return saved ? saved === 'true' : true;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('adminQueue:showQuickLinks', String(showQuickLinks));
  }, [showQuickLinks]);

  const handleFocusToggle = () => {
    const next = !focusMode;
    setFocusMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminHeader:visible', String(!next));
      window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: !next } }));
      if (next) {
        setShowQuickLinks(false);
      }
    }
  };

  if (!auth?.store) {
    return <div style={{ padding: 24 }}>Carregando fila da loja...</div>;
  }

  return (
    <AdminLayout contextLabel="Fila de Pedidos">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-sm">
                <ChefHat size={20} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Operação</p>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">Fila de Pedidos</h1>
              </div>
            </div>
            {showQuickLinks ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/dashboard')}
                  className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
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
                  className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen size={15} weight="duotone" />
                  Cardápio
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Modo de visualização</p>
              <p className="text-xs font-semibold text-slate-700">
                {focusMode ? 'Foco ativo (layout compacto para produção)' : 'Padrão (atalhos e painel visíveis)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuickLinks((prev) => !prev)}
                className="btn-press inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                {showQuickLinks ? <EyeSlash size={14} weight="duotone" /> : <Eye size={14} weight="duotone" />}
                {showQuickLinks ? 'Ocultar atalhos' : 'Mostrar atalhos'}
              </button>
              <button
                type="button"
                onClick={handleFocusToggle}
                className={`btn-press inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold ${
                  focusMode
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                <Sparkle size={14} weight="duotone" />
                {focusMode ? 'Desativar foco' : 'Ativar foco'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <GrillQueue />
        </div>
      </div>
    </AdminLayout>
  );
}
