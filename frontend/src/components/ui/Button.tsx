import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from './classNames';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  // Aliases shadcn/ReUI (blocos baixados usam; ver scripts/reui-download.mjs)
  | 'outline'
  | 'link'
  | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xs' | 'icon' | 'icon-sm' | 'icon-xs';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  /** React 19: ref como prop (componentes vendored ex. calendar passam). */
  ref?: Ref<HTMLButtonElement>;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-brand-navy text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.72)] hover:bg-[#102f3f]',
  secondary:
    'border-[#C3D8FB] bg-white text-brand-navy shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)] hover:border-brand-teal/30 hover:bg-[#f7fafc]',
  ghost:
    'border-transparent bg-transparent text-brand-teal hover:bg-[#E0EBFD]',
  danger:
    'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_14px_28px_-24px_rgba(225,29,72,0.32)] hover:bg-rose-100',
  success:
    'border-emerald-200 bg-emerald-600 text-white shadow-[0_16px_32px_-24px_rgba(5,150,105,0.58)] hover:bg-emerald-700',
  warning:
    'border-amber-200 bg-amber-500 text-slate-900 shadow-[0_16px_32px_-24px_rgba(217,119,6,0.55)] hover:bg-amber-600',
  outline: 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100',
  link: 'border-transparent bg-transparent text-brand-teal underline-offset-4 hover:underline',
  destructive:
    'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_14px_28px_-24px_rgba(225,29,72,0.32)] hover:bg-rose-100',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-xl px-3 py-2 text-xs',
  md: 'min-h-11 rounded-2xl px-4 py-2.5 text-sm',
  lg: 'min-h-12 rounded-[1.15rem] px-5 py-3 text-sm',
  xs: 'min-h-7 rounded-lg px-2 py-1 text-xs',
  icon: 'min-h-10 w-10 rounded-xl p-0',
  'icon-sm': 'min-h-9 w-9 rounded-xl p-0',
  'icon-xs': 'min-h-7 w-7 rounded-lg p-0',
};

/** Variantes para componentes vendored (ex.: calendar do shadcn usa
 *  buttonVariants para os dias). */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'jnc-ds-touch jnc-ds-focus-ring inline-flex items-center justify-center gap-2 border font-black tracking-[-0.01em] transition-all disabled:pointer-events-none disabled:opacity-50',
    sizeClasses[size],
    variantClasses[variant],
    className
  );
}

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
  ref,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
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
