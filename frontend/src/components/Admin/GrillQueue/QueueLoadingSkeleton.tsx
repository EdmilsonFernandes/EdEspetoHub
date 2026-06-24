// @ts-nocheck
import { SYSTEM_LOGO_SRC } from "./helpers";

export const QueueLoadingSkeleton = ({ variant = "queue" }: { variant?: "queue" | "sales" | "route" }) => {
  const isSales = variant === "sales";
  const rows = isSales ? 6 : 4;
  const title =
    variant === "sales"
      ? "Carregando vendas"
      : variant === "route"
        ? "Carregando entregas"
        : "Carregando pedidos";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F28C28]/15 via-white to-[#336886]/10 ring-1 ring-slate-100">
          <span className="absolute inset-0 rounded-2xl bg-[#F28C28]/10 animate-ping" />
          <img
            src={SYSTEM_LOGO_SRC}
            alt="Já no Caminho"
            className="relative h-8 w-8 rounded-xl object-cover"
            loading="eager"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="text-xs font-semibold text-slate-500">
            O Já no Caminho está buscando os dados atualizados da loja.
          </p>
        </div>
      </div>
      {isSales ? (
        <div className="grid gap-2.5 grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={`sales-metric-${item}`} className="animate-pulse rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="h-3 w-20 rounded-full bg-slate-100" />
              <div className="mt-3 h-5 w-24 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : null}
      <div className={`grid gap-3 ${isSales ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`queue-loading-${variant}-${index}`} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded-full bg-slate-100" />
                <div className="h-3 w-32 rounded-full bg-slate-100" />
              </div>
              <div className="h-8 w-14 rounded-full bg-slate-100" />
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3 w-full rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 rounded-full bg-slate-100" />
              <div className="h-3 w-2/3 rounded-full bg-slate-100" />
            </div>
            <div className="mt-5 h-10 w-full rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
};
