import { CaretRight, X } from '@phosphor-icons/react';

export type HubAnonymousActiveOrder = {
  id: string;
  accessToken?: string | null;
};

type HubAnonymousActiveOrdersProps = {
  orders: HubAnonymousActiveOrder[];
  onDismissAll: () => void;
  onOpenOrder: (orderId?: string | null, accessToken?: string | null) => void;
  onPrimeOrder: (orderId?: string | null, accessToken?: string | null) => void;
};

export function HubAnonymousActiveOrders({
  orders,
  onDismissAll,
  onOpenOrder,
  onPrimeOrder,
}: HubAnonymousActiveOrdersProps) {
  if (!orders.length) return null;

  const firstOrder = orders[0];

  return (
    <div className="order-1 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-200/50 bg-amber-50/90 p-5 shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] backdrop-blur-md">
        <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-amber-200/20 blur-2xl" />
        <button
          type="button"
          onClick={onDismissAll}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-white/80 text-amber-700 shadow-sm transition-colors hover:bg-white"
          aria-label="Fechar aviso de pedido em andamento"
          title="Fechar aviso"
        >
          <X size={14} weight="bold" />
        </button>
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Pedido em andamento
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onOpenOrder(order.id, order.accessToken)}
                  onMouseEnter={() => onPrimeOrder(order.id, order.accessToken)}
                  onFocus={() => onPrimeOrder(order.id, order.accessToken)}
                  onTouchStart={() => onPrimeOrder(order.id, order.accessToken)}
                  className="min-w-[180px] rounded-[1.4rem] border border-white/70 bg-white/95 px-3.5 py-3 text-left shadow-[0_12px_26px_-18px_rgba(245,158,11,0.28)] transition-all active:scale-95"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Pedido salvo
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">
                      #{String(order.id).slice(-6).toUpperCase()}
                    </p>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                      Em andamento
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 sm:text-right">
            <button
              type="button"
              onClick={() => onOpenOrder(firstOrder?.id, firstOrder?.accessToken)}
              onMouseEnter={() => onPrimeOrder(firstOrder?.id, firstOrder?.accessToken)}
              onFocus={() => onPrimeOrder(firstOrder?.id, firstOrder?.accessToken)}
              onTouchStart={() => onPrimeOrder(firstOrder?.id, firstOrder?.accessToken)}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(16,185,129,0.45)] transition-all hover:bg-emerald-600 active:scale-95"
            >
              Acompanhar agora
              <CaretRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-[10px] font-bold italic text-emerald-600/70">
              Disponível por 3 horas neste navegador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
