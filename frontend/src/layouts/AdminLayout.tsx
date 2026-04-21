// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CaretDown, ChartBar, CheckSquare, ClipboardText, CreditCard, Gear, Package, ShoppingCart, SignOut, Scooter, Star, Storefront, X, UsersThree } from '@phosphor-icons/react';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';

interface AdminLayoutProps {
  children: React.ReactNode;
  contextLabel?: string;
  showHeader?: boolean;
  fluid?: boolean;
}

export function AdminLayout({
  children,
  contextLabel = 'Painel',
  showHeader = true,
  fluid = false,
}: AdminLayoutProps) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR' || userRole === 'LOJISTA';
  const storeSlug = String(auth?.store?.slug || '').trim();
  const isVip = Boolean(auth?.store?.settings?.planExempt || auth?.subscription?.planExempt);
  const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
  const subscriptionStatus = String(auth?.subscription?.status || '').toUpperCase();
  const primaryColor = String(
    auth?.store?.settings?.primaryColor ||
    auth?.store?.settings?.primary_color ||
    '#334155'
  );
  const hexToRgba = (hex: string, alpha: number) => {
    const n = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(n)) return `rgba(51,65,85,${alpha})`;
    return `rgba(${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)},${alpha})`;
  };
  const canUseMotoboys = Boolean(
    isVip ||
      auth?.features?.motoboyManagement ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );

  const mobileNavItems = useMemo(
    () =>
      (isOperatorUser
        ? [
            { id: 'fila', label: 'Gestor de Pedidos', icon: CheckSquare },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'cardapio', label: 'Loja Online', icon: Package },
          ]
        : [
            { id: 'resumo', label: 'Resumo', icon: ChartBar },
            { id: 'fila', label: 'Gestor de Pedidos', icon: CheckSquare },
            { id: 'vendas', label: 'Histórico de Pedidos', icon: ClipboardText },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'estoque', label: 'Estoque', icon: Package },
            { id: 'destaques', label: 'Destaques', icon: Star },
            { id: 'cardapio', label: 'Loja Online', icon: ShoppingCart },
            { id: 'pagamentos', label: 'Minha assinatura', icon: CreditCard },
            { id: 'gateway', label: 'Gateway de pagamento', icon: CreditCard },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree },
            { id: 'config', label: 'Configurações', icon: Gear },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
          ]),
    [isOperatorUser, canUseMotoboys]
  );

  const groupedMobileSections = useMemo(() => {
    if (isOperatorUser) {
      return [
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'fila') },
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'produtos') },
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'cardapio') },
      ].filter((entry) => Boolean(entry?.item));
    }
    const byId = new Map((mobileNavItems || []).map((item) => [item.id, item]));
    const consumeIds = new Set<string>();
    const consume = (id: string) => {
      if (byId.has(id)) consumeIds.add(id);
      return byId.get(id);
    };
    const sections: any[] = [];
    const principal = consume('resumo');
    if (principal) sections.push({ type: 'item', item: principal });
    const vendas = ['fila', 'vendas', 'avaliacoes'].map(consume).filter(Boolean);
    if (vendas.length) sections.push({ type: 'group', id: 'vendas', label: 'Vendas', children: vendas });
    const catalogo = ['produtos', 'estoque', 'destaques', 'cardapio'].map(consume).filter(Boolean);
    if (catalogo.length) sections.push({ type: 'group', id: 'catalogo', label: 'Produtos e Loja', children: catalogo });
    const financeiro = ['pagamentos', 'gateway'].map(consume).filter(Boolean);
    if (financeiro.length) sections.push({ type: 'group', id: 'financeiro', label: 'Financeiro', children: financeiro });
    const gestao = ['motoboys', 'usuarios'].map(consume).filter(Boolean);
    if (gestao.length) sections.push({ type: 'group', id: 'gestao', label: 'Gestão', children: gestao });
    const sistema = consume('config');
    if (sistema) sections.push({ type: 'item', item: sistema });
    const leftovers = (mobileNavItems || []).filter((item) => !consumeIds.has(item.id));
    leftovers.forEach((item) => sections.push({ type: 'item', item }));
    return sections;
  }, [mobileNavItems, isOperatorUser]);

  const activeMobileId = useMemo(() => {
    const path = String(location.pathname || '');
    const persistedTab = typeof window !== 'undefined' ? String(sessionStorage.getItem('admin:activeTab') || '') : '';
    if (path.startsWith('/admin/queue')) return 'fila';
    if (path.startsWith('/admin/orders')) return 'vendas';
    if (path.startsWith('/admin/highlights')) return 'destaques';
    if (path.startsWith('/admin/dashboard')) return String((location.state as any)?.activeTab || persistedTab || '');
    return '';
  }, [location.pathname, location.state]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const activeGroup = groupedMobileSections.find(
      (section: any) => section.type === 'group' && section.children.some((child: any) => child.id === activeMobileId)
    );
    if (activeGroup?.id) setMobileOpenGroup(activeGroup.id);
  }, [mobileNavOpen, groupedMobileSections, activeMobileId]);

  useEffect(() => {
    const open = () => setMobileNavOpen(true);
    window.addEventListener('admin:open-global-nav', open as EventListener);
    return () => window.removeEventListener('admin:open-global-nav', open as EventListener);
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

  const handleNavSelect = (id: string) => {
    if (id === 'fila') {
      navigate('/admin/queue');
      setMobileNavOpen(false);
      return;
    }
    if (id === 'vendas') {
      navigate('/admin/orders');
      setMobileNavOpen(false);
      return;
    }
    if (id === 'cardapio') {
      if (storeSlug) navigate(`/${storeSlug}`);
      setMobileNavOpen(false);
      return;
    }
    if (id === 'destaques') {
      navigate('/admin/highlights');
      setMobileNavOpen(false);
      return;
    }
    if (id === 'motoboys' && !canUseMotoboys) {
      navigate('/admin/renewal?focus=pro');
      setMobileNavOpen(false);
      return;
    }
    navigate('/admin/dashboard', { state: { activeTab: id } });
    setMobileNavOpen(false);
  };

  return (
    <div className="ds-admin-bg overflow-x-clip pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* ── Mode indicator pill (fixed, above bottom nav) ── */}
      <div
        className="fixed left-3 z-[215] animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden rounded-full border border-white/[0.08] bg-slate-950/90 py-1.5 pl-2.5 pr-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.9)]" />
          <Storefront size={11} weight="duotone" className="shrink-0 text-sky-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Admin</span>
          <span className="mx-0.5 h-3 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => navigate('/hub')}
            className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-[9px] font-black text-sky-400 transition hover:bg-sky-500/25 active:scale-95"
          >
            <ArrowLeft size={9} weight="bold" />
            Hub
          </button>
        </div>
      </div>
      <div
        key={location.pathname}
        className={
          fluid
            ? 'w-full px-3 py-3 sm:px-4 sm:py-4 lg:pl-0 lg:pr-10 lg:py-4 xl:pr-12 2xl:pr-14 space-y-3 sm:space-y-4'
            : 'w-full max-w-[1600px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 xl:px-8 space-y-3 sm:space-y-4'
        }
      >
        {showHeader && (
          <AdminHeader contextLabel={contextLabel} />
        )}
        {children}
      </div>
      <AdminMobileBottomNav />
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999] bg-black/55 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="h-full w-[85%] max-w-[360px] border-r border-white/[0.07] shadow-[2px_0_40px_rgba(0,0,0,0.55)] px-4 pb-4 flex flex-col"
            style={{
              paddingTop: 'calc(1rem + env(safe-area-inset-top))',
              background: `linear-gradient(180deg, ${hexToRgba(primaryColor, 0.18)} 0px, #111114 100px, #111114 100%)`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[0.6rem] border border-white/15 bg-white/10">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold">Painel</p>
                  <p className="text-[13px] font-bold text-slate-100 truncate leading-tight">{auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Usuário'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.07] text-slate-400 active:scale-95"
                aria-label="Fechar menu"
              >
                <X size={15} weight="bold" />
              </button>
            </div>
            <div className="pt-2 space-y-0.5 flex-1 overflow-y-auto">
              {groupedMobileSections.map((section: any) => {
                if (section.type === 'item') {
                  const item = section.item;
                  const Icon = item.icon;
                  const isActive = activeMobileId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavSelect(item.id)}
                      className={`w-full min-h-[42px] px-2.5 py-2 rounded-xl text-left text-[13px] font-medium flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                        item.disabled
                          ? 'bg-violet-500/[0.12] text-violet-300'
                          : isActive
                          ? 'text-white font-semibold'
                          : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                      }`}
                      style={isActive && !item.disabled ? { backgroundColor: hexToRgba(primaryColor, 0.18) } : undefined}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon
                          size={15}
                          weight={isActive ? 'fill' : 'duotone'}
                          className={`shrink-0 transition-colors ${item.disabled ? 'text-violet-400' : isActive ? '' : 'text-slate-500'}`}
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
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-between transition-colors ${
                        hasActiveChild ? 'text-slate-200' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span>{section.label}</span>
                      <CaretDown size={12} weight="bold" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 ml-1 pl-3 border-l border-white/[0.07]">
                        {section.children.map((item: any) => {
                          const Icon = item.icon;
                          const isActive = activeMobileId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNavSelect(item.id)}
                              className={`w-full min-h-[40px] px-2.5 py-2 rounded-xl text-left text-[13px] flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                                item.disabled
                                  ? 'bg-violet-500/[0.12] text-violet-300 font-medium'
                                  : isActive
                                  ? 'text-white font-semibold'
                                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 font-normal'
                              }`}
                              style={isActive && !item.disabled ? { backgroundColor: hexToRgba(primaryColor, 0.18) } : undefined}
                            >
                              <span className="inline-flex items-center gap-2.5">
                                <Icon
                                  size={13}
                                  weight={isActive ? 'fill' : 'duotone'}
                                  className={`shrink-0 transition-colors ${item.disabled ? 'text-violet-400' : isActive ? '' : 'text-slate-500'}`}
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
                markManualLogoutRedirect('admin', '/hub');
                logout();
                setMobileNavOpen(false);
                navigate('/hub', { replace: true });
              }}
              className="mt-3 w-full min-h-11 px-3 py-2.5 rounded-xl border border-rose-500/[0.22] bg-rose-500/[0.1] text-rose-400 text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-rose-500/[0.16] active:scale-[0.98]"
            >
              <SignOut size={15} weight="bold" />
              Sair da conta
            </button>
            <PlatformTrustFooter className="mt-3 pt-1 opacity-40" compact mode="minimal" />
          </aside>
        </div>
      )}
    </div>
  );
}
