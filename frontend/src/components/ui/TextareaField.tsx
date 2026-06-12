import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from './classNames';

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  textareaClassName?: string;
};

export function TextareaField({
  label,
  hint,
  error,
  wrapperClassName,
  textareaClassName,
  id,
  className,
  rows = 4,
  ...props
}: TextareaFieldProps) {
  const textareaId = id || props.name;
  const describedBy = error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined;

  return (
    <div className={cn('block space-y-1.5', wrapperClassName)}>
      {label ? (
        <label htmlFor={textareaId} className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          'jnc-ds-focus-ring min-h-24 w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)] transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
          error ? 'border-rose-300 bg-rose-50/80' : 'border-slate-200 focus:bg-white',
          textareaClassName,
          className
        )}
        {...props}
      />
      {error ? (
        <span id={`${textareaId}-error`} className="block text-xs font-bold text-rose-600">
          {error}
        </span>
      ) : hint ? (
        <span id={`${textareaId}-hint`} className="block text-xs font-semibold text-slate-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
