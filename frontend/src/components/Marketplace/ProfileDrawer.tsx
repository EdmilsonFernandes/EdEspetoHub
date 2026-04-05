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
        { id: 'account', label: 'Dados do perfil', icon: <UserRectangle size={20} weight="duotone" />, onClick: onOpenAccount },
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={20} weight="duotone" />, onClick: onOpenAccount },
        { id: 'security', label: 'Segurança', icon: <ShieldCheck size={20} weight="duotone" />, onClick: onOpenAccount },
        { id: 'help', label: 'Central de ajuda', icon: <Lifebuoy size={20} weight="duotone" />, onClick: onOpenHelp },
        { id: 'logout', label: 'Sair da conta', icon: <SignOut size={20} weight="duotone" />, onClick: onLogout, tone: 'danger' },
      ]
    : [
        { id: 'help', label: 'Central de ajuda', icon: <Lifebuoy size={20} weight="duotone" />, onClick: onOpenHelp },
        { id: 'terms', label: 'Termos de uso', icon: <UserRectangle size={20} weight="duotone" />, onClick: onOpenTerms },
        { id: 'privacy', label: 'Privacidade', icon: <ShieldCheck size={20} weight="duotone" />, onClick: onOpenPrivacy },
      ];

  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <aside
        className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] transform bg-white shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col pt-[env(safe-area-inset-top)]`}
      >
        <div className="p-6 pb-4">
          {isLogged ? (
            <div className="flex items-center gap-4">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={userName}
                  className="h-14 w-14 rounded-2xl border-2 border-white object-cover shadow-md ring-1 ring-slate-100"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 shadow-inner">
                  <UserCircle size={32} weight="duotone" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-black text-slate-900">{userName}</p>
                <p className="truncate text-xs font-bold text-slate-400">{userEmail}</p>
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

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {isAdmin && (
            <section className="space-y-2 px-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Minha Operação</p>
              <div className="grid gap-2">
                <button
                  onClick={() => {
                    if (storeSlug) window.location.href = `/${storeSlug}`;
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-sky-900 transition-all active:scale-95"
                >
                  <CookingPot size={20} weight="duotone" className="text-sky-600" />
                  <span className="text-[13px] font-black">Gerenciar Loja</span>
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/hub';
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-emerald-900 transition-all active:scale-95"
                >
                  <House size={20} weight="duotone" className="text-emerald-600" />
                  <span className="text-[13px] font-black">Voltar ao Hub</span>
                </button>
              </div>
            </section>
          )}

          <nav className="space-y-1 px-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3">Menu</p>
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-3 py-3.5 transition-all active:scale-[0.98] ${
                  action.tone === 'danger'
                    ? 'text-rose-600 hover:bg-rose-50 active:bg-rose-100'
                    : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <span className={action.tone === 'danger' ? 'text-rose-500' : 'text-slate-400'}>
                  {action.icon}
                </span>
                <span className="text-[14px] font-bold">{action.label}</span>
              </button>
            ))}
          </nav>

          <section className="px-3 pt-2">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3">Acesso Profissional</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenAdminLogin}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all active:scale-95"
              >
                <Truck size={24} weight="duotone" className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Sou Lojista</span>
              </button>
              <button
                onClick={onOpenMotoboyLogin}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all active:scale-95"
              >
                <ArrowsClockwise size={24} weight="duotone" className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Entregador</span>
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-black text-slate-900">Já no Caminho</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Versão {versionLabel || 'v0.0.0'}</p>
            </div>
            <img src="/janocaminho-logov1.svg" alt="Logo" className="h-6 w-auto opacity-30 grayscale" />
          </div>
        </div>
      </aside>
    </div>
  );
}
