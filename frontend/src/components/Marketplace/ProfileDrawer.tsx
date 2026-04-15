import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowsClockwise,
  BellSimple,
  Storefront,
  CookingPot,
  Motorcycle,
  Lifebuoy,
  SignOut,
  UserCircle,
  UserRectangle,
  House,
  CaretRight,
  Scroll,
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
  summary: string;
  tone: string;
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
          name: String(customerSession?.user?.fullName || customerSession?.user?.name || 'Cliente').trim(),
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

  const getInitials = (value: string) => {
    const parts = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length) return 'JN';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setAccessPickerOpen(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const actions: DrawerAction[] = isLogged
    ? [
        { id: 'account', label: 'Minha Conta', icon: <UserRectangle size={18} weight="fill" />, onClick: onOpenAccount, iconColor: 'text-[#336886]', bgColor: 'bg-[#336886]/15' },
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={18} weight="fill" />, onClick: onOpenOrders || onOpenAccount, iconColor: 'text-amber-600', bgColor: 'bg-amber-100/70' },
        { id: 'settings', label: 'Configurações', icon: <ArrowsClockwise size={18} weight="bold" />, onClick: onOpenSettings, iconColor: 'text-violet-600', bgColor: 'bg-violet-100/70' },
        { id: 'legal', label: 'Termos de Uso', icon: <Scroll size={18} weight="fill" />, onClick: onOpenTerms, iconColor: 'text-slate-500', bgColor: 'bg-slate-200/50' },
        { id: 'help', label: 'Ajuda e Suporte', icon: <Lifebuoy size={18} weight="fill" />, onClick: onOpenHelp, iconColor: 'text-slate-500', bgColor: 'bg-slate-200/50' },
        { id: 'logout', label: 'Sair da conta', icon: <SignOut size={18} weight="bold" />, onClick: onLogout, tone: 'danger' },
      ]
    : [
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={18} weight="fill" />, onClick: onOpenHelp, iconColor: 'text-slate-500', bgColor: 'bg-slate-200/50' },
        { id: 'legal', label: 'Termos e privacidade', icon: <Scroll size={18} weight="fill" />, onClick: onOpenTerms, iconColor: 'text-slate-500', bgColor: 'bg-slate-200/50' },
      ];

  const accessProfiles: AccessProfile[] = [
    {
      id: 'client',
      title: 'Cliente',
      subtitle: savedAccessProfiles.customer.biometric
        ? 'Biometria pronta neste aparelho'
        : savedAccessProfiles.customer.hasSession
          ? savedAccessProfiles.customer.email || savedAccessProfiles.customer.name
          : 'Entrar na área do cliente',
      summary: savedAccessProfiles.customer.name || 'Conta pessoal',
      icon: <UserCircle size={24} weight="duotone" />,
      tone: 'bg-[#336886]/10 text-[#336886]',
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
      summary: savedAccessProfiles.admin.name || 'Operação da loja',
      icon: <Storefront size={24} weight="duotone" />,
      tone: 'bg-emerald-50 text-emerald-700',
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
      summary: savedAccessProfiles.motoboy.name || 'Área do entregador',
      icon: <Motorcycle size={24} weight="duotone" />,
      tone: 'bg-amber-50 text-amber-700',
      action: onOpenMotoboyLogin,
      ready: savedAccessProfiles.motoboy.biometric || savedAccessProfiles.motoboy.hasSession,
    },
  ];

  const currentAccessProfile = accessProfiles.find((item) => item.current) || null;

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
               <div className="relative z-10 px-4 pt-6 pb-4">
          {isLogged ? (
            <div className="group relative overflow-hidden rounded-[1.8rem] border border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-4 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/60 backdrop-blur-3xl transition-all duration-300 hover:shadow-[0_24px_46px_-30px_rgba(51,104,134,0.24)]">
              <div className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full bg-[#336886]/5 blur-2xl transition-transform duration-500 group-hover:scale-150" />
              
              <div className="relative flex items-center gap-3 mb-4">
                {profileImageUrl ? (
                  <div className="relative shrink-0">
                    <img
                      src={profileImageUrl}
                      alt={userName}
                      loading="lazy"
                      className="h-[3.25rem] w-[3.25rem] rounded-full border-2 border-white object-cover shadow-[0_8px_16px_-6px_rgba(51,104,134,0.3)] ring-1 ring-[#336886]/10"
                    />
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                  </div>
                ) : (
                  <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full bg-gradient-to-br from-white to-slate-50 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_-6px_rgba(15,23,42,0.15)] ring-1 ring-[#336886]/10">
                    <UserCircle size={28} weight="duotone" />
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-black tracking-tight text-slate-900">{userName}</p>
                  </div>
                  <p className="truncate text-[11px] font-semibold text-slate-500">{userEmail}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAccessPickerOpen(true)}
                className="relative flex w-full items-center justify-between overflow-hidden rounded-[1.1rem] border border-slate-200/80 bg-white/60 px-3.5 py-2.5 text-left text-slate-700 transition-all active:scale-[0.98] hover:bg-white"
              >
                <div className="min-w-0 flex flex-1 items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#336886]/10 text-[#336886]">
                    {currentAccessProfile?.icon || <UserRectangle size={15} weight="duotone" />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Perfil ativo</p>
                    <p className="truncate text-xs font-black text-slate-800">
                      {currentAccessProfile ? currentAccessProfile.title : 'Escolher perfil'}
                    </p>
                  </div>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 shadow-sm transition-transform active:scale-95">
                  <ArrowsClockwise size={13} weight="bold" />
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAccessPickerOpen(true)}
              className="group relative w-full overflow-hidden rounded-[1.8rem] border border-[#336886]/20 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-5 text-left shadow-[0_20px_42px_-24px_rgba(15,23,42,0.6)] focus:outline-none focus:ring-2 focus:ring-[#336886]/30 active:scale-[0.98] transition-all"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(51,104,134,0.4),transparent_60%)] opacity-60 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[17px] font-black tracking-tight text-white">Criar ou Entrar</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Acesse como Cliente, Lojista ou Entregador
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform group-hover:translate-x-1">
                  <CaretRight size={18} weight="bold" />
                </div>
              </div>
            </button>
          )}
        </div>  </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {isAdmin && (
            <section className="relative z-10 space-y-3 mb-6 animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600/70 px-2 lg:px-4">Minha Operação</p>
              <div className="overflow-hidden rounded-[1.8rem] border border-emerald-100 bg-white/70 shadow-[0_12px_32px_-20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-50 backdrop-blur-md">
                <button
                  onClick={() => {
                    if (storeSlug) window.location.href = `/${storeSlug}`;
                    onClose();
                  }}
                  className="group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors focus:bg-slate-50 focus:outline-none active:bg-emerald-50/80 sm:hover:bg-emerald-50/50"
                >
                  <div className="grid h-[2.15rem] w-[2.15rem] shrink-0 place-items-center rounded-[0.8rem] bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-105">
                    <CookingPot size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="block text-[14px] font-black text-emerald-950">Gerenciar Loja</span>
                  </div>
                  <CaretRight size={15} weight="bold" className="shrink-0 text-emerald-400 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </button>
                <div className="ml-[4.5rem] h-px border-b border-emerald-100/60" />
                <button
                  onClick={() => {
                    window.location.href = '/hub';
                    onClose();
                  }}
                  className="group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors focus:bg-slate-50 focus:outline-none active:bg-emerald-50/80 sm:hover:bg-emerald-50/50"
                >
                  <div className="grid h-[2.15rem] w-[2.15rem] shrink-0 place-items-center rounded-[0.8rem] bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-105">
                    <House size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="block text-[14px] font-black text-emerald-950">Página Inicial (Hub)</span>
                  </div>
                  <CaretRight size={15} weight="bold" className="shrink-0 text-emerald-400 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </section>
          )}

          <nav className="relative z-10 space-y-3 pb-8 animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-both" style={{ animationDelay: '150ms' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-2 lg:px-4">Ajustes da conta</p>
            <div className="overflow-hidden rounded-[1.8rem] border border-[#336886]/5 bg-white/60 text-slate-800 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.1)] ring-1 ring-slate-100 backdrop-blur-md">
              {actions.map((action, index) => (
                <div key={action.id}>
                  <button
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={`group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors focus:bg-slate-50 focus:outline-none active:bg-slate-100/80 sm:hover:bg-slate-50/80 ${
                      action.tone === 'danger' ? 'hover:bg-rose-50/50' : ''
                    }`}
                  >
                    <div className={`grid h-[2.15rem] w-[2.15rem] shrink-0 place-items-center rounded-[0.8rem] transition-colors group-hover:scale-105 ${action.tone === 'danger' ? 'bg-rose-100 text-rose-600' : action.bgColor || 'bg-slate-100'} ${action.tone !== 'danger' && action.iconColor ? action.iconColor : 'text-slate-500'}`}>
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className={`block text-[14px] font-black ${action.tone === 'danger' ? 'text-rose-600' : 'text-slate-800'}`}>
                        {action.label}
                      </span>
                    </div>
                    <CaretRight size={15} weight="bold" className={`shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 ${action.tone === 'danger' ? 'text-rose-400' : 'text-slate-400'}`} />
                  </button>
                  {index < actions.length - 1 && (
                    <div className="ml-[4.5rem] h-px border-b border-slate-200/60" />
                  )}
                </div>
              ))}
            </div>
          </nav>

          {!isLogged && (
            <section className="rounded-[1.65rem] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.86))] p-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Primeiro acesso</p>
              <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-slate-500">
                Acesse sua conta para organizar seus perfis, salvar seu endereço de entrega e rastrear pedidos em tempo real no hub.
              </p>
            </section>
          )}
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
        <div className="absolute inset-0 z-[10] flex items-center justify-center bg-slate-950/42 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200" onClick={() => setAccessPickerOpen(false)}>
          <div
            className="relative w-full max-w-[446px] overflow-hidden rounded-[2.15rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.985)_0%,rgba(248,250,252,0.98)_54%,rgba(244,247,251,0.98)_100%)] p-5 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.72)] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-[#336886]/12 blur-3xl" />
              <div className="absolute left-16 top-0 h-20 w-40 rounded-full bg-sky-100/50 blur-3xl" />
              <div className="absolute -right-8 bottom-10 h-24 w-24 rounded-full bg-emerald-200/35 blur-3xl" />
            </div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]">Escolha seu acesso</p>
                  <h3 className="mt-1 text-[1.35rem] font-black tracking-[-0.03em] text-slate-950">
                    {isLogged ? 'Trocar perfil' : 'Entrar ou começar'}
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                    {isLogged ? 'Cada opção abre a área certa do app.' : 'Entre com sua conta ou crie o acesso certo para você.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccessPickerOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/92 text-slate-600 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.38)] transition-all active:scale-95"
                aria-label="Fechar escolha de acesso"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="grid gap-3 relative">
              {accessProfiles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAccessPickerOpen(false);
                    item.action();
                    onClose();
                  }}
                  className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.65rem] border p-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 transition-all duration-150 ease-out active:scale-[0.97] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_18px_32px_rgba(15,23,42,0.11)] ${
                    item.current
                      ? 'border-slate-900/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] ring-slate-900/5'
                      : item.ready
                        ? 'border-white/90 bg-white/95 ring-slate-100/70'
                        : 'border-slate-200/80 bg-slate-50/92 ring-slate-200/70'
                  }`}
                >
                  <div className={`pointer-events-none absolute inset-y-0 right-0 w-24 ${
                    item.current
                      ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)]'
                      : 'bg-[radial-gradient(circle_at_center,rgba(51,104,134,0.08),transparent_70%)]'
                  }`} />
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.current ? 'bg-white/10 text-white' : item.tone} shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]`}>
                    <div className="relative grid place-items-center">
                      {item.icon}
                      <span className={`absolute -bottom-4 text-[9px] font-black uppercase tracking-[0.12em] ${item.current ? 'text-white/55' : 'text-slate-300'}`}>
                        {getInitials(item.summary)}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-[15px] font-black ${item.current ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                      {item.current ? (
                        <span className="inline-flex rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                          Atual
                        </span>
                      ) : null}
                      {item.ready && !item.current ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">
                          Pronto
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-1 text-[11px] font-bold ${item.current ? 'text-white/65' : item.ready ? 'text-slate-500' : 'text-slate-400'}`}>{item.subtitle}</p>
                  </div>
                  <CaretRight size={17} weight="bold" className={`${item.current ? 'text-white/45' : 'text-slate-300'} transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5`} />
                </button>
              ))}
            </div>
            {!isLogged ? (
              <div className="relative mt-4 rounded-[1.65rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.28)]">
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quero começar</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Escolha o cadastro ideal sem poluir a tela principal.</p>
                </div>
                <div className="grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAccessPickerOpen(false);
                      onRegisterClient();
                      onClose();
                    }}
                    className="flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-left text-slate-700 transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900">Criar conta de cliente</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Para pedir, salvar favoritos e acompanhar pedidos.</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="shrink-0 text-slate-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessPickerOpen(false);
                      onRegisterStore();
                      onClose();
                    }}
                    className="flex items-center justify-between rounded-[1.2rem] border border-emerald-100 bg-emerald-50/80 px-3.5 py-3 text-left text-emerald-900 transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-black text-emerald-950">Criar loja</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80">Para vender no hub e operar seus pedidos.</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="shrink-0 text-emerald-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessPickerOpen(false);
                      onRegisterMotoboy();
                      onClose();
                    }}
                    className="flex items-center justify-between rounded-[1.2rem] border border-amber-100 bg-amber-50/80 px-3.5 py-3 text-left text-amber-900 transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-black text-amber-950">Criar conta de entregador</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-amber-700/80">Para receber solicitações e acessar sua área.</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="shrink-0 text-amber-300" />
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
