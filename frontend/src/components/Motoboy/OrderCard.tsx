import React, { useMemo } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { PaymentBadge } from './PaymentBadge';
import { StatusBadge } from './StatusBadge';

type Props = {
  order: any;
  compact?: boolean;
  actions?: React.ReactNode;
};

export function OrderCard({ order, compact, actions }: Props) {
  const createdAt = order?.createdAt || order?.created_at;
  const address = order?.address || order?.deliveryAddress || '-';
  const storeName = order?.store?.name || order?.storeName;
  const storeSlug = order?.store?.slug || order?.storeSlug;
  const storeAddress = order?.store?.settings?.address || order?.store?.address || order?.storeAddress;
  const type = order?.type || order?.orderType;
  const deliveryFeeRaw = order?.deliveryFee ?? order?.delivery_fee ?? null;
  const deliveryFee = deliveryFeeRaw !== null && deliveryFeeRaw !== undefined ? Number(deliveryFeeRaw) : null;

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const shortId = order?.shortId || (order?.id ? String(order.id).slice(0, 8) : '-');
  const customerName = order?.customerName || order?.customer_name || 'Cliente';
  const phone = order?.phone || null;

  return (
    <div className="premium-card p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Pedido</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="text-lg font-extrabold text-slate-900 truncate">#{shortId}</p>
            <StatusBadge status={order?.status} />
          </div>
          {createdAt && <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(createdAt)}</p>}
        </div>
        <div className="shrink-0">
          <PaymentBadge method={order?.paymentMethod || order?.payment_method} status={order?.paymentStatus} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="text-base font-bold text-slate-900 truncate">{customerName}</p>
            {phone && <p className="text-xs text-slate-600 mt-1">{phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-extrabold text-slate-900">{formatCurrency(order?.total || 0)}</p>
            {type === 'delivery' && deliveryFee !== null && (
              <p className="text-[11px] text-emerald-700 font-semibold">Frete: {formatCurrency(deliveryFee)}</p>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <p className="text-xs font-semibold text-slate-600">Retirada na loja</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{storeName || 'Loja'}</p>
            {(storeAddress || storeSlug) && (
              <p className="text-xs text-slate-600 mt-1">{storeAddress || (storeSlug ? `/${storeSlug}` : '')}</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <p className="text-xs font-semibold text-slate-600">Entrega</p>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">{address}</p>
          </div>
        </div>
      )}

      {!compact && items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Itens</p>
          <div className="space-y-3">
            {items.map((item: any) => (
              <div key={item.id || item.productId || item.name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {(item.quantity || 1)}x {item.name || 'Item'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item?.cookingPoint && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        {item.cookingPoint}
                      </span>
                    )}
                    {item?.passSkewer && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
                        passar varinha
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(item.price || 0))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions && <div className="pt-2 border-t border-slate-100">{actions}</div>}
    </div>
  );
}

