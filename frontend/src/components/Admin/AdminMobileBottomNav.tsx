// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Buildings, ChartBar, ChefHat, Compass, CurrencyDollar, EnvelopeSimple, ImageSquare, Package, SignOut, UserCircle } from '@phosphor-icons/react';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { loadAdminDashboardPage, loadAdminQueuePage, loadStorePage } from '../../utils/adminRoutePrefetch';

export function AdminMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const role = String(auth?.user?.role || '').toUpperCase();
  const isOperator = role === 'OPERATOR';
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
  const isSuperAdminPath = path.startsWith('/superadmin');
  const dashboardTab =
    (location.state as any)?.activeTab ||
    (typeof window !== 'undefined' ? String(sessionStorage.getItem('admin:activeTab') || '') : '');
  const [monitorCount, setMonitorCount] = useState(0);
  const [hiddenByOverlay, setHiddenByOverlay] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hiddenByCart, setHiddenByCart] = useState(false);
  const [optimisticActiveId, setOptimisticActiveId] = useState('');
  const optimisticTimerRef = useRef<number | null>(null);

  const setOptimisticNav = (id: string) => {
    setOptimisticActiveId(id);
    if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
    optimisticTimerRef.current = window.setTimeout(() => setOptimisticActiveId(''), 900);
  };

  const preloadNavTarget = (id: string) => {
    if (id === 'monitor' || id === 'pedidos') {
      void loadAdminQueuePage().catch(() => undefined);
      return;
    }
    if (id === 'catalogo') {
      void loadStorePage().catch(() => undefined);
      return;
    }
    if (id === 'produtos' || id === 'resumo') {
      void loadAdminDashboardPage().catch(() => undefined);
    }
  };

  const handleNavPress = (item: any) => {
    setOptimisticNav(item.id);
    preloadNavTarget(item.id);
    item.onClick();
  };

  useEffect(() => {
    return () => {
      if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleCartVisibility = (e: any) => {
      setHiddenByCart(!!e.detail?.visible);
    };
    window.addEventListener('jnk:cart-visibility', handleCartVisibility);
    return () => window.removeEventListener('jnk:cart-visibility', handleCartVisibility);
  }, []);

  const effectiveVisibility = isVisible && !hiddenByCart;
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
    if (isSuperAdminPath) return;
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
  }, [isSuperAdminPath]);

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
    if (typeof window !== 'undefined') sessionStorage.setItem('admin:activeTab', 'resumo');
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
      onClick: () => {
        if (typeof window !== 'undefined') sessionStorage.setItem('admin:activeTab', 'produtos');
        navigate('/admin/dashboard', { state: { activeTab: 'produtos' } });
      },
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
      onClick: () => {
        if (typeof window !== 'undefined') sessionStorage.setItem('admin:activeTab', 'resumo');
        navigate('/admin/dashboard', { state: { activeTab: 'resumo' } });
      },
    },
  ];
  const items = isOperator
    ? baseItems.filter((item) => item.id === 'monitor' || item.id === 'produtos' || item.id === 'catalogo')
    : baseItems.filter((item) => item.id !== 'produtos');
  const navItems = [
    ...items,
    {
      id: 'account',
      label: 'Conta',
      icon: UserCircle,
      active: false,
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin:open-account-drawer'));
        }
      },
    },
  ];

  useEffect(() => {
    if (!optimisticActiveId) return;
    if (navItems.some((item: any) => item.id === optimisticActiveId && item.active)) {
      setOptimisticActiveId('');
    }
  }, [dashboardTab, optimisticActiveId, path, navItems]);

  if (isSuperAdminPath) {
    const superItems = [
      {
        id: 'super-home',
        label: 'Resumo',
        icon: ChartBar,
        active: path === '/superadmin',
        onClick: () => navigate('/superadmin'),
      },
      {
        id: 'super-condominiums',
        label: 'Condomínios',
        icon: Buildings,
        active: path.startsWith('/superadmin/condominiums'),
        onClick: () => navigate('/superadmin/condominiums'),
      },
      {
        id: 'super-destinations',
        label: 'Destinos',
        icon: Compass,
        active: path.startsWith('/superadmin/destinations'),
        onClick: () => navigate('/superadmin/destinations'),
      },
      {
        id: 'super-home-config',
        label: 'Banners',
        icon: ImageSquare,
        active: path.startsWith('/superadmin/home-config'),
        onClick: () => navigate('/superadmin/home-config'),
      },
      {
        id: 'super-email',
        label: 'E-mails',
        icon: EnvelopeSimple,
        active: path.startsWith('/superadmin/email-templates'),
        onClick: () => navigate('/superadmin/email-templates'),
      },
      {
        id: 'super-logout',
        label: 'Sair',
        icon: SignOut,
        tone: 'danger',
        active: false,
        onClick: () => {
          localStorage.removeItem('superAdminToken');
          localStorage.removeItem('superAdminUser');
          if (typeof window !== 'undefined') {
            window.location.assign('/superadmin');
          } else {
            navigate('/superadmin', { replace: true });
          }
        },
      },
    ];

    if (hiddenByOverlay) return null;

    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-[220] pointer-events-none transition-transform duration-300 ease-in-out flex justify-center"
        style={{
          transform: effectiveVisibility ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
        }}
      >
        <ul className={`pointer-events-auto mx-auto grid w-full max-w-md ${superItems.length === 3 ? 'grid-cols-3' : superItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} gap-0.5 border-t border-slate-200/60 bg-white/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_32px_-16px_rgba(15,23,42,0.18)] backdrop-blur-xl`}>
          {superItems.map((item) => {
            const Icon = item.icon;
            const danger = item.tone === 'danger';
            const isActive = optimisticActiveId ? optimisticActiveId === item.id : item.active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onPointerDown={() => setOptimisticNav(item.id)}
                  onClick={() => handleNavPress(item)}
                  className={`w-full flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-bold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                    isActive
                      ? 'text-[#153A4C]'
                      : danger
                        ? 'text-rose-500'
                        : 'text-slate-400'
                  }`}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl transition-all ${
                    isActive
                      ? 'bg-[#153A4C]/10 text-[#153A4C]'
                      : danger
                        ? 'bg-rose-50 text-rose-500'
                        : 'text-slate-400'
                  }`}>
                    <Icon size={18} weight={isActive ? 'fill' : 'duotone'} />
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

  if (isSuperAdmin || hiddenByOverlay) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[220] pointer-events-none transition-transform duration-300 ease-in-out flex justify-center"
      style={{
        transform: effectiveVisibility ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
      }}
    >
      <ul className={`pointer-events-auto mx-auto grid ${navItems.length <= 2 ? 'grid-cols-2' : navItems.length === 3 ? 'grid-cols-3' : navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-0.5 w-full max-w-lg sm:max-w-xl md:max-w-2xl border-t border-slate-200/60 bg-white/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_32px_-16px_rgba(15,23,42,0.18)] backdrop-blur-xl`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = optimisticActiveId ? optimisticActiveId === item.id : item.active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onPointerDown={() => {
                  setOptimisticNav(item.id);
                  preloadNavTarget(item.id);
                }}
                onClick={() => handleNavPress(item)}
                className={`w-full flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-bold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                  isActive ? '' : 'text-slate-400'
                }`}
                style={isActive ? { color: activeTextColor } : undefined}
              >
                <span
                  className={`relative inline-flex h-8 w-8 items-center justify-center rounded-2xl transition-all ${
                    isActive ? '' : 'text-slate-400'
                  }`}
                  style={isActive ? { backgroundColor: activePillColor, color: activeIconBg } : undefined}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'duotone'} />
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-rose-500 px-1 text-[9px] font-black text-white flex items-center justify-center">
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
