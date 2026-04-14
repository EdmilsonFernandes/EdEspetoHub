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
      className="relative inline-flex h-[3.05rem] w-[3.05rem] items-center justify-center overflow-hidden rounded-full border border-white/75 bg-white/92 text-slate-700 shadow-[0_14px_28px_-16px_rgba(15,23,42,0.35)] backdrop-blur-sm transition hover:bg-white active:scale-95"
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
        <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
      ) : null}
    </button>
  );
}
