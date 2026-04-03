// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChartBar, ChefHat, CurrencyDollar, Package, Star } from '@phosphor-icons/react';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

export function AdminMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const role = String(auth?.user?.role || '').toUpperCase();
  const isOperator = role === 'OPERATOR' || role === 'CHURRASQUEIRO';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const primaryColor = String(
    auth?.store?.settings?.primaryColor ||
    auth?.store?.settings?.primary_color ||
    '#0f172a'
  );
  const secondaryColor = String(
    auth?.store?.settings?.secondaryColor ||
    auth?.store?.settings?.secondary_color ||
    '#e2e8f0'
  );
  const path = location.pathname || '';
  const dashboardTab = (location.state as any)?.activeTab || '';
  const [monitorCount, setMonitorCount] = useState(0);
  const [hiddenByOverlay, setHiddenByOverlay] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
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

  const getContrastTextColor = (hexColor = '') => {
    const normalized = String(hexColor || '').trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#0f172a';
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#0f172a' : '#ffffff';
  };

  const hexToRgba = (hexColor = '', alpha = 0.1, fallback = 'rgba(15,23,42,0.08)') => {
    const normalized = String(hexColor || '').trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const activePillColor = hexToRgba(secondaryColor, 0.16, hexToRgba(primaryColor, 0.1));
  const activeTextColor = primaryColor;
  const activeIconBg = primaryColor;
  const activeIconColor = getContrastTextColor(primaryColor);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const queue = await orderService.fetchQueue();
        if (!active) return;
        const openStatuses = new Set([
          'pending',
          'preparing',
          'ready',
          'ready_for_delivery',
          'waiting_for_motoboy',
          'in_delivery',
          'dispatched',
        ]);
        const count = (Array.isArray(queue) ? queue : []).filter((order: any) => {
          const st = String(order?.status || '').toLowerCase();
          return openStatuses.has(st);
        }).length;
        setMonitorCount(count);
      } catch {
        if (active) setMonitorCount(0);
      }
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onQueueCount = (event: any) => {
      const value = Number(event?.detail?.openCount);
      if (Number.isFinite(value) && value >= 0) {
        setMonitorCount(value);
      }
    };
    window.addEventListener('admin:queue-count', onQueueCount as EventListener);
    return () => {
      window.removeEventListener('admin:queue-count', onQueueCount as EventListener);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY || 0;
    let anchorY = lastY;
    let ticking = false;
    const HIDE_DELTA = 28;
    const SHOW_DELTA = 18;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const delta = currentY - lastY;
        if (Math.abs(delta) >= 4) {
          if (delta > 0 && currentY > 80) {
            if (isVisible && currentY - anchorY >= HIDE_DELTA) {
              setIsVisible(false);
              anchorY = currentY;
            }
          } else if (delta < 0) {
            if (!isVisible && anchorY - currentY >= SHOW_DELTA) {
              setIsVisible(true);
              anchorY = currentY;
            }
          }
        }
        lastY = currentY;
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isVisible]);

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
      label: 'Loja Online',
      icon: Package,
      active: Boolean(storeSlug && (path === `/${storeSlug}` || path === `/store/${storeSlug}` || path === `/chamanoespeto/${storeSlug}`)),
      onClick: openCatalog,
    },
    {
      id: 'produtos',
      label: 'Produtos',
      icon: Package,
      active: path === '/admin/dashboard' && dashboardTab === 'produtos',
      onClick: () => navigate('/admin/dashboard?tab=produtos'),
    },
    {
      id: 'destaques',
      label: 'Destaques',
      icon: Star,
      active: path === '/admin/highlights',
      onClick: () => navigate('/admin/highlights'),
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
  const items = isOperator
    ? baseItems.filter((item) => item.id === 'monitor' || item.id === 'produtos' || item.id === 'destaques' || item.id === 'catalogo')
    : baseItems.filter((item) => item.id !== 'produtos');

  if (isSuperAdmin || hiddenByOverlay) return null;

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-[220] pointer-events-none transition-transform duration-300 ease-in-out"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
      }}
    >
      <ul className={`pointer-events-auto mx-auto grid ${items.length <= 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-1 max-w-none rounded-none border-t border-slate-200/40 bg-white/72 p-1.5 pb-[max(env(safe-area-inset-bottom),4px)] shadow-[0_-12px_24px_-20px_rgba(15,23,42,0.35)] backdrop-blur-2xl`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className={`w-full min-h-12 rounded-xl py-1 text-[8px] font-black uppercase tracking-[0.1em] flex flex-col items-center justify-center gap-0.5 transition ${
                  item.active
                    ? 'shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]'
                    : 'bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
                }`}
                style={item.active ? { backgroundColor: activePillColor, color: activeTextColor } : undefined}
              >
                <span
                  className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full ${
                    item.active ? '' : 'bg-slate-100 text-slate-600'
                  }`}
                  style={item.active ? { backgroundColor: activeIconBg, color: activeIconColor } : undefined}
                >
                  <Icon size={17} weight={item.active ? 'fill' : 'duotone'} />
                  {item.badge ? (
                    <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-black text-white flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="leading-none">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
