// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChartBar, ChefHat, Package, ShoppingCart } from '@phosphor-icons/react';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

export function AdminMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const path = location.pathname || '';
  const dashboardTab = (location.state as any)?.activeTab || '';
  const [monitorCount, setMonitorCount] = useState(0);
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

  const openCatalog = () => {
    if (storeSlug) {
      navigate(`/${storeSlug}`);
      return;
    }
    navigate('/admin/dashboard', { state: { activeTab: 'resumo' } });
  };

  const items = [
    {
      id: 'monitor',
      label: 'Monitor',
      icon: ChefHat,
      active: path === '/admin/queue',
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
      icon: ShoppingCart,
      active: path === '/admin/dashboard' && dashboardTab === 'pedidos',
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'pedidos' } }),
    },
    {
      id: 'resumo',
      label: 'Resumo',
      icon: ChartBar,
      active: path === '/admin/dashboard' && (!dashboardTab || dashboardTab === 'resumo'),
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'resumo' } }),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[260] border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[max(env(safe-area-inset-bottom),8px)] pt-2 px-2">
      <ul className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className={`w-full rounded-xl py-2 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition ${
                  item.active
                    ? 'bg-slate-900 text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.85)] ring-1 ring-slate-700'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
