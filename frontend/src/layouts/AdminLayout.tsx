import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminDesktopSidebar } from '../components/Admin/AdminDesktopSidebar';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { CaretDown, SignOut, UserCircle, X } from '@phosphor-icons/react';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { ContextSideDrawer } from '../components/common/ContextSideDrawer';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { hexToRgba } from '../utils/hexToRgba';
import { getAdminAccountItems, getAdminNavGroup, isAdminNavGroupSection, type AdminNavGroupSection } from '../navigation/adminNavigation';
import { useAdminNav } from '../navigation/useAdminNav';

interface AdminLayoutProps {
  children: React.ReactNode;
  contextLabel?: string;
  showHeader?: boolean;
  fluid?: boolean;
  /** Renderiza sidebar desktop da loja. Default false = comportamento antigo
   *  (páginas standalone/SuperAdmin); as 4 telas principais optam por true. */
  withSidebar?: boolean;
  /** Override do item ativo (dashboard usa a aba corrente). */
  navActiveId?: string;
  /** Seleção guardada pela página (dashboard: runOrConfirmDiscard). */
  onNavSelect?: (id: string) => void;
  /** Badges do sidebar (ex: solicitações de motoboy pendentes). */
  navBadges?: { queueCount?: number; motoboysPending?: number };
}

export function AdminLayout({
  children,
  contextLabel = 'Painel',
  showHeader = true,
  fluid = false,
  withSidebar = false,
  navActiveId,
  onNavSelect,
  navBadges,
}: AdminLayoutProps) {
  const { auth } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const operatorRoleLabel =
    userRole === 'ADMIN' || userRole === 'LOJISTA'
      ? 'Administrador da loja'
      : userRole === 'OPERATOR'
        ? 'Operador da loja'
        : 'Conta da operação';
  const storeName = String(auth?.store?.name || 'Minha loja').trim() || 'Minha loja';
  const operatorName = String(auth?.user?.fullName || auth?.user?.name || '').trim();
  const storeEmail = String(auth?.user?.email || '').trim();
  const storeCity = String(auth?.store?.settings?.city || '').trim();
  const storeState = String(auth?.store?.settings?.state || '').trim().toUpperCase();
  const storeLocation = [storeCity, storeState].filter(Boolean).join(' · ');
  const storeLogo = resolveAssetUrl(String(auth?.store?.settings?.logoUrl || '')) || '';
  const primaryColor = String(
    auth?.store?.settings?.primaryColor ||
    auth?.store?.settings?.primary_color ||
    '#2f9df7'
  );

  // Fonte única de navegação (antes: mobileNavItems + groupedMobileSections +
  // activeMobileId próprios, com cfg-operation/cfg-printer/cfg-permissions
  // extintos e id fantasma 'vendas' apontando pra /admin/orders).
  const {
    sidebarItems: mobileNavItems,
    sections: groupedMobileSections,
    activeItemId: activeMobileId,
    selectItem,
    logout: navLogout,
  } = useAdminNav({ activeIdOverride: navActiveId, badges: navBadges });

  // Chrome desktop centralizado (antes: grid 260/80px + sidebar + compact
  // duplicados em Dashboard/Orders/Queue/Highlights). Keys preservadas.
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('adminSidebar:compact');
    if (saved === null) return window.matchMedia('(min-width: 1024px)').matches;
    return saved === 'true';
  });
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    localStorage.setItem('adminSidebar:compact', String(sidebarCompact));
  }, [sidebarCompact]);

  useEffect(() => {
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

  useEffect(() => {
    if (!isDesktopLayout || !sidebarCompact) return;
    setSidebarCompact(false);
  }, [isDesktopLayout, sidebarCompact]);

  const handleSidebarSelect = onNavSelect || ((id: string) => selectItem(id));

  useEffect(() => {
    if (!mobileNavOpen) return;
    const activeGroup = groupedMobileSections.find(
      (section): section is AdminNavGroupSection =>
        isAdminNavGroupSection(section) && section.children.some((child) => child.id === activeMobileId)
    );
    if (activeGroup) setMobileOpenGroup(activeGroup.id);
  }, [mobileNavOpen, groupedMobileSections, activeMobileId]);

  useEffect(() => {
    const open = () => setMobileNavOpen(true);
    window.addEventListener('admin:open-global-nav', open as EventListener);
    return () => window.removeEventListener('admin:open-global-nav', open as EventListener);
  }, []);

  useEffect(() => {
    const openAccountDrawer = () => {
      setMobileNavOpen(false);
      setAccountDrawerOpen(true);
    };
    window.addEventListener('admin:open-account-drawer', openAccountDrawer as EventListener);
    return () => window.removeEventListener('admin:open-account-drawer', openAccountDrawer as EventListener);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('admin-mobile-menu-open', mobileNavOpen);
    window.dispatchEvent(new CustomEvent('admin:mobile-menu', { detail: { open: mobileNavOpen } }));
    return () => {
      document.body.classList.remove('admin-mobile-menu-open');
      window.dispatchEvent(new CustomEvent('admin:mobile-menu', { detail: { open: false } }));
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Reset any global overflow/class leak from public pages when entering admin routes.
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('admin-mobile-menu-open');
  }, [location.pathname]);

  const runAfterMobileNavClose = (action: () => void) => {
    setMobileNavOpen(false);
    if (typeof window === 'undefined') {
      action();
      return;
    }
    window.requestAnimationFrame(action);
  };

  const handleNavSelect = (id: string) => {
    runAfterMobileNavClose(() => selectItem(id));
  };

  // Conta enxuta (decisão 29/08): só o que é de conta — assinatura, senha, MFA e
  // sair. Os 15 atalhos de navegação que duplicavam o menu moram no drawer
  // principal; nenhum destino deixou de existir.
  const accountActions = getAdminAccountItems(userRole).map((item) => {
    const Icon = item.icon;
    return {
      section: 'Conta',
      id: item.id,
      label: item.label,
      description: item.description || '',
      icon: <Icon size={22} weight="duotone" />,
      onClick: () => {
        setAccountDrawerOpen(false);
        selectItem(item.id);
      },
      ...(item.tone === 'danger' ? { tone: 'danger' as const } : {}),
    };
  });

  return (
    <div className="ds-admin-bg min-h-screen overflow-x-clip pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div
        key={location.pathname}
        className={
          fluid
            ? 'w-full min-w-0 px-3 py-3 sm:px-4 sm:py-4 lg:pl-0 lg:pr-10 lg:py-4 xl:pr-12 2xl:pr-14 space-y-3 sm:space-y-4'
            : 'w-full min-w-0 max-w-[1600px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 xl:px-8 space-y-3 sm:space-y-4'
        }
      >
        {showHeader && (
          <AdminHeader contextLabel={contextLabel} />
        )}
        {withSidebar ? (
          <div
            className={`w-full min-w-0 lg:grid lg:items-start lg:gap-0 ${
              sidebarCompact ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'
            }`}
          >
            <AdminDesktopSidebar
              items={mobileNavItems}
              activeId={activeMobileId}
              compact={sidebarCompact}
              onToggleCompact={() => setSidebarCompact((prev) => !prev)}
              onSelect={handleSidebarSelect}
              onLogout={navLogout}
            />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
      <AdminMobileBottomNav />
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="h-full w-[85%] max-w-[360px] border-r border-slate-200/90 bg-white shadow-[4px_0_32px_rgba(15,23,42,0.14)] px-4 pb-4 flex flex-col"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[0.6rem] border border-slate-200 bg-slate-50">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 truncate">{auth?.store?.name || 'Painel'}</p>
                  <p className="text-[15px] font-bold text-slate-900 truncate leading-tight">{auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Usuário'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 active:scale-95 hover:bg-slate-100"
                aria-label="Fechar menu"
              >
                <X size={15} weight="bold" />
              </button>
            </div>
            <div className="pt-2 space-y-0.5 flex-1 overflow-y-auto">
              {groupedMobileSections.filter((section: any) => section.type !== 'logout').map((section: any) => {
                if (section.type === 'item') {
                  const item = section.item;
                  const Icon = item.icon;
                  const isActive = activeMobileId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavSelect(item.id)}
                      className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-left text-[14px] font-medium flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                        item.disabled
                          ? 'bg-violet-500/[0.08] text-violet-600'
                          : isActive
                          ? 'text-slate-950 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                      style={isActive && !item.disabled ? { backgroundColor: hexToRgba(primaryColor, 0.18, 'rgba(51,65,85,0.18)') } : undefined}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon
                          size={15}
                          weight={isActive ? 'fill' : 'duotone'}
                          className={`shrink-0 transition-colors ${item.disabled ? 'text-violet-500' : isActive ? '' : 'text-slate-400'}`}
                          style={isActive && !item.disabled ? { color: primaryColor } : undefined}
                        />
                        {item.label}
                      </span>
                      {item.disabled && <span className="text-[9px] font-black rounded-full bg-violet-500/20 text-violet-300 px-2 py-0.5 uppercase tracking-wide">Pro</span>}
                    </button>
                  );
                }
                const isOpen = mobileOpenGroup === section.id;
                const hasActiveChild = section.children.some((child: any) => child.id === activeMobileId);
                return (
                  <div key={section.id} className="space-y-0.5 pt-2 first:pt-0">
                    <button
                      type="button"
                      onClick={() => setMobileOpenGroup((prev) => (prev === section.id ? null : section.id))}
                      className={`w-full px-3 py-2 rounded-lg text-left text-[11px] font-semibold flex items-center justify-between transition-colors ${
                        hasActiveChild ? 'text-[#1b77ba]' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        {(() => {
                          const GroupIcon = getAdminNavGroup(section.id)?.icon;
                          return GroupIcon ? (
                            <GroupIcon size={13} weight="duotone" className="shrink-0" />
                          ) : null;
                        })()}
                        {section.label}
                      </span>
                      <CaretDown size={12} weight="bold" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 ml-1 pl-3 border-l border-slate-200">
                        {section.children.map((item: any) => {
                          const Icon = item.icon;
                          const isActive = activeMobileId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNavSelect(item.id)}
                              className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-[14px] flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                                item.disabled
                                  ? 'bg-violet-500/[0.08] text-violet-600 font-medium'
                                  : isActive
                                  ? 'text-slate-950 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                              }`}
                              style={isActive && !item.disabled ? { backgroundColor: hexToRgba(primaryColor, 0.18, 'rgba(51,65,85,0.18)') } : undefined}
                            >
                              <span className="inline-flex items-center gap-2.5">
                                <Icon
                                  size={13}
                                  weight={isActive ? 'fill' : 'duotone'}
                                  className={`shrink-0 transition-colors ${item.disabled ? 'text-violet-500' : isActive ? '' : 'text-slate-400'}`}
                                  style={isActive && !item.disabled ? { color: primaryColor } : undefined}
                                />
                                {item.label}
                              </span>
                              {item.disabled && <span className="text-[9px] font-black rounded-full bg-violet-500/20 text-violet-300 px-2 py-0.5 uppercase tracking-wide">Pro</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                navLogout();
              }}
              className="mt-3 w-full min-h-11 px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-rose-100 active:scale-[0.98]"
            >
              <SignOut size={15} weight="bold" />
              Sair
            </button>
            <PlatformTrustFooter className="mt-3 pt-1 opacity-80" compact mode="minimal" />
          </aside>
        </div>
      )}
      {accountDrawerOpen && (
        <ContextSideDrawer
          isOpen={accountDrawerOpen}
          onClose={() => setAccountDrawerOpen(false)}
          side="left"
          theme="store"
          eyebrow="Menu da operação"
          title={storeName}
          subtitle={[operatorRoleLabel, operatorName || null, storeEmail || null].filter(Boolean).join(' · ') || 'Acesso da operação neste aparelho'}
          leading={
            storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName}
                className="h-10 w-10 rounded-[0.95rem] bg-white object-contain p-1"
              />
            ) : (
              <UserCircle size={26} weight="duotone" className="text-[#336886]" />
            )
          }
          badges={[
            { label: ['ADMIN', 'LOJISTA'].includes(userRole) ? 'Admin' : 'Operador', tone: 'brand' },
            { label: storeLocation || 'Operação ativa', tone: 'neutral' },
          ]}
          actions={accountActions}
          footer={<PlatformTrustFooter compact mode="default" align="left" />}
        />
      )}
    </div>
  );
}
