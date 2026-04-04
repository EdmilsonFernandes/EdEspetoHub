import { UserCircle } from '@phosphor-icons/react';

type HeaderAvatarTriggerProps = {
  displayName?: string;
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
  onClick,
  hasNotification = true,
}: HeaderAvatarTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
      aria-label="Abrir menu de perfil"
      title="Abrir menu de perfil"
    >
      {displayName ? (
        <span className="text-[11px] font-black uppercase tracking-[0.08em]">
          {initialsFrom(displayName)}
        </span>
      ) : (
        <UserCircle size={20} weight="duotone" />
      )}
      {hasNotification ? (
        <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
      ) : null}
    </button>
  );
}

