// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { CaretDown } from '@phosphor-icons/react';

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
  const [headerVisible, setHeaderVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('adminHeader:visible');
    return stored ? stored === 'true' : true;
  });
  const storeSlug = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('adminSession');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed?.store?.slug || '';
    } catch (error) {
      return '';
    }
  }, []);
  const handleToggleHeader = () => {
    setHeaderVisible((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminHeader:visible', String(next));
        window.dispatchEvent(new CustomEvent('adminHeader:toggle', { detail: { visible: next } }));
      }
      return next;
    });
  };
  useEffect(() => {
    const handleSet = (event: any) => {
      const next = event?.detail?.visible;
      if (typeof next === 'boolean') {
        setHeaderVisible(next);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('adminHeader:set', handleSet as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('adminHeader:set', handleSet as EventListener);
      }
    };
  }, []);
  const shouldShowHeader = useMemo(() => showHeader && headerVisible, [showHeader, headerVisible]);

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="mx-auto p-4 space-y-6">
        {shouldShowHeader && (
          <AdminHeader contextLabel={contextLabel} onToggleHeader={handleToggleHeader} />
        )}
        {!shouldShowHeader && showHeader && (
          <div className="sticky top-3 z-10">
            <div className="mx-auto max-w-md bg-white/90 backdrop-blur rounded-full border border-slate-200 shadow-md px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Modo foco ativo
              </div>
              <div className="flex items-center rounded-full bg-slate-100 border border-slate-200 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-slate-900 text-white shadow-sm"
                  title="Modo foco da fila"
                >
                  Fila foco
                </button>
                {storeSlug && (
                  <a
                    href={`/${storeSlug}`}
                    className="px-3 py-1.5 rounded-full bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md transition"
                  >
                    Cardápio
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleToggleHeader}
                  className="px-3 py-1.5 rounded-full text-slate-600 hover:bg-white transition flex items-center gap-1.5"
                >
                  <CaretDown size={14} weight="duotone" className="rotate-180" />
                  Mostrar painel
                </button>
              </div>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
