// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChartBar, ChefHat, CurrencyDollar, Package } from '@phosphor-icons/react';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

export function AdminMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const role = String(auth?.user?.role || '').toUpperCase();
  const isOperator = role === 'OPERATOR' || role === 'CHURRASQUEIRO';
  const path = location.pathname || '';
  const dashboardTab = (location.state as any)?.activeTab || '';
  const [monitorCount, setMonitorCount] = useState(0);
  const [hiddenByOverlay, setHiddenByOverlay] = useState(false);
  const storeSlug = useMemo(() => {
    const fromAuth = String(auth?.store?.slug || '').trim();
    if (fromAuth) return fromAuth;
    if (typeof window === 'undefined') return '';
    const fromQuery = new URLSearchParams(window.location.search).get('slug');
    if (fromQuery) return String(fromQuery).trim();
    const fromSessionRedirect = sessionStorage.getItem('admin:redirectSlug');
    if (fromSessionRedirect) return String(fromSessionRedirect).trim();
    try {
      const raw = localStorage.getItem('adminSession');
      const parsed = raw ? JSON.parse(raw) : null;
      return String(parsed?.store?.slug || '').trim();
    } catch {
      return '';
    }
  }, [auth?.store?.slug]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const queue = await orderService.fetchQueue();
        if (!active) return;
        const count = (Array.isArray(queue) ? queue : []).filter((order: any) => {
          const st = String(order?.status || '').toLowerCase();
          return st !== 'done' && st !== 'delivered' && st !== 'cancelled';
        }).length;
        setMonitorCount(count);
      } catch {
        if (active) setMonitorCount(0);
      }
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onMobileMenu = (event: any) => {
      setHiddenByOverlay(Boolean(event?.detail?.open));
    };
    window.addEventListener('admin:mobile-menu', onMobileMenu as EventListener);
    return () => {
      window.removeEventListener('admin:mobile-menu', onMobileMenu as EventListener);
    };
  }, []);

  const openCatalog = () => {
    if (storeSlug) {
      navigate(`/${storeSlug}`);
      return;
    }
    navigate('/admin/dashboard', { state: { activeTab: 'resumo' } });
  };

  const baseItems = [
    {
      id: 'monitor',
      label: 'Pedidos',
      icon: ChefHat,
      active: path === '/admin/queue' && dashboardTab !== 'completed',
      onClick: () => navigate('/admin/queue'),
      badge: monitorCount > 0 ? (monitorCount > 99 ? '99+' : String(monitorCount)) : '',
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: Package,
      active: Boolean(storeSlug && (path === `/${storeSlug}` || path === `/store/${storeSlug}` || path === `/chamanoespeto/${storeSlug}`)),
      onClick: openCatalog,
    },
    {
      id: 'pedidos',
      label: 'Vendas',
      icon: CurrencyDollar,
      active: path === '/admin/queue' && dashboardTab === 'completed',
      onClick: () => navigate('/admin/queue', { state: { activeTab: 'completed' } }),
    },
    {
      id: 'resumo',
      label: 'Resumo',
      icon: ChartBar,
      active: path === '/admin/dashboard' && (!dashboardTab || dashboardTab === 'resumo'),
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'resumo' } }),
    },
  ];
  const items = isOperator ? baseItems.filter((item) => item.id === 'monitor' || item.id === 'catalogo') : baseItems;

  if (hiddenByOverlay) return null;

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-4 z-[260] px-4 pointer-events-none">
      <ul className={`pointer-events-auto mx-auto grid ${items.length <= 2 ? 'grid-cols-2' : 'grid-cols-4'} gap-1.5 max-w-2xl rounded-full border border-slate-700/80 bg-slate-900/95 p-2 shadow-[0_24px_48px_-28px_rgba(2,6,23,0.85)] backdrop-blur-xl`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className={`w-full rounded-full py-2 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition ${
                  item.active
                    ? 'bg-white text-slate-900 shadow-[0_10px_24px_-14px_rgba(255,255,255,0.45)]'
                    : 'bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="relative inline-flex">
                  <Icon size={16} weight="duotone" />
                  {item.badge ? (
                    <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-black text-white flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
