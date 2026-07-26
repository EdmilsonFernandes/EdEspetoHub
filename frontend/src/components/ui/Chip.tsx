import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type ChipTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type ChipSize = 'sm' | 'md';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  selected?: boolean;
  leftIcon?: ReactNode;
};

const toneClasses: Record<ChipTone, { selected: string; idle: string }> = {
  brand: {
    selected: 'border-brand-teal bg-brand-navy text-white shadow-[0_14px_26px_-20px_rgba(21,58,76,0.48)]',
    idle: 'border-[#d7e7ef] bg-white text-brand-teal hover:bg-[#edf5fa]',
  },
  neutral: {
    selected: 'border-slate-900 bg-slate-900 text-white',
    idle: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  },
  success: {
    selected: 'border-emerald-600 bg-emerald-600 text-white',
    idle: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  warning: {
    selected: 'border-amber-500 bg-amber-500 text-white',
    idle: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  danger: {
    selected: 'border-rose-600 bg-rose-600 text-white',
    idle: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
  },
  info: {
    selected: 'border-sky-600 bg-sky-600 text-white',
    idle: 'border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100',
  },
};

const sizeClasses: Record<ChipSize, string> = {
  sm: 'min-h-8 rounded-full px-3 py-1 text-[11px]',
  md: 'min-h-10 rounded-full px-3.5 py-2 text-xs',
};

export function Chip({
  children,
  tone = 'brand',
  size = 'md',
  selected = false,
  leftIcon,
  type = 'button',
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'jnc-ds-touch jnc-ds-focus-ring inline-flex items-center justify-center gap-1.5 border font-black uppercase tracking-[0.08em] transition-all disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        selected ? toneClasses[tone].selected : toneClasses[tone].idle,
        className
      )}
      {...props}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}
