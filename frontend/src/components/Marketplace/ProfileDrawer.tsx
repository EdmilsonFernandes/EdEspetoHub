import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowsClockwise,
  BellSimple,
  Storefront,
  CookingPot,
  Lifebuoy,
  SignOut,
  Trash,
  UserCircle,
  UserRectangle,
  House,
  CaretRight,
  Scroll,
  Sparkle
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
  onDeactivateAccount: () => void; // Nova prop
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
  onDeactivateAccount, // Nova prop
  versionLabel,
}: ProfileDrawerProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

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
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const actions: DrawerAction[] = isLogged
    ? [
        { id: 'account', label: 'Minha Conta', icon: <UserRectangle size={22} weight="duotone" />, onClick: onOpenAccount, iconColor: 'text-sky-600', bgColor: 'bg-sky-50' },
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={22} weight="duotone" />, onClick: onOpenOrders || onOpenAccount, iconColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { id: 'settings', label: 'Configurações', icon: <ArrowsClockwise size={22} weight="duotone" />, onClick: onOpenSettings, iconColor: 'text-violet-600', bgColor: 'bg-violet-50' },
        { id: 'legal', label: 'Termos e privacidade', icon: <Scroll size={22} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={22} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'deactivate', label: 'Excluir conta', icon: <Trash size={22} weight="duotone" />, onClick: onDeactivateAccount, tone: 'danger' },
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
          <div className="absolute -left-12 top-8 h-28 w-28 rounded-full bg-sky-100/55 blur-3xl" />
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
                    className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-[0_18px_30px_-18px_rgba(14,165,233,0.45)] ring-2 ring-sky-100"
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
              onClick={onLogin}
              className="flex w-full items-center justify-between rounded-[1.5rem] bg-slate-900 p-4 text-white shadow-[0_24px_40px_-24px_rgba(15,23,42,0.65)] transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <UserCircle size={24} weight="duotone" className="text-slate-400" />
                <div className="text-left">
                  <p className="text-sm font-black">Entrar como cliente</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pedidos, conta e endereços</p>
                </div>
              </div>
              <CaretRight size={16} weight="bold" className="text-slate-500" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-8">
          <section className="rounded-[1.65rem] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))] p-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)] ring-1 ring-slate-100/80">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_28px_-22px_rgba(15,23,42,0.65)]">
                <Sparkle size={18} weight="fill" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Acesso rápido</p>
                <p className="text-sm font-bold text-slate-800">Tudo da sua conta em um só lugar</p>
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Minha Operação</p>
              <div className="grid gap-2">
                <button
                  onClick={() => {
                    if (storeSlug) window.location.href = `/${storeSlug}`;
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-[1.5rem] border border-sky-100 bg-white/80 p-3.5 text-sky-900 shadow-[0_14px_28px_-24px_rgba(14,165,233,0.5)] transition-all active:scale-95"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 shadow-sm text-sky-600">
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
                  {action.id === 'deactivate' ? (
                    <span className="block text-[11px] font-medium text-rose-500">Remove seu acesso e dados da conta</span>
                  ) : action.id === 'logout' ? (
                    <span className="block text-[11px] font-medium text-slate-400">Encerra somente a sessão neste aparelho</span>
                  ) : null}
                </div>
              </button>
            ))}
          </nav>

          <section className="pt-2">
            <div className="mb-3 px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Acessos Profissionais</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Lojista e entregador entram por aqui.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onOpenAdminLogin}
                className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-100 bg-white/90 p-5 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.35)] transition-all active:scale-95"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                  <Storefront size={28} weight="duotone" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Painel da Loja</span>
              </button>
              <button
                onClick={onOpenMotoboyLogin}
                className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-100 bg-white/90 p-5 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.35)] transition-all active:scale-95"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <ArrowsClockwise size={28} weight="duotone" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Entregador</span>
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-100/90 bg-white/70 p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-black text-slate-900 tracking-tight">Ja no Caminho</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Versão {versionLabel || 'v0.0.0'}</p>
            </div>
            <img src="/jnc.png" alt="Logo" className="h-8 w-auto opacity-95" />
          </div>
        </div>
      </aside>
    </div>
  );
}
