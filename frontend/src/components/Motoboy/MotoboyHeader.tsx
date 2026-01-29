type MotoboyHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function MotoboyHeader({ title, subtitle, rightAction }: MotoboyHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white ring-1 ring-red-200 shadow-[0_16px_30px_-20px_rgba(239,68,68,0.6)] overflow-hidden">
            <img src="/logo.svg" alt="Chama no Espeto" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Área do Entregador</p>
            <h1 className="text-lg sm:text-xl font-black text-slate-800">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {rightAction}
      </div>
    </div>
  );
}
