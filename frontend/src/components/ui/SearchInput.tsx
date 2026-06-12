import { useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './classNames';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Rendered inside the input on the left (default: MagnifyingGlass) */
  icon?: ReactNode;
  /** Called when the clear button is tapped */
  onClear?: () => void;
  /** sm or md (default) */
  size?: 'sm' | 'md';
};

/**
 * Reusable search input matching the app's glass/surface style.
 * Wraps a native `<input type="search">` with icon and optional clear button.
 */
export function SearchInput({
  icon,
  onClear,
  size = 'md',
  value,
  placeholder = 'Buscar...',
  className,
  disabled,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = String(value ?? '').length > 0;

  const sizeClasses = {
    sm: 'min-h-9 rounded-xl px-3 py-2 text-xs pl-9',
    md: 'min-h-11 rounded-2xl px-4 py-3 text-sm pl-11',
  };

  const iconSizeClasses = {
    sm: 'left-2.5 [&>svg]:h-4 [&>svg]:w-4',
    md: 'left-3.5 [&>svg]:h-[18px] [&>svg]:w-[18px]',
  };

  return (
    <div className={cn('relative', className)}>
      {icon ? (
        <span className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400', iconSizeClasses[size])}>
          {icon}
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'jnc-ds-focus-ring w-full border border-slate-200 bg-slate-50 font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50',
          sizeClasses[size],
          hasValue && onClear ? 'pr-9' : '',
        )}
        {...props}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            onClear();
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
