import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowsClockwise,
  ArrowRight,
  BellSimple,
  Storefront,
  CookingPot,
  Motorcycle,
  Headset,
  RocketLaunch,
  SignOut,
  ShieldCheckered,
  UserCircle,
  UserRectangle,
  House,
  CaretRight,
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
  onRegisterClient,
  onRegisterStore,
  onRegisterMotoboy,
  versionLabel,
}: ProfileDrawerProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [accessPickerOpen, setAccessPickerOpen] = useState(false);
  const [highlightFirstAccess, setHighlightFirstAccess] = useState(false);
  const [accessPickerMode, setAccessPickerMode] = useState<'login' | 'register'>('login');
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
    try {
      const adminRaw = localStorage.getItem('adminSession');
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
      }
    } catch {
      setIsAdmin(false);
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
      setHighlightFirstAccess(false);
      setAccessPickerMode('login');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const actions: DrawerAction[] = isLogged
    ? [
        { id: 'account', label: 'Minha Conta', icon: <UserRectangle size={22} weight="duotone" />, onClick: onOpenAccount, iconColor: 'text-[#336886]', bgColor: 'bg-[#336886]/10' },
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={22} weight="duotone" />, onClick: onOpenOrders || onOpenAccount, iconColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { id: 'settings', label: 'Configurações', icon: <ArrowsClockwise size={22} weight="duotone" />, onClick: onOpenSettings, iconColor: 'text-violet-600', bgColor: 'bg-violet-50' },
        { id: 'legal', label: 'Termos, Privacidade e Segurança', icon: <ShieldCheckered size={24} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
        { id: 'help', label: 'Ajuda e Atendimento', icon: <Headset size={24} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
        { id: 'logout', label: 'Sair da conta', icon: <SignOut size={22} weight="duotone" />, onClick: onLogout, tone: 'danger' },
      ]
    : [
        { id: 'help', label: 'Ajuda e Atendimento', icon: <Headset size={24} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
        { id: 'legal', label: 'Termos, Privacidade e Segurança', icon: <ShieldCheckered size={24} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-[#336886]', bgColor: 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.9))]' },
      ];

  const accessProfiles: AccessProfile[] = [
    {
      id: 'client',
      title: 'Usuário',
      subtitle: savedAccessProfiles.customer.biometric
        ? 'Biometria pronta neste aparelho'
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
        ? 'Biometria pronta neste aparelho'
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
        ? 'Biometria pronta neste aparelho'
        : savedAccessProfiles.motoboy.hasSession
          ? savedAccessProfiles.motoboy.email || savedAccessProfiles.motoboy.name
          : 'Entrar no painel de entregas',
      icon: <Motorcycle size={24} weight="duotone" />,
      action: onOpenMotoboyLogin,
      ready: savedAccessProfiles.motoboy.biometric || savedAccessProfiles.motoboy.hasSession,
    },
  ];

  const currentAccessProfile = accessProfiles.find((item) => item.current) || null;
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
        shell: 'border-emerald-100/85 bg-[linear-gradient(135deg,#f3fff8_0%,#e9f9f0_100%)] text-emerald-950 shadow-[0_16px_30px_-24px_rgba(16,185,129,0.34)]',
        icon: 'border-emerald-100 bg-emerald-100/78 text-emerald-700',
        title: 'text-slate-950',
        subtitle: 'text-slate-600',
        badge: 'bg-emerald-100/90 text-emerald-700',
        caret: 'border-emerald-100 bg-white/54 text-emerald-700/60',
      };
    }
    return {
      shell: 'border-amber-100/85 bg-[linear-gradient(135deg,#fffbed_0%,#fbf4d4_100%)] text-amber-950 shadow-[0_16px_30px_-24px_rgba(245,158,11,0.34)]',
      icon: 'border-amber-100 bg-amber-100/78 text-amber-700',
      title: 'text-slate-950',
      subtitle: 'text-slate-600',
      badge: 'bg-lime-100/90 text-lime-700',
      caret: 'border-amber-100 bg-white/54 text-amber-700/60',
    };
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
          <div className="absolute right-0 top-24 h-36 w-36 rounded-full bg-emerald-100/50 blur-3xl" />
        </div>
        <div className="border-b border-slate-100/80 bg-white/50 p-6 pb-4">
          {isLogged ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {profileImageUrl ? (
                  <div className="relative">
                    <img
                      src={profileImageUrl}
                      alt={userName}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-[0_18px_30px_-18px_rgba(51,104,134,0.45)] ring-2 ring-[#336886]/15"
                    />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                  </div>
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-white to-slate-100 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_32px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
                    <UserCircle size={36} weight="duotone" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]/80">Conta conectada</p>
                  <p className="mt-1 truncate text-base font-black leading-tight text-slate-950">{userName}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{userEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccessPickerOpen(true)}
                className="relative flex w-full items-center justify-between overflow-hidden rounded-[1.5rem] border border-[#336886]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.92))] px-4 py-3 text-left text-slate-700 shadow-[0_18px_34px_-24px_rgba(51,104,134,0.28)] transition-all active:scale-[0.98]"
              >
                <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-[radial-gradient(circle_at_center,rgba(51,104,134,0.12),transparent_70%)]" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]">Acessos do app</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">
                    {currentAccessProfile ? currentAccessProfile.title : 'Escolher acesso'}
                  </p>
                </div>
                <CaretRight size={16} weight="bold" className="text-slate-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAccessPickerMode('login');
                setHighlightFirstAccess(false);
                setAccessPickerOpen(true);
              }}
              className="relative flex w-full items-center justify-between overflow-hidden rounded-[1.55rem] border border-[#2d6a88]/18 bg-[linear-gradient(135deg,#0d526c_0%,#13455a_58%,#17384a_100%)] p-4 text-white shadow-[0_18px_34px_-18px_rgba(21,58,76,0.35)] transition-all active:scale-[0.97]"
            >
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_72%)]" />
              <div className="text-left">
                <p className="text-sm font-black">Entrar</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-100/75">Cliente, lojista e entregador</p>
              </div>
              <ArrowRight size={19} weight="regular" className="text-white/78" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {isAdmin && (
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Minha Operação</p>
              <div className="grid gap-2">
                <button
                  onClick={() => {
                    if (storeSlug) window.location.href = `/${storeSlug}`;
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-[1.5rem] border border-[#336886]/15 bg-white/80 p-3.5 text-[#336886] shadow-[0_14px_28px_-24px_rgba(51,104,134,0.5)] transition-all active:scale-95"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#336886]/10 shadow-sm text-[#336886]">
                    <CookingPot size={22} weight="duotone" />
                  </div>
                  <span className="text-[14px] font-black">Gerenciar Loja</span>
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/hub';
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-[1.5rem] border border-emerald-100 bg-white/80 p-3.5 text-emerald-900 shadow-[0_14px_28px_-24px_rgba(16,185,129,0.45)] transition-all active:scale-95"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 shadow-sm text-emerald-600">
                    <House size={22} weight="duotone" />
                  </div>
                  <span className="text-[14px] font-black">Página Inicial (Hub)</span>
                </button>
              </div>
            </section>
          )}

          {!isLogged && (
            <button
              type="button"
              onClick={() => {
                setAccessPickerMode('register');
                setHighlightFirstAccess(true);
                setAccessPickerOpen(true);
              }}
              className="flex w-full items-center gap-4 rounded-[1.7rem] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,rgba(224,242,241,0.9)_42%,rgba(239,246,255,0.96)_100%)] p-4 text-left shadow-[0_18px_34px_-24px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/60 transition-all active:scale-[0.98]"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.2rem] border border-white/85 bg-white/72 text-[#2b708a] shadow-[0_12px_26px_-18px_rgba(51,104,134,0.26)] backdrop-blur-sm">
                <RocketLaunch size={28} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[1.02rem] font-black leading-tight text-slate-900">Comece por aqui</p>
                <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-slate-600">
                  Crie seu acesso como usuário, loja ou entregador
                </p>
              </div>
              <CaretRight size={18} weight="bold" className="shrink-0 text-[#336886]/55" />
            </button>
          )}

          <nav className="space-y-2">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Área do Cliente</p>
            {actions.map((action) => (
              <button
                key={action.id}
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
                  <span className={`block text-[15px] leading-tight ${action.tone === 'danger' ? 'font-black text-rose-700' : 'font-semibold'}`}>{action.label}</span>
                  {action.id === 'logout' ? (
                    <span className="mt-0.5 block text-[11px] font-semibold text-rose-700/46">Encerra somente a sessão neste aparelho</span>
                  ) : null}
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-100/90 bg-white/70 p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-900 tracking-tight">Ja no Caminho</p>
              <div className="inline-flex items-center rounded-full border border-[#336886]/12 bg-[#336886]/6 px-3 py-1.5 shadow-[0_10px_22px_-18px_rgba(51,104,134,0.28)]">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">
                  Versão {versionLabel || 'v0.0.0'}
                </span>
              </div>
            </div>
            <img src="/janocaminho.jpg" alt="Logo" loading="eager" fetchPriority="high" decoding="async" className="h-8 w-auto rounded-full object-cover opacity-95" />
          </div>
        </div>
      </aside>

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
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Escolha seu acesso</p>
                <h3 className="mt-1 text-[1.18rem] font-black tracking-[-0.035em] text-slate-950">
                  {isLogged ? 'Alternar acesso' : accessPickerMode === 'register' ? 'Primeiro acesso' : 'Entrar'}
                </h3>
                <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-slate-500">
                  {isLogged
                    ? 'Sua conta pessoal fica no Hub. Lojista e entregador abrem as áreas operacionais.'
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

            {(isLogged || accessPickerMode === 'login') ? (
              <div className="relative grid gap-3">
                {accessProfiles.map((item) => {
                  const classes = getAccessCardClasses(item);
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
                          {item.current ? (
                            <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${classes.badge}`}>
                              Atual
                            </span>
                          ) : item.ready ? (
                            <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${classes.badge}`}>
                              Pronto
                            </span>
                          ) : null}
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
            {!isLogged && accessPickerMode === 'register' ? (
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
                      <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80">Para vender no hub e operar seus pedidos.</p>
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
