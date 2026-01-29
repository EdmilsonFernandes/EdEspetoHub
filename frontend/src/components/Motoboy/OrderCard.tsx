import React from 'react';
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

  return (
    <div className="premium-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Pedido</p>
          <p className="text-sm font-semibold text-slate-800">#{order?.shortId || order?.id?.slice(0, 8)}</p>
        </div>
        <StatusBadge status={order?.status} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">{order?.customerName || order?.customer_name}</p>
        {order?.phone && <p className="text-xs text-slate-500">{order.phone}</p>}
      </div>

      {!compact && (storeName || storeAddress) && (
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Retirada na loja</p>
          <p>{storeName || 'Loja'}</p>
          {(storeAddress || storeSlug) && (
            <p className="text-[11px] text-slate-400">
              {storeAddress || (storeSlug ? `/${storeSlug}` : '')}
            </p>
          )}
        </div>
      )}

      {!compact && (
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Endereço</p>
          <p>{address}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-base font-bold text-slate-800">{formatCurrency(order?.total || 0)}</p>
        </div>
        <PaymentBadge method={order?.paymentMethod || order?.payment_method} status={order?.paymentStatus} />
      </div>

      {createdAt && (
        <p className="text-xs text-slate-400">{formatDateTime(createdAt)}</p>
      )}

      {actions && <div className="pt-2 border-t border-slate-100">{actions}</div>}
    </div>
  );
}
