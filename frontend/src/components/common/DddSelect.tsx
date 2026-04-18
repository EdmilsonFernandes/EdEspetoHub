import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';

const BRAZIL_DDDS = [
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
];

type DddSelectProps = {
  value: string;
  onChange: (ddd: string) => void;
  className?: string;
  disabled?: boolean;
};

export function DddSelect({ value, onChange, className = '', disabled = false }: DddSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (!open || !value || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-ddd="${value}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [open, value]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full inline-flex items-center justify-between gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 outline-none ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : open
            ? 'bg-white border border-[#336886]/30 text-[#336886] shadow-[0_0_0_3px_rgba(51,104,134,0.10)] ring-1 ring-[#336886]/15'
            : 'bg-slate-100 border border-transparent text-slate-800 hover:bg-slate-200/60 focus:bg-white focus:border-[#336886]/20 focus:ring-2 focus:ring-[#336886]/10'
        }`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{value || 'DDD'}</span>
        <CaretDown
          size={13}
          weight="bold"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-[#336886]' : 'text-slate-400'}`}
        />
      </button>

      {open && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] max-h-56 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.30)] ring-1 ring-slate-900/5"
        >
          <div className="grid grid-cols-3 gap-1">
            {BRAZIL_DDDS.map((ddd) => {
              const isSelected = ddd === value;
              return (
                <button
                  key={ddd}
                  data-ddd={ddd}
                  type="button"
                  onClick={() => { onChange(ddd); setOpen(false); }}
                  className={`inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-bold transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'bg-[#336886] text-white shadow-[0_4px_12px_-6px_rgba(51,104,134,0.65)]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {ddd}
                  {isSelected && <Check size={10} weight="bold" className="ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
