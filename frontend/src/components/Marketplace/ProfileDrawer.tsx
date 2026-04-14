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
  versionLabel?: string;
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
  versionLabel,
}: ProfileDrawerProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [accessPickerOpen, setAccessPickerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const adminRaw = localStorage.getItem('auth_session');
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
  }, [isOpen]);

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
        { id: 'account', label: 'Minha Conta', icon: <UserRectangle size={22} weight="duotone" />, onClick: onOpenAccount, iconColor: 'text-[#336886]', bgColor: 'bg-[#336886]/10' },
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={22} weight="duotone" />, onClick: onOpenOrders || onOpenAccount, iconColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { id: 'settings', label: 'Configurações', icon: <ArrowsClockwise size={22} weight="duotone" />, onClick: onOpenSettings, iconColor: 'text-violet-600', bgColor: 'bg-violet-50' },
        { id: 'legal', label: 'Termos e privacidade', icon: <Scroll size={22} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={22} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'logout', label: 'Sair da conta', icon: <SignOut size={22} weight="duotone" />, onClick: onLogout, tone: 'danger' },
      ]
    : [
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={22} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'legal', label: 'Termos e privacidade', icon: <Scroll size={22} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
      ];

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
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-900 leading-tight">{userName}</p>
                <p className="truncate text-xs font-bold text-slate-400 mt-0.5">{userEmail}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAccessPickerOpen(true)}
              className="flex w-full items-center justify-between rounded-[1.5rem] bg-slate-900 p-4 text-white shadow-[0_24px_40px_-24px_rgba(15,23,42,0.65)] transition-all active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <UserCircle size={24} weight="duotone" className="text-slate-400" />
                <div className="text-left">
                  <p className="text-sm font-black">Entrar</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente, lojista ou entregador</p>
                </div>
              </div>
              <CaretRight size={16} weight="bold" className="text-slate-500" />
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

          <nav className="space-y-1">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Área do Cliente</p>
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`flex w-full items-center gap-4 rounded-[1.35rem] border px-3 py-3 transition-all active:scale-[0.97] ${
                  action.tone === 'danger'
                    ? action.id === 'deactivate'
                      ? 'border-rose-100 bg-rose-50/70 text-rose-700 hover:bg-rose-50'
                      : 'border-transparent text-rose-600 hover:bg-rose-50/90'
                    : 'border-transparent text-slate-700 hover:border-white/80 hover:bg-white/85'
                }`}
              >
                <div className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 border border-white/60 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.28)] transition-colors ${action.tone === 'danger' && action.id === 'deactivate' ? 'bg-rose-100 text-rose-600' : action.bgColor || 'bg-slate-100'} ${action.tone === 'danger' && action.id === 'deactivate' ? '' : action.iconColor || 'text-slate-500'}`}>
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className="block text-[15px] font-bold">{action.label}</span>
                  {action.id === 'logout' ? (
                    <span className="block text-[11px] font-medium text-slate-400">Encerra somente a sessão neste aparelho</span>
                  ) : null}
                </div>
              </button>
            ))}
          </nav>

          {!isLogged && (
            <section className="rounded-[1.65rem] border border-slate-100 bg-white/72 p-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Acesso unificado</p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-600">
                Toque em Entrar para escolher se você é cliente, lojista ou entregador.
              </p>
            </section>
          )}
        </div>

        <div className="border-t border-slate-100/90 bg-white/70 p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-black text-slate-900 tracking-tight">Ja no Caminho</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Versão {versionLabel || 'v0.0.0'}</p>
            </div>
            <img src="/janocaminho.jpg" alt="Logo" loading="eager" fetchPriority="high" decoding="async" className="h-8 w-auto rounded-full object-cover opacity-95" />
          </div>
        </div>
      </aside>

      {accessPickerOpen && (
        <div className="absolute inset-0 z-[10] flex items-center justify-center bg-slate-950/42 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200" onClick={() => setAccessPickerOpen(false)}>
          <div
            className="relative w-full max-w-[430px] overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)] p-5 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.72)] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-[#336886]/10 blur-3xl" />
              <div className="absolute -right-8 bottom-10 h-24 w-24 rounded-full bg-emerald-200/35 blur-3xl" />
            </div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]">Escolha seu acesso</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Como você quer entrar?</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">Cada perfil abre a área certa do app.</p>
              </div>
              <button
                type="button"
                onClick={() => setAccessPickerOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white text-slate-600 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.38)] transition-all active:scale-95"
                aria-label="Fechar escolha de acesso"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="grid gap-3 relative">
              {[
                {
                  id: 'client',
                  title: 'Cliente',
                  description: 'Pedir produtos, acompanhar pedidos e salvar endereços.',
                  icon: <UserCircle size={24} weight="duotone" />,
                  tone: 'bg-[#336886]/10 text-[#336886]',
                  action: onLogin,
                },
                {
                  id: 'store',
                  title: 'Lojista',
                  description: 'Gerenciar loja, cardápio, fila e impressora.',
                  icon: <Storefront size={24} weight="duotone" />,
                  tone: 'bg-emerald-50 text-emerald-700',
                  action: onOpenAdminLogin,
                },
                {
                  id: 'motoboy',
                  title: 'Entregador',
                  description: 'Receber entregas, rotas e histórico de ganhos.',
                  icon: <Motorcycle size={24} weight="duotone" />,
                  tone: 'bg-amber-50 text-amber-700',
                  action: onOpenMotoboyLogin,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAccessPickerOpen(false);
                    item.action();
                    onClose();
                  }}
                  className="group flex w-full items-center gap-4 rounded-[1.55rem] border border-white/90 bg-white/95 p-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/70 transition-all duration-150 ease-out active:scale-[0.97] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_18px_32px_rgba(15,23,42,0.11)]"
                >
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.tone} shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-black text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs font-medium leading-snug text-slate-500">{item.description}</p>
                  </div>
                  <CaretRight size={17} weight="bold" className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
