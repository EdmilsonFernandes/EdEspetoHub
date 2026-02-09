import React, { useMemo } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
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
  const cashTenderedRaw = order?.cashTendered ?? order?.cash_tendered ?? null;
  const cashTendered = cashTenderedRaw !== null && cashTenderedRaw !== undefined ? Number(cashTenderedRaw) : null;
  const totalValue = Number(order?.total || 0);
  const cashChangeDue = cashTendered !== null ? cashTendered - totalValue : null;

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const compactItemsLabel = useMemo(() => {
    if (!items.length) return '';
    return items
      .slice(0, 2)
      .map((it: any) => `${it.quantity || 1}x ${it.name || it?.product?.name || 'Item'}`)
      .join(' • ');
  }, [items]);
  const shortId = order?.shortId || (order?.id ? String(order.id).slice(0, 8) : '-');
  const customerName = order?.customerName || order?.customer_name || 'Cliente';
  const phone = order?.phone || null;
  const storeLogo = resolveAssetUrl(order?.store?.settings?.logoUrl || order?.store?.settings?.logo_url || '');
  const storeAccent = String(order?.store?.settings?.primaryColor || order?.store?.settings?.primary_color || '').trim();
  const accentColor = storeAccent || 'var(--color-primary)';
  const storeLabel = storeName || (storeSlug ? `/${storeSlug}` : 'Loja');

  return (
    <div className="premium-card p-4 sm:p-5 space-y-4 relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{
          background: `linear-gradient(180deg, ${accentColor}, color-mix(in srgb, ${accentColor} 55%, #f59e0b))`,
        }}
        aria-hidden="true"
      />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeLabel}
                className="h-9 w-9 rounded-xl object-cover border border-white shadow-sm"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-slate-100 border border-white shadow-sm" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 truncate">{storeLabel}</p>
              <p className="text-[11px] text-slate-400 truncate">Pedido</p>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="text-lg font-extrabold text-slate-900 truncate">#{shortId}</p>
            <StatusBadge status={order?.status} />
          </div>
          {createdAt && <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(createdAt)}</p>}
        </div>
        <div className="sm:shrink-0">
          <PaymentBadge method={order?.paymentMethod || order?.payment_method} status={order?.paymentStatus} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="text-base font-bold text-slate-900 truncate">{customerName}</p>
            {phone && <p className="text-xs text-slate-600 mt-1">{phone}</p>}
            {compact && compactItemsLabel && (
              <p className="text-xs text-slate-600 mt-2 truncate">{compactItemsLabel}</p>
            )}
            {compact && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] text-slate-600 truncate">
                  <span className="font-semibold text-slate-700">Loja:</span> {storeName || storeSlug || 'Loja'}
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  <span className="font-semibold text-slate-700">Entrega:</span> {address}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-extrabold text-slate-900">{formatCurrency(order?.total || 0)}</p>
            {type === 'delivery' && (
              <p className="text-[11px] text-emerald-700 font-semibold">
                Frete: {formatCurrency(Number.isFinite(Number(deliveryFee)) ? Number(deliveryFee) : 0)}
              </p>
            )}
            {(String(order?.paymentMethod || order?.payment_method || '').toLowerCase() === 'dinheiro' ||
              String(order?.paymentMethod || order?.payment_method || '').toLowerCase() === 'cash') &&
            cashTendered !== null ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-[11px] text-emerald-700 font-semibold">
                  Cliente paga com: {formatCurrency(cashTendered)}
                </p>
                {cashChangeDue !== null && cashChangeDue > 0 ? (
                  <p className="text-[11px] text-amber-700 font-semibold">
                    Troco: {formatCurrency(cashChangeDue)}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 font-semibold">Sem troco</p>
                )}
              </div>
            ) : null}
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
                  <div className="flex items-center gap-3">
                    {item?.imageUrl || item?.product?.imageUrl ? (
                      <img
                        src={resolveAssetUrl(item.imageUrl || item?.product?.imageUrl)}
                        alt={item.name || item?.product?.name || 'Item'}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {(item.quantity || 1)}x {item.name || item?.product?.name || 'Item'}
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
