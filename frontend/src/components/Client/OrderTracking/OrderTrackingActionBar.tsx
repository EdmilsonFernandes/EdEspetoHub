import type { ReactNode } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

type Props = {
  label: string;
  detail: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'success';
};

export function OrderTrackingActionBar({
  label,
  detail,
  icon,
  onClick,
  disabled = false,
  loading = false,
  tone = 'primary',
}: Props) {
  const buttonClass =
    tone === 'success'
      ? 'bg-emerald-600 shadow-[0_18px_34px_-22px_rgba(5,150,105,0.58)]'
      : 'bg-[linear-gradient(135deg,#153A4C,#336886)] shadow-[0_18px_34px_-22px_rgba(51,104,134,0.58)]';

  return (
    <aside
      className="fixed inset-x-0 z-[90] px-3 pb-2 lg:hidden"
      style={{
        bottom: 'calc(var(--jnk-client-bottom-nav-height, 0px) + var(--jnk-native-nav-height, 0px))',
      }}
      aria-label="Próxima ação do pedido"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/95 p-2.5 shadow-[0_-16px_42px_-28px_rgba(15,23,42,0.38)] ring-1 ring-[#d6e4ed]/80 backdrop-blur-xl">
        <div className="min-w-0 flex-1 pl-1">
          <p className="text-2xs font-black uppercase tracking-[0.18em] text-[#336886]">Próxima ação</p>
          <p className="truncate text-[11px] font-semibold text-slate-500">{detail}</p>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          className={`jnc-hub-touch inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-black text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 ${buttonClass}`}
        >
          {loading ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : icon}
          {loading ? 'Aguarde...' : label}
        </button>
      </div>
    </aside>
  );
}
