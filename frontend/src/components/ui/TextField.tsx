import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './classNames';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  wrapperClassName?: string;
  inputClassName?: string;
};

export function TextField({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  wrapperClassName,
  inputClassName,
  id,
  className,
  type = 'text',
  ...props
}: TextFieldProps) {
  const inputId = id || props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn('block space-y-1.5', wrapperClassName)}>
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
        </label>
      ) : null}
      <span className="relative block">
        {leftIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span> : null}
        <input
          id={inputId}
          type={type}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            'jnc-ds-focus-ring w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)] transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
            Boolean(leftIcon) && 'pl-10',
            Boolean(rightIcon) && 'pr-10',
            error ? 'border-rose-300 bg-rose-50/80' : 'border-slate-200 focus:bg-white',
            inputClassName,
            className
          )}
          {...props}
        />
        {rightIcon ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span> : null}
      </span>
      {error ? (
        <span id={`${inputId}-error`} className="block text-xs font-bold text-rose-600">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="block text-xs font-semibold text-slate-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
