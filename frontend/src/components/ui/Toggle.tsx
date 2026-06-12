import type { ButtonHTMLAttributes } from 'react';
import { cn } from './classNames';

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onToggle: () => void;
  label?: string;
};

/**
 * Accessible toggle/switch control following the existing DevicePermissionsCard pattern.
 */
export function Toggle({ checked, onToggle, label, disabled, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
        style={{ width: 22, height: 22 }}
      />
    </button>
  );
}
