// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  CookingPot,
  Package,
  Storefront,
  Truck,
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const TERMINAL_STATUSES = [ 'DELIVERED', 'CANCELLED', 'FINISHED', 'REJECTED' ];

const getStatusMeta = (status: string) => {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Aguardando confirmação',
        icon: <Clock size={15} weight="duotone" className="text-amber-500" />,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'ACCEPTED':
      return {
        label: 'Pedido aceito',
        icon: <CookingPot size={15} weight="duotone" className="text-sky-600" />,
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    case 'PREPARING':
      return {
        label: 'Em preparo',
        icon: <CookingPot size={15} weight="duotone" className="text-sky-600" />,
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    case 'READY':
      return {
        label: 'Pronto para retirada',
        icon: <Package size={15} weight="duotone" className="text-emerald-600" />,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'DELIVERING':
      return {
        label: 'Saiu para entrega',
        icon: <Truck size={15} weight="duotone" className="text-indigo-600" />,
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'DELIVERED':
      return {
        label: 'Pedido concluido',
        icon: <CheckCircle size={15} weight="fill" className="text-emerald-500" />,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'FINISHED':
      return {
        label: 'Pedido finalizado',
        icon: <CheckCircle size={15} weight="fill" className="text-emerald-500" />,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'CANCELLED':
      return {
        label: 'Pedido cancelado',
        icon: <Package size={15} weight="duotone" className="text-rose-500" />,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'REJECTED':
      return {
        label: 'Pedido recusado',
        icon: <Package size={15} weight="duotone" className="text-rose-500" />,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    default:
      return {
        label: status || 'Pedido',
        icon: <Package size={15} weight="duotone" className="text-slate-400" />,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
};

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

function OrderCard({
  order,
  isActive,
  onOpenOrder,
  onOpenStore,
}: {
  order: any;
  isActive: boolean;
  onOpenOrder: (orderId: string) => void;
  onOpenStore: (slug?: string) => void;
}) {
  const statusMeta = getStatusMeta(order.status);
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

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.4)]">
      <button
        type="button"
        onClick={() => onOpenOrder(order.id)}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#0f172a,#334155)] text-sm font-bold text-white">
                  {getStoreInitials(storeName)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[15px] font-semibold text-slate-900">{storeName}</h3>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMeta.badgeClass}`}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {orderDate ? `${orderDate} • ` : ''}
                #{String(order.id || '').slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.total || 0)}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {isActive ? 'Em andamento' : 'Concluido'}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50/90 px-3 py-2.5">
          <div className="space-y-2">
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
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-3">
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
          <button
            type="button"
            onClick={() => onOpenStore(order.store?.slug)}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
          >
            {isActive ? 'Ver loja' : 'Ajuda'}
          </button>
          <button
            type="button"
            onClick={() => (isActive ? onOpenOrder(order.id) : onOpenStore(order.store?.slug))}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            {isActive ? 'Acompanhar' : 'Pedir novamente'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ClientOrders() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Meus Pedidos | Já no Caminho';
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('customerSession');
    if (!sessionRaw) {
      navigate('/cliente?next=/cliente/pedidos&hub=1', { replace: true });
      return;
    }

    let mounted = true;
    customerAccountService.listOrders()
      .then((ordersData) => {
        if (!mounted) return;
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Falha ao carregar pedidos.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !TERMINAL_STATUSES.includes(order.status)),
    [orders]
  );
  const pastOrders = useMemo(
    () => orders.filter((order) => TERMINAL_STATUSES.includes(order.status)),
    [orders]
  );
  const groupedPastOrders = useMemo(() => groupOrdersByDate(pastOrders), [pastOrders]);

  const openStore = (slug?: string) => {
    if (!slug) {
      navigate('/hub');
      return;
    }
    navigate(`/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f6]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] pb-12 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-[#f8f8f6]/95 px-4 py-4 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all active:scale-95"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Historico</p>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">Meus pedidos</h1>
          </div>
          <div className="w-10" />
        </header>

        <div className="px-4 py-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {activeOrders.length > 0 ? (
            <section className="mb-7">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Clock size={15} weight="duotone" className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-800">Em andamento</h2>
              </div>
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isActive
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
              <h2 className="text-sm font-semibold text-slate-800">Historico</h2>
            </div>

            {pastOrders.length === 0 && activeOrders.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Storefront size={28} weight="duotone" />
                </div>
                <p className="text-base font-semibold text-slate-900">Voce ainda nao fez pedidos</p>
                <p className="mt-1 text-sm text-slate-500">Quando pedir pelo app, eles vao aparecer aqui.</p>
                <button
                  onClick={() => navigate('/hub')}
                  className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Explorar lojas
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedPastOrders.map((group) => (
                  <section key={group.key}>
                    <p className="mb-3 px-1 text-sm font-medium text-slate-500">{group.label}</p>
                    <div className="space-y-3">
                      {group.orders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          isActive={false}
                          onOpenOrder={(orderId) => navigate(`/pedido/${orderId}`)}
                          onOpenStore={openStore}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
