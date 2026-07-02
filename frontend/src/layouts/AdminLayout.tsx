// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Buildings, CaretDown, ChartBar, ChatCircle, CheckSquare, ClipboardText, Clock, Compass, CreditCard, ForkKnife, Gear, IdentificationCard, LockKey, Package, PlugsConnected, Printer, ShieldCheck, ShoppingCart, SignOut, Scooter, Sparkle, Stack, Star, Storefront, Truck, UserCircle, X, UsersThree } from '@phosphor-icons/react';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { ContextSideDrawer } from '../components/common/ContextSideDrawer';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

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
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR';
  const operatorRoleLabel =
    userRole === 'ADMIN' || userRole === 'LOJISTA'
      ? 'Administrador da loja'
      : userRole === 'OPERATOR'
        ? 'Operador da loja'
        : 'Conta da operação';
  const storeSlug = String(auth?.store?.slug || '').trim();
  const storeName = String(auth?.store?.name || 'Minha loja').trim() || 'Minha loja';
  const operatorName = String(auth?.user?.fullName || auth?.user?.name || '').trim();
  const storeEmail = String(auth?.user?.email || '').trim();
  const storeCity = String(auth?.store?.settings?.city || '').trim();
  const storeState = String(auth?.store?.settings?.state || '').trim().toUpperCase();
  const storeLocation = [storeCity, storeState].filter(Boolean).join(' · ');
  const storeLogo = resolveAssetUrl(String(auth?.store?.settings?.logoUrl || '')) || '';
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
            { id: 'fila', label: 'Fila ao Vivo', icon: CheckSquare },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'cardapio', label: 'Loja Online', icon: Package },
            { id: 'config', label: 'Impressora', icon: Printer },
          ]
        : [
            { id: 'resumo', label: 'Início', icon: ChartBar },
            { id: 'fila', label: 'Fila ao Vivo', icon: CheckSquare },
            { id: 'vendas', label: 'Vendas', icon: ClipboardText },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'estoque', label: 'Estoque', icon: Stack },
            { id: 'cardapio', label: 'Loja Online', icon: Storefront },
            { id: 'destaques', label: 'Destaques', icon: Sparkle },
            { id: 'destinos', label: 'Destinos', icon: Compass },
            { id: 'condominios', label: 'Condomínios', icon: Buildings },
            { id: 'pagamentos', label: 'Assinatura e plano', icon: CreditCard },
            { id: 'gateway', label: 'Pagamentos online', icon: PlugsConnected },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree },
            { id: 'cfg-hub', label: 'Visão geral', icon: Gear },
            { id: 'cfg-profile', label: 'Perfil e marca', icon: IdentificationCard },
            { id: 'cfg-channels', label: 'Promo e contato', icon: ChatCircle },
            { id: 'cfg-delivery', label: 'Entrega e frete', icon: Truck },
            { id: 'cfg-ordering', label: 'Tipos de pedido', icon: ForkKnife },
            { id: 'cfg-hours', label: 'Horários', icon: Clock },
            { id: 'cfg-operation', label: 'Operação e som', icon: Bell },
            { id: 'cfg-printer', label: 'Impressora térmica', icon: Printer },
            { id: 'cfg-permissions', label: 'Permissões do app', icon: ShieldCheck },
          ]),
    [isOperatorUser, canUseMotoboys]
  );

  const groupedMobileSections = useMemo(() => {
    if (isOperatorUser) {
      return [
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'fila') },
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'produtos') },
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'cardapio') },
        { type: 'item', item: mobileNavItems.find((i) => i.id === 'config') },
      ].filter((entry) => Boolean(entry?.item));
    }
    const byId = new Map((mobileNavItems || []).map((item) => [item.id, item]));
    const consumeIds = new Set<string>();
    const consume = (id: string) => {
      if (byId.has(id)) consumeIds.add(id);
      return byId.get(id);
    };
    const consumeMany = (ids: string[]) => ids.map(consume).filter(Boolean);
    const sections: any[] = [];
    const principal = consume('resumo');
    if (principal) sections.push({ type: 'item', item: principal });
    const operacao = consumeMany(['fila', 'vendas', 'avaliacoes']);
    if (operacao.length) sections.push({ type: 'group', id: 'operacao', label: 'Operação', children: operacao });
    const catalogo = consumeMany(['produtos', 'estoque', 'cardapio']);
    if (catalogo.length) sections.push({ type: 'group', id: 'catalogo', label: 'Catálogo', children: catalogo });
    const crescer = consumeMany(['destaques', 'destinos', 'condominios']);
    if (crescer.length) sections.push({ type: 'group', id: 'crescer', label: 'Crescer', children: crescer });
    const financeiro = consumeMany(['pagamentos', 'gateway']);
    if (financeiro.length) sections.push({ type: 'group', id: 'financeiro', label: 'Financeiro', children: financeiro });
    const equipe = consumeMany(['motoboys', 'usuarios']);
    if (equipe.length) sections.push({ type: 'group', id: 'equipe', label: 'Equipe', children: equipe });
    // Configurações como submenu (cfg-*); operador sem cfg-* mantém 'config' como item único.
    const configChildren = (mobileNavItems || []).filter((item) => item.id.startsWith('cfg-'));
    if (configChildren.length) {
      configChildren.forEach((item) => consumeIds.add(item.id));
      sections.push({ type: 'group', id: 'config', label: 'Configurações', children: configChildren });
    } else {
      const sistema = consume('config');
      if (sistema) sections.push({ type: 'item', item: sistema });
    }
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
    if (path.startsWith('/admin/dashboard')) {
      const tab = String((location.state as any)?.activeTab || persistedTab || '');
      if (tab === 'config') {
        const section = String(new URLSearchParams(location.search || '').get('section') || 'hub');
        return `cfg-${section}`;
      }
      return tab;
    }
    return '';
  }, [location.pathname, location.state, location.search]);

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
    if (id.startsWith('cfg-')) {
      const section = id.slice(4) || 'hub';
      runAfterMobileNavClose(() => navigate(`/admin/dashboard?section=${encodeURIComponent(section)}`, { state: { activeTab: 'config' } }));
      return;
    }
    if (id === 'fila') {
      runAfterMobileNavClose(() => navigate('/admin/queue'));
      return;
    }
    if (id === 'vendas') {
      runAfterMobileNavClose(() => navigate('/admin/orders'));
      return;
    }
    if (id === 'cardapio') {
      runAfterMobileNavClose(() => {
        if (storeSlug) navigate(`/${storeSlug}`);
      });
      return;
    }
    if (id === 'destaques') {
      runAfterMobileNavClose(() => navigate('/admin/highlights'));
      return;
    }
    if (id === 'motoboys' && !canUseMotoboys) {
      runAfterMobileNavClose(() => navigate('/admin/renewal?focus=pro'));
      return;
    }
    runAfterMobileNavClose(() => navigate('/admin/dashboard', { state: { activeTab: id } }));
  };

  const accountActions = [
    ...(!isOperatorUser
      ? [{
          section: 'Painel',
          id: 'summary',
          label: 'Resumo da operação',
          description: 'Visão geral da loja, vendas e atalhos do painel.',
          icon: <ChartBar size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'resumo' } }),
        }]
      : []),
    {
      section: 'Pedidos',
      id: 'queue',
      label: 'Pedidos em operação',
      description: 'Acompanhe fila, produção e pedidos aguardando ação.',
      icon: <CheckSquare size={22} weight="duotone" />,
      onClick: () => navigate('/admin/queue'),
    },
    ...(!isOperatorUser
      ? [{
          section: 'Pedidos',
          id: 'orders',
          label: 'Histórico de pedidos',
          description: 'Pedidos finalizados, filtros e buscas da operação.',
          icon: <ClipboardText size={22} weight="duotone" />,
          onClick: () => navigate('/admin/orders'),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Pedidos',
          id: 'sales',
          label: 'Vendas concluídas',
          description: 'Atalho para a fila com pedidos já finalizados.',
          icon: <ClipboardText size={22} weight="duotone" />,
          onClick: () => navigate('/admin/queue', { state: { activeTab: 'completed' } }),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Pedidos',
          id: 'reviews',
          label: 'Avaliações',
          description: 'Notas e comentários dos clientes por pedido.',
          icon: <Star size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'avaliacoes' } }),
        }]
      : []),
    ...(storeSlug
      ? [{
          section: 'Loja',
          id: 'storefront',
          label: 'Minha vitrine',
          description: 'Abra a loja pública sem sair da operação.',
          icon: <ShoppingCart size={22} weight="duotone" />,
          onClick: () => navigate(`/${storeSlug}`),
        }]
      : []),
    {
      section: 'Loja',
      id: 'products',
      label: 'Produtos',
      description: 'Abra o catálogo e ajustes da vitrine.',
      icon: <Package size={22} weight="duotone" />,
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'produtos' } }),
    },
    {
      section: 'Loja',
      id: 'printer',
      label: 'Impressora',
      description: 'Configure a impressora Bluetooth deste aparelho.',
      icon: <Printer size={22} weight="duotone" />,
      onClick: () => navigate('/admin/dashboard?tab=config&section=printer'),
    },
    ...(!isOperatorUser
      ? [{
          section: 'Loja',
          id: 'stock',
          label: 'Estoque',
          description: 'Monitore níveis, alertas e movimentações dos produtos.',
          icon: <Package size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'estoque' } }),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Loja',
          id: 'highlights',
          label: 'Destaques',
          description: 'Solicite e acompanhe campanhas de visibilidade da loja.',
          icon: <Star size={22} weight="duotone" />,
          onClick: () => navigate('/admin/highlights'),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Financeiro',
          id: 'subscription',
          label: 'Minha assinatura',
          description: 'Controle assinatura, ciclo e renovação da loja.',
          icon: <CreditCard size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'pagamentos' } }),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Financeiro',
          id: 'gateway',
          label: 'Pagamentos online',
          description: 'Conecte e acompanhe Pix, crédito e débito online.',
          icon: <CreditCard size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'gateway' } }),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Operação',
          id: 'condominiums',
          label: 'Condomínios',
          description: 'Gerencie feiras, vínculos e aprovações da operação.',
          icon: <Buildings size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'condominios' } }),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Operação',
          id: 'destinations',
          label: 'Destinos',
          description: 'Solicite presença em chalés e pousadas atendidos pela loja.',
          icon: <Compass size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'destinos' } }),
        }]
      : []),
    ...(canUseMotoboys && ['ADMIN', 'LOJISTA'].includes(userRole)
      ? [{
          section: 'Operação',
          id: 'motoboys',
          label: 'Entregadores',
          description: 'Gestão de equipe, repasses e vínculo das entregas.',
          icon: <Scooter size={22} weight="duotone" />,
          onClick: () => navigate('/admin/motoboys'),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Operação',
          id: 'users',
          label: 'Usuários',
          description: 'Cadastre e gerencie acessos de admin e operador da loja.',
          icon: <UsersThree size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'usuarios' } }),
        }]
      : []),
    ...(!isOperatorUser
      ? [{
          section: 'Operação',
          id: 'settings',
          label: 'Configurações da loja',
          description: 'Marca, atendimento e ajustes principais da operação.',
          icon: <Gear size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'config' } }),
        }]
      : []),
    {
      section: 'Conta',
      id: 'password',
      label: 'Trocar senha',
      description: 'Atualize a senha deste acesso sem sair da operação.',
      icon: <LockKey size={22} weight="duotone" />,
      onClick: () => window.dispatchEvent(new CustomEvent('admin:open-change-password')),
    },
    {
      section: 'Conta',
      id: 'logout',
      label: 'Sair',
      description: '',
      icon: <SignOut size={22} weight="duotone" />,
      onClick: () => {
        markManualLogoutRedirect('admin', '/hub');
        logout();
        navigate('/hub', { replace: true });
      },
      tone: 'danger' as const,
    },
  ];

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
        {children}
      </div>
      <AdminMobileBottomNav />
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="h-full w-[85%] max-w-[360px] border-r border-white/[0.1] shadow-[4px_0_32px_rgba(15,23,42,0.5)] px-4 pb-4 flex flex-col"
            style={{
              paddingTop: 'calc(1rem + env(safe-area-inset-top))',
              background: `linear-gradient(160deg, #1a3a52 0%, #153A4C 40%, #0f2535 100%)`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.12]">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[0.6rem] border border-white/15 bg-white/10">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-[#336886]/80 font-bold truncate">{auth?.store?.name || 'Painel'}</p>
                  <p className="text-[13px] font-bold text-white truncate leading-tight">{auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Usuário'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.1] text-slate-300 active:scale-95"
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
                      className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-left text-[14px] font-medium flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                        item.disabled
                          ? 'bg-violet-500/[0.12] text-violet-300'
                          : isActive
                          ? 'text-white font-semibold'
                          : 'text-slate-300/80 hover:bg-white/[0.08] hover:text-white'
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
                      className={`w-full px-3 py-2 rounded-lg text-left text-[11px] font-black uppercase tracking-[0.14em] flex items-center justify-between transition-colors ${
                        hasActiveChild ? 'text-white' : 'text-slate-400/70 hover:text-slate-200'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span>{section.label}</span>
                      <CaretDown size={12} weight="bold" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 ml-1 pl-3 border-l border-white/[0.12]">
                        {section.children.map((item: any) => {
                          const Icon = item.icon;
                          const isActive = activeMobileId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNavSelect(item.id)}
                              className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-[14px] flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                                item.disabled
                                  ? 'bg-violet-500/[0.12] text-violet-300 font-medium'
                                  : isActive
                                  ? 'text-white font-semibold'
                                  : 'text-slate-300/80 hover:bg-white/[0.08] hover:text-white font-normal'
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
              Sair
            </button>
            <PlatformTrustFooter className="mt-3 pt-1 opacity-40" compact mode="minimal" />
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
