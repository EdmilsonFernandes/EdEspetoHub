// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

export const PremiumDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Selecione...",
  className = "",
  menuClassName = "",
  disabled = false,
}: any) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: any) => {
      if (!rootRef.current?.contains?.(event?.target)) setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const selectedOption = options.find((opt: any) => String(opt.value) === String(value));
  const selectedLabel = selectedOption?.label || placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <CaretDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[120] max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl ${menuClassName}`}>
          {options.map((opt: any) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={`w-full inline-flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  isSelected
                    ? "bg-amber-50 text-amber-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected ? <Check size={14} className="text-amber-600" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
