import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type IconButtonVariant = 'plain' | 'surface' | 'primary' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClasses: Record<IconButtonVariant, string> = {
  plain: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  surface: 'border-white/80 bg-white/78 text-brand-navy shadow-[0_14px_28px_-22px_rgba(21,58,76,0.55)] ring-1 ring-[#d7e7ef]/70',
  primary: 'border-transparent bg-brand-navy text-white shadow-[0_16px_32px_-24px_rgba(21,58,76,0.70)]',
  danger: 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-10 w-10 rounded-full',
  lg: 'h-12 w-12 rounded-[1.1rem]',
};

export function IconButton({
  icon,
  label,
  variant = 'surface',
  size = 'md',
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'jnc-ds-touch jnc-ds-focus-ring inline-flex shrink-0 items-center justify-center border transition-all disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
