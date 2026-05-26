// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Buildings, ChartBar, ChefHat, Compass, CurrencyDollar, DotsThreeCircle, EnvelopeSimple, ImageSquare, Megaphone, Package, RocketLaunch, ShieldCheck, SignOut, Storefront, UserCircle, X } from '@phosphor-icons/react';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { loadAdminDashboardPage, loadAdminQueuePage, loadStorePage } from '../../utils/adminRoutePrefetch';

const SUPER_ADMIN_ACTIVE_SECTION_KEY = 'superadmin:activeSection';

export function AdminMobileBottomNav({ onOpenAccount }: { onOpenAccount?: () => void } = {}) {
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
        if (typeof onOpenAccount === 'function') {
          onOpenAccount();
          return;
        }
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
        id: 'super-home',
        label: 'Resumo',
        icon: ChartBar,
        active: path === '/superadmin' && superActiveSection === 'executive',
        onClick: () => openSuperAdminSection('executive'),
      },
      {
        id: 'super-operation',
        label: 'Operação',
        icon: Storefront,
        active: path === '/superadmin' && ['rankings', 'stores', 'payments'].includes(superActiveSection),
        onClick: () => openSuperAdminSection('stores'),
      },
      {
        id: 'super-platform',
        label: 'Plataforma',
        icon: Megaphone,
        active:
          path === '/superadmin' && ['push', 'kyc', 'security'].includes(superActiveSection),
        onClick: () => openSuperAdminSection('push'),
      },
      {
        id: 'super-more',
        label: 'Mais',
        icon: DotsThreeCircle,
        active:
          superMoreOpen ||
          path.startsWith('/superadmin/condominiums') ||
          path.startsWith('/superadmin/destinations') ||
          path.startsWith('/superadmin/home-config') ||
          path.startsWith('/superadmin/email-templates') ||
          ['logs', 'events', 'versions'].includes(superActiveSection),
        onClick: () => setSuperMoreOpen((prev) => !prev),
      },
    ];
    const superMoreItems = [
      { id: 'super-condominiums', label: 'Condomínios', subtitle: 'Acessos e feiras', icon: Buildings, href: '/superadmin/condominiums', active: path.startsWith('/superadmin/condominiums') },
      { id: 'super-destinations', label: 'Destinos', subtitle: 'Chalés e serviços', icon: Compass, href: '/superadmin/destinations', active: path.startsWith('/superadmin/destinations') },
      { id: 'super-home-config', label: 'Banners da Home', subtitle: 'Home e popup', icon: ImageSquare, href: '/superadmin/home-config', active: path.startsWith('/superadmin/home-config') },
      { id: 'super-email', label: 'E-mails', subtitle: 'Templates e descadastro', icon: EnvelopeSimple, href: '/superadmin/email-templates', active: path.startsWith('/superadmin/email-templates') },
      { id: 'super-kyc', label: 'KYC entregadores', subtitle: 'Documentos e decisão', icon: ShieldCheck, section: 'kyc', active: path === '/superadmin' && superActiveSection === 'kyc' },
      { id: 'super-security', label: 'Segurança', subtitle: 'Clientes e bloqueios', icon: ShieldCheck, section: 'security', active: path === '/superadmin' && superActiveSection === 'security' },
      { id: 'super-versions', label: 'Versões', subtitle: 'Build e commits', icon: RocketLaunch, section: 'versions', active: path === '/superadmin' && superActiveSection === 'versions' },
      { id: 'super-logout', label: 'Sair', subtitle: 'Encerrar sessão', icon: SignOut, danger: true },
    ];

    if (hiddenByOverlay) return null;

    return (
      <>
        {superMoreOpen ? (
          <div className="fixed inset-0 z-[240] bg-slate-950/35 backdrop-blur-[2px]" onClick={() => setSuperMoreOpen(false)}>
            <div
              className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+5.9rem)] mx-auto max-w-md overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 p-3 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.58)] backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Super Admin</p>
                  <p className="text-sm font-black text-slate-950">Mais opções</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuperMoreOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-100 bg-slate-50 text-slate-500 active:scale-95"
                  aria-label="Fechar mais opções"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {superMoreItems.map((item: any) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.danger) {
                          localStorage.removeItem('superAdminToken');
                          localStorage.removeItem('superAdminUser');
                          window.location.assign('/superadmin');
                          return;
                        }
                        if (item.href) {
                          setSuperMoreOpen(false);
                          navigate(item.href);
                          return;
                        }
                        if (item.section) openSuperAdminSection(item.section);
                      }}
                      className={`min-h-[76px] rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                        item.active
                          ? 'border-[#336886]/20 bg-[#336886]/8 text-[#153A4C]'
                          : item.danger
                            ? 'border-rose-100 bg-rose-50/80 text-rose-600'
                            : 'border-slate-100 bg-slate-50/80 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className={`mb-2 grid h-8 w-8 place-items-center rounded-xl ${
                        item.active
                          ? 'bg-[#153A4C] text-white'
                          : item.danger
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-white text-[#336886]'
                      }`}>
                        <Icon size={17} weight={item.active ? 'fill' : 'duotone'} />
                      </span>
                      <span className="block text-xs font-black leading-tight">{item.label}</span>
                      <span className={`mt-0.5 block text-[10px] font-semibold leading-tight ${item.danger ? 'text-rose-500/75' : 'text-slate-400'}`}>{item.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <nav
          className="fixed inset-x-0 bottom-0 z-[220] pointer-events-none transition-transform duration-300 ease-in-out flex justify-center"
          style={{
            transform: effectiveVisibility ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
          }}
        >
          <ul className="pointer-events-auto mx-auto grid w-full max-w-md grid-cols-4 gap-1 border-t border-slate-200/60 bg-white/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_32px_-16px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            {superPrimaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = optimisticActiveId ? optimisticActiveId === item.id : item.active;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onPointerDown={() => setOptimisticNav(item.id)}
                    onClick={() => item.onClick()}
                    className={`w-full flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-bold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                      isActive ? 'text-[#153A4C]' : 'text-slate-400'
                    }`}
                  >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl transition-all ${
                      isActive ? 'bg-[#153A4C]/10 text-[#153A4C]' : 'text-slate-400'
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
      <ul className={`pointer-events-auto mx-auto grid ${navItems.length <= 2 ? 'grid-cols-2' : navItems.length === 3 ? 'grid-cols-3' : navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-0.5 w-full max-w-lg sm:max-w-xl md:max-w-2xl border-t border-slate-200/60 bg-white/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_32px_-16px_rgba(15,23,42,0.18)] backdrop-blur-xl`}>
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
