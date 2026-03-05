// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';

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
    <div className="ds-admin-bg overflow-x-clip">
      <div className="w-full max-w-[1560px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 xl:px-8 space-y-3 sm:space-y-4">
        {shouldShowHeader && (
          <AdminHeader contextLabel={contextLabel} onToggleHeader={handleToggleHeader} />
        )}
        {children}
      </div>
    </div>
  );
}
