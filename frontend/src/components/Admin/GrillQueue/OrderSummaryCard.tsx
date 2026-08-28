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

// Redesign premium (28/08): hierarquia em 3 camadas — quem+urgência → o quê
// (completo, sem truncar) → quanto+ação. Status vira barra lateral colorida.
// Props, testids e comportamentos preservados; nada de truncate em nome,
// itens, endereço ou nota — informação essencial da cozinha quebra, não corta.
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
    const closedAtLabel = (() => {
      if (!archived) return '';
      const base = Number(order?.updatedAt || order?.createdAt || 0);
      if (!base) return '';
      return new Date(base).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    })();

    // Itens agregados por nome (2× Medalhão...) — cozinha lê quantidade.
    const MAX_VISIBLE_ITEMS = 4;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const aggregatedItems = (() => {
      const map = new Map<string, number>();
      for (const item of orderItems) {
        const name = String(item?.name || '').trim();
        if (!name) continue;
        const qty = Math.max(1, Number(item?.quantity ?? item?.qty ?? 1) || 1);
        map.set(name, (map.get(name) || 0) + qty);
      }
      return [...map.entries()];
    })();
    const visibleItems = aggregatedItems.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenItemsCount = aggregatedItems.length - visibleItems.length;

    const customerNote = resolveCustomerOrderNote(order);

    // Barra lateral = status do pedido (o "vento" do card: muda com o play).
    const statusBarClass = (() => {
      if (isLate) return 'bg-rose-500';
      if (archived) return 'bg-slate-300';
      if (orderStatus === 'pending') return 'bg-amber-400';
      if (orderStatus === 'preparing') return 'bg-sky-500';
      if (orderStatus === 'ready' || orderStatus === 'ready_for_delivery' || orderStatus === 'waiting_for_motoboy' || orderStatus === 'dispatched' || orderStatus === 'in_delivery') return 'bg-violet-500';
      if (orderStatus === 'done' || orderStatus === 'delivered' || orderStatus === 'finished') return 'bg-emerald-500';
      return 'bg-slate-400';
    })();
    const statusDotClass = statusBarClass;
    const statusLabelClass = (() => {
      if (isLate) return 'text-rose-600';
      if (orderStatus === 'pending') return 'text-amber-600';
      if (orderStatus === 'preparing') return 'text-sky-600';
      if (orderStatus === 'ready' || orderStatus === 'ready_for_delivery' || orderStatus === 'waiting_for_motoboy' || orderStatus === 'dispatched' || orderStatus === 'in_delivery') return 'text-violet-600';
      if (orderStatus === 'done' || orderStatus === 'delivered' || orderStatus === 'finished') return 'text-emerald-600';
      return 'text-slate-500';
    })();

    const timerTextClass = isLate
      ? 'text-rose-600'
      : isTimerWarning
        ? 'text-amber-600'
        : 'text-slate-500';
    const timerIconClass = isLate
      ? 'text-rose-500'
      : isTimerWarning
        ? 'text-amber-500'
        : 'text-slate-400';

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

    // Label do local (header): Mesa N / Condomínio / Delivery / Retirada / tipo.
    const locationHeader = (() => {
      if (isMesaLocation) return { icon: Monitor, label: `Mesa ${mesaMeta.number}`, tone: 'text-[#E65100]' };
      if (isCondo) return { icon: Buildings, label: 'Condomínio', tone: 'text-emerald-700' };
      if (orderType === 'delivery') return { icon: Truck, label: 'Delivery', tone: 'text-sky-700' };
      if (orderType === 'pickup') return { icon: Storefront, label: 'Retirada', tone: 'text-slate-600' };
      const typeLabel = String(typeMeta?.label || '').trim();
      if (typeLabel) return { icon: Hash, label: typeLabel, tone: 'text-slate-600' };
      return null;
    })();

    const orderDisplayLabel = String(orderDisplayId || '').trim() || String(order?.id || '').trim() || '-';
    const reservationTimeLabel = (() => {
      if (orderType !== 'reservation' || !order?.scheduledFor) return '';
      const parsed = new Date(order.scheduledFor);
      const ts = Number(parsed?.getTime?.() || 0);
      if (!Number.isFinite(ts) || ts <= 0) return '';
      return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    })();
    const showReservationChip = orderType === 'reservation' && Boolean(reservationTimeLabel);

    // Endereço/linha completa do local: quebra (wrap-anywhere), nunca corta.
    const showLocationLine = hasLocationIdentifier && !isMesaLocation;

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
        className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
          archived
            ? 'border-slate-200/80 bg-slate-50/90 opacity-80'
            : `border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_-20px_rgba(15,23,42,0.25)] hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_36px_-22px_rgba(15,23,42,0.3)] ${
                selected ? 'ring-2 ring-emerald-500/70' : ''
              } ${isLate ? 'border-rose-200 bg-rose-50/40 ring-1 ring-rose-300/50' : ''}`
        }`}
      >
        {/* Barra de status — a identidade dinâmica do card */}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 h-full w-[4px] ${statusBarClass} ${isLate ? 'animate-pulse' : ''}`}
        />

        <div className="flex items-stretch h-full pl-1.5">
          {showSelector && (
            <div className="shrink-0 flex w-12 flex-col items-center justify-center gap-3 border-r border-slate-100 bg-slate-50/70 px-1.5">
              <PremiumCheckToggle
                selected={selected}
                disabled={!showQuickFinalize}
                onToggle={onToggleSelect}
                ariaLabel={selected ? "Desmarcar pedido" : "Selecionar pedido"}
              />
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 ${selectorToneClass} ${selected ? 'scale-105' : ''}`}>
                <selectorMeta.icon size={17} weight="duotone" />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-3.5">
            {/* Camada 1 — quem + urgência */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 shrink-0 items-center rounded-md px-1.5 text-[11px] font-bold tabular-nums tracking-tight ${
                  archived ? 'border border-slate-200 bg-white text-slate-400' : 'bg-slate-900 text-white'
                }`}
              >
                #{String(queueRank).padStart(2, '0')}
              </span>

              {locationHeader && (
                <span className={`inline-flex min-w-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] ${locationHeader.tone}`}>
                  <locationHeader.icon size={13} weight="duotone" className="shrink-0" />
                  <span className="truncate">{locationHeader.label}</span>
                </span>
              )}

              {showReservationChip && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-600">
                  <Clock size={10} weight="fill" />
                  Reserva {reservationTimeLabel}
                </span>
              )}

              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] font-extrabold tabular-nums tracking-tight whitespace-nowrap">
                <Clock size={13} weight={isLate ? 'fill' : 'duotone'} className={timerIconClass} />
                <span className={timerTextClass}>{archived ? (closedAtLabel || '--:--') : elapsedLabel}</span>
              </span>
            </div>

            <h3 className="mt-1.5 text-[17px] font-extrabold leading-tight text-slate-900 break-words">
              {order.customerName || order.name || 'Cliente'}
            </h3>

            {showLocationLine && (
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500 break-words [overflow-wrap:anywhere]">
                {locationLine}
              </p>
            )}

            {/* Camada 2 — o quê (completo, sem truncar) */}
            {visibleItems.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {visibleItems.map(([name, qty]) => (
                  <li key={name} className="text-[12.5px] leading-snug text-slate-700 break-words">
                    <span className="font-bold tabular-nums text-slate-900">{qty}×</span>{' '}
                    {name}
                  </li>
                ))}
                {hiddenItemsCount > 0 && (
                  <li className="text-[11px] font-semibold text-slate-400">
                    +{hiddenItemsCount} {hiddenItemsCount === 1 ? 'item' : 'itens'} — toque para ver tudo
                  </li>
                )}
              </ul>
            )}
            {visibleItems.length === 0 && itemsCount > 0 && (
              <p className="mt-2 text-[12.5px] font-semibold text-slate-600">
                {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
              </p>
            )}

            {customerNote ? (
              <div
                className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold leading-snug text-amber-800"
                title={customerNote}
              >
                <NotePencil size={12} weight="duotone" className="mt-0.5 shrink-0" />
                <span className="line-clamp-3 break-words [overflow-wrap:anywhere]">{customerNote}</span>
              </div>
            ) : null}

            {/* Camada 3 — quanto + ação */}
            <div className="flex-1" aria-hidden="true" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-100 pt-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${statusLabelClass}`}>
                  <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
                  {archived ? 'Finalizado' : statusMeta.label}
                </span>
                <span className="font-mono text-[10px] leading-none text-slate-400 truncate" title={orderDisplayLabel}>
                  {orderDisplayLabel}
                  {order?.origin ? (
                    <span className="font-sans font-bold uppercase"> · {order.origin === 'staff' ? 'Balcão' : order.origin === 'app' ? 'App' : 'Site'}</span>
                  ) : null}
                </span>
              </div>

              <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">{paymentLabel}</span>
                  <span className="text-[16px] font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                    {totalLabel}
                  </span>
                </div>

                {!archived && showQuickStart && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickStart();
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#153A4C] px-3 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_10px_22px_-14px_rgba(21,58,76,0.6)] transition-all hover:bg-[#102b38] active:scale-95"
                    title="Atender"
                    aria-label="Atender pedido"
                  >
                    <Play size={13} weight="fill" />
                    <span className="hidden min-[380px]:inline">Atender</span>
                  </button>
                )}

                {!archived && showQuickFinalize && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickFinalize();
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_10px_22px_-14px_rgba(5,150,105,0.6)] transition-all hover:bg-emerald-700 active:scale-95"
                    title="Pronto"
                    aria-label="Marcar pedido como pronto"
                  >
                    <Check size={15} weight="bold" />
                  </button>
                )}

                {canPrint && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPrint();
                    }}
                    disabled={printBusy}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                    title="Imprimir"
                    aria-label="Imprimir pedido"
                  >
                    <Printer size={16} weight="duotone" />
                  </button>
                )}

                {archived && typeof onReopen === 'function' && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReopen();
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 transition-all hover:bg-amber-100 active:scale-95 whitespace-nowrap"
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
