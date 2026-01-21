// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { ChevronDown } from 'lucide-react';

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
                Modo foco da fila
              </div>
              <button
                type="button"
                onClick={handleToggleHeader}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <ChevronDown size={14} className="rotate-180" />
                Mostrar painel
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
