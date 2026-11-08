import { UserCircle } from '@phosphor-icons/react';

type HeaderAvatarTriggerProps = {
  displayName?: string;
  profileImageUrl?: string | null;
  onClick: () => void;
  hasNotification?: boolean;
};

const initialsFrom = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return 'AN';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

export function HeaderAvatarTrigger({
  displayName,
  profileImageUrl,
  onClick,
  hasNotification = false,
}: HeaderAvatarTriggerProps) {
  const isLogged = Boolean(displayName || profileImageUrl);

  if (!isLogged) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="jnc-hub-touch relative inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3 text-slate-800 shadow-2xs backdrop-blur-md transition-all hover:border-emerald-500/40 hover:bg-emerald-50/50 hover:text-emerald-950 active:scale-95"
        aria-label="Fazer login ou acessar conta"
        title="Fazer login ou acessar conta"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-800">
          <UserCircle size={15} weight="bold" />
        </span>
        <span className="text-xs font-black tracking-tight text-slate-900">
          Entrar
        </span>
        {hasNotification ? (
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="jnc-hub-touch relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[linear-gradient(145deg,#0E4B3E_0%,#166534_100%)] text-white shadow-2xs ring-1 ring-slate-900/10 backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
      aria-label="Abrir menu da conta"
      title={displayName ? `Conta de ${displayName}` : 'Abrir menu da conta'}
    >
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={displayName || 'Perfil'}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-[12px] font-black uppercase tracking-wider text-emerald-100">
          {initialsFrom(displayName)}
        </span>
      )}
      
      {/* Indicador de presença verde online */}
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white shadow-xs" />

      {hasNotification ? (
        <>
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-[0_8px_14px_-8px_rgba(225,29,72,0.95)] z-10" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping opacity-65" />
        </>
      ) : null}
    </button>
  );
}
