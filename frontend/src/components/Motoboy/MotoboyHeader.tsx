type MotoboyHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function MotoboyHeader({ title, subtitle, rightAction }: MotoboyHeaderProps) {
  return (
    <div className="premium-card-glass p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-12 w-12 rounded-2xl overflow-hidden shadow-[0_18px_34px_-26px_rgba(239,68,68,0.9)]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#ef4444,#f59e0b)] opacity-20" />
            <img src="/logo.svg" alt="Chama no Espeto" className="relative h-full w-full object-cover bg-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500 truncate">Área do Entregador</p>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="shrink-0">{rightAction}</div>
      </div>
    </div>
  );
}

