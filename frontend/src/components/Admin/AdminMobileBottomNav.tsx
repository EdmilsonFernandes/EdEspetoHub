// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChartBar, ChefHat, CurrencyDollar, DotsThreeCircle, Package, SignOut, UserCircle } from '@phosphor-icons/react';
import { hexToRgba } from '../utils/hexToRgba';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { loadAdminDashboardPage, loadAdminQueuePage, loadStorePage } from '../../utils/adminRoutePrefetch';
import { ContextSideDrawer } from '../common/ContextSideDrawer';
import { PlatformTrustFooter } from '../common/PlatformTrustFooter';
import {
  filterSuperAdminNavigationItems,
  getSuperAdminGroup,
  isSuperAdminNavigationItemActive,
  SUPER_ADMIN_ACTIVE_SECTION_KEY,
  SUPER_ADMIN_NAV_GROUPS,
  type SuperAdminNavigationItem,
} from '../../navigation/superAdminNavigation';

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
  const [superMoreOpen, setSuperMoreOpen] = useState(false);
  const [superMenuSearch, setSuperMenuSearch] = useState('');
  const [superActiveSection, setSuperActiveSection] = useState(() => {
    if (typeof window === 'undefined') return 'executive';
    return String(sessionStorage.getItem(SUPER_ADMIN_ACTIVE_SECTION_KEY) || 'executive');
  });
  const optimisticTimerRef = useRef<number | null>(null);

  const setOptimisticNav = (id: string) => {
    setOptimisticActiveId(id);
    if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
    optimisticTimerRef.current = window.setTimeout(() => setOptimisticActiveId(''), 900);
  };

  const openSuperAdminSection = (section: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SUPER_ADMIN_ACTIVE_SECTION_KEY, section);
      window.dispatchEvent(new CustomEvent('superadmin:set-section', { detail: { section } }));
    }
    setSuperActiveSection(section);
    setSuperMoreOpen(false);
    if (path !== '/superadmin') navigate('/superadmin');
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

  useEffect(() => {
    if (!path.startsWith('/admin') && !isSuperAdminPath) return;
    setHiddenByCart(false);
    setHiddenByOverlay(false);
    setIsVisible(true);
  }, [dashboardTab, isSuperAdminPath, path]);

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
    if (!isSuperAdminPath) {
      setSuperMoreOpen(false);
      return;
    }
    const syncSuperSection = (event?: any) => {
      const fromEvent = String(event?.detail?.section || '').trim();
      const fromStorage =
        typeof window !== 'undefined'
          ? String(sessionStorage.getItem(SUPER_ADMIN_ACTIVE_SECTION_KEY) || '').trim()
          : '';
      setSuperActiveSection(fromEvent || fromStorage || 'executive');
    };
    syncSuperSection();
    window.addEventListener('superadmin:active-section-changed', syncSuperSection as EventListener);
    window.addEventListener('superadmin:set-section', syncSuperSection as EventListener);
    return () => {
      window.removeEventListener('superadmin:active-section-changed', syncSuperSection as EventListener);
      window.removeEventListener('superadmin:set-section', syncSuperSection as EventListener);
    };
  }, [isSuperAdminPath, path]);

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
    const superPrimaryItems = [
      {
        id: 'super-overview',
        label: 'Resumo',
        icon: SUPER_ADMIN_NAV_GROUPS.find((group) => group.id === 'overview')?.icon || ChartBar,
        active: path === '/superadmin' && ['executive', 'rankings'].includes(superActiveSection),
        onClick: () => openSuperAdminSection('executive'),
      },
      {
        id: 'super-operation',
        label: 'Operação',
        icon: SUPER_ADMIN_NAV_GROUPS.find((group) => group.id === 'operation')?.icon || ChartBar,
        active: path === '/superadmin' && ['stores', 'payments'].includes(superActiveSection),
        onClick: () => openSuperAdminSection('stores'),
      },
      {
        id: 'super-ecosystem',
        label: 'Ecossistema',
        icon: SUPER_ADMIN_NAV_GROUPS.find((group) => group.id === 'ecosystem')?.icon || ChartBar,
        active:
          path.startsWith('/superadmin/destinations') ||
          path.startsWith('/superadmin/condominiums'),
        onClick: () => navigate('/superadmin/destinations'),
      },
      {
        id: 'super-marketing',
        label: 'Marketing',
        icon: SUPER_ADMIN_NAV_GROUPS.find((group) => group.id === 'marketing')?.icon || ChartBar,
        active:
          (path === '/superadmin' && superActiveSection === 'push') ||
          path.startsWith('/superadmin/home-config') ||
          path.startsWith('/superadmin/email-templates'),
        onClick: () => openSuperAdminSection('push'),
      },
      {
        id: 'super-more',
        label: 'Mais',
        icon: DotsThreeCircle,
        active:
          superMoreOpen ||
          (path === '/superadmin' &&
            ['kyc', 'security', 'logs', 'events', 'health', 'versions'].includes(superActiveSection)),
        onClick: () => setSuperMoreOpen((prev) => !prev),
      },
    ];
    const openSuperAdminNavigationItem = (item: SuperAdminNavigationItem) => {
      setSuperMoreOpen(false);
      if (item.section) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SUPER_ADMIN_ACTIVE_SECTION_KEY, item.section);
          window.dispatchEvent(new CustomEvent('superadmin:set-section', { detail: { section: item.section } }));
        }
        setSuperActiveSection(item.section);
      }
      if (item.route) {
        navigate(item.route);
        return;
      }
      if (item.section && path !== '/superadmin') navigate('/superadmin');
    };
    const superMenuActions = [
      ...filterSuperAdminNavigationItems(superMenuSearch)
          .filter((item) => item.group === 'trust' || item.group === 'technical')
          .map((item) => {
        const Icon = item.icon;
        const group = getSuperAdminGroup(item.group);
        const active = isSuperAdminNavigationItemActive(item, path, superActiveSection);
        return {
          section: group?.label || 'Super Admin',
          id: item.id,
          label: item.label,
          description: item.description,
          icon: <Icon size={22} weight={active ? 'fill' : 'duotone'} />,
          badge: active ? 'Atual' : undefined,
          badgeTone: 'brand' as const,
          onClick: () => openSuperAdminNavigationItem(item),
        };
      }),
      {
        section: 'Conta',
        id: 'super-logout',
        label: 'Sair',
        description: 'Encerrar sessão do Super Admin neste aparelho.',
        icon: <SignOut size={22} weight="duotone" />,
        tone: 'danger' as const,
        onClick: () => {
          localStorage.removeItem('superAdminToken');
          localStorage.removeItem('superAdminUser');
          window.location.assign('/superadmin');
        },
      },
    ];

    if (hiddenByOverlay) return null;

    return (
      <>
        <ContextSideDrawer
          isOpen={superMoreOpen}
          onClose={() => setSuperMoreOpen(false)}
          side="left"
          theme="client"
          eyebrow="Master Console"
          title="Super Admin"
          subtitle="Busque ou navegue por módulos sem perder o contexto."
          leading={<img src="/janocaminho.jpg" alt="Já no Caminho" className="h-10 w-10 rounded-[0.95rem] bg-white object-cover" />}
          badges={[
            { label: 'Operação', tone: 'brand' },
            { label: 'Mobile first', tone: 'neutral' },
          ]}
          searchValue={superMenuSearch}
          searchPlaceholder="Buscar módulo, ex: push, destino, e-mail..."
          onSearchChange={setSuperMenuSearch}
          actions={superMenuActions}
          footer={<PlatformTrustFooter compact mode="default" align="left" />}
        />

        <nav
          className="fixed inset-x-0 bottom-0 z-[220] pointer-events-none transition-transform duration-300 ease-in-out flex justify-center"
          style={{
            transform: effectiveVisibility ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
          }}
        >
          <ul className="pointer-events-auto mx-auto grid w-full max-w-md grid-cols-5 gap-1 border-t border-slate-200/60 bg-white/[0.97] px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-18px_44px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
            {superPrimaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = optimisticActiveId ? optimisticActiveId === item.id : item.active;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onPointerDown={() => setOptimisticNav(item.id)}
                    onClick={() => item.onClick()}
                    className={`w-full flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-bold uppercase tracking-[0.06em] transition-all active:scale-[0.96] ${
                      isActive ? 'text-[#153A4C]' : 'text-slate-400'
                    }`}
                  >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                      isActive ? 'bg-[#153A4C] text-white shadow-[0_14px_28px_-18px_rgba(21,58,76,0.55)] scale-[1.06]' : 'bg-slate-50 ring-1 ring-slate-200/60'
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
      </>
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
      <ul className={`pointer-events-auto mx-auto grid ${navItems.length <= 2 ? 'grid-cols-2' : navItems.length === 3 ? 'grid-cols-3' : navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-0.5 w-full max-w-lg sm:max-w-xl md:max-w-2xl border-t border-slate-200/60 bg-white/[0.97] px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-18px_44px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = optimisticActiveId ? optimisticActiveId === item.id : item.active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onPointerDown={() => {
                  if (item.id === 'account') return;
                  setOptimisticNav(item.id);
                  preloadNavTarget(item.id);
                }}
                onClick={() => handleNavPress(item)}
                className={`w-full flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-bold uppercase tracking-[0.06em] transition-all active:scale-[0.96] ${
                  isActive ? '' : 'text-slate-400'
                }`}
                style={isActive ? { color: activeTextColor } : undefined}
              >
                <span
                  className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? '' : 'bg-slate-50 ring-1 ring-slate-200/60'
                  }`}
                  style={isActive ? { backgroundColor: activeIconBg, color: activeIconColor, boxShadow: '0 14px 28px -18px rgba(21,58,76,0.35)', transform: 'scale(1.06)' } : undefined}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'duotone'} />
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-rose-500 px-1 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
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
