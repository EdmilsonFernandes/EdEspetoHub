import type { ReactNode } from 'react';
import { cn } from './classNames';
import { SurfaceCard } from './SurfaceCard';

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <SurfaceCard tone="soft" padding="lg" className={cn('text-center', className)}>
      {icon ? <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[1.25rem] bg-white text-brand-teal shadow-[0_14px_28px_-24px_rgba(15,23,42,0.30)] ring-1 ring-[#d7e7ef]">{icon}</div> : null}
      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </SurfaceCard>
  );
}
