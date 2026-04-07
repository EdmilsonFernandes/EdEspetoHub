import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowsClockwise,
  BellSimple,
  CookingPot,
  Lifebuoy,
  ShieldCheck,
  SignOut,
  Truck,
  UserCircle,
  UserRectangle,
  House,
  CaretRight
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
  onOpenTerms,
  onOpenPrivacy,
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
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={22} weight="duotone" />, onClick: onOpenAccount, iconColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { id: 'security', label: 'Segurança', icon: <ShieldCheck size={22} weight="duotone" />, onClick: onOpenAccount, iconColor: 'text-indigo-600', bgColor: 'bg-indigo-50' },
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={22} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'deactivate', label: 'Excluir conta', icon: <SignOut size={22} weight="duotone" />, onClick: onDeactivateAccount, tone: 'danger' },
        { id: 'logout', label: 'Sair da conta', icon: <SignOut size={22} weight="duotone" />, onClick: onLogout, tone: 'danger' },
      ]
    : [
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={22} weight="duotone" />, onClick: onOpenHelp, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'terms', label: 'Termos de uso', icon: <UserRectangle size={22} weight="duotone" />, onClick: onOpenTerms, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
        { id: 'privacy', label: 'Privacidade', icon: <ShieldCheck size={22} weight="duotone" />, onClick: onOpenPrivacy, iconColor: 'text-slate-600', bgColor: 'bg-slate-100' },
      ];

  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <aside
        className={`absolute inset-y-0 left-0 w-[300px] max-w-[85vw] transform bg-white shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col pt-[env(safe-area-inset-top)]`}
      >
        <div className="p-6 pb-4">
          {isLogged ? (
            <div className="flex items-center gap-4">
              {profileImageUrl ? (
                <div className="relative">
                  <img
                    src={profileImageUrl}
                    alt={userName}
                    className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-lg ring-2 ring-sky-100"
                  />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                </div>
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 shadow-inner ring-2 ring-slate-50">
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
              className="flex w-full items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-lg transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <UserCircle size={24} weight="duotone" className="text-slate-400" />
                <div className="text-left">
                  <p className="text-sm font-black">Entrar ou cadastrar</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Minha conta</p>
                </div>
              </div>
              <CaretRight size={16} weight="bold" className="text-slate-500" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8">
          {isAdmin && (
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Minha Operação</p>
              <div className="grid gap-2">
                <button
                  onClick={() => {
                    if (storeSlug) window.location.href = `/${storeSlug}`;
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-3.5 text-sky-900 transition-all active:scale-95"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm text-sky-600">
                    <CookingPot size={22} weight="duotone" />
                  </div>
                  <span className="text-[14px] font-black">Gerenciar Loja</span>
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/hub';
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-emerald-900 transition-all active:scale-95"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm text-emerald-600">
                    <House size={22} weight="duotone" />
                  </div>
                  <span className="text-[14px] font-black">Página Inicial (Hub)</span>
                </button>
              </div>
            </section>
          )}

          <nav className="space-y-1">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Menu do Cliente</p>
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`flex w-full items-center gap-4 rounded-2xl px-3 py-3 transition-all active:scale-[0.97] ${
                  action.tone === 'danger'
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 transition-colors ${action.bgColor || 'bg-slate-100'} ${action.iconColor || 'text-slate-500'}`}>
                  {action.icon}
                </div>
                <span className="text-[15px] font-bold">{action.label}</span>
              </button>
            ))}
          </nav>

          <section className="pt-2">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1">Serviços Profissionais</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onOpenAdminLogin}
                className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all active:scale-95"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                  <Truck size={28} weight="duotone" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Sou Lojista</span>
              </button>
              <button
                onClick={onOpenMotoboyLogin}
                className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all active:scale-95"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <ArrowsClockwise size={28} weight="duotone" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Entregador</span>
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Já no Caminho</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Versão {versionLabel || 'v0.0.0'}</p>
            </div>
            <img src="/jnc.png" alt="Logo" className="h-8 w-auto grayscale opacity-50" />
          </div>
        </div>
      </aside>
    </div>
  );
}
