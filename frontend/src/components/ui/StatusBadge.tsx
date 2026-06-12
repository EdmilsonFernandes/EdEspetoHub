import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type StatusBadgeTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusBadgeTone;
  icon?: ReactNode;
  children: ReactNode;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  brand: 'border-[#d7e7ef] bg-[#edf5fa] text-[#336886]',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

/**
 * Read-only status pill/badge. For interactive (selectable) pills, use `<Chip>`.
 */
export function StatusBadge({
  tone = 'neutral',
  icon,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {icon ? <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span> : null}
      {children}
    </span>
  );
}
