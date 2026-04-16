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
  hasNotification = true,
}: HeaderAvatarTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-[3.2rem] w-[3.2rem] items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/90 bg-[linear-gradient(145deg,#ffffff_0%,#eef6f4_100%)] text-slate-700 shadow-[0_18px_34px_-18px_rgba(15,23,42,0.42)] ring-1 ring-slate-950/5 backdrop-blur-sm transition hover:bg-white active:scale-95"
      aria-label="Abrir menu de perfil"
      title="Abrir menu de perfil"
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
      ) : displayName ? (
        <span className="text-[11.5px] font-black uppercase tracking-[0.08em]">
          {initialsFrom(displayName)}
        </span>
      ) : (
        <UserCircle size={21} weight="duotone" />
      )}
      {hasNotification ? (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-[0_8px_14px_-8px_rgba(225,29,72,0.95)]" />
      ) : null}
    </button>
  );
}
