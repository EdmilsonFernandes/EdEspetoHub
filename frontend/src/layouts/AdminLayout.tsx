// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CaretDown, ChartBar, CheckSquare, ClipboardText, CreditCard, Gear, Package, ShoppingCart, SignOut, Scooter, Star, X, UsersThree } from '@phosphor-icons/react';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';

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
            { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
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
    const financeiro = ['pagamentos'].map(consume).filter(Boolean);
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
            className="h-full w-[85%] max-w-[360px] bg-white border-r border-slate-200 shadow-2xl p-4 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Navegação</p>
                <p className="text-sm font-bold text-slate-900 truncate">{auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Usuário'}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                aria-label="Fechar menu"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="pt-2 space-y-1 flex-1 overflow-y-auto">
              {groupedMobileSections.map((section: any) => {
                if (section.type === 'item') {
                  const item = section.item;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavSelect(item.id)}
                      className={`w-full min-h-11 px-2.5 py-2.5 rounded-lg text-left text-sm font-medium flex items-center justify-between transition-colors ${
                        item.disabled
                          ? 'bg-violet-50 text-violet-700'
                          : activeMobileId === item.id
                          ? 'bg-slate-50 text-brand-primary border-l-4 border-brand-primary pl-2'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon size={16} weight="duotone" />
                        {item.label}
                      </span>
                      {item.disabled && <span className="text-[10px] font-bold rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">Pro</span>}
                    </button>
                  );
                }
                const isOpen = mobileOpenGroup === section.id;
                const hasActiveChild = section.children.some((child: any) => child.id === activeMobileId);
                return (
                  <div key={section.id} className="space-y-0.5 border-b border-slate-100 pb-1.5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setMobileOpenGroup((prev) => (prev === section.id ? null : section.id))}
                      className={`w-full min-h-11 px-2.5 py-2.5 rounded-lg text-left text-sm font-semibold flex items-center justify-between transition-colors ${
                        hasActiveChild
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span>{section.label}</span>
                      <CaretDown size={16} weight="bold" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 bg-slate-50/90 rounded-lg py-1">
                        {section.children.map((item: any) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNavSelect(item.id)}
                              className={`w-full min-h-11 pl-5 pr-2.5 py-2.5 rounded-md text-left text-sm font-normal flex items-center justify-between transition-colors ${
                                item.disabled
                                  ? 'bg-violet-50 text-violet-700'
                                  : activeMobileId === item.id
                                  ? 'bg-white text-brand-primary border-l-4 border-brand-primary pl-4'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Icon size={15} weight="duotone" />
                                {item.label}
                              </span>
                              {item.disabled && <span className="text-[10px] font-bold rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">Pro</span>}
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
                logout();
                setMobileNavOpen(false);
                navigate('/admin');
              }}
              className="mt-3 w-full min-h-12 px-3 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <SignOut size={16} weight="bold" />
              Sair
            </button>
            <PlatformTrustFooter className="mt-3 pt-1" compact mode="minimal" />
          </aside>
        </div>
      )}
    </div>
  );
}
