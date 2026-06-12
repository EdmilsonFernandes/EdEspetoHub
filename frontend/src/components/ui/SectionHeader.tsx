import type { ReactNode } from 'react';
import { cn } from './classNames';

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]/75">{eyebrow}</p> : null}
        <h2 className="mt-0.5 text-xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
