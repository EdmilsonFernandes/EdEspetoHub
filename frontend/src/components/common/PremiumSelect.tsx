import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';

type PremiumSelectOption = {
  value: string;
  label: string;
};

type PremiumSelectProps = {
  value: string;
  options: PremiumSelectOption[];
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
};

export function PremiumSelect({
  value,
  options,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  menuClassName = '',
  disabled = false,
}: PremiumSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition-all ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-200'
        }`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <CaretDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[220] max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl ${menuClassName}`}>
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(String(option.value));
                  setOpen(false);
                }}
                className={`w-full inline-flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  isSelected ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check size={14} className="text-amber-600" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
