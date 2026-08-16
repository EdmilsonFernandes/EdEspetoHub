import {
  Clock,
  Printer,
  Monitor,
  Buildings,
  Truck,
  Storefront,
  Hash,
  NotePencil,
  Play,
  Check,
  Package,
} from "@phosphor-icons/react";
import {
  resolveLocationIdentifier,
  isCondominiumOrder,
  resolveCondominiumCardIdentifier,
  parseMesaIdentifier,
  resolveCustomerOrderNote,
} from "./helpers";
import { PremiumCheckToggle } from "./PremiumCheckToggle";

export const OrderSummaryCard = ({
  order,
  queueRank,
  orderDisplayId,
  isLate,
  elapsedLabel,
  statusMeta,
  typeMeta,
  paymentLabel,
  totalLabel,
  itemsCount,
  onClick,
  onPrint,
  canPrint,
  printBusy,
  archived = false,
  onReopen,
  showSelector = false,
  selected = false,
  onToggleSelect,
  showQuickStart = false,
  onQuickStart,
  showQuickFinalize = false,
  onQuickFinalize,
  isTimerWarning = false,
}: any) => (
  (() => {
    const orderType = String(order?.type || '').toLowerCase();
    const orderStatus = String(order?.status || '').toLowerCase();
    const locationIdentifier = resolveLocationIdentifier(order);
    const isCondo = isCondominiumOrder(order);
    const cardLocationIdentifier = isCondo ? resolveCondominiumCardIdentifier(order) : locationIdentifier;
    const condominiumLine = isCondo ? String(locationIdentifier || '').trim() : '';
    const hasLocationIdentifier = Boolean(cardLocationIdentifier);
    const mesaMeta = parseMesaIdentifier(cardLocationIdentifier);
    const isMesaLocation = mesaMeta.isMesa;
    const locationLine = isCondo ? condominiumLine : cardLocationIdentifier;
    const locationBadgeTone = isMesaLocation
      ? 'bg-[#FFF3E0] text-[#E65100] border-[#E65100]'
      : isCondo
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-slate-100 text-slate-900 border-slate-200';
    const closedAtLabel = (() => {
      if (!archived) return '';
      const base = Number(order?.updatedAt || order?.createdAt || 0);
      if (!base) return '';
      return new Date(base).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    })();
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const itemNames = Array.from(
      new Set(orderItems.map((item: any) => String(item?.name || '').trim()).filter(Boolean))
    );
    const itemsSummary = itemNames.slice(0, 2).join(' • ');
    const customerNote = resolveCustomerOrderNote(order);
    const timerToneClass = isLate
      ? 'text-red-600'
      : isTimerWarning
        ? 'text-amber-600'
        : 'text-slate-500';
    const timerIconToneClass = isLate
      ? 'text-red-500'
      : isTimerWarning
        ? 'text-amber-500'
        : 'text-slate-400';
    const timerShellClass = isLate
      ? 'border-red-200 bg-red-50/80'
      : isTimerWarning
        ? 'border-amber-200 bg-amber-50/80'
        : 'border-slate-200 bg-white';
    const selectorToneClass = (() => {
      if (orderStatus === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
      if (orderStatus === 'preparing') return 'border-sky-200 bg-sky-50 text-sky-700';
      if (orderStatus === 'ready' || orderStatus === 'ready_for_delivery' || orderStatus === 'waiting_for_motoboy' || orderStatus === 'dispatched' || orderStatus === 'in_delivery') {
        return 'border-violet-200 bg-violet-50 text-violet-700';
      }
      if (orderStatus === 'done' || orderStatus === 'delivered' || orderStatus === 'finished') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      return 'border-slate-200 bg-slate-100 text-slate-600';
    })();
    const selectorMeta = (() => {
      const fulfillment = String(order?.fulfillmentMode || '').toLowerCase();
      if (orderType === 'delivery' && fulfillment === 'postal') return { icon: Package };
      if (orderType === 'delivery') return { icon: Truck };
      if (orderType === 'pickup') return { icon: Storefront };
      if (orderType === 'table') return { icon: Monitor };
      return { icon: Hash };
    })();
    const statusBadgeTone = (() => {
      if (orderStatus === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
      if (orderStatus === 'preparing') return 'border-sky-200 bg-sky-50 text-sky-700';
      if (orderStatus === 'ready' || orderStatus === 'ready_for_delivery' || orderStatus === 'waiting_for_motoboy' || orderStatus === 'dispatched' || orderStatus === 'in_delivery') return 'border-violet-200 bg-violet-50 text-violet-700';
      if (orderStatus === 'done' || orderStatus === 'delivered' || orderStatus === 'finished') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      return 'bg-slate-50 border-transparent text-slate-500';
    })();
    const orderDisplayLabel = String(orderDisplayId || '').trim() || String(order?.id || '').trim() || '-';
    const typeLabel = String(typeMeta?.label || '').trim();
    const showTypeInMeta = !hasLocationIdentifier && Boolean(typeLabel);
    const renderMetaDivider = () => <span className="text-slate-300">•</span>;
    // Reserva: chip compacto inline com o horário agendado (HH:MM local).
    // Só renderiza para pedidos de reserva com scheduledFor válido; não cria nova linha.
    const reservationTimeLabel = (() => {
      if (orderType !== 'reservation' || !order?.scheduledFor) return '';
      const parsed = new Date(order.scheduledFor);
      const ts = Number(parsed?.getTime?.() || 0);
      if (!Number.isFinite(ts) || ts <= 0) return '';
      return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    })();
    const showReservationChip = orderType === 'reservation' && Boolean(reservationTimeLabel);
    return (
  <div
    role="button"
    tabIndex={0}
    data-testid="admin-order-card"
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    }}
    className={`relative w-full min-h-[140px] rounded-[1.7rem] border transition-all duration-300 cursor-pointer overflow-hidden ${
      archived
        ? 'border-slate-200/80 bg-slate-50/90 opacity-80'
        : `border-slate-200 bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.24)] hover:border-slate-300 hover:shadow-[0_20px_38px_-24px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 ${
            selected ? 'ring-2 ring-emerald-100' : ''
          } ${isLate ? '!border-rose-300 !bg-rose-50/70 ring-1 ring-rose-300/60' : ''}`
    }`}
  >
    <div className="flex items-stretch h-full">
      {showSelector && (
        <div className="shrink-0 flex w-14 flex-col items-center justify-center gap-3 border-r border-slate-100 bg-slate-50/80 px-2">
          <PremiumCheckToggle
            selected={selected}
            disabled={!showQuickFinalize}
            onToggle={onToggleSelect}
            ariaLabel={selected ? "Desmarcar pedido" : "Selecionar pedido"}
          />
          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 ${selectorToneClass} ${selected ? 'scale-105 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]' : ''}`}>
            <selectorMeta.icon size={18} weight="duotone" />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div className="space-y-3.5">
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex flex-1 items-start gap-3">
              <div className={`inline-flex h-9 shrink-0 items-center justify-center rounded-2xl px-3 text-sm font-black tracking-tight shadow-sm ${
                archived
                  ? 'border border-slate-200 bg-white text-slate-400'
                  : 'border border-slate-900/5 bg-slate-900 text-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)]'
              }`}>
                #{String(queueRank).padStart(2, '0')}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors whitespace-nowrap ${timerShellClass} ${timerToneClass}`}>
                <Clock size={14} weight="fill" className={`shrink-0 ${timerIconToneClass}`} />
                <span className="inline-block min-w-[3.1rem] text-center text-[11px] font-extrabold tabular-nums tracking-tight whitespace-nowrap">
                  {archived ? (closedAtLabel || '--:--') : elapsedLabel}
                </span>
              </div>

              {canPrint && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPrint();
                  }}
                  disabled={printBusy}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-90 disabled:opacity-50 shrink-0"
                  title="Imprimir"
                >
                  <Printer size={18} weight="duotone" />
                </button>
              )}
            </div>
          </div>

          {/* Nome do Cliente */}
          <div className="min-w-0">
            {hasLocationIdentifier && (
              <div
                className={`mb-2.5 inline-flex max-w-full items-start gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm ${locationBadgeTone}`}
                title={locationIdentifier || cardLocationIdentifier}
              >
                {isMesaLocation ? (
                  <>
                    <Monitor size={14} weight="duotone" className="mt-0.5 shrink-0" />
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]">Mesa</span>
                    <span className="text-sm font-black leading-none">{mesaMeta.number}</span>
                  </>
                ) : (
                  <>
                    {isCondo ? <Buildings size={14} weight="duotone" className="mt-0.5 shrink-0" /> : orderType === 'delivery' ? <Truck size={14} weight="duotone" className="mt-0.5 shrink-0" /> : <Storefront size={14} weight="duotone" className="mt-0.5 shrink-0" />}
                    <span className="min-w-0 leading-snug [overflow-wrap:anywhere]">
                      {locationLine}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-slate-600 shadow-sm">
                <Hash size={11} weight="duotone" className="shrink-0 text-slate-400" />
                <span className="truncate">{orderDisplayLabel}</span>
              </span>
            </div>
            <h3 className="mt-2 text-[1.05rem] font-black leading-tight text-slate-900 truncate">
              {order.customerName || order.name || 'Cliente'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
              {showTypeInMeta ? (
                <>
                  <span className="font-semibold text-slate-700">{typeLabel}</span>
                  {renderMetaDivider()}
                </>
              ) : null}
              <span className="font-semibold text-slate-700">{itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
              {renderMetaDivider()}
              <span className="truncate">{paymentLabel}</span>
              {itemsSummary && (
                <>
                  {renderMetaDivider()}
                  <span className="truncate">{itemsSummary}</span>
                </>
              )}
            </div>
            {customerNote ? (
              <div className="mt-2 inline-flex max-w-full items-start gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm">
                <NotePencil size={13} weight="duotone" className="mt-0.5 shrink-0" />
                <span className="line-clamp-2 [overflow-wrap:anywhere]">{customerNote}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer do Card */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-col shrink-0">
              <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 leading-none">Total</span>
              <span className="text-[1.05rem] font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">
                {totalLabel}
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${statusBadgeTone}`}>
                {archived ? 'Finalizado' : statusMeta.label}
              </span>
              {showReservationChip && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap text-indigo-700">
                  <Clock size={10} weight="fill" className="shrink-0" />
                  Reserva {reservationTimeLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 justify-end">
            {!archived && showQuickStart && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickStart();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#153A4C] text-white shadow-[0_18px_32px_-24px_rgba(21,58,76,0.55)] transition-all hover:bg-[#102b38] active:scale-95"
                title="Atender"
                aria-label="Atender pedido"
              >
                <Play size={16} weight="fill" />
              </button>
            )}

            {!archived && showQuickFinalize && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickFinalize();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_18px_32px_-24px_rgba(5,150,105,0.55)] transition-all hover:bg-emerald-700 active:scale-95"
                title="Pronto"
                aria-label="Marcar pedido como pronto"
              >
                <Check size={16} weight="bold" />
              </button>
            )}

            {archived && typeof onReopen === 'function' && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onReopen();
                }}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 transition-all hover:bg-amber-100 active:scale-95 whitespace-nowrap"
              >
                Reabrir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
    );
  })()
);
