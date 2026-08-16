export const PremiumCheckToggle = ({
  selected = false,
  onToggle,
  disabled = false,
  ariaLabel,
  title,
}: {
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      if (disabled) return;
      onToggle?.();
    }}
    className={`relative z-20 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[10px] border-2 shadow-sm transition-all ${
      selected
        ? "border-emerald-500 bg-emerald-500 text-slate-900 animate-[satinPop_180ms_ease-out]"
        : disabled
          ? "border-slate-200 bg-slate-100 text-transparent opacity-60 cursor-not-allowed"
          : "border-slate-300 bg-white text-transparent hover:border-slate-400 hover:bg-slate-50"
    }`}
    aria-label={ariaLabel}
    title={title}
  >
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </button>
);
