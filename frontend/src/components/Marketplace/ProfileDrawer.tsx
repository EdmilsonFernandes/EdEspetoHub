import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRinging,
  ArrowRight,
  CheckCircle,
  GearSix,
  Receipt,
  Storefront,
  CookingPot,
  Motorcycle,
  Headset,
  RocketLaunch,
  SignOut,
  ShieldCheckered,
  UserCircle,
  UserRectangle,
  CaretRight,
  Fingerprint,
  X
} from '@phosphor-icons/react';
import { nativeBiometricService } from '../../services/nativeBiometricService';

type DrawerAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  iconColor?: string;
  bgColor?: string;
  badge?: number;
};

type ProfileDrawerProps = {
  isOpen: boolean;
  isLogged: boolean;
  userName?: string;
  userEmail?: string;
  profileImageUrl?: string | null;
  onClose: () => void;
  onLogin: () => void;
  onOpenAdminLogin: () => void;
  onOpenMotoboyLogin: () => void;
  onOpenAccount: () => void;
  onOpenSettings: () => void;
  onOpenOrders?: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  onLogoutAdmin?: () => void;
  onLogoutMotoboy?: () => void;
  onRegisterClient: () => void;
  onRegisterStore: () => void;
  onRegisterMotoboy: () => void;
  versionLabel?: string;
};

type AccessProfile = {
  id: 'client' | 'store' | 'motoboy';
  title: string;
  subtitle: string;
  icon: ReactNode;
  action: () => void;
  current?: boolean;
  ready?: boolean;
};

type DrawerContext = 'guest' | 'client' | 'store' | 'motoboy';

export function ProfileDrawer({
  isOpen,
  isLogged,
  userName,
  userEmail,
  profileImageUrl,
  onClose,
  onLogin,
  onOpenAdminLogin,
  onOpenMotoboyLogin,
  onOpenAccount,
  onOpenSettings,
  onOpenOrders,
  onOpenTerms,
  onOpenPrivacy: _onOpenPrivacy,
  onOpenHelp,
  onLogout,
  onLogoutAdmin,
  onLogoutMotoboy,
  onRegisterClient,
  onRegisterStore,
  onRegisterMotoboy,
  versionLabel,
}: ProfileDrawerProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const drawerNavigate = useNavigate();
  const [isMotoboy, setIsMotoboy] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [accessPickerOpen, setAccessPickerOpen] = useState(false);
  const [notifBadge, setNotifBadge] = useState(0);
  const [highlightFirstAccess, setHighlightFirstAccess] = useState(false);
  const [accessPickerMode, setAccessPickerMode] = useState<'login' | 'register'>('login');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [savedAccessProfiles, setSavedAccessProfiles] = useState<{
    customer: { name: string; email: string; biometric: boolean; hasSession: boolean };
    admin: { name: string; email: string; biometric: boolean; hasSession: boolean };
    motoboy: { name: string; email: string; biometric: boolean; hasSession: boolean };
  }>({
    customer: { name: '', email: '', biometric: false, hasSession: false },
    admin: { name: '', email: '', biometric: false, hasSession: false },
    motoboy: { name: '', email: '', biometric: false, hasSession: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/customer/notifications").then(r => r.ok ? r.json() : null).then(d => setNotifBadge(d?.unreadCount || 0)).catch(() => {});
    try {
      const adminRaw = localStorage.getItem('adminSession');
      const motoboyRaw = localStorage.getItem('motoboySession');
      if (adminRaw) {
        const parsed = JSON.parse(adminRaw);
        if (parsed?.token && parsed?.user) {
          setIsAdmin(true);
          setStoreSlug(parsed?.store?.slug || null);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setStoreSlug(null);
      }

      if (motoboyRaw) {
        const parsed = JSON.parse(motoboyRaw);
        setIsMotoboy(Boolean(parsed?.token && parsed?.user));
      } else {
        setIsMotoboy(false);
      }
    } catch {
      setIsAdmin(false);
      setIsMotoboy(false);
      setStoreSlug(null);
    }

    try {
      const customerRaw = localStorage.getItem('customerSession');
      const adminSessionRaw = localStorage.getItem('adminSession');
      const motoboyRaw = localStorage.getItem('motoboySession');
      const customerSession = customerRaw ? JSON.parse(customerRaw) : null;
      const adminSession = adminSessionRaw ? JSON.parse(adminSessionRaw) : null;
      const motoboySession = motoboyRaw ? JSON.parse(motoboyRaw) : null;

      setSavedAccessProfiles({
        customer: {
          name: String(customerSession?.user?.fullName || customerSession?.user?.name || 'Usuário').trim(),
          email: String(customerSession?.user?.email || '').trim(),
          biometric: nativeBiometricService.hasValidStoredCustomerEnrollment(),
          hasSession: Boolean(customerSession?.token && customerSession?.user),
        },
        admin: {
          name: String(adminSession?.store?.name || adminSession?.user?.fullName || adminSession?.user?.name || 'Lojista').trim(),
          email: String(adminSession?.user?.email || '').trim(),
          biometric: nativeBiometricService.hasValidStoredAdminEnrollment(),
          hasSession: Boolean(adminSession?.token && adminSession?.user),
        },
        motoboy: {
          name: String(motoboySession?.user?.fullName || motoboySession?.user?.name || 'Entregador').trim(),
          email: String(motoboySession?.user?.email || '').trim(),
          biometric: nativeBiometricService.hasValidStoredMotoboyEnrollment(),
          hasSession: Boolean(motoboySession?.token && motoboySession?.user),
        },
      });
    } catch {
      setSavedAccessProfiles({
        customer: { name: '', email: '', biometric: false, hasSession: false },
        admin: { name: '', email: '', biometric: false, hasSession: false },
        motoboy: { name: '', email: '', biometric: false, hasSession: false },
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setAccessPickerOpen(false);
      setAboutOpen(false);
      setHighlightFirstAccess(false);
      setAccessPickerMode('login');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getAccessStateLabel = (profile: { biometric: boolean; hasSession: boolean }) => {
    if (profile.biometric) return 'Entrar rápido';
    if (profile.hasSession) return 'Disponível neste aparelho';
    return 'Entrar';
  };
  const getCompactAccessStateLabel = (profile: { biometric: boolean; hasSession: boolean }) => {
    if (profile.biometric) return 'Rápido';
    if (profile.hasSession) return 'Disponível';
    return 'Entrar';
  };

  const accessProfiles: AccessProfile[] = [
    {
      id: 'client',
      title: 'Cliente',
      subtitle: savedAccessProfiles.customer.biometric
        ? 'Entrar rápido neste aparelho'
        : savedAccessProfiles.customer.hasSession
          ? savedAccessProfiles.customer.email || savedAccessProfiles.customer.name
          : 'Entrar para pedir e acompanhar',
      icon: <UserCircle size={24} weight="duotone" />,
      action: onLogin,
      current: isLogged,
      ready: savedAccessProfiles.customer.biometric || savedAccessProfiles.customer.hasSession,
    },
    {
      id: 'store',
      title: 'Lojista',
      subtitle: savedAccessProfiles.admin.biometric
        ? 'Entrar rápido neste aparelho'
        : savedAccessProfiles.admin.hasSession
          ? savedAccessProfiles.admin.email || savedAccessProfiles.admin.name
          : 'Entrar na operação da loja',
      icon: <Storefront size={24} weight="duotone" />,
      action: onOpenAdminLogin,
      ready: savedAccessProfiles.admin.biometric || savedAccessProfiles.admin.hasSession,
    },
    {
      id: 'motoboy',
      title: 'Entregador',
      subtitle: savedAccessProfiles.motoboy.biometric
        ? 'Entrar rápido neste aparelho'
        : savedAccessProfiles.motoboy.hasSession
          ? savedAccessProfiles.motoboy.email || savedAccessProfiles.motoboy.name
          : 'Entrar no painel de entregas',
      icon: <Motorcycle size={24} weight="duotone" />,
      action: onOpenMotoboyLogin,
      ready: savedAccessProfiles.motoboy.biometric || savedAccessProfiles.motoboy.hasSession,
    },
  ];
  const activeContext: DrawerContext = isLogged ? 'client' : isAdmin ? 'store' : isMotoboy ? 'motoboy' : 'guest';
  const hasActiveContext = activeContext !== 'guest';
  const visibleAccessProfiles = hasActiveContext
    ? accessProfiles.filter((item) => item.id !== activeContext)
    : accessProfiles;

  const currentIdentity =
    activeContext === 'client'
      ? {
          eyebrow: 'Minha conta',
          title: String(userName || savedAccessProfiles.customer.name || 'Cliente').trim() || 'Cliente',
          email: String(userEmail || savedAccessProfiles.customer.email || '').trim(),
          imageUrl: profileImageUrl || null,
          icon: <UserCircle size={36} weight="duotone" />,
          iconShell: 'rounded-2xl bg-gradient-to-br from-white to-slate-100 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_32px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-100',
          badges: [
            { label: 'Conectado', tone: 'success' as const },
          ],
          switchTitle: 'Outros acessos',
          switchHint: 'Lojista e entregador aparecem aqui.',
        }
      : activeContext === 'store'
        ? {
            eyebrow: 'Minha loja',
            title: String(savedAccessProfiles.admin.name || 'Lojista').trim() || 'Lojista',
            email: String(savedAccessProfiles.admin.email || '').trim(),
            imageUrl: null,
            icon: <Storefront size={32} weight="duotone" />,
            iconShell: 'rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] text-white shadow-[0_18px_30px_-18px_rgba(51,104,134,0.45)] ring-2 ring-[#336886]/12',
            badges: [
              { label: 'Lojista', tone: 'brand' as const },
            ],
            switchTitle: 'Outros acessos',
            switchHint: 'Cliente e entregador aparecem aqui.',
          }
        : activeContext === 'motoboy'
          ? {
              eyebrow: 'Entregas',
              title: String(savedAccessProfiles.motoboy.name || 'Entregador').trim() || 'Entregador',
              email: String(savedAccessProfiles.motoboy.email || '').trim(),
              imageUrl: null,
              icon: <Motorcycle size={32} weight="duotone" />,
              iconShell: 'rounded-2xl bg-[linear-gradient(135deg,#0f172a,#334155)] text-white shadow-[0_18px_30px_-18px_rgba(15,23,42,0.45)] ring-2 ring-slate-300/12',
              badges: [
                { label: 'Entregador', tone: 'dark' as const },
              ],
              switchTitle: 'Outros acessos',
              switchHint: 'Cliente e lojista aparecem aqui.',
            }
          : null;

  const clientActions: DrawerAction[] = [
    { id: 'account', label: 'Minha Conta', icon: <UserRectangle size={22} weight="duotone" />, onClick: onOpenAccount, iconColor: 'text-[#336886]', bgColor: 'bg-[#336886]/10' },
    { id: 'orders', label: 'Meus pedidos', icon: <Receipt size={22} weight="duotone" />, onClick: onOpenOrders || onOpenAccount, iconColor: 'text-[#336886]', bgColor: 'bg-[#336886]/10' },
    { id: 'notifications', label: 'Notificações', icon: <BellRinging size={22} weight="duotone" />, onClick: () => { drawerNavigate('/notificacoes'); }, iconColor: 'text-amber-600', bgColor: 'bg-amber-50', badge: notifBadge },
    { id: 'settings', label: 'Configurações', icon: <GearSix size={22} weight="duotone" />, onClick: onOpenSettings, iconColor: 'text-violet-600', bgColor: 'bg-violet-50' },
    { id: 'legal', label: 'Termos, Privacidade e Segurança', icon: <ShieldCheckered size={24} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'help', label: 'Ajuda e Atendimento', icon: <Headset size={24} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'logout', label: 'Sair da conta', icon: <SignOut size={22} weight="duotone" />, onClick: onLogout, tone: 'danger' },
  ];
  const storeActions: DrawerAction[] = [
    { id: 'store-panel', label: 'Operação da loja', icon: <CookingPot size={22} weight="duotone" />, onClick: onOpenAdminLogin, iconColor: 'text-[#336886]', bgColor: 'bg-[#336886]/10' },
    { id: 'help-store', label: 'Ajuda operacional', icon: <Headset size={24} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'legal', label: 'Termos, Privacidade e Segurança', icon: <ShieldCheckered size={24} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'logout-store', label: 'Sair da operação', icon: <SignOut size={22} weight="duotone" />, onClick: onLogoutAdmin || (() => undefined), tone: 'danger' },
  ];
  if (storeSlug) {
    storeActions.splice(1, 0, {
      id: 'storefront',
      label: 'Minha vitrine',
      icon: <Storefront size={22} weight="duotone" />,
      onClick: () => {
        window.location.href = `/${storeSlug}`;
      },
      iconColor: 'text-slate-700',
      bgColor: 'bg-slate-100',
    });
  }
  const motoboyActions: DrawerAction[] = [
    { id: 'motoboy-panel', label: 'Painel de entregas', icon: <Motorcycle size={22} weight="duotone" />, onClick: onOpenMotoboyLogin, iconColor: 'text-slate-700', bgColor: 'bg-slate-100' },
    { id: 'help-motoboy', label: 'Ajuda do entregador', icon: <Headset size={24} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'legal', label: 'Termos, Privacidade e Segurança', icon: <ShieldCheckered size={24} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'logout-motoboy', label: 'Sair das entregas', icon: <SignOut size={22} weight="duotone" />, onClick: onLogoutMotoboy || (() => undefined), tone: 'danger' },
  ];
  const guestActions: DrawerAction[] = [
    { id: 'help', label: 'Ajuda e Atendimento', icon: <Headset size={24} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
    { id: 'legal', label: 'Termos, Privacidade e Segurança', icon: <ShieldCheckered size={24} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
  ];
  const actions: DrawerAction[] =
    activeContext === 'client'
      ? clientActions
      : activeContext === 'store'
        ? storeActions
        : activeContext === 'motoboy'
          ? motoboyActions
          : guestActions;

  const quickSwitchAccess = accessProfiles
    .filter((item) => hasActiveContext && item.id !== activeContext)
    .map((item) => {
      const profile =
        item.id === 'client'
          ? savedAccessProfiles.customer
          : item.id === 'store'
            ? savedAccessProfiles.admin
            : savedAccessProfiles.motoboy;

      return {
        id: item.id,
        label: item.id === 'client' ? 'Cliente' : item.id === 'store' ? 'Loja' : 'Entrega',
        description:
          item.id === 'client'
            ? 'Conta e pedidos'
            : item.id === 'store'
              ? 'Painel do lojista'
              : 'Rotas e coletas',
        state: getCompactAccessStateLabel(profile),
        stateIcon: profile.biometric
          ? <Fingerprint size={13} weight="duotone" />
          : profile.hasSession
            ? <CheckCircle size={13} weight="fill" />
            : <CaretRight size={13} weight="bold" />,
        icon: item.id === 'client' ? <UserCircle size={23} weight="duotone" /> : item.id === 'store' ? <Storefront size={23} weight="duotone" /> : <Motorcycle size={23} weight="duotone" />,
        shell:
          item.id === 'store'
            ? 'border-[#d8e5ee] bg-[linear-gradient(135deg,#ffffff_0%,#f1f7fb_100%)] text-slate-950 shadow-[0_14px_28px_-24px_rgba(51,104,134,0.28)]'
            : 'border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f9fb_100%)] text-slate-950 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)]',
        iconClass:
          item.id === 'store'
            ? 'bg-white/88 text-[#336886] ring-1 ring-[#d8e5ee]'
            : 'bg-white/88 text-slate-700 ring-1 ring-slate-200',
        stateClass:
          profile.biometric || profile.hasSession
            ? item.id === 'store'
              ? 'text-[#336886]'
              : 'text-slate-700'
            : 'text-slate-500',
        onClick: () => {
          item.action();
          onClose();
        },
      };
    });

  const getAccessCardClasses = (item: AccessProfile) => {
    if (item.current) {
      return {
        shell: 'border-slate-900/10 bg-[linear-gradient(135deg,#111827_0%,#172033_58%,#101827_100%)] text-white shadow-[0_18px_34px_-22px_rgba(15,23,42,0.72)]',
        icon: 'border-white/10 bg-white/8 text-white',
        title: 'text-white',
        subtitle: 'text-white/62',
        badge: 'bg-white/12 text-white',
        caret: 'border-white/10 bg-white/6 text-white/54',
      };
    }
    if (item.id === 'store') {
      return {
        shell: 'border-[#d8e5ee] bg-[linear-gradient(135deg,#ffffff_0%,#f0f6fa_100%)] text-slate-950 shadow-[0_16px_30px_-24px_rgba(51,104,134,0.28)]',
        icon: 'border-[#d8e5ee] bg-[#edf5fa] text-[#336886]',
        title: 'text-slate-950',
        subtitle: 'text-slate-600',
        badge: 'bg-[#edf5fa] text-[#336886]',
        caret: 'border-[#d8e5ee] bg-white/54 text-[#336886]/60',
      };
    }
    return {
      shell: 'border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f9fb_100%)] text-slate-950 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.22)]',
      icon: 'border-slate-200 bg-slate-100/88 text-slate-700',
      title: 'text-slate-950',
      subtitle: 'text-slate-600',
      badge: 'bg-slate-100 text-slate-700',
      caret: 'border-slate-200 bg-white/54 text-slate-500',
    };
  };
  const getActionHelper = (actionId: string) => {
    switch (actionId) {
      case 'account':
        return 'Perfil, endereços e preferências';
      case 'orders':
        return 'Histórico e acompanhamento dos pedidos';
      case 'notifications':
        return 'Alertas de pedidos e atualizações';
      case 'settings':
        return 'Permissões, biometria e segurança';
      case 'store-panel':
        return 'Pedidos, operação e rotina da loja';
      case 'storefront':
        return 'Abrir a vitrine pública da sua loja';
      case 'motoboy-panel':
        return 'Acesse suas corridas e entregas';
      case 'legal':
        return 'Termos, dados e proteção da conta';
      case 'help':
        return 'Suporte e dúvidas sobre seus pedidos';
      case 'help-store':
        return 'Suporte sobre operação e vendas';
      case 'help-motoboy':
        return 'Suporte para corridas e coletas';
      case 'logout':
        return 'Encerra somente a sessão neste aparelho';
      case 'logout-store':
        return 'Encerra somente a sessão da loja neste aparelho';
      case 'logout-motoboy':
        return 'Encerra somente a sessão de entregador neste aparelho';
      default:
        return '';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" onClick={onClose} />

      <aside
        className={`absolute inset-y-0 left-0 w-[300px] max-w-[85vw] transform border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)] shadow-[0_30px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition-transform duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col pt-[env(safe-area-inset-top)]`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-12 top-8 h-28 w-28 rounded-full bg-[#336886]/12 blur-3xl" />
          <div className="absolute right-0 top-24 h-36 w-36 rounded-full bg-sky-100/60 blur-3xl" />
        </div>
        <div className="border-b border-slate-100/80 bg-white/50 p-6 pb-4">
          {hasActiveContext && currentIdentity ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {currentIdentity.imageUrl ? (
                  <div className="relative">
                    <img
                      src={currentIdentity.imageUrl}
                      alt={currentIdentity.title}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-[0_18px_30px_-18px_rgba(51,104,134,0.45)] ring-2 ring-[#336886]/15"
                    />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  </div>
                ) : (
                  <div className={`grid h-16 w-16 place-items-center ${currentIdentity.iconShell}`}>
                    {currentIdentity.icon}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]/80">{currentIdentity.eyebrow}</p>
                  <p className="mt-1 truncate text-base font-black leading-tight text-slate-950">{currentIdentity.title}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{currentIdentity.email || 'Acesso salvo neste aparelho'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {currentIdentity.badges.map((badge) => (
                      <span
                        key={badge.label}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                          badge.tone === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : badge.tone === 'brand'
                              ? 'border border-[#d8e5ee] bg-[#edf5fa] text-[#336886]'
                              : badge.tone === 'dark'
                                ? 'border border-slate-200 bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white/90 text-slate-500'
                        }`}
                      >
                        <CheckCircle size={10} weight="fill" />
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {quickSwitchAccess.length > 0 ? (
                <section className="relative overflow-hidden rounded-[1.55rem] border border-[#336886]/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(243,248,251,0.96)_100%)] p-3.5 shadow-[0_18px_34px_-26px_rgba(51,104,134,0.24)]">
                  <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#336886]/10 blur-3xl" />
                  <div className="relative mb-2.5">
                    <p className="text-[11px] font-bold tracking-tight text-slate-400">{currentIdentity.switchTitle}</p>
                    {currentIdentity.switchHint ? (
                      <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{currentIdentity.switchHint}</p>
                    ) : null}
                  </div>

                  <div className="relative grid gap-2">
                    {quickSwitchAccess.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className={`group relative flex w-full items-center gap-3 rounded-[1.2rem] border px-3 py-3 pr-9 text-left transition-all active:scale-[0.98] ${item.shell}`}
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-transform group-active:scale-95 ${item.iconClass}`}>
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">
                          <span className="block truncate text-[14px] font-black leading-tight">{item.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-600">{item.description}</span>
                        </span>
                        <CaretRight size={14} weight="bold" className="absolute right-3 top-3 text-slate-400/80 transition-transform group-active:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Saudação */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]/70">Já no Caminho</p>
                <h2 className="mt-0.5 text-[1.15rem] font-black tracking-tight text-slate-900 leading-snug">Acesse sua conta</h2>
                <p className="mt-0.5 text-[11.5px] font-medium text-slate-500">Entre para acompanhar pedidos, endereços e favoritos.</p>
              </div>

              {/* Dois CTAs lado a lado */}
              <div className="grid grid-cols-2 gap-2">
                {/* Entrar */}
                <button
                  type="button"
                  onClick={() => { setAccessPickerMode('login'); setHighlightFirstAccess(false); setAccessPickerOpen(true); }}
                  className="relative flex flex-col items-start overflow-hidden rounded-[1.3rem] bg-[linear-gradient(135deg,#0d526c_0%,#17384a_100%)] p-3.5 text-white shadow-[0_12px_24px_-16px_rgba(21,58,76,0.45)] transition-all active:scale-[0.97]"
                >
                  <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/8 blur-2xl" />
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                    <ArrowRight size={15} weight="bold" />
                  </div>
                  <p className="text-[13px] font-black leading-none">Entrar</p>
                  <p className="mt-1 text-[9.5px] font-semibold text-white/60 leading-tight">Já tenho conta</p>
                </button>

                {/* Criar conta */}
                <button
                  type="button"
                  onClick={() => { setAccessPickerMode('register'); setHighlightFirstAccess(true); setAccessPickerOpen(true); }}
                  className="relative flex flex-col items-start overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white p-3.5 text-slate-800 shadow-[0_4px_14px_-8px_rgba(15,23,42,0.1)] transition-all active:scale-[0.97] hover:border-[#336886]/20 hover:shadow-[0_6px_18px_-8px_rgba(51,104,134,0.15)]"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#336886]/10 text-[#336886]">
                    <RocketLaunch size={15} weight="duotone" />
                  </div>
                  <p className="text-[13px] font-black leading-none text-slate-900">Criar conta</p>
                  <p className="mt-1 text-[9.5px] font-semibold text-slate-400 leading-tight">Sou novo aqui</p>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <nav className="space-y-2">
            <p className="mb-3 text-[11px] font-bold tracking-tight text-slate-400 px-1">
              {activeContext === 'client'
                ? 'Sua conta'
                : activeContext === 'store'
                  ? 'Área da Loja'
                  : activeContext === 'motoboy'
                    ? 'Área do Entregador'
                    : 'Ajuda e políticas'}
            </p>
            {actions.map((action, idx) => (
              <div key={action.id}>
              {(action.id === 'settings' || action.id === 'legal' || action.id === 'help' || action.id === 'logout' || action.id === 'logout-store' || action.id === 'logout-motoboy') && idx > 0 && actions[idx - 1]?.id !== 'settings' && actions[idx - 1]?.id !== 'legal' && actions[idx - 1]?.id !== 'help' && (
                <div className="my-2 mx-3 h-px bg-slate-100" />
              )}
              <button
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`flex w-full items-center gap-4 rounded-[1.45rem] border px-3.5 py-3.5 transition-all active:scale-[0.97] ${
                  action.tone === 'danger'
                    ? 'border-rose-100/70 bg-rose-50/58 text-rose-700 shadow-[0_14px_28px_-24px_rgba(225,29,72,0.35)] hover:border-rose-100 hover:bg-rose-50/82'
                    : 'border-transparent text-slate-800 hover:border-white/80 hover:bg-white/90'
                }`}
              >
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-[1.1rem] border border-white/70 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.22)] transition-colors ${
                  action.tone === 'danger'
                    ? 'bg-rose-100/78 text-rose-500'
                    : `${action.bgColor || 'bg-slate-100'} ${action.iconColor || 'text-slate-500'}`
                }`}>
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className={`block text-[15px] leading-tight ${action.tone === 'danger' ? 'font-black text-rose-700' : 'font-semibold'}`}>{action.label}{action.badge ? <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{action.badge > 9 ? "9+" : action.badge}</span> : null}</span>
                  {getActionHelper(action.id) ? (
                    <span className={`mt-0.5 block text-[11px] font-semibold ${action.tone === 'danger' ? 'text-rose-700/46' : 'text-slate-500'}`}>
                      {getActionHelper(action.id)}
                    </span>
                  ) : null}
                </div>
              </button>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-100/90 bg-white/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-3 text-left shadow-[0_18px_34px_-28px_rgba(15,23,42,0.24)] transition-all active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white bg-white p-0.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.44)] ring-1 ring-slate-100">
              <img src="/janocaminho.jpg" alt="Logo" loading="eager" fetchPriority="high" decoding="async" className="h-full w-full rounded-[0.85rem] object-cover opacity-95" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-black tracking-tight text-slate-950">Sobre o app</span>
              <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {versionLabel || 'v0.0.0'}
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                Seguro
              </span>
            </span>
            <CaretRight size={15} weight="bold" className="shrink-0 text-slate-300 transition-transform group-active:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {aboutOpen && (
        <div className="absolute inset-0 z-[12] flex items-center justify-center bg-slate-950/45 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[12px] animate-in fade-in duration-200" onClick={() => setAboutOpen(false)}>
          <div
            className="relative w-full max-w-[345px] overflow-hidden rounded-[1.9rem] border border-white/86 bg-[linear-gradient(180deg,rgba(255,255,255,0.985)_0%,rgba(248,250,252,0.98)_100%)] p-5 shadow-[0_30px_76px_-34px_rgba(15,23,42,0.78)] animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-12 top-2 h-32 w-32 rounded-full bg-[#336886]/10 blur-3xl" />
              <div className="absolute -right-10 bottom-4 h-32 w-32 rounded-full bg-emerald-200/32 blur-3xl" />
            </div>
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-[1.35rem] bg-white p-1 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.52)] ring-1 ring-slate-100">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-[1rem] object-cover" />
                </span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#336886]">Já no Caminho</p>
                  <h3 className="mt-1 text-lg font-black tracking-[-0.035em] text-slate-950">Sobre o app</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white/88 text-slate-400 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.32)] transition-all active:scale-95"
                aria-label="Fechar sobre o app"
              >
                <X size={17} weight="bold" />
              </button>
            </div>

            <div className="relative mt-5 space-y-3">
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/82 p-4">
                <p className="text-sm font-black text-slate-950">Marketplace local, pedidos e entregas em um só lugar.</p>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
                  Plataforma desenvolvida para clientes, lojas, entregadores, condomínios e destinos turísticos operarem com uma experiência simples e segura.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[1.2rem] border border-[#d8e5ee] bg-[#edf5fa] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#336886]/70">Versão</p>
                  <p className="mt-1 truncate text-xs font-black text-[#153A4C]">{versionLabel || 'v0.0.0'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700/70">Ambiente</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-black text-emerald-700">
                    <ShieldCheckered size={13} weight="fill" />
                    Seguro
                  </p>
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Desenvolvimento</p>
                <p className="mt-1 text-sm font-black text-slate-900">Edmilson Santos</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
                  Produto oficial do Já no Caminho, com foco em operação local, usabilidade mobile e confiabilidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {accessPickerOpen && (
        <div className="absolute inset-0 z-[10] flex items-center justify-center bg-slate-950/36 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[10px] animate-in fade-in duration-200" onClick={() => setAccessPickerOpen(false)}>
          <div
            className="relative w-full max-w-[345px] overflow-hidden rounded-[1.75rem] border border-white/86 bg-[linear-gradient(180deg,rgba(255,255,255,0.985)_0%,rgba(248,250,252,0.98)_100%)] p-4 shadow-[0_26px_68px_-30px_rgba(15,23,42,0.72)] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-12 top-4 h-28 w-28 rounded-full bg-[#336886]/8 blur-3xl" />
              <div className="absolute -right-10 bottom-4 h-28 w-28 rounded-full bg-emerald-200/28 blur-3xl" />
            </div>
            <div className="relative mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
                  {hasActiveContext ? 'Outros acessos' : 'Escolha sua área'}
                </p>
                <h3 className="mt-1 text-[1.18rem] font-black tracking-[-0.035em] text-slate-950">
                  {hasActiveContext ? 'Abrir outra área' : accessPickerMode === 'register' ? 'Primeiro acesso' : 'Entrar'}
                </h3>
                <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-slate-500">
                  {hasActiveContext
                    ? 'Seu acesso atual continua salvo. Escolha apenas a outra área que deseja abrir.'
                    : accessPickerMode === 'register'
                      ? 'Escolha qual conta deseja criar e siga o fluxo certo para começar.'
                      : 'Entre com sua conta e acesse a área certa do app.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccessPickerOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white/88 text-slate-400 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.32)] transition-all active:scale-95"
                aria-label="Fechar escolha de acesso"
              >
                <X size={17} weight="bold" />
              </button>
            </div>

            {(hasActiveContext || accessPickerMode === 'login') ? (
              <div className="relative grid gap-3">
                {visibleAccessProfiles.map((item) => {
                  const classes = getAccessCardClasses(item);
                  const stateLabel = item.current
                    ? 'Atual'
                    : item.id === 'client'
                      ? getAccessStateLabel(savedAccessProfiles.customer)
                      : item.id === 'store'
                        ? getAccessStateLabel(savedAccessProfiles.admin)
                        : getAccessStateLabel(savedAccessProfiles.motoboy);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAccessPickerOpen(false);
                        item.action();
                        onClose();
                      }}
                      className={`group relative flex min-h-[4.6rem] w-full items-center gap-3.5 overflow-hidden rounded-[1.35rem] border px-3.5 py-3 text-left transition-all duration-150 ease-out active:scale-[0.985] sm:hover:-translate-y-0.5 ${classes.shell}`}
                    >
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_72%)]" />
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-[1.05rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] ${classes.icon}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-[14px] font-black leading-tight ${classes.title}`}>{item.title}</p>
                          <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${classes.badge}`}>
                            {stateLabel}
                          </span>
                        </div>
                        <p className={`mt-1 truncate text-[10.5px] font-semibold ${classes.subtitle}`}>{item.subtitle}</p>
                      </div>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5 ${classes.caret}`}>
                        <CaretRight size={16} weight="bold" />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {!hasActiveContext && accessPickerMode === 'register' ? (
              <div className={`relative rounded-[1.65rem] border p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.28)] transition-all duration-200 ${
                highlightFirstAccess
                  ? 'border-[#336886]/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,253,245,0.86))] ring-2 ring-[#336886]/12'
                  : 'border-slate-200/80 bg-white/88'
              }`}>
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Primeiro acesso</p>
                  <p className="mt-1 text-sm font-black leading-tight text-slate-950">Escolha como quer começar</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Cada perfil tem um cadastro próprio para manter seu app organizado.</p>
                </div>
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAccessPickerOpen(false);
                      onRegisterClient();
                      onClose();
                    }}
                    className="group flex min-h-[5rem] items-center gap-3.5 rounded-[1.35rem] border border-sky-100 bg-[linear-gradient(135deg,#f8fbff,#eef7ff)] px-3.5 py-3 text-left text-slate-700 shadow-[0_14px_28px_-24px_rgba(51,104,134,0.32)] transition-all active:scale-[0.98]"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.05rem] border border-white/80 bg-white/86 text-[#336886] shadow-[0_12px_24px_-20px_rgba(51,104,134,0.35)]">
                      <UserCircle size={25} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">Criar conta de cliente</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Para pedir, salvar favoritos e acompanhar pedidos.</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="shrink-0 text-slate-300 transition-transform group-active:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessPickerOpen(false);
                      onRegisterStore();
                      onClose();
                    }}
                    className="group flex min-h-[5rem] items-center gap-3.5 rounded-[1.35rem] border border-emerald-100 bg-[linear-gradient(135deg,#f3fff8,#e8f8ef)] px-3.5 py-3 text-left text-emerald-900 shadow-[0_14px_28px_-24px_rgba(16,185,129,0.32)] transition-all active:scale-[0.98]"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.05rem] border border-white/80 bg-white/82 text-emerald-700 shadow-[0_12px_24px_-20px_rgba(16,185,129,0.35)]">
                      <Storefront size={25} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-emerald-950">Criar loja</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80">Para vender no app e operar seus pedidos.</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="shrink-0 text-emerald-300 transition-transform group-active:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessPickerOpen(false);
                      onRegisterMotoboy();
                      onClose();
                    }}
                    className="group flex min-h-[5rem] items-center gap-3.5 rounded-[1.35rem] border border-amber-100 bg-[linear-gradient(135deg,#fffbed,#fbf4d4)] px-3.5 py-3 text-left text-amber-900 shadow-[0_14px_28px_-24px_rgba(245,158,11,0.32)] transition-all active:scale-[0.98]"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.05rem] border border-white/80 bg-white/80 text-amber-700 shadow-[0_12px_24px_-20px_rgba(245,158,11,0.35)]">
                      <Motorcycle size={25} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-amber-950">Criar conta de entregador</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-amber-700/80">Para receber solicitações e acessar sua área.</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="shrink-0 text-amber-300 transition-transform group-active:translate-x-0.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
