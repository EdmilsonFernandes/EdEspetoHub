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
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleToggleHeader}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <ChevronDown size={14} />
              Mostrar topo
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
