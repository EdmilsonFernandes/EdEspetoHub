import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type SurfaceCardTone = 'default' | 'soft' | 'brand' | 'success' | 'warning';
type SurfaceCardPadding = 'none' | 'sm' | 'md' | 'lg';

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article';
  tone?: SurfaceCardTone;
  padding?: SurfaceCardPadding;
  interactive?: boolean;
  children: ReactNode;
};

const toneClasses: Record<SurfaceCardTone, string> = {
  default: 'jnc-ds-surface text-slate-950',
  soft: 'jnc-ds-surface-soft text-slate-950',
  brand: 'border-[#d7e7ef] bg-[linear-gradient(145deg,#ffffff,#edf5fa)] text-[#153A4C] shadow-[0_24px_52px_-40px_rgba(51,104,134,0.42)]',
  success: 'border-emerald-100 bg-[linear-gradient(145deg,#ffffff,#ecfdf5)] text-emerald-950 shadow-[0_24px_52px_-42px_rgba(5,150,105,0.32)]',
  warning: 'border-amber-100 bg-[linear-gradient(145deg,#ffffff,#fffbeb)] text-amber-950 shadow-[0_24px_52px_-42px_rgba(217,119,6,0.28)]',
};

const paddingClasses: Record<SurfaceCardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export function SurfaceCard({
  as: Component = 'div',
  tone = 'default',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <Component
      className={cn(
        'relative overflow-hidden border',
        toneClasses[tone],
        paddingClasses[padding],
        interactive && 'jnc-ds-touch hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
