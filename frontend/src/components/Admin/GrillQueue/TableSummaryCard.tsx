// @ts-nocheck
import { Clock, Monitor } from "@phosphor-icons/react";
import { formatCurrency } from "../../../utils/format";
import { getTableStageMeta } from "./helpers";

export const TableSummaryCard = ({ group, elapsedLabel, onClick }: any) => {
  const stageMeta = getTableStageMeta(group?.stage);
  const StageIcon = stageMeta.icon;
  const previewItems = Array.isArray(group?.previewItems) ? group.previewItems : [];

  return (
    <button
      type="button"
      data-testid="admin-table-card"
      onClick={onClick}
      className="group relative min-h-[178px] w-full overflow-hidden rounded-[1.75rem] border border-orange-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#e8f6f3_100%)] p-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.38)] transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_24px_54px_-34px_rgba(230,81,0,0.35)] active:scale-[0.99]"
    >
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#F28C28]/12 blur-2xl transition-transform group-hover:scale-125" />
      <span className="pointer-events-none absolute -bottom-10 left-4 h-28 w-28 rounded-full bg-[#153A4C]/10 blur-2xl" />

      <div className="relative flex h-full min-h-0 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E65100]">Mesa</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#153A4C] px-3 text-xl font-black leading-none text-white shadow-[0_18px_32px_-24px_rgba(21,58,76,0.75)]">
                {group?.displayNumber || "--"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  {group?.ordersCount || 0} pedido{Number(group?.ordersCount || 0) === 1 ? "" : "s"} aberto{Number(group?.ordersCount || 0) === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {group?.itemsCount || 0} {Number(group?.itemsCount || 0) === 1 ? "item" : "itens"} na mesa
                </p>
              </div>
            </div>
          </div>

          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${stageMeta.className}`}>
            <StageIcon size={12} weight="duotone" />
            {stageMeta.label}
          </span>
        </div>

        <div className="relative rounded-2xl border border-white/70 bg-white/76 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Resumo</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                {previewItems.length
                  ? previewItems.map((item: any) => `${item.qty}x ${item.name}`).join(" • ")
                  : "Sem itens informados"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total</p>
              <p className="mt-1 whitespace-nowrap text-base font-black text-slate-900">{formatCurrency(Number(group?.total || 0))}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-orange-100/80 pt-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
            <Clock size={13} weight="duotone" className="shrink-0 text-[#E65100]" />
            <span className="truncate">{elapsedLabel || "Agora"}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#E65100] px-3 py-2 text-xs font-black text-white shadow-[0_18px_30px_-24px_rgba(230,81,0,0.8)]">
            Abrir mesa
            <Monitor size={14} weight="duotone" />
          </span>
        </div>
      </div>
    </button>
  );
};
