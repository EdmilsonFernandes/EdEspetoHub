// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  House,
  UserCircle,
  Package,
  Receipt,
  Motorcycle,
  SpinnerGap,
  Storefront,
  Timer,
  XCircle,
  Buildings,
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { orderService } from '../services/orderService';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getPaymentProviderMeta, mercadoPagoHorizontal } from '../utils/paymentAssets';

const TERMINAL_STATUSES = [ 'DELIVERED', 'CANCELLED', 'FINISHED', 'REJECTED', 'DONE' ];
const ACTIVE_REFRESH_MS = 10_000;
const DELAY_GRACE_MS = 15 * 60 * 1000;

const normalizeStatus = (status?: string) => String(status || '').trim().toUpperCase();

const formatGroupDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStoreInitials = (name?: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return 'JN';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

const getEtaWindowLabel = (eta?: { windowMin?: number; windowMax?: number; totalMinutes?: number } | null) => {
  const min = Number(eta?.windowMin || 0);
  const max = Number(eta?.windowMax || 0);
  const total = Number(eta?.totalMinutes || 0);
  if (min > 0 && max > 0) return `${min}-${max} min`;
  if (total > 0) return `${total} min`;
  return '';
};

const getEtaDeadlineMs = (order: any, details?: any) => {
  const createdAt = new Date(order?.createdAt || '').getTime();
  const etaMinutes = Number(details?.eta?.windowMax || details?.eta?.totalMinutes || details?.eta?.windowMin || 0);
  if (!createdAt || !(etaMinutes > 0)) return null;
  return createdAt + etaMinutes * 60 * 1000;
};

const isCustomerCancelableStatus = (status?: string) =>
  [ 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'READY_FOR_DELIVERY', 'WAITING_FOR_MOTOBOY' ].includes(normalizeStatus(status));

const buildWhatsappLink = (phone?: string | null, native = false) => {
  const normalized = String(phone || '').replace(/\D/g, '').replace(/^55/, '');
  if (!normalized) return '';
  if (native) return `whatsapp://send?phone=55${normalized}`;
  return `https://wa.me/55${normalized}`;
};

const groupOrdersByDate = (orders: any[]) => {
  const groups: Array<{ key: string; label: string; orders: any[] }> = [];
  const byKey = new Map<string, { key: string; label: string; orders: any[] }>();

  orders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const existing = byKey.get(key);
    if (existing) {
      existing.orders.push(order);
      return;
    }
    const next = {
      key,
      label: formatGroupDate(order.createdAt),
      orders: [ order ],
    };
    byKey.set(key, next);
    groups.push(next);
  });

  return groups;
};

const getStatusMeta = (status: string, orderType?: string) => {
  const normalized = normalizeStatus(status);
  const normalizedType = String(orderType || '').trim().toLowerCase();
  const isDelivery = normalizedType === 'delivery';

  switch (normalized) {
    case 'AWAITING_PAYMENT':
      return {
        label: 'Aguardando pagamento',
        icon: <Clock size={15} weight="duotone" className="text-sky-500" />,
        toneClass: 'text-sky-600',
      };
    case 'PENDING':
    case 'ACCEPTED':
      return {
        label: 'Recebido',
        icon: <Clock size={15} weight="duotone" className="text-amber-500" />,
        toneClass: 'text-amber-600',
      };
    case 'PREPARING':
      return {
        label: 'Em preparação',
        icon: <SpinnerGap size={15} weight="duotone" className="text-sky-600" />,
        toneClass: 'text-sky-600',
      };
    case 'READY':
    case 'READY_FOR_DELIVERY':
    case 'WAITING_FOR_MOTOBOY': {
      const readyLabel =
        isDelivery ? 'Aguardando entregador' :
        normalizedType === 'table' ? 'Pedido pronto' :
        'Disponível para retirada';
      return {
        label: readyLabel,
        icon: <Package size={15} weight="duotone" className="text-emerald-600" />,
        toneClass: 'text-emerald-600',
      };
    }
    case 'DELIVERING':
    case 'IN_DELIVERY':
    case 'DISPATCHED':
      return {
        label: 'Em rota',
        icon: <Motorcycle size={15} weight="duotone" className="text-indigo-600" />,
        toneClass: 'text-indigo-600',
      };
    case 'DELIVERED':
      return {
        label: 'Entregue',
        icon: <CheckCircle size={15} weight="fill" className="text-emerald-500" />,
        toneClass: 'text-emerald-600',
      };
    case 'DONE':
    case 'FINISHED':
      return {
        label: 'Finalizado',
        icon: <CheckCircle size={15} weight="fill" className="text-emerald-500" />,
        toneClass: 'text-emerald-600',
      };
    case 'CANCELLED':
    case 'REJECTED':
      return {
        label: 'Cancelado',
        icon: <XCircle size={15} weight="duotone" className="text-rose-500" />,
        toneClass: 'text-rose-600',
      };
    default:
      return {
        label: 'Pedido',
        icon: <Package size={15} weight="duotone" className="text-slate-400" />,
        toneClass: 'text-slate-500',
      };
  }
};

function OrderCard({
  order,
  isActive,
  details,
  onCancelRequest,
  onOpenOrder,
  onOpenStore,
}: {
  order: any;
  isActive: boolean;
  details?: any;
  onCancelRequest: (order: any) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenStore: (slug?: string) => void;
}) {
  const statusMeta = getStatusMeta(order.status, order.type);
  const items = Array.isArray(order.items) ? order.items : [];
  const visibleItems = items.slice(0, 2);
  const extraItems = Math.max(0, items.length - visibleItems.length);
  const thumbnails = items
    .map((item: any) => resolveAssetUrl(item.imageUrl || ''))
    .filter(Boolean)
    .slice(0, 3);
  const logoUrl = resolveAssetUrl(order.store?.settings?.logoUrl || '');
  const storeName = order.store?.name || 'Loja parceira';
  const orderDate = formatTime(order.createdAt);
  const etaWindowLabel = getEtaWindowLabel(details?.eta);
  const etaDeadlineMs = getEtaDeadlineMs(order, details);
  const condominiumOrder = order?.condominiumOrder || (order?.condominiumId ? {
    condominiumName: order?.condominiumName,
    fulfillmentMode: order?.condominiumFulfillmentMode,
    unit: order?.condominiumUnit,
  } : null);
  const condominiumFulfillment = String(condominiumOrder?.fulfillmentMode || '').toLowerCase();
  const condominiumLabel =
    condominiumFulfillment === 'apartment_delivery' || condominiumFulfillment === 'condominium_apartment'
      ? 'Entrega no apartamento'
      : 'Retirada na feira';
  const isDelayed = Boolean(etaDeadlineMs && Date.now() > etaDeadlineMs);
  const canCancel = Boolean(
    isActive &&
    isDelayed &&
    isCustomerCancelableStatus(order.status) &&
    etaDeadlineMs &&
    Date.now() > etaDeadlineMs + DELAY_GRACE_MS
  );
  const isPaymentApproved = normalizeStatus(order.paymentStatus) === 'PAID';

  const handleHelp = () => {
    const nativeUrl = buildWhatsappLink(order.store?.phone, true);
    const webUrl = buildWhatsappLink(order.store?.phone, false);
    if (!webUrl) {
      onOpenStore(order.store?.slug);
      return;
    }
    if (Capacitor.isNativePlatform() && nativeUrl) {
      window.location.href = nativeUrl;
      return;
    }
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenStore(order.store?.slug)}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition-transform active:scale-95"
            aria-label={`Abrir loja ${storeName}`}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#0f172a,#334155)] text-sm font-bold text-white">
                {getStoreInitials(storeName)}
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenOrder(order.id)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-slate-900">{storeName}</h3>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[12px]">
              {isActive ? (
                <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              ) : null}
              {statusMeta.icon}
              <span className={`font-medium ${statusMeta.toneClass}`}>{statusMeta.label}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{orderDate || formatGroupDate(order.createdAt)}</p>
            {isPaymentApproved && (
              <span className="mt-2 flex max-w-full items-center justify-between gap-2.5 rounded-[18px] border border-slate-200/90 bg-[linear-gradient(135deg,#ffffff_0%,#f4fbff_100%)] px-2.5 py-2 shadow-[0_14px_30px_-26px_rgba(0,158,227,0.5)]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <CheckCircle size={17} weight="fill" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                      Pagamento aprovado
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                      Confirmado online
                    </span>
                  </span>
                </span>
                <span className="flex h-7 shrink-0 items-center rounded-full border border-slate-200/80 bg-white px-2.5 shadow-sm">
                  <img src={mercadoPagoHorizontal} alt="Mercado Pago" className="h-3.5 w-[78px] object-contain" />
                </span>
              </span>
            )}
            {condominiumOrder?.condominiumName ? (
              <p className="mt-1 inline-flex max-w-full rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                <span className="truncate">{condominiumLabel} • {condominiumOrder.condominiumName}</span>
              </p>
            ) : null}
          </button>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.total || 0)}</p>
        </div>
      </div>

      {String(order.status || '').toLowerCase() === 'awaiting_payment' && order.paymentLink && (
        <button
          type="button"
          onClick={() => {
            const url = order.paymentLink;
            if (!url) return;
            if (Capacitor.isNativePlatform()) {
              Browser.open({ url });
            } else {
              window.open(url, '_blank');
            }
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#009ee3] py-3 text-sm font-black text-white shadow-[0_6px_18px_-8px_rgba(0,158,227,0.55)] active:scale-[0.98] transition-transform"
        >
          <img src={getPaymentProviderMeta('mercado_pago').icon} alt="" className="h-5 w-5 object-contain brightness-0 invert" />
          Finalizar pagamento
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpenOrder(order.id)}
        className="mt-3 block w-full text-left"
      >
        <div className="rounded-2xl bg-slate-50/90 px-3 py-2.5">
          {normalizeStatus(order.status) === 'AWAITING_PAYMENT' ? (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                <SpinnerGap size={12} weight="duotone" className="animate-spin" />
                Confirme o pagamento para o pedido entrar na fila
              </span>
            </div>
          ) : isActive && (etaWindowLabel || isDelayed) ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {etaWindowLabel ? (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDelayed ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  <Timer size={12} weight="duotone" />
                  {isDelayed ? 'Atrasado' : `Previsão ${etaWindowLabel}`}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-w-0 items-center gap-3">
            <div className="w-full space-y-2">
              {visibleItems.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <span className="inline-flex min-w-6 justify-center rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    {item.quantity}
                  </span>
                  <span className="min-w-0 truncate text-sm text-slate-700">{item.name || 'Item do pedido'}</span>
                </div>
              ))}
              {extraItems > 0 ? (
                <p className="pl-8 text-xs font-medium text-slate-500">+{extraItems} itens</p>
              ) : null}
              {normalizeStatus(order.status) === 'CANCELLED' && String(order.canceledReason || '').trim() ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <span className="font-semibold">Motivo:</span> {order.canceledReason}
                </div>
              ) : null}
            </div>
          </div>
          {['DELIVERING', 'IN_DELIVERY', 'DISPATCHED'].includes(normalizeStatus(order.status)) && details?.delivery?.motoboy?.name ? (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                {details.delivery.motoboy.profileImageUrl ? (
                  <img src={resolveAssetUrl(details.delivery.motoboy.profileImageUrl)} alt={details.delivery.motoboy.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-indigo-200 text-xs font-bold text-indigo-700">
                    {String(details.delivery.motoboy.name)[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Entregador</p>
                <p className="truncate text-sm font-semibold text-indigo-900">{details.delivery.motoboy.name}</p>
              </div>
              <Motorcycle size={18} weight="duotone" className="ml-auto shrink-0 text-indigo-400" />
            </div>
          ) : null}
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex min-h-10 items-center">
          {thumbnails.length > 0 ? (
            <div className="flex items-center">
              {thumbnails.map((src, index) => (
                <img
                  key={`${order.id}-${index}`}
                  src={src}
                  alt=""
                  className={`h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm ${index > 0 ? '-ml-3' : ''}`}
                />
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              <CalendarBlank size={13} weight="duotone" />
              {formatGroupDate(order.createdAt)}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {isActive && isDelayed ? (
            <button
              type="button"
              onClick={handleHelp}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
            >
              Falar com a loja
            </button>
          ) : !isActive ? (
            <button
              type="button"
              onClick={handleHelp}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
            >
              Ajuda
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              onClick={() => onCancelRequest(order)}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
            >
              Solicitar cancelamento
            </button>
          ) : null}
          {!isActive ? (
            <button
              type="button"
              onClick={() => onOpenStore(order.store?.slug)}
              className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Pedir novamente
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ClientOrders() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished' | 'cancelled'>('all');
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [cancelModal, setCancelModal] = useState<{ order: any | null; reason: string; submitting: boolean }>({
    order: null,
    reason: '',
    submitting: false,
  });
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const prevAwaitingIdsRef = useRef<Set<string>>(new Set());
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 10;

  const refreshActiveOrderDetails = useCallback(async (targetOrders: any[]) => {
    const active = (Array.isArray(targetOrders) ? targetOrders : []).filter(
      (order) => !TERMINAL_STATUSES.includes(normalizeStatus(order.status))
    );
    if (!active.length) {
      setOrderDetails({});
      return;
    }

    const entries = await Promise.all(
      active.map(async (order) => {
        try {
          const data = await orderService.getPublicById(order.id);
          return [ order.id, data ];
        } catch {
          return [ order.id, null ];
        }
      })
    );

    setOrderDetails((prev) => {
      const next: Record<string, any> = {};
      for (const [ orderId, payload ] of entries) {
        if (payload) next[String(orderId)] = payload;
      }
      return Object.keys(next).length ? next : prev;
    });
  }, []);

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const requestId = ++requestIdRef.current;

    if (!options?.silent) {
      setError('');
      setLoading(true);
    }

    try {
      const result = await customerAccountService.listOrders({ limit: PAGE_SIZE, offset: 0 });
      if (requestId !== requestIdRef.current) return;
      const { data = [], hasMore: more = false } = result || {};

      if (options?.silent) {
        // Merge first page into existing state: update known orders, prepend genuinely new ones
        setOrders((prev) => {
          const newMap = new Map((data as any[]).map((o: any) => [o.id, o]));
          const updated = prev.map((o: any) => (newMap.has(o.id) ? newMap.get(o.id) : o));
          const existingIds = new Set(prev.map((o: any) => o.id));
          const newItems = (data as any[]).filter((o: any) => !existingIds.has(o.id));
          return [...newItems, ...updated];
        });
      } else {
        setOrders(data);
        setHasMore(more);
        offsetRef.current = (data as any[]).length;
      }

      if (!options?.silent) setLoading(false);
      void refreshActiveOrderDetails(data);
    } catch (e: any) {
      if (requestId !== requestIdRef.current) return;
      setError(e?.message || 'Falha ao carregar pedidos.');
      if (!options?.silent) showToast(e?.message || 'Falha ao carregar pedidos.', 'error');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
      inFlightRef.current = false;
    }
  }, [refreshActiveOrderDetails, showToast]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await customerAccountService.listOrders({ limit: PAGE_SIZE, offset: offsetRef.current });
      const { data = [], hasMore: more = false } = result || {};
      setOrders((prev) => [...prev, ...(data as any[])]);
      setHasMore(more);
      offsetRef.current += (data as any[]).length;
    } catch {
      // ignore — user can scroll again to retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    document.title = 'Meus Pedidos | Já no Caminho';
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('customerSession');
    if (!sessionRaw) {
      navigate('/cliente?next=/cliente/pedidos&hub=1', { replace: true });
      return;
    }

    void loadOrders();
  }, [loadOrders, navigate]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [orders]
  );
  const pastOrders = useMemo(
    () => orders.filter((order) => TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [orders]
  );
  const groupedPastOrders = useMemo(() => groupOrdersByDate(pastOrders), [pastOrders]);
  const activeOrderIds = useMemo(() => activeOrders.map((order) => String(order.id)).join('|'), [activeOrders]);
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'active') return activeOrders;
    if (statusFilter === 'finished') {
      return orders.filter((order) => [ 'DELIVERED', 'FINISHED', 'DONE' ].includes(normalizeStatus(order.status)));
    }
    if (statusFilter === 'cancelled') {
      return orders.filter((order) => [ 'CANCELLED', 'REJECTED' ].includes(normalizeStatus(order.status)));
    }
    return orders;
  }, [activeOrders, orders, statusFilter]);
  const filteredPastOrders = useMemo(
    () => filteredOrders.filter((order) => TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [filteredOrders]
  );
  const filteredActiveOrders = useMemo(
    () => filteredOrders.filter((order) => !TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [filteredOrders]
  );
  const groupedFilteredPastOrders = useMemo(() => groupOrdersByDate(filteredPastOrders), [filteredPastOrders]);

  useEffect(() => {
    if (!activeOrders.length) return;

    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadOrders({ silent: true });
    };

    const timer = window.setInterval(refreshIfVisible, ACTIVE_REFRESH_MS);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [activeOrderIds, activeOrders.length, loadOrders]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: '160px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Detect payment confirmation: show toast when any awaiting_payment order transitions to a paid status
  useEffect(() => {
    const currentAwaiting = new Set(
      orders.filter((o) => String(o.status || '').toLowerCase() === 'awaiting_payment').map((o) => o.id)
    );
    const prev = prevAwaitingIdsRef.current;
    if (prev.size > 0) {
      const confirmed = [...prev].filter((id) => {
        if (currentAwaiting.has(id)) return false;
        const order = orders.find((o) => o.id === id);
        const s = String(order?.status || '').toLowerCase();
        return !['cancelled', 'rejected'].includes(s);
      });
      if (confirmed.length > 0) {
        showToast('Pagamento confirmado! Seu pedido foi aceito.', 'success', { durationMs: 6000 });
      }
    }
    prevAwaitingIdsRef.current = currentAwaiting;
  }, [orders]);

  // On native APK: refresh when app returns to foreground or MP browser closes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const hasAwaitingPayment = orders.some((o) => String(o.status || '').toLowerCase() === 'awaiting_payment');
    if (!hasAwaitingPayment) return;
    let appHandle: any;
    let browserHandle: any;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void loadOrders({ silent: true });
    }).then((h) => { appHandle = h; });
    Browser.addListener('browserFinished', () => {
      void loadOrders({ silent: true });
    }).then((h) => { browserHandle = h; });
    return () => { appHandle?.remove(); browserHandle?.remove(); };
  }, [orders, loadOrders]);

  const openStore = (slug?: string) => {
    if (!slug) {
      navigate('/hub');
      return;
    }
    navigate(`/${slug}`);
  };

  const submitCustomerCancellation = async () => {
    if (!cancelModal.order || cancelModal.submitting) return;
    const reason = String(cancelModal.reason || '').trim();
    if (reason.length < 3) {
      showToast('Informe um motivo para a loja entender o cancelamento.', 'warning');
      return;
    }

    try {
      setCancelModal((prev) => ({ ...prev, submitting: true }));
      await customerAccountService.cancelOrder(cancelModal.order.id, { reason });
      showToast('Pedido cancelado com sucesso.', 'success');
      setCancelModal({ order: null, reason: '', submitting: false });
      await loadOrders({ silent: true });
    } catch (error: any) {
      setCancelModal((prev) => ({ ...prev, submitting: false }));
      showToast(error?.message || 'Não foi possível cancelar o pedido agora.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EEF2F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF2F7] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none fixed top-[-10%] right-[-8%] h-[38%] w-[46%] rounded-full bg-[#153A4C]/13 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[8%] left-[-5%] h-[26%] w-[34%] rounded-full bg-[#336886]/7 blur-[100px] -z-10" />
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-[#EEF2F7]/95 px-4 py-4 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all active:scale-95"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-4 w-4 rounded-[0.35rem] object-cover shadow-sm" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Histórico</p>
            </div>
            <h1 className="text-[15px] font-semibold text-slate-900">Meus pedidos</h1>
          </div>
          <div className="w-10" />
        </header>

        <div className="px-4 py-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 no-scrollbar">
            {(['all', 'active', 'finished', 'cancelled'] as const).map((f) => {
              const label = f === 'all' ? 'Todos' : f === 'active' ? 'Em andamento' : f === 'finished' ? 'Finalizados' : 'Cancelados';
              const isActive = statusFilter === f;
              const activeClass = f === 'all' ? 'bg-[#153A4C] text-white border-[#336886] shadow-[0_8px_18px_-8px_rgba(21,58,76,0.5)]'
                : f === 'active' ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_8px_18px_-8px_rgba(5,150,105,0.45)]'
                : f === 'finished' ? 'bg-sky-600 text-white border-sky-500 shadow-[0_8px_18px_-8px_rgba(2,132,199,0.45)]'
                : 'bg-rose-500 text-white border-rose-400 shadow-[0_8px_18px_-8px_rgba(244,63,94,0.45)]';
              const inactiveClass = f === 'all' ? 'bg-white text-slate-600 border-slate-200'
                : f === 'active' ? 'bg-emerald-50/70 text-emerald-700 border-emerald-100'
                : f === 'finished' ? 'bg-sky-50/70 text-sky-700 border-sky-100'
                : 'bg-rose-50/70 text-rose-600 border-rose-100';
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-[12px] transition-all duration-200 active:scale-[0.97] ${isActive ? `font-black ${activeClass}` : `font-semibold ${inactiveClass}`}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {filteredActiveOrders.length > 0 ? (
            <section className="mb-7">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <h2 className="text-sm font-semibold text-slate-800">Em andamento</h2>
              </div>
              <div className="space-y-3">
                {filteredActiveOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isActive
                    details={orderDetails[order.id]}
                    onCancelRequest={(selectedOrder) => setCancelModal({ order: selectedOrder, reason: '', submitting: false })}
                    onOpenOrder={(orderId) => navigate(`/pedido/${orderId}`)}
                    onOpenStore={openStore}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center gap-2 px-1">
              <Package size={15} weight="duotone" className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800">Histórico</h2>
            </div>

            {filteredPastOrders.length === 0 && filteredActiveOrders.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Storefront size={28} weight="duotone" />
                </div>
                <p className="text-base font-semibold text-slate-900">Você ainda não fez pedidos</p>
                <p className="mt-1 text-sm text-slate-500">Quando pedir pelo app, eles vão aparecer aqui.</p>
                <button
                  onClick={() => navigate('/hub')}
                  className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Explorar lojas
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedFilteredPastOrders.map((group) => (
                  <section key={group.key}>
                    <p className="mb-3 px-1 text-sm font-medium text-slate-500">{group.label}</p>
                    <div className="space-y-3">
                      {group.orders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          isActive={false}
                          details={orderDetails[order.id]}
                          onCancelRequest={() => {}}
                          onOpenOrder={(orderId) => navigate(`/pedido/${orderId}`)}
                          onOpenStore={openStore}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {cancelModal.order ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/45 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">Cancelamento</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Conte o motivo para a loja</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal({ order: null, reason: '', submitting: false })}
                className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle size={20} weight="duotone" />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Esse pedido já passou do prazo previsto. Se quiser, você pode enviar um motivo e cancelar pelo app.
            </p>

            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              A loja recebe esse motivo para entender o cancelamento.
            </div>

            <textarea
              value={cancelModal.reason}
              onChange={(event) => setCancelModal((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              placeholder="Ex.: o prazo passou bastante e eu não consigo mais receber agora."
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModal({ order: null, reason: '', submitting: false })}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100"
              >
                Agora nao
              </button>
              <button
                type="button"
                onClick={submitCustomerCancellation}
                disabled={cancelModal.submitting}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelModal.submitting ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className={`fixed bottom-0 left-0 right-0 z-[100] px-0 pb-0 transition-transform duration-300 lg:hidden ${
        cancelModal.order ? 'translate-y-[120%] pointer-events-none' : 'translate-y-0'
      }`}>
        <div className="mx-auto max-w-none rounded-none border border-b-0 border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-2 pt-2 shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
          <div className="grid min-h-[4.75rem] grid-cols-4 items-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
          <button
            type="button"
            onClick={() => navigate('/hub')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <House size={18} weight="duotone" />
            </span>
            <span>Início</span>
          </button>
          <button
            type="button"
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12 transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]">
              <Receipt size={18} weight="fill" />
            </span>
            <span>Pedidos</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/hub?panel=condominios')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <Buildings size={18} weight="duotone" />
            </span>
            <span>Condo</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/hub?profile=1')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <UserCircle size={18} weight="duotone" />
            </span>
            <span>Perfil</span>
          </button>
          </div>
        </div>
      </nav>
    </main>
  );
}
