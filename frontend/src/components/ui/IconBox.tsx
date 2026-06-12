import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type IconBoxSize = 'sm' | 'md' | 'lg';
type IconBoxTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

type IconBoxProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  size?: IconBoxSize;
  tone?: IconBoxTone;
  rounded?: boolean;
};

const sizeClasses: Record<IconBoxSize, string> = {
  sm: 'h-9 w-9 rounded-xl [&>svg]:h-4 [&>svg]:w-4',
  md: 'h-12 w-12 rounded-2xl [&>svg]:h-[22px] [&>svg]:w-[22px]',
  lg: 'h-14 w-14 rounded-[1rem] [&>svg]:h-7 [&>svg]:w-7',
};

const toneClasses: Record<IconBoxTone, string> = {
  brand: 'bg-[#336886]/10 text-[#336886] ring-1 ring-[#336886]/15',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  neutral: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/60',
};

/**
 * Square icon container used throughout the app for section headers,
 * list items, and card headers.
 */
export function IconBox({
  children,
  size = 'md',
  tone = 'brand',
  rounded = false,
  className,
  ...props
}: IconBoxProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizeClasses[size],
        toneClasses[tone],
        rounded && '[&]:rounded-full',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
