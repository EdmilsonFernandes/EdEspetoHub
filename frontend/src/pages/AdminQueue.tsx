import React from 'react';
import { useLocation } from 'react-router-dom';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useAdminNav } from '../navigation/useAdminNav';
import { AdminDesktopSidebar } from '../components/Admin/AdminDesktopSidebar';

export function AdminQueue() {
  const { auth } = useAuth();
  const location = useLocation();
  const [isDesktopLayout, setIsDesktopLayout] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [sidebarCompact, setSidebarCompact] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const savedPreference = localStorage.getItem('adminSidebar:compact');
    if (savedPreference === null) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return savedPreference === 'true';
  });
  React.useEffect(() => {
    localStorage.setItem('adminSidebar:compact', String(sidebarCompact));
  }, [sidebarCompact]);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktopLayout(media.matches);
    onChange();
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);
  React.useEffect(() => {
    if (!isDesktopLayout || !sidebarCompact) return;
    setSidebarCompact(false);
  }, [isDesktopLayout, sidebarCompact]);

  // Fonte única de navegação (antes: desktopNavItems + handleNavSelect locais).
  const { sidebarItems, selectItem, logout: navLogout } = useAdminNav({ activeIdOverride: 'fila' });
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
    <AdminLayout contextLabel="Central de Pedidos" fluid>
      <div
        className={`w-full space-y-4 lg:space-y-0 lg:grid lg:items-start lg:gap-0 ${
          sidebarCompact ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'
        }`}
      >
        <AdminDesktopSidebar
          items={sidebarItems}
          activeId="fila"
          compact={sidebarCompact}
          onToggleCompact={() => setSidebarCompact((prev) => !prev)}
          onSelect={selectItem}
          onLogout={navLogout}
        />
        <div className="min-w-0 flex-1 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden relative z-20">
          <GrillQueue forcedTab={forcedTab as 'queue' | 'inroute' | 'completed'} />
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}
