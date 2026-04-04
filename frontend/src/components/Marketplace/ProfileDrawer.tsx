import { useEffect, type ReactNode } from 'react';
import {
  BellSimple,
  ChatCenteredDots,
  Lifebuoy,
  MapPin,
  ShieldCheck,
  SignOut,
  UserCircle,
  UserRectangle,
} from '@phosphor-icons/react';

type DrawerAction = {
  id: string;
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  onClick: () => void;
};

type ProfileDrawerProps = {
  isOpen: boolean;
  isLogged: boolean;
  userName: string;
  userEmail?: string;
  locationLabel?: string;
  onClose: () => void;
  onLogin: () => void;
  onOpenAccount: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  versionLabel?: string;
};

const ItemButton = ({
  label,
  icon,
  onClick,
  tone = 'default',
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
      tone === 'danger'
        ? 'text-rose-700 hover:bg-rose-50'
        : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
      {icon}
    </span>
    <span>{label}</span>
  </button>
);

export function ProfileDrawer({
  isOpen,
  isLogged,
  userName,
  userEmail,
  locationLabel,
  onClose,
  onLogin,
  onOpenAccount,
  onOpenTerms,
  onOpenPrivacy,
  onOpenHelp,
  onLogout,
  versionLabel,
}: ProfileDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions: DrawerAction[] = isLogged
    ? [
        { id: 'account', label: 'Minha conta', icon: <UserRectangle size={18} weight="duotone" />, onClick: onOpenAccount },
        { id: 'orders', label: 'Meus pedidos', icon: <BellSimple size={18} weight="duotone" />, onClick: onOpenAccount },
        { id: 'security', label: 'Central de segurança', icon: <ShieldCheck size={18} weight="duotone" />, onClick: onOpenAccount },
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={18} weight="duotone" />, onClick: onOpenHelp },
        { id: 'terms', label: 'Termos de uso', icon: <UserRectangle size={18} weight="duotone" />, onClick: onOpenTerms },
        { id: 'privacy', label: 'Política de privacidade', icon: <ShieldCheck size={18} weight="duotone" />, onClick: onOpenPrivacy },
        { id: 'messages', label: 'Mensagens', icon: <ChatCenteredDots size={18} weight="duotone" />, onClick: onOpenAccount },
        { id: 'logout', label: 'Sair', icon: <SignOut size={18} weight="duotone" />, onClick: onLogout, tone: 'danger' },
      ]
    : [
        { id: 'login', label: 'Entrar ou criar conta', icon: <UserCircle size={18} weight="duotone" />, onClick: onLogin },
        { id: 'security', label: 'Central de segurança', icon: <ShieldCheck size={18} weight="duotone" />, onClick: onLogin },
        { id: 'help', label: 'Ajuda', icon: <Lifebuoy size={18} weight="duotone" />, onClick: onOpenHelp },
        { id: 'terms', label: 'Termos de uso', icon: <UserRectangle size={18} weight="duotone" />, onClick: onOpenTerms },
        { id: 'privacy', label: 'Política de privacidade', icon: <ShieldCheck size={18} weight="duotone" />, onClick: onOpenPrivacy },
      ];

  return (
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Fechar menu"
      />

      <aside className="absolute left-0 top-0 z-[140] h-full w-[82%] max-w-[360px] overflow-y-auto rounded-r-3xl bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)]">
        <div className="relative border-b border-slate-200 bg-slate-50/90 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3 pt-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-base font-black text-slate-900">{userName || 'Anônimo'}</h3>
                <ShieldCheck size={14} weight="fill" className="text-amber-500" />
              </div>
              <button
                type="button"
                onClick={isLogged ? onOpenAccount : onLogin}
                className="mt-1 text-xs font-semibold text-sky-700 hover:text-sky-800"
              >
                {isLogged ? 'Editar minhas informações >' : 'Entrar para salvar seus dados >'}
              </button>
              {userEmail ? (
                <p className="mt-1 truncate text-[11px] text-slate-500">{userEmail}</p>
              ) : null}
            </div>
            <div className="relative">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white bg-slate-900 text-sm font-black text-white shadow">
                {(userName || 'AN').slice(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            <MapPin size={14} weight="duotone" className="text-sky-500" />
            <span className="truncate">Entregar em: {locationLabel || 'Sua região'}</span>
          </div>
        </div>

        <div className="px-3 py-3">
          {actions.map((item) => (
            <ItemButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              onClick={() => {
                onClose();
                item.onClick();
              }}
              tone={item.tone}
            />
          ))}
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
          <p className="font-semibold">Já no Caminho</p>
          <p className="mt-0.5">Versão {versionLabel || 'v0.0.0'}</p>
        </div>
      </aside>
    </div>
  );
}
