import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-[#153A4C] text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.72)] hover:bg-[#102f3f]',
  secondary:
    'border-[#d7e7ef] bg-white text-[#153A4C] shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)] hover:border-[#336886]/30 hover:bg-[#f7fafc]',
  ghost:
    'border-transparent bg-transparent text-[#336886] hover:bg-[#edf5fa]',
  danger:
    'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_14px_28px_-24px_rgba(225,29,72,0.32)] hover:bg-rose-100',
  success:
    'border-emerald-200 bg-emerald-600 text-white shadow-[0_16px_32px_-24px_rgba(5,150,105,0.58)] hover:bg-emerald-700',
  warning:
    'border-amber-200 bg-amber-500 text-white shadow-[0_16px_32px_-24px_rgba(217,119,6,0.55)] hover:bg-amber-600',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-xl px-3 py-2 text-xs',
  md: 'min-h-11 rounded-2xl px-4 py-2.5 text-sm',
  lg: 'min-h-12 rounded-[1.15rem] px-5 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'jnc-ds-touch jnc-ds-focus-ring inline-flex items-center justify-center gap-2 border font-black tracking-[-0.01em] transition-all disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className="min-w-0 truncate">{loading ? 'Aguarde...' : children}</span>
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
}
