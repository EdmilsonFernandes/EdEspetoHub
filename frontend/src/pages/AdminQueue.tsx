// @ts-nocheck
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { ChartBar, CreditCard, Package, Gear, Scooter, Star, ChefHat, ShoppingCart, UsersThree } from '@phosphor-icons/react';
import { AdminDesktopSidebar } from '../components/Admin/AdminDesktopSidebar';

export function AdminQueue() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
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
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR' || userRole === 'CHURRASQUEIRO';
  const storeSlug = String(auth?.store?.slug || '').trim();
  const isVip = Boolean(auth?.store?.settings?.planExempt || auth?.subscription?.planExempt);
  const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
  const subscriptionStatus = String(auth?.subscription?.status || '').toUpperCase();
  const canUseMotoboys = Boolean(
    isVip ||
      auth?.features?.motoboyManagement ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );
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

  const desktopNavItems = React.useMemo(
    () =>
      (isOperatorUser
        ? [
            { id: 'cardapio', label: 'Catálogo Online', icon: Package },
            { id: 'fila', label: 'Pedidos ao vivo', icon: ChefHat },
          ]
        : [
            { id: 'resumo', label: 'Resumo', icon: ChartBar },
            { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree },
            { id: 'config', label: 'Configurações', icon: Gear },
            { id: 'fila', label: 'Pedidos ao vivo', icon: ChefHat },
            { id: 'cardapio', label: 'Catálogo Online', icon: Package },
          ]),
    [isOperatorUser, canUseMotoboys]
  );

  const handleNavSelect = (id: string) => {
    if (id === 'cardapio') {
      if (storeSlug) navigate(`/${storeSlug}`);
      return;
    }
    if (id === 'fila') {
      navigate('/admin/queue');
      return;
    }
    if (id === 'pedidos') {
      navigate('/admin/orders');
      return;
    }
    if (id === 'motoboys' && !canUseMotoboys) {
      navigate('/admin/renewal?focus=pro');
      return;
    }
    navigate('/admin/dashboard', { state: { activeTab: id } });
  };
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
    <AdminLayout contextLabel="Central de Pedidos" showHeader={false} fluid>
      <div
        className={`w-full space-y-4 lg:space-y-0 lg:grid lg:items-start lg:gap-0 ${
          sidebarCompact ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'
        }`}
      >
        <AdminDesktopSidebar
          items={desktopNavItems.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            disabled: item.disabled,
            badge: item.id === 'motoboys' && item.disabled ? 'Pro' : undefined,
            tone: item.id === 'motoboys' && item.disabled ? 'violet' : 'default',
          }))}
          activeId="fila"
          compact={sidebarCompact}
          onToggleCompact={() => setSidebarCompact((prev) => !prev)}
          onSelect={handleNavSelect}
          onLogout={() => {
            logout();
            navigate('/admin');
          }}
        />
        <div className="min-w-0 flex-1 space-y-4">
        <AdminHeader />
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden relative z-20">
          <GrillQueue forcedTab={forcedTab as 'queue' | 'inroute' | 'completed'} />
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}

