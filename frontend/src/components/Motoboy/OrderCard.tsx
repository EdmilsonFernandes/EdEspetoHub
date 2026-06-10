import React, { useMemo } from 'react';
import { formatAddress, formatCurrency, formatDateTime } from '../../utils/format';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { PaymentBadge } from './PaymentBadge';
import { StatusBadge } from './StatusBadge';
import { formatSelectedModifiers } from '../../utils/productModifiers';

type Props = {
  order: any;
  compact?: boolean;
  actions?: React.ReactNode;
  showCourierEarnings?: boolean;
  tipAmount?: number;
  tipPayoutStatus?: string;
  tipSettlementMode?: string;
};

export function OrderCard({ order, compact, actions, showCourierEarnings = false, tipAmount = 0, tipPayoutStatus, tipSettlementMode }: Props) {
  const createdAt = order?.createdAt || order?.created_at;
  const address = formatAddress(order?.address || order?.deliveryAddress) || '-';
  const storeName = order?.store?.name || order?.storeName;
  const storeSlug = order?.store?.slug || order?.storeSlug;
  const storeAddress = formatAddress(order?.store?.settings?.address || order?.store?.address || order?.storeAddress);
  const type = order?.type || order?.orderType;
  const deliveryFeeRaw = order?.deliveryFee ?? order?.delivery_fee ?? null;
  const deliveryFee = deliveryFeeRaw !== null && deliveryFeeRaw !== undefined ? Number(deliveryFeeRaw) : null;
  const isDelivery = String(type || '').toLowerCase() === 'delivery' || deliveryFee !== null;
  const cashTenderedRaw = order?.cashTendered ?? order?.cash_tendered ?? null;
  const cashTendered = cashTenderedRaw !== null && cashTenderedRaw !== undefined ? Number(cashTenderedRaw) : null;
  const totalValue = Number(order?.total || 0);
  const cashChangeDue = cashTendered !== null ? cashTendered - totalValue : null;
  const safeTipAmount = Number(tipAmount || 0);
  const deliveryGain = Math.max(0, Number(deliveryFee || 0)) + safeTipAmount;
  const compactCourierGain = Math.max(0, Number(deliveryFee || 0));
  const tipRepasseStatus = String(tipPayoutStatus || '').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
  const isDirectTipSettlement = String(tipSettlementMode || '').toUpperCase() === 'DIRECT_MOTOBOY';

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const compactItemsLabel = useMemo(() => {
    if (!items.length) return '';
    const first = items[0];
    const firstLabel = `${first?.quantity || 1}x ${first?.name || first?.product?.name || 'Item'}`;
    const remaining = items.length - 1;
    return remaining > 0 ? `${firstLabel} +${remaining} item(ns)` : firstLabel;
  }, [items]);
  const compactAddress = useMemo(() => {
    const raw = String(address || '').trim();
    return raw || '-';
  }, [address]);
  const shortId = order?.shortId || (order?.id ? String(order.id).slice(0, 8) : '-');
  const customerName = order?.customerName || order?.customer_name || 'Cliente';
  const phone = order?.phone || null;
  const storeLogo = resolveAssetUrl(order?.store?.settings?.logoUrl || order?.store?.settings?.logo_url || '');
  const storeAccent = String(order?.store?.settings?.primaryColor || order?.store?.settings?.primary_color || '').trim();
  const accentColor = storeAccent || 'var(--color-primary)';
  const storeLabel = storeName || (storeSlug ? `/${storeSlug}` : 'Loja');
  const paymentMethod = String(order?.paymentMethod || order?.payment_method || '').toLowerCase();
  const isCashPayment = paymentMethod === 'dinheiro' || paymentMethod === 'cash';

  if (compact) {
    const courierGain = showCourierEarnings ? deliveryGain : compactCourierGain;

    return (
      <div className="relative w-full min-w-0 overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.45)]">
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{
            background: `linear-gradient(180deg, ${accentColor}, color-mix(in srgb, ${accentColor} 55%, #f59e0b))`,
          }}
          aria-hidden="true"
        />
        <div className="flex items-start justify-between gap-3 pl-1">
          <div className="flex min-w-0 items-center gap-2.5">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeLabel}
                className="h-10 w-10 shrink-0 rounded-2xl border border-white object-cover shadow-sm"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-2xl border border-white bg-slate-100 shadow-sm" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{storeLabel}</p>
              <p className="truncate text-[11px] font-semibold text-slate-500">Pedido #{shortId}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Você recebe</p>
            <p className="text-lg font-black leading-tight text-emerald-700">{formatCurrency(courierGain)}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-1.5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Retirar</p>
            <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-700">
              {storeName || storeSlug || 'Loja'}{storeAddress ? ` • ${storeAddress}` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Entregar</p>
            <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-700">
              {customerName} • {compactAddress}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <PaymentBadge method={order?.paymentMethod || order?.payment_method} status={order?.paymentStatus} />
          <StatusBadge status={order?.status} />
          {compactItemsLabel ? (
            <span className="min-w-0 flex-1 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              {compactItemsLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
            Frete: <strong className="text-slate-900">{formatCurrency(Number.isFinite(Number(deliveryFee)) ? Number(deliveryFee) : 0)}</strong>
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
            Pedido: <strong className="text-slate-900">{formatCurrency(order?.total || 0)}</strong>
          </span>
          {isCashPayment && cashTendered !== null ? (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700">
              Troco: <strong>{cashChangeDue !== null && cashChangeDue > 0 ? formatCurrency(cashChangeDue) : 'sem troco'}</strong>
            </span>
          ) : null}
        </div>

        {actions ? <div className="mt-3 border-t border-slate-100 pt-3">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div className="premium-card bg-white border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4 relative overflow-hidden w-full min-w-0 no-x-scroll">
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
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 break-words line-clamp-2">{storeLabel}</p>
              <p className="text-[11px] text-slate-400 truncate">Pedido</p>
            </div>
          </div>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <p className="text-lg font-extrabold text-slate-900 break-all">#{shortId}</p>
            <StatusBadge status={order?.status} />
          </div>
          {createdAt && <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(createdAt)}</p>}
        </div>
        <div className="sm:shrink-0">
          <PaymentBadge method={order?.paymentMethod || order?.payment_method} status={order?.paymentStatus} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 overflow-x-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="text-base font-bold text-slate-900 break-words">{customerName}</p>
            {phone && <p className="text-xs text-slate-600 mt-1 break-all">{phone}</p>}
            {compact && compactItemsLabel && (
              <p className="text-xs text-slate-600 mt-2 break-words">{compactItemsLabel}</p>
            )}
            {compact && (
              <div className="mt-3 grid gap-1.5">
                <div
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                  title={storeAddress || storeName || storeSlug || 'Loja'}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Retirada</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700 break-words line-clamp-2">
                    {storeName || storeSlug || 'Loja'}{storeAddress ? ` • ${storeAddress}` : ''}
                  </p>
                </div>
                <div
                  className="rounded-xl border border-slate-100 bg-white px-3 py-2"
                  title={compactAddress}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Entrega</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700 break-words line-clamp-2">{compactAddress}</p>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 w-full sm:w-auto sm:max-w-[220px] text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1">Valores</p>
            {compact && isDelivery ? (
              <p className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                Você recebe: {formatCurrency(showCourierEarnings ? deliveryGain : compactCourierGain)}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-start sm:justify-end gap-1.5">
              {isDelivery && (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  Frete: <strong className="ml-1 tracking-tight text-slate-800">{formatCurrency(Number.isFinite(Number(deliveryFee)) ? Number(deliveryFee) : 0)}</strong>
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                Pedido: <strong className="ml-1 text-slate-900 tracking-tight">{formatCurrency(order?.total || 0)}</strong>
              </span>
            </div>
            {showCourierEarnings && isDelivery && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-[11px] text-emerald-600 font-semibold tracking-tight">
                  Seu ganho: {formatCurrency(deliveryGain)}
                </p>
                {safeTipAmount > 0 ? (
                  <p className="text-[10px] text-slate-500">
                    Frete + gorjeta (
                    {tipRepasseStatus === 'PAID'
                      ? isDirectTipSettlement
                        ? 'recebida direto'
                        : 'repassada'
                      : 'repasse pendente'}
                    )
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">Somente frete</p>
                )}
              </div>
            )}
            {isCashPayment && cashTendered !== null ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-[11px] text-emerald-600 font-semibold tracking-tight">
                  Cliente paga com: {formatCurrency(cashTendered)}
                </p>
                {cashChangeDue !== null && cashChangeDue > 0 ? (
                  <p className="text-[11px] text-orange-500 font-semibold tracking-tight">
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
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-600">Retirada na loja</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{storeName || 'Loja'}</p>
            {(storeAddress || storeSlug) && (
              <p className="text-xs text-slate-600 mt-1">{storeAddress || (storeSlug ? `/${storeSlug}` : '')}</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-600">Entrega</p>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">{address}</p>
          </div>
        </div>
      )}

      {!compact && items.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
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
                        className="h-10 w-10 rounded-xl object-cover border border-slate-200 transition-opacity duration-300"
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
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              {item.cookingPoint}
                            </span>
                          )}
                          {item?.passSkewer && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              passar farinha
                            </span>
                          )}
                        {formatSelectedModifiers(item?.selectedModifiers || []).map((modifierName) => (
                          <span
                            key={`${item.id || item.productId}-${modifierName}`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            + {modifierName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tracking-tight text-slate-900">{formatCurrency(Number(item.price || 0))}</p>
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

