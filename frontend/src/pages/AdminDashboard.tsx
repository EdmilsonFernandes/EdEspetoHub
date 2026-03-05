// @ts-nocheck
import * as React from 'react';
import { ChartBar, BookOpen, ChefHat, CreditCard, Package, Gear, ShoppingCart, X, Scooter, ForkKnife, Storefront, Truck, List, CaretLeft, CaretRight, Star, Bell, WarningCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { BrandingSettings } from '../components/Admin/BrandingSettings';
import DashboardView from '../components/Admin/DashboardView';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { ProductManager } from '../components/Admin/ProductManager';
import { OrderTypeSettingsCard } from '../components/Admin/OrderTypeSettingsCard';
import { AdminMotoboys } from './AdminMotoboys';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { subscriptionService } from '../services/subscriptionService';
import { paymentService } from '../services/paymentService';
import { motoboyAdminService } from '../services/motoboyAdminService';
import { formatAddress, formatCurrency, formatDateTime, formatOrderDisplayId, formatOrderStatus, formatOrderType } from '../utils/format';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatSelectedModifiers } from '../utils/productModifiers';
import { FormSection } from '../components/common/FormSection';

const formatPlanCycle = (days: number) => {
  if (!Number.isFinite(days)) return '—';
  if (days >= 360) return 'Anual';
  if (days >= 30) return 'Mensal';
  return `${days} dias`;
};

const OrdersView = ({ orders, products, storeSlug }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);
  const productsById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const sortedOrders = useMemo(() => {
    const resolveTime = (value) => {
      if (!value) return 0;
      if (value.seconds) return value.seconds * 1000;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return [...(orders || [])].sort((a, b) => resolveTime(b.createdAt) - resolveTime(a.createdAt));
  }, [orders]);

  const canonicalStatus = (raw: any) => {
    const st = String(raw || '').toLowerCase();
    if (st === 'delivered') return 'done';
    if (st === 'ready_for_delivery' || st === 'waiting_for_motoboy') return 'ready';
    return st || 'pending';
  };

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      if (periodFilter !== 'all' && !dateFilter) {
        const periodDays = Number(periodFilter);
        const createdAt = order.createdAt?.seconds
          ? new Date(order.createdAt.seconds * 1000).getTime()
          : new Date(order.createdAt).getTime();
        if (Number.isFinite(createdAt)) {
          const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
          if (createdAt < cutoff) return false;
        }
      }
      if (statusFilter !== 'all') {
        const st = canonicalStatus(order.status);
        if (st !== String(statusFilter).toLowerCase()) return false;
      }
      if (dateFilter) {
        const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt);
        if (!Number.isFinite(date.getTime())) return false;
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (localDate !== dateFilter) return false;
      }
      if (!normalized) return true;
      const haystack = [order.customerName, order.name, order.phone, order.id, formatOrderDisplayId(order.id, storeSlug)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [sortedOrders, statusFilter, query, dateFilter, periodFilter]);
  const ordersTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPageSize));
  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return filteredOrders.slice(start, start + ordersPageSize);
  }, [filteredOrders, ordersPage, ordersPageSize]);
  const ordersStart = filteredOrders.length === 0 ? 0 : (ordersPage - 1) * ordersPageSize + 1;
  const ordersEnd = Math.min(filteredOrders.length, ordersPage * ordersPageSize);
  const groupedPagedOrders = useMemo(() => {
    const byLabel = new Map<string, any[]>();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    for (const order of pagedOrders) {
      const date = order?.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order?.createdAt);
      const key = Number.isFinite(date.getTime())
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        : 'unknown';
      const label =
        key === todayKey
          ? 'Hoje'
          : key === yesterdayKey
          ? 'Ontem'
          : Number.isFinite(date.getTime())
          ? date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
          : 'Sem data';
      if (!byLabel.has(label)) byLabel.set(label, []);
      byLabel.get(label)!.push(order);
    }
    return Array.from(byLabel.entries()).map(([label, list]) => ({ label, list }));
  }, [pagedOrders]);

  useEffect(() => {
    setOrdersPage(1);
  }, [statusFilter, query, dateFilter, periodFilter, ordersPageSize]);

  useEffect(() => {
    if (ordersPage > ordersTotalPages) {
      setOrdersPage(ordersTotalPages);
    }
  }, [ordersPage, ordersTotalPages]);

  const statusCounts = useMemo(() => {
    return (orders || []).reduce(
      (acc, order) => {
        const key = canonicalStatus(order.status);
        acc[key] = (acc[key] || 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, pending: 0, preparing: 0, ready: 0, done: 0, cancelled: 0 }
    );
  }, [orders]);

  const statusStyles = (status) => {
    const st = String(status || '').toLowerCase();
    if (st === 'pending') return 'bg-amber-100 text-amber-800';
    if (st === 'preparing') return 'bg-sky-100 text-sky-700';
    if (st === 'ready') return 'bg-violet-100 text-violet-700';
    if (st === 'done' || st === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (st === 'cancelled') return 'bg-slate-100 text-slate-600';
    return 'bg-red-100 text-red-700';
  };
  const shortId = (value) => formatOrderDisplayId(value, storeSlug);
  const orderTypeMeta = (order: any) => {
    const type = String(order?.type || '').toLowerCase();
    if (type === 'delivery') {
      return { label: 'Entrega', pill: 'bg-sky-100 text-sky-800 border-sky-200', icon: <Truck size={14} weight="duotone" /> };
    }
    if (type === 'pickup') {
      return { label: 'Retirada', pill: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Storefront size={14} weight="duotone" /> };
    }
    if (type === 'table') {
      const table = order?.table ? `Mesa ${order.table}` : 'Mesa';
      return { label: table, pill: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', icon: <ForkKnife size={14} weight="duotone" /> };
    }
    return { label: formatOrderType(order?.type), pill: 'bg-slate-100 text-slate-700 border-slate-200', icon: null };
  };
  const getOrderMoney = (order: any) => {
    const fee =
      String(order?.type || '').toLowerCase() === 'delivery' &&
      order.deliveryFee !== null &&
      order.deliveryFee !== undefined
        ? Number(order.deliveryFee)
        : 0;
    const total = Number(order.total || 0);
    const safeFee = Number.isFinite(fee) ? fee : 0;
    const itemsTotal = Math.max(0, total - safeFee);
    return { total, fee: safeFee, itemsTotal };
  };
  const renderMoneyBreakdown = (order: any) => {
    const money = getOrderMoney(order);
    return (
      <div className="w-full sm:w-auto">
        <div className="grid grid-cols-3 gap-1.5 text-[10px] sm:text-[11px] font-semibold">
          <span className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
            <span className="text-slate-500">Itens</span>
            <span className="text-slate-800">{formatCurrency(money.itemsTotal)}</span>
          </span>
          <span className="flex flex-col rounded-xl border border-slate-200 bg-white px-2 py-1.5">
            <span className="text-slate-500">Frete</span>
            <span className="text-slate-800">{money.fee > 0 ? formatCurrency(money.fee) : '—'}</span>
          </span>
          <span className="flex flex-col rounded-xl border border-brand-primary/20 bg-brand-primary-soft px-2 py-1.5">
            <span className="text-slate-500">Total</span>
            <span className="text-brand-primary font-extrabold">{formatCurrency(money.total)}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Lista de pedidos</h2>
          <p className="text-sm text-slate-500">{filteredOrders.length} pedidos encontrados</p>
        </div>
      </div>

      <div className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { id: 'all', label: 'Todos', count: statusCounts.all },
            { id: 'pending', label: 'Pendentes', count: statusCounts.pending },
            { id: 'preparing', label: 'Em atendimento', count: statusCounts.preparing },
            { id: 'ready', label: 'Aguardando retirada', count: statusCounts.ready },
            { id: 'done', label: 'Finalizados', count: statusCounts.done },
            { id: 'cancelled', label: 'Cancelados', count: statusCounts.cancelled },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`ds-btn ds-focus-ring px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors duration-150 ${
                statusFilter === filter.id
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-transparent text-slate-600 border-transparent hover:bg-white/70'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:ml-auto w-full lg:w-auto">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="ds-select ds-focus-ring w-full sm:w-36 py-2 text-sm text-slate-600"
          >
            <option value="all">Todo período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="ds-input ds-focus-ring w-full sm:w-44 py-2 text-sm"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, telefone ou ID do pedido"
            className="ds-input ds-focus-ring w-full sm:w-64 py-2 text-sm"
          />
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <div className="mx-auto max-w-md ds-empty-state px-6 py-8">
            <div className="text-4xl">🧾</div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum pedido por aqui ainda.</p>
            <p className="text-xs text-slate-500 mt-1">
              Assim que entrarem pedidos, eles aparecem aqui com status e detalhes.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPagedOrders.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-primary" />
                <h3 className="text-sm font-bold text-slate-700 capitalize">{group.label}</h3>
                <span className="text-xs text-slate-500">{group.list.length} pedido(s)</span>
              </div>
              {group.list.map((order, index) => (
                <div
                  key={order.id || `${order.customerName}-${index}`}
                  className="border border-slate-200 rounded-3xl bg-white p-5 shadow-sm space-y-4 hover:bg-slate-50/60 transition-colors duration-150"
                >
	              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
	                <div>
	                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
	                    <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 font-semibold">
	                      Pedido #{shortId(order.id)}
	                    </span>
	                    <span>{formatDateTime(order.createdAt)}</span>
	                  </div>
	                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      {(() => {
                        const meta = orderTypeMeta(order);
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${meta.pill}`}
                          >
                            {meta.icon}
                            <span>{meta.label}</span>
                          </span>
                        );
                      })()}
	                  </div>
	                </div>
	                <div className="flex items-center gap-2">
	                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles(order.status)}`}>
	                    {formatOrderStatus(order.status, order.type)}
	                  </span>
                    {renderMoneyBreakdown(order)}
	                </div>
	              </div>

                <div className="grid sm:grid-cols-3 gap-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs uppercase text-slate-400">Cliente</p>
                    <p className="font-semibold text-slate-700">{order.customerName || order.name || 'Cliente'}</p>
                    <p className="text-xs text-slate-500">{order.phone || '-'}</p>
                  </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Pagamento</p>
                  {(() => {
                    const paymentMeta = getPaymentMethodMeta(order.payment);
                    return (
                      <p className="font-semibold text-slate-700 inline-flex items-center gap-2">
                        {paymentMeta.icon && (
                          <img
                            src={paymentMeta.icon}
                            alt={paymentMeta.label}
                            className="h-4 w-4 object-contain"
                          />
                        )}
                        {paymentMeta.label}
                      </p>
                    );
                  })()}
                </div>
	                <div>
	                  <p className="text-xs uppercase text-slate-400">Endereço</p>
	                  <p className="font-semibold text-slate-700">{formatAddress(order.address || order.deliveryAddress) || '-'}</p>
                    {String(order?.type || '').toLowerCase() === 'delivery' &&
                      order.deliveryFee !== null &&
                      order.deliveryFee !== undefined && (
                        <p className="text-xs text-slate-500">Frete: {formatCurrency(Number(order.deliveryFee || 0))}</p>
                      )}
	                </div>
	              </div>

              {(order.items || []).length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs uppercase text-slate-400 mb-2">Itens</p>
                  <div className="grid sm:grid-cols-2 gap-2.5 text-sm text-slate-700">
                    {order.items.map((item) => {
                      const quantity = item.qty ?? item.quantity ?? 1;
                      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                      const subtotal = unitPrice * quantity;
                      const image =
                        item.imageUrl || productsById.get(item.productId || item.id)?.imageUrl || '';
                      return (
                        <div
                          key={item.id || item.name}
                          className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm hover:bg-slate-50 transition-colors duration-150"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                {image ? (
                                  <img
                                    src={resolveAssetUrl(image)}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                    🍖
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-800 truncate">
                                  {item.name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {quantity}x {formatCurrency(unitPrice)}
                                </span>
                              </div>
                            </div>
                            <span className="font-extrabold text-slate-800 whitespace-nowrap">
                              {formatCurrency(subtotal)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-700 border border-slate-200">
                              {quantity} unidade{quantity > 1 ? 's' : ''}
                            </span>
                            {item?.cookingPoint && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                {item.cookingPoint}
                              </span>
                            )}
                            {item?.passSkewer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
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
                      );
                    })}
                  </div>
                </div>
              )}
                </div>
              ))}
            </div>
          ))}
          {filteredOrders.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo {ordersStart}-{ordersEnd} de {filteredOrders.length}
                </span>
                <span>Página {ordersPage} de {ordersTotalPages}</span>
                <label className="flex items-center gap-2">
                  <span>Por página</span>
                  <select
                    value={ordersPageSize}
                    onChange={(event) => setOrdersPageSize(Number(event.target.value))}
                    className="ds-select ds-focus-ring py-1 text-xs text-slate-600"
                  >
                    {[10, 20, 30].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                  disabled={ordersPage <= 1}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setOrdersPage((prev) => Math.min(ordersTotalPages, prev + 1))}
                  disabled={ordersPage >= ordersTotalPages}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReviewsView = ({ reviews = [], canUseDeliveryReviewsAndTips = false, onUpgrade, storeSlug }) => {
  const [query, setQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [commentFilter, setCommentFilter] = useState<'all' | 'with_comment'>('all');
  const [tipFilter, setTipFilter] = useState<'all' | 'with_tip'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const normalized = query.trim().toLowerCase();
  const normalizedRows = useMemo(() => (Array.isArray(reviews) ? reviews : []), [reviews]);
  const getInitials = (value: string) => {
    const parts = String(value || '').trim().split(' ').filter(Boolean);
    if (!parts.length) return 'CL';
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  };
  const normalizeRating = (value: unknown) => {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(1, Math.min(5, Math.round(parsed)));
  };
  const renderStars = (value: unknown) => {
    const score = normalizeRating(value);
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`${score} estrelas`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={11}
            weight={star <= score ? 'fill' : 'regular'}
            className={star <= score ? 'text-amber-400' : 'text-slate-300'}
          />
        ))}
      </span>
    );
  };
  const parseTime = (value: unknown) => {
    const parsed = new Date(value as any).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const filterCounts = useMemo(() => {
    const all = normalizedRows.length;
    const ratings = {
      1: normalizedRows.filter((row: any) => normalizeRating(row?.storeRating) === 1).length,
      2: normalizedRows.filter((row: any) => normalizeRating(row?.storeRating) === 2).length,
      3: normalizedRows.filter((row: any) => normalizeRating(row?.storeRating) === 3).length,
      4: normalizedRows.filter((row: any) => normalizeRating(row?.storeRating) === 4).length,
      5: normalizedRows.filter((row: any) => normalizeRating(row?.storeRating) === 5).length,
    };
    const withComment = normalizedRows.filter((row: any) => String(row?.comment || '').trim().length > 0).length;
    const withTip = normalizedRows.filter((row: any) => Number(row?.tipAmount || 0) > 0).length;
    return { all, ratings, withComment, withTip };
  }, [normalizedRows]);

  const rows = useMemo(() => {
    return normalizedRows
      .filter((row: any) => {
        if (ratingFilter !== 'all' && normalizeRating(row?.storeRating) !== Number(ratingFilter)) return false;
        if (commentFilter === 'with_comment' && String(row?.comment || '').trim().length === 0) return false;
        if (tipFilter === 'with_tip' && Number(row?.tipAmount || 0) <= 0) return false;
        return true;
      })
      .filter((row: any) => {
        if (!normalized) return true;
      const haystack = [
        row?.customerName,
        row?.comment,
        row?.orderId,
        row?.motoboyName,
        formatOrderDisplayId(row?.orderId, storeSlug),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [normalizedRows, ratingFilter, commentFilter, tipFilter, normalized, storeSlug]);
  const insights = useMemo(() => {
    const base = normalizedRows;
    const total = base.length;
    const avgStore =
      total > 0
        ? base.reduce((acc: number, row: any) => acc + Number(row?.storeRating || 0), 0) / total
        : 0;
    const withComment = base.filter((row: any) => String(row?.comment || '').trim().length > 0).length;
    const withTip = base.filter((row: any) => Number(row?.tipAmount || 0) > 0).length;
    const now = Date.now();
    const last7 = base.filter((row: any) => {
      const ts = parseTime(row?.createdAt);
      return ts > 0 && now - ts <= 7 * 24 * 60 * 60 * 1000;
    });
    const avg7 =
      last7.length > 0
        ? last7.reduce((acc: number, row: any) => acc + Number(row?.storeRating || 0), 0) / last7.length
        : 0;
    return {
      total,
      avgStore,
      avg7,
      withCommentRate: total > 0 ? (withComment / total) * 100 : 0,
      withTipRate: total > 0 ? (withTip / total) * 100 : 0,
    };
  }, [normalizedRows]);
  const ratingDistribution = useMemo(() => {
    const total = normalizedRows.length || 1;
    const buckets = [5, 4, 3, 2, 1].map((score) => {
      const count = normalizedRows.filter((row: any) => normalizeRating(row?.storeRating) === score).length;
      const percent = (count / total) * 100;
      return { score, count, percent };
    });
    return buckets;
  }, [normalizedRows]);

  const handleExportCsv = () => {
    const source = rows || [];
    if (!source.length) return;
    const escapeCell = (value: unknown) => {
      const text = String(value ?? '');
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    };
    const header = [
      'data_hora',
      'pedido',
      'cliente',
      'nota_loja',
      'nota_entrega',
      'gorjeta',
      'comentario',
      'entregador',
    ];
    const lines = source.map((row: any) => [
      formatDateTime(row?.createdAt),
      formatOrderDisplayId(row?.orderId, storeSlug),
      row?.customerName || 'Cliente',
      Number(row?.storeRating || 0).toFixed(1),
      row?.deliveryRating != null ? Number(row?.deliveryRating || 0).toFixed(1) : '',
      Number(row?.tipAmount || 0).toFixed(2),
      row?.comment || '',
      row?.motoboyName || '',
    ]);
    const csv = [header, ...lines].map((line) => line.map(escapeCell).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `avaliacoes-${storeSlug || 'loja'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);
  const rangeStart = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(rows.length, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, ratingFilter, commentFilter, tipFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-4">
      {!canUseDeliveryReviewsAndTips && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-900">Detalhes de entrega e gorjetas no plano Pro</p>
          <p className="mt-1 text-xs text-violet-700">Você já vê as avaliações da loja. Para dados de entrega e gorjetas, faça upgrade.</p>
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-3 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
          >
            Trocar assinatura
          </button>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, pedido ou comentário..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-primary"
          />
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!rows.length}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] text-slate-500">Nota média da loja</p>
          <p className="text-lg font-black text-slate-900">{insights.avgStore.toFixed(2)}</p>
          <div className="mt-1">{renderStars(insights.avgStore)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] text-slate-500">Média últimos 7 dias</p>
          <p className="text-lg font-black text-slate-900">{insights.avg7.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Base: {insights.total} avaliação(ões)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] text-slate-500">Com comentário</p>
          <p className="text-lg font-black text-slate-900">{insights.withCommentRate.toFixed(1)}%</p>
          <p className="text-[11px] text-slate-500 mt-1">qualidade de feedback</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] text-slate-500">Com gorjeta</p>
          <p className="text-lg font-black text-slate-900">{insights.withTipRate.toFixed(1)}%</p>
          <p className="text-[11px] text-slate-500 mt-1">engajamento do cliente</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Distribuição de notas</p>
        {ratingDistribution.map((bucket) => (
          <div key={bucket.score} className="grid grid-cols-[42px_minmax(0,1fr)_64px] items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">{bucket.score}★</span>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: `${Math.max(3, bucket.percent)}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 text-right">{bucket.count} ({bucket.percent.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: `Todas (${filterCounts.all})`, active: ratingFilter === 'all' && commentFilter === 'all' && tipFilter === 'all', onClick: () => { setRatingFilter('all'); setCommentFilter('all'); setTipFilter('all'); } },
          { id: 'r5', label: `5★ (${filterCounts.ratings[5]})`, active: ratingFilter === '5', onClick: () => setRatingFilter((prev) => (prev === '5' ? 'all' : '5')) },
          { id: 'r4', label: `4★ (${filterCounts.ratings[4]})`, active: ratingFilter === '4', onClick: () => setRatingFilter((prev) => (prev === '4' ? 'all' : '4')) },
          { id: 'r3', label: `3★ (${filterCounts.ratings[3]})`, active: ratingFilter === '3', onClick: () => setRatingFilter((prev) => (prev === '3' ? 'all' : '3')) },
          { id: 'r2', label: `2★ (${filterCounts.ratings[2]})`, active: ratingFilter === '2', onClick: () => setRatingFilter((prev) => (prev === '2' ? 'all' : '2')) },
          { id: 'r1', label: `1★ (${filterCounts.ratings[1]})`, active: ratingFilter === '1', onClick: () => setRatingFilter((prev) => (prev === '1' ? 'all' : '1')) },
          { id: 'comment', label: `Com comentário (${filterCounts.withComment})`, active: commentFilter === 'with_comment', onClick: () => setCommentFilter((prev) => (prev === 'with_comment' ? 'all' : 'with_comment')) },
          { id: 'tip', label: `Com gorjeta (${filterCounts.withTip})`, active: tipFilter === 'with_tip', onClick: () => setTipFilter((prev) => (prev === 'with_tip' ? 'all' : 'with_tip')) },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onClick}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              chip.active
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Nenhuma avaliação encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            {pagedRows.map((row: any) => (
              <article
                key={row.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-30px_rgba(15,23,42,0.6)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-primary/70 via-emerald-500/60 to-sky-500/70" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-xs flex items-center justify-center">
                      {getInitials(row.customerName || 'Cliente')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{row.customerName || 'Cliente'}</p>
                      <p className="text-[11px] text-slate-500">Pedido #{formatOrderDisplayId(row.orderId, storeSlug)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(row.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                      {renderStars(row.storeRating)}
                      Loja {Number(row.storeRating || 0).toFixed(1)}
                    </span>
                    {canUseDeliveryReviewsAndTips && row.deliveryRating ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        {renderStars(row.deliveryRating)}
                        Entrega {Number(row.deliveryRating || 0).toFixed(1)}
                      </span>
                    ) : null}
                    {canUseDeliveryReviewsAndTips && Number(row.tipAmount || 0) > 0 ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        Gorjeta {formatCurrency(Number(row.tipAmount || 0))}
                      </span>
                    ) : null}
                  </div>
                </div>
                {row.comment ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                    <p className="text-sm text-slate-700 leading-relaxed">{row.comment}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">Sem comentário.</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold">
                    ID: {String(row.orderId || '').slice(0, 8)}
                  </span>
                  {canUseDeliveryReviewsAndTips && row.motoboyName ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold">
                      Entregador: {row.motoboyName}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">
              Exibindo {rangeStart}-{rangeEnd} de {rows.length} avaliações
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
              >
                {[10, 20, 30].map((size) => (
                  <option key={size} value={size}>{size}/página</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentsView = ({ subscription, loading, error, payments }) => {
  const navigate = useNavigate();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const isVip = Boolean(subscription?.planExempt) || subscription?.plan?.name === 'vip';
  const plan = subscription?.plan;
  const planName = String(plan?.name || '').toLowerCase();
  const isBasicPlan = !isVip && planName.includes('basic');
  const planLabel = isVip
    ? subscription?.plan?.displayName || subscription?.planExemptLabel || 'Cliente VIP'
    : plan?.displayName || plan?.name || 'Plano não identificado';
  const priceValue = isVip ? 0 : (subscription?.latestPaymentAmount ?? plan?.price ?? 0);
  const methodMeta = isVip
    ? { label: 'Isento de plano', icon: null }
    : getPaymentMethodMeta(subscription?.paymentMethod);
  const expiresLabel = isVip ? 'Sem vencimento' : (subscription?.endDate ? formatDateTime(subscription.endDate) : '—');
  const resolveDaysUntil = (value) => {
    if (!value) return null;
    const end = new Date(value).getTime();
    if (!Number.isFinite(end)) return null;
    const diffDays = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const expiresInDays = isVip ? null : resolveDaysUntil(subscription?.endDate);
  const expiresHint =
    !isVip && typeof expiresInDays === 'number'
      ? expiresInDays > 1
        ? `em ${expiresInDays} dias`
        : expiresInDays === 1
        ? 'em 1 dia'
        : expiresInDays === 0
        ? 'expira hoje'
        : `expirado há ${Math.abs(expiresInDays)} dia${Math.abs(expiresInDays) === 1 ? '' : 's'}`
      : '';
  const rawStatus = (subscription?.status || '').toUpperCase();
  const statusMap: Record<string, { label: string; tone: string; accent: string }> = {
    TRIAL: { label: 'Trial ativo (7 dias)', tone: 'bg-emerald-100 text-emerald-700', accent: 'border-l-emerald-400 bg-white' },
    ACTIVE: { label: 'Assinatura ativa', tone: 'bg-emerald-100 text-emerald-700', accent: 'border-l-emerald-400 bg-white' },
    PENDING: { label: 'Aguardando pagamento', tone: 'bg-amber-100 text-amber-700', accent: 'border-l-amber-400 bg-white' },
    EXPIRED: { label: 'Assinatura expirada', tone: 'bg-rose-100 text-rose-700', accent: 'border-l-rose-400 bg-white' },
    SUSPENDED: { label: 'Assinatura suspensa', tone: 'bg-rose-100 text-rose-700', accent: 'border-l-rose-400 bg-white' },
    CANCELLED: { label: 'Assinatura cancelada', tone: 'bg-slate-100 text-slate-600', accent: 'border-l-slate-300 bg-white' },
  };
  const statusLabel = isVip ? 'VIP ativo' : (statusMap[rawStatus]?.label || subscription?.status || '—');
  const statusTone = isVip ? 'bg-emerald-100 text-emerald-700' : (statusMap[rawStatus]?.tone || 'bg-slate-100 text-slate-600');
  const statusAccent = isVip ? 'border-l-emerald-400 bg-white' : (statusMap[rawStatus]?.accent || 'border-l-slate-200 bg-white');
  const paidAtLabel = subscription?.latestPaymentAt ? formatDateTime(subscription.latestPaymentAt) : '—';
  const rawPaymentStatus = (subscription?.latestPaymentStatus || '').toUpperCase();
  const paymentStatusMap: Record<string, string> = {
    PAID: 'Pagamento aprovado',
    PENDING: 'Pagamento pendente',
    FAILED: 'Pagamento falhou',
    CANCELLED: 'Pagamento cancelado',
    EXPIRED: 'Pagamento expirado',
  };
  const paymentStatus =
    isVip
      ? 'Isento de cobranca (VIP)'
      : rawStatus === 'TRIAL'
      ? 'Sem cobrança durante o trial'
      : paymentStatusMap[rawPaymentStatus] || subscription?.latestPaymentStatus || '—';
  const historyStatusMap: Record<string, string> = {
    PAID: 'PAGO',
    PENDING: 'PENDENTE',
    FAILED: 'FALHOU',
    CANCELLED: 'CANCELADO',
    EXPIRED: 'EXPIRADO',
  };
  const historyToneMap: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-rose-100 text-rose-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-slate-100 text-slate-600',
  };
  const historyAccentMap: Record<string, string> = {
    PAID: 'border-l-emerald-400 bg-white',
    PENDING: 'border-l-amber-400 bg-white',
    FAILED: 'border-l-rose-400 bg-white',
    CANCELLED: 'border-l-slate-300 bg-white',
    EXPIRED: 'border-l-slate-300 bg-white',
  };
  const paymentInsights = useMemo(() => {
    const rows = Array.isArray(payments) ? payments : [];
    const totals = {
      paidCount: 0,
      paidAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      failedCount: 0,
      failedAmount: 0,
    };
    rows.forEach((payment) => {
      const status = String(payment?.status || '').toUpperCase();
      const amount = Number(payment?.amount || 0);
      if (status === 'PAID') {
        totals.paidCount += 1;
        totals.paidAmount += amount;
      } else if (status === 'PENDING') {
        totals.pendingCount += 1;
        totals.pendingAmount += amount;
      } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
        totals.failedCount += 1;
        totals.failedAmount += amount;
      }
    });
    return totals;
  }, [payments]);

  if (loading) {
    return (
      <div className="py-4 space-y-3">
        <div className="ds-skeleton h-20 w-full" />
        <div className="ds-skeleton h-16 w-full" />
        <div className="ds-skeleton h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="py-4 text-sm text-red-600">{error}</div>;
  }

  if (!subscription) {
    return (
      <div className="ds-empty-state py-8 text-center">
        <p className="text-base font-semibold text-slate-800">Nenhuma assinatura encontrada</p>
        <p className="mt-1 text-xs text-slate-500">Ative um plano para liberar os recursos da loja.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className={`rounded-3xl border border-slate-200 border-l-4 ${statusAccent} p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.45)] space-y-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Plano atual</p>
            <div className="flex items-center gap-2 mt-2">
              <h3 className="text-2xl font-bold text-slate-900">{planLabel}</h3>
              {isVip && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                  VIP
                </span>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone}`}>
            {statusLabel}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 border-l-4 border-l-rose-400 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Valor</p>
            <p className="text-lg font-semibold text-slate-900 mt-2">{formatCurrency(priceValue)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {isVip ? 'Sem cobranca e sem vencimento' : `Plano ${plan?.billingCycle || 'mensal'}`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 border-l-4 border-l-sky-400 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Forma de pagamento</p>
            <p className="text-lg font-semibold text-slate-900 mt-2 inline-flex items-center gap-2">
              {methodMeta.icon && (
                <img src={methodMeta.icon} alt={methodMeta.label} className="h-4 w-4 object-contain" />
              )}
              {methodMeta.label}
            </p>
            <p className="text-xs text-slate-500 mt-1">{paymentStatus}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 border-l-4 border-l-slate-300 bg-white p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)] space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Ciclo</p>
          <h3 className="text-lg font-bold text-slate-900 mt-2">{isVip ? 'Acesso VIP' : 'Próximo vencimento'}</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-slate-300 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{isVip ? 'Vencimento' : 'Expira em'}</p>
          <p className="text-lg font-semibold text-slate-900 mt-2">{expiresLabel}</p>
          {expiresHint && (
            <p className="text-xs font-semibold text-slate-600 mt-1">{expiresHint}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            {isVip ? 'Acesso liberado pelo administrador.' : `Último pagamento: ${paidAtLabel}`}
          </p>
        </div>
        {isBasicPlan && (
          <div className="rounded-2xl border border-slate-200 border-l-4 border-l-slate-300 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-violet-700">Upgrade</p>
            <p className="text-sm font-bold text-violet-900 mt-2">Desbloqueie recursos Pro</p>
            <p className="text-xs text-violet-700/90 mt-1">
              Ative retirada, entregadores e fluxo de gorjetas.
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin/renewal')}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Trocar para Pro
            </button>
          </div>
        )}
        {Array.isArray(payments) && payments.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold">Resumo financeiro</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] text-emerald-700">Recebido</p>
                <p className="text-sm font-black text-emerald-800">{formatCurrency(paymentInsights.paidAmount)}</p>
                <p className="text-[11px] text-emerald-700/80">{paymentInsights.paidCount} pagamento(s)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] text-amber-700">Em análise</p>
                <p className="text-sm font-black text-amber-800">{formatCurrency(paymentInsights.pendingAmount)}</p>
                <p className="text-[11px] text-amber-700/80">{paymentInsights.pendingCount} pendente(s)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] text-rose-700">Não concluído</p>
                <p className="text-sm font-black text-rose-800">{formatCurrency(paymentInsights.failedAmount)}</p>
                <p className="text-[11px] text-rose-700/80">{paymentInsights.failedCount} tentativa(s)</p>
              </div>
            </div>
          </div>
        )}
        {Array.isArray(payments) && payments.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Histórico de pagamentos</p>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  checked={showAllHistory}
                  onChange={(event) => setShowAllHistory(event.target.checked)}
                />
                Mostrar falhas e pendentes
              </label>
            </div>
            <div className="mt-3 space-y-2">
              {payments
                .filter((payment) =>
                  showAllHistory ? true : (payment.status || '').toUpperCase() === 'PAID',
                )
                .slice(0, 6)
                .map((payment) => {
                  const normalizedStatus = (payment.status || '').toUpperCase();
                  const rowAccent = historyAccentMap[normalizedStatus] || 'border-l-slate-200 bg-white';
                  return (
                  <div key={payment.id} className={`flex items-center justify-between text-sm rounded-2xl border border-slate-200 border-l-4 px-3 py-2 ${rowAccent}`}>
                  <div>
                    {(() => {
                      const paymentMeta = getPaymentMethodMeta(payment.method);
                      const providerMeta = getPaymentProviderMeta(payment.provider);
                      const statusLabel = historyStatusMap[normalizedStatus] || payment.status || '—';
                      const statusTone = historyToneMap[normalizedStatus] || 'bg-slate-100 text-slate-600';
                      return (
                        <p className="font-semibold text-slate-700 flex flex-wrap items-center gap-2">
                          {paymentMeta.icon && (
                            <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                          )}
                          <span>{paymentMeta.label}</span>
                          <span className="text-slate-300">·</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusTone}`}>
                            {statusLabel}
                          </span>
                          {providerMeta.icon && (
                            <>
                              <span className="text-slate-300">·</span>
                              <img
                                src={providerMeta.icon}
                                alt={providerMeta.label}
                                className="h-4 w-4 object-contain"
                              />
                              <span className="text-xs text-slate-500">{providerMeta.label}</span>
                            </>
                          )}
                        </p>
                      );
                    })()}
                    <p className="text-xs text-slate-400">
                      {payment.createdAt ? formatDateTime(payment.createdAt) : '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {payment.planDisplayName || payment.planName || 'Plano'}
                      {payment.planDurationDays ? ` · ${formatPlanCycle(payment.planDurationDays)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(payment.amount || 0)}</p>
                    <p className="text-xs text-slate-400">
                      {getPaymentProviderMeta(payment.provider).label}
                    </p>
                  </div>
                </div>
              )})}
            </div>
            {!showAllHistory &&
              payments.filter((payment) => (payment.status || '').toUpperCase() === 'PAID').length === 0 && (
              <p className="mt-3 text-xs text-slate-500">Nenhum pagamento aprovado ainda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  session?: any;
}

export function AdminDashboard({ session: sessionProp }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, setAuth } = useAuth();
  const { branding, setBranding } = useTheme();
  const { showToast } = useToast();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [linkStats, setLinkStats] = useState<any>(null);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pedidos' | 'avaliacoes' | 'produtos' | 'config' | 'fila' | 'pagamentos' | 'motoboys'>(() => {
    return (location.state as any)?.activeTab || 'resumo';
  });
  const [menuVisible, setMenuVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('adminHeader:visible') !== 'false';
  });
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('adminSidebar:compact') === 'true';
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [notificationCriticalOnly, setNotificationCriticalOnly] = useState(false);
  const [pendingMotoboyRequests, setPendingMotoboyRequests] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState<any | null>(null);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [tipsOverview, setTipsOverview] = useState({
    paidAmount: 0,
    pendingAmount: 0,
    tipOrders: 0,
    paidTipOrders: 0,
    pendingTipOrders: 0,
    avgTipAmount: 0,
    payoutPendingAmount: 0,
    payoutPendingCount: 0,
    payoutPaidAmount: 0,
    payoutPaidCount: 0,
  });
  const prevTabRef = useRef(activeTab);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState<string[]>([]);
  const isVip = Boolean(session?.store?.settings?.planExempt || session?.subscription?.planExempt);
  const planName = String(session?.subscription?.plan?.name || '').toLowerCase();
  const subscriptionStatus = String(session?.subscription?.status || '').toUpperCase();
  const canUseMotoboys = Boolean(
    isVip ||
      session?.features?.motoboyManagement ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );
  const canUseDeliveryReviewsAndTips = Boolean(
    isVip ||
      session?.features?.tipPayouts ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );
  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
  const storeUrl = storeSlug ? `https://www.janocaminho.com.br/${storeSlug}` : '';
  const storeName = session?.store?.name || 'Já no Caminho';
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const whatsappNumber = session?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';

  const desktopTabItems = [
    { id: 'resumo', label: 'Resumo', icon: ChartBar },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
    { id: 'avaliacoes', label: 'Avaliações', icon: Star },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
    { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
    { id: 'config', label: 'Configurações', icon: Gear },
    { id: 'fila', label: 'Monitor de Pedidos', icon: ChefHat },
  ];
  const navItems = useMemo(
    () => [
      ...desktopTabItems,
      { id: 'cardapio', label: 'Catálogo Online', icon: BookOpen, disabled: false, standalone: true },
    ],
    [desktopTabItems]
  );
  const tabMeta = useMemo(
    () => ({
      resumo: { title: 'Resumo executivo', subtitle: 'Visão consolidada da operação, receita e qualidade da loja.' },
      pedidos: { title: 'Pedidos', subtitle: 'Acompanhe status, filtros e histórico dos pedidos em tempo real.' },
      avaliacoes: { title: 'Avaliações', subtitle: 'Notas e comentários dos clientes por pedido.' },
      produtos: { title: 'Produtos', subtitle: 'Gerencie catálogo, preço, disponibilidade e destaque da vitrine.' },
      pagamentos: { title: 'Pagamentos', subtitle: 'Controle assinatura, ciclo e eventos de cobrança da loja.' },
      config: { title: 'Configurações', subtitle: 'Ajuste identidade, canais, tipos de pedido e horários da operação.' },
      fila: { title: 'Operação', subtitle: 'Acompanhe pedidos em andamento e o fluxo de atendimento da loja.' },
      motoboys: { title: 'Entregadores', subtitle: 'Vínculos, documentos, solicitações e status de entrega.' },
    }),
    []
  );
  const openQueueMonitor = React.useCallback(
    (options?: { replace?: boolean }) => {
      const isDashboard = location.pathname === '/admin/dashboard';
      if (isDashboard) {
        setActiveTab('fila');
        setNotificationsOpen(false);
        setCommandOpen(false);
        setMobileDrawerOpen(false);
        return;
      }
      navigate('/admin/queue', { replace: Boolean(options?.replace) });
    },
    [location.pathname, navigate]
  );
  const commandActions = useMemo(() => {
    const items = [
      ...desktopTabItems
        .filter((item) => !item.disabled && item.id !== 'resumo')
        .map((item) => ({
          id: `tab-${item.id}`,
          label: item.label,
          description: tabMeta[item.id]?.subtitle || 'Abrir seção',
          run: () => {
            if (item.id === 'fila') {
              openQueueMonitor();
              return;
            }
            setActiveTab(item.id as typeof activeTab);
            setMobileDrawerOpen(false);
          },
        })),
      {
        id: 'go-menu',
        label: 'Monitor de pedidos',
        description: 'Abre o monitor operacional da loja.',
        run: () => openQueueMonitor(),
      },
      {
        id: 'go-queue',
        label: 'Abrir operação',
        description: 'Acessa a central de operação dos pedidos.',
        run: () => openQueueMonitor(),
      },
      {
        id: 'go-renewal',
        label: 'Trocar assinatura',
        description: 'Abre a tela de renovação/upgrade da assinatura.',
        run: () => navigate('/admin/renewal'),
      },
    ];
    return items;
  }, [desktopTabItems, tabMeta, storeSlug, navigate, openQueueMonitor]);
  const filteredCommandActions = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return commandActions;
    return commandActions.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(q));
  }, [commandActions, commandQuery]);

  useEffect(() => {
    if (!canUseMotoboys && activeTab === 'motoboys') {
      setActiveTab('resumo');
    }
  }, [canUseMotoboys, activeTab]);
  const [brandingDraft, setBrandingDraft] = useState(() => ({
    brandName: session?.store?.name || '',
    logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
    logoFile: '',
    bannerUrl: resolveAssetUrl(session?.store?.settings?.bannerUrl) || '',
    bannerFile: '',
    bannerPosition: session?.store?.settings?.bannerPosition === 'top' ? 'top' : 'center',
    description: session?.store?.settings?.description || '',
    primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
    secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
    pixKey: session?.store?.settings?.pixKey || '',
    contactEmail: session?.store?.settings?.contactEmail || '',
    promoMessage: session?.store?.settings?.promoMessage || '',
    address: session?.store?.settings?.address || session?.store?.owner?.address || '',
    instagram: instagramHandle?.replace('@', '') || '',
    deliveryRadiusKm: session?.store?.settings?.deliveryRadiusKm || '',
    deliveryFee: session?.store?.settings?.deliveryFee || '',
    prepBaseMinutes: session?.store?.settings?.prepBaseMinutes || '20',
    prepAttentionMinutes: session?.store?.settings?.prepAttentionMinutes || '15',
  }));

  useEffect(() => {
    if (!storeId) return;
    const loadRequests = async () => {
      try {
        const data = await motoboyAdminService.listRequests(storeId);
        const list = Array.isArray(data) ? data : [];
        setPendingMotoboyRequests(list.filter((req) => req.status === 'PENDING').length);
      } catch {
        setPendingMotoboyRequests(0);
      }
    };
    loadRequests();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    const loadReviewsSummary = async () => {
      setReviewsLoading(true);
      try {
        const summary = await orderService.getReviewSummaryByStore(storeId);
        const reviewsPromise = orderService.listReviewsByStore(storeId, 300).catch(() => []);
        const payoutsPromise = canUseDeliveryReviewsAndTips
          ? orderService.listTipPayoutsByStore(storeId, 300).catch(() => [])
          : Promise.resolve([]);
        const [reviews, payouts] = await Promise.all([reviewsPromise, payoutsPromise]);
        if (!active) return;
        setReviewsSummary(summary || null);
        const reviewRows = Array.isArray(reviews) ? reviews : [];
        setReviewsList(reviewRows);
        const tipRows = reviewRows.filter((r: any) => Number(r?.tipAmount ?? r?.tip_amount ?? 0) > 0);
        const paidRows = tipRows.filter((r: any) => String(r?.tipStatus ?? r?.tip_status ?? '').toUpperCase() === 'PAID');
        const pendingRows = tipRows.filter((r: any) => String(r?.tipStatus ?? r?.tip_status ?? '').toUpperCase() === 'PENDING');
        const paidAmount = paidRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount ?? r?.tip_amount ?? 0), 0);
        const pendingAmount = pendingRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount ?? r?.tip_amount ?? 0), 0);
        const tipOrders = tipRows.length;
        const avgTipAmount = tipOrders > 0 ? (paidAmount + pendingAmount) / tipOrders : 0;
        const payoutRows = Array.isArray(payouts) ? payouts : [];
        const payoutPendingRows = payoutRows.filter((r: any) => String(r?.tipPayoutStatus || '').toUpperCase() !== 'PAID');
        const payoutPaidRows = payoutRows.filter((r: any) => String(r?.tipPayoutStatus || '').toUpperCase() === 'PAID');
        const payoutPendingAmount = payoutPendingRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount || 0), 0);
        const payoutPaidAmount = payoutPaidRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount || 0), 0);
        setTipsOverview({
          paidAmount,
          pendingAmount,
          tipOrders,
          paidTipOrders: paidRows.length,
          pendingTipOrders: pendingRows.length,
          avgTipAmount,
          payoutPendingAmount,
          payoutPendingCount: payoutPendingRows.length,
          payoutPaidAmount,
          payoutPaidCount: payoutPaidRows.length,
        });
      } catch {
        if (!active) return;
        setReviewsSummary(null);
        setReviewsList([]);
        setTipsOverview({
          paidAmount: 0,
          pendingAmount: 0,
          tipOrders: 0,
          paidTipOrders: 0,
          pendingTipOrders: 0,
          avgTipAmount: 0,
          payoutPendingAmount: 0,
          payoutPendingCount: 0,
          payoutPaidAmount: 0,
          payoutPaidCount: 0,
        });
      } finally {
        if (active) setReviewsLoading(false);
      }
    };
    loadReviewsSummary();
    return () => {
      active = false;
    };
  }, [storeId, canUseDeliveryReviewsAndTips]);
  useEffect(() => {
    if ((location.state as any)?.activeTab === 'fila') {
      openQueueMonitor({ replace: true });
    }
  }, [location.state, openQueueMonitor]);
  const [savingBranding, setSavingBranding] = useState(false);
  const [configPanels, setConfigPanels] = useState({
    branding: true,
    orderTypes: false,
    hours: false,
  });

  const updateAuthStore = (updates) => {
    if (!auth?.store) return;
    setAuth({
      ...auth,
      store: {
        ...auth.store,
        ...updates,
        settings: {
          ...auth.store.settings,
          ...(updates.settings || {}),
        },
      },
    });
  };


  useEffect(() => {
    setBrandingDraft({
      brandName: session?.store?.name || '',
      logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
      logoFile: '',
      bannerUrl: resolveAssetUrl(session?.store?.settings?.bannerUrl) || '',
      bannerFile: '',
      bannerPosition: session?.store?.settings?.bannerPosition === 'top' ? 'top' : 'center',
      description: session?.store?.settings?.description || '',
      primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
      secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
      pixKey: session?.store?.settings?.pixKey || '',
      contactEmail: session?.store?.settings?.contactEmail || '',
      promoMessage: session?.store?.settings?.promoMessage || '',
      address: session?.store?.settings?.address || session?.store?.owner?.address || '',
      instagram: instagramHandle?.replace('@', '') || '',
      deliveryRadiusKm: session?.store?.settings?.deliveryRadiusKm || '',
      deliveryFee: session?.store?.settings?.deliveryFee || '',
      prepBaseMinutes: session?.store?.settings?.prepBaseMinutes || '20',
      prepAttentionMinutes: session?.store?.settings?.prepAttentionMinutes || '15',
    });
  }, [
    session?.store?.name,
    session?.store?.settings?.logoUrl,
    session?.store?.settings?.bannerUrl,
    session?.store?.settings?.bannerPosition,
    session?.store?.settings?.description,
    session?.store?.settings?.primaryColor,
    session?.store?.settings?.secondaryColor,
    session?.store?.settings?.pixKey,
    session?.store?.settings?.contactEmail,
    session?.store?.settings?.promoMessage,
    session?.store?.settings?.address,
    session?.store?.owner?.address,
    session?.store?.settings?.deliveryRadiusKm,
    session?.store?.settings?.deliveryFee,
    session?.store?.settings?.prepBaseMinutes,
    session?.store?.settings?.prepAttentionMinutes,
    instagramHandle,
  ]);
  const hasBrandingChanges = useMemo(() => {
    const normalize = (value: any) => String(value ?? '').trim();
    const current = {
      brandName: normalize(session?.store?.name),
      logoUrl: normalize(resolveAssetUrl(session?.store?.settings?.logoUrl) || ''),
      bannerUrl: normalize(resolveAssetUrl(session?.store?.settings?.bannerUrl) || ''),
      bannerPosition: session?.store?.settings?.bannerPosition === 'top' ? 'top' : 'center',
      description: normalize(session?.store?.settings?.description),
      primaryColor: normalize(session?.store?.settings?.primaryColor || '#b91c1c'),
      secondaryColor: normalize(session?.store?.settings?.secondaryColor || '#111827'),
      pixKey: normalize(session?.store?.settings?.pixKey),
      contactEmail: normalize(session?.store?.settings?.contactEmail),
      promoMessage: normalize(session?.store?.settings?.promoMessage),
      address: normalize(session?.store?.settings?.address || session?.store?.owner?.address || ''),
      instagram: normalize(instagramHandle?.replace('@', '') || ''),
      deliveryRadiusKm: normalize(session?.store?.settings?.deliveryRadiusKm),
      deliveryFee: normalize(session?.store?.settings?.deliveryFee),
      prepBaseMinutes: normalize(session?.store?.settings?.prepBaseMinutes || '20'),
      prepAttentionMinutes: normalize(session?.store?.settings?.prepAttentionMinutes || '15'),
    };
    const draft = {
      brandName: normalize(brandingDraft.brandName),
      logoUrl: normalize(brandingDraft.logoUrl),
      bannerUrl: normalize(brandingDraft.bannerUrl),
      bannerPosition: brandingDraft.bannerPosition === 'top' ? 'top' : 'center',
      description: normalize(brandingDraft.description),
      primaryColor: normalize(brandingDraft.primaryColor),
      secondaryColor: normalize(brandingDraft.secondaryColor),
      pixKey: normalize(brandingDraft.pixKey),
      contactEmail: normalize(brandingDraft.contactEmail),
      promoMessage: normalize(brandingDraft.promoMessage),
      address: normalize(brandingDraft.address),
      instagram: normalize(brandingDraft.instagram),
      deliveryRadiusKm: normalize(brandingDraft.deliveryRadiusKm),
      deliveryFee: normalize(brandingDraft.deliveryFee),
      prepBaseMinutes: normalize(brandingDraft.prepBaseMinutes || '20'),
      prepAttentionMinutes: normalize(brandingDraft.prepAttentionMinutes || '15'),
    };
    const fieldsChanged = Object.keys(current).some((key) => current[key] !== draft[key]);
    return fieldsChanged || Boolean(brandingDraft.logoFile || brandingDraft.bannerFile);
  }, [brandingDraft, session?.store, instagramHandle]);
  const headerNotifications = useMemo(() => {
    const normalizeTime = (value: any) => {
      if (!value) return 0;
      if (value?.seconds) return Number(value.seconds) * 1000;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const normalizeStatus = (raw: any) => {
      const st = String(raw || '').toLowerCase();
      if (st === 'delivered') return 'done';
      if (st === 'ready_for_delivery' || st === 'waiting_for_motoboy') return 'ready';
      return st || 'pending';
    };
    const result: Array<{
      key: string;
      id: string;
      title: string;
      description: string;
      generatedAt: number;
      tone: 'danger' | 'warning' | 'info' | 'success';
      actionLabel: string;
      action: () => void;
    }> = [];

    const pendingOrders = (orders || []).filter((order: any) => normalizeStatus(order?.status) === 'pending').length;
    const readyOrders = (orders || []).filter((order: any) => normalizeStatus(order?.status) === 'ready').length;
    if (pendingOrders > 0) {
      const oldestPendingTs = (orders || [])
        .filter((order: any) => normalizeStatus(order?.status) === 'pending')
        .map((order: any) => normalizeTime(order?.createdAt))
        .filter((ts: number) => ts > 0)
        .sort((a: number, b: number) => a - b)[0] || Date.now();
      result.push({
        key: `pending-orders:${pendingOrders}`,
        id: 'pending-orders',
        title: `${pendingOrders} pedido(s) pendente(s)`,
        description: 'Pedidos novos aguardando início da operação.',
        generatedAt: oldestPendingTs,
        tone: 'warning',
        actionLabel: 'Abrir operação',
        action: () => openQueueMonitor(),
      });
    }
    if (readyOrders > 0) {
      const oldestReadyTs = (orders || [])
        .filter((order: any) => normalizeStatus(order?.status) === 'ready')
        .map((order: any) => normalizeTime(order?.createdAt))
        .filter((ts: number) => ts > 0)
        .sort((a: number, b: number) => a - b)[0] || Date.now();
      result.push({
        key: `ready-orders:${readyOrders}`,
        id: 'ready-orders',
        title: `${readyOrders} pedido(s) pronto(s)`,
        description: 'Pedidos prontos aguardando retirada/expedição.',
        generatedAt: oldestReadyTs,
        tone: 'info',
        actionLabel: 'Abrir operação',
        action: () => openQueueMonitor(),
      });
    }
    if (pendingMotoboyRequests > 0) {
      result.push({
        key: `motoboy-requests:${pendingMotoboyRequests}:${canUseMotoboys ? 'enabled' : 'pro-only'}`,
        id: 'motoboy-requests',
        title: `${pendingMotoboyRequests} solicitação(ões) de entregador`,
        description: canUseMotoboys
          ? 'Há solicitações aguardando aprovação da loja.'
          : 'Recurso disponível no plano Pro.',
        generatedAt: Date.now(),
        tone: canUseMotoboys ? 'warning' : 'info',
        actionLabel: canUseMotoboys ? 'Revisar solicitações' : 'Trocar assinatura',
        action: () => {
          if (canUseMotoboys) {
            setActiveTab('motoboys');
          } else {
            navigate('/admin/renewal?focus=pro');
          }
        },
      });
    }
    if (canUseDeliveryReviewsAndTips && Number(tipsOverview?.payoutPendingCount || 0) > 0) {
      result.push({
        key: `tip-payout:${tipsOverview.payoutPendingCount}:${Number(tipsOverview?.payoutPendingAmount || 0).toFixed(2)}`,
        id: 'tip-payout',
        title: `${tipsOverview.payoutPendingCount} repasse(s) pendente(s)`,
        description: `Total aguardando repasse: ${formatCurrency(Number(tipsOverview?.payoutPendingAmount || 0))}.`,
        generatedAt: Date.now(),
        tone: 'warning',
        actionLabel: 'Ver repasses',
        action: () => setActiveTab('motoboys'),
      });
    }
    const expiresAt = new Date(subscriptionDetails?.endDate || '').getTime();
    const daysUntilExpiry = Number.isFinite(expiresAt)
      ? Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    if (!isVip && daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      result.push({
        key: `subscription-expiring:${daysUntilExpiry}`,
        id: 'subscription-expiring',
        title: daysUntilExpiry <= 0 ? 'Assinatura expirada' : 'Assinatura perto do vencimento',
        description:
          daysUntilExpiry <= 0
            ? 'Renove para manter a operação sem interrupções.'
            : `Vence em ${daysUntilExpiry} dia(s).`,
        generatedAt: Date.now(),
        tone: 'danger',
        actionLabel: 'Renovar agora',
        action: () => navigate('/admin/renewal'),
      });
    }
    const failedRecent = (paymentsHistory || []).filter((payment: any) => {
      const status = String(payment?.status || '').toUpperCase();
      if (status !== 'FAILED') return false;
      const ts = normalizeTime(payment?.createdAt);
      return ts > 0 && Date.now() - ts <= 24 * 60 * 60 * 1000;
    }).length;
    if (failedRecent > 0) {
      result.push({
        key: `failed-payments:${failedRecent}`,
        id: 'failed-payments',
        title: `${failedRecent} falha(s) de pagamento recente(s)`,
        description: 'Revise tentativas para evitar bloqueio de assinatura.',
        generatedAt: Date.now(),
        tone: 'danger',
        actionLabel: 'Ver pagamentos',
        action: () => setActiveTab('pagamentos'),
      });
    }
    return result.slice(0, 8);
  }, [
    orders,
    pendingMotoboyRequests,
    canUseMotoboys,
    canUseDeliveryReviewsAndTips,
    tipsOverview,
    subscriptionDetails?.endDate,
    isVip,
    paymentsHistory,
    navigate,
    openQueueMonitor,
  ]);
  const activeNotifications = useMemo(() => {
    const filtered = headerNotifications.filter((note) => !dismissedNotificationKeys.includes(note.key));
    return notificationCriticalOnly
      ? filtered.filter((note) => note.tone === 'danger' || note.tone === 'warning')
      : filtered;
  }, [headerNotifications, dismissedNotificationKeys, notificationCriticalOnly]);
  const unreadNotifications = activeNotifications.length;
  const notificationToneClass = (tone: 'danger' | 'warning' | 'info' | 'success') => {
    if (tone === 'danger') return 'border-rose-200 bg-rose-50';
    if (tone === 'warning') return 'border-amber-200 bg-amber-50';
    if (tone === 'success') return 'border-emerald-200 bg-emerald-50';
    return 'border-sky-200 bg-sky-50';
  };
  const notificationRelativeTime = (value: number) => {
    const ts = Number(value || 0);
    if (!Number.isFinite(ts) || ts <= 0) return 'agora';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return `há ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin}min`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `há ${diffHour}h`;
    const diffDay = Math.floor(diffHour / 24);
    return `há ${diffDay}d`;
  };

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notificationsOpen]);
  useEffect(() => {
    if (!storeId) return;
    const key = `adminNotifications:dismissed:${storeId}`;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setDismissedNotificationKeys(parsed.filter((item) => typeof item === 'string'));
      } else {
        setDismissedNotificationKeys([]);
      }
    } catch {
      setDismissedNotificationKeys([]);
    }
  }, [storeId]);
  useEffect(() => {
    if (!storeId) return;
    const key = `adminNotifications:dismissed:${storeId}`;
    localStorage.setItem(key, JSON.stringify(dismissedNotificationKeys));
  }, [storeId, dismissedNotificationKeys]);
  const markNotificationRead = (noteKey: string) => {
    setDismissedNotificationKeys((prev) => (prev.includes(noteKey) ? prev : [...prev, noteKey]));
  };
  const clearAllNotifications = () => {
    setDismissedNotificationKeys((prev) => {
      const keys = activeNotifications.map((note) => note.key);
      const merged = new Set([...prev, ...keys]);
      return Array.from(merged);
    });
  };

  /* =========================
   * CARREGA PRODUTOS + PEDIDOS
   * ========================= */
  useEffect(() => {
    if (!storeId && !storeSlug) return;

    const storeIdentifier = storeId || storeSlug;

    const unsubscribeProducts = productService.subscribe(setProducts, storeIdentifier);
    const unsubscribeOrders = orderService.subscribeAll(storeIdentifier, setOrders);

    return () => {
      unsubscribeProducts?.();
      unsubscribeOrders?.();
    };
  }, [storeId, storeSlug]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;

    const loadSubscription = async () => {
      setSubscriptionLoading(true);
      setSubscriptionError('');
      try {
        const data = await subscriptionService.getByStore(storeId);
        if (active) {
          setSubscriptionDetails(data);
          if (auth?.token && auth?.store) {
            const status = String(data?.status || '').toUpperCase();
            const planName = String(data?.plan?.name || '').toLowerCase();
            const isVipPlan = Boolean(data?.planExempt || auth?.store?.settings?.planExempt);
            const isProLike = isVipPlan || status === 'TRIAL' || planName.includes('pro') || planName.includes('vip');
            const syncedFeatures = {
              motoboyManagement: isProLike,
              tipPayouts: isProLike,
              advancedDashboard: isProLike,
              deliveryMode: isProLike,
              pickupMode: true,
            };
            setAuth({
              ...auth,
              subscription: data,
              planTier: isVipPlan ? 'vip' : (isProLike ? 'pro' : 'basic'),
              features: syncedFeatures,
            });
          }
        }
      } catch (err) {
        if (active) {
          setSubscriptionError(err.message || 'Não foi possível carregar a assinatura agora.');
        }
      } finally {
        if (active) setSubscriptionLoading(false);
      }
    };

    loadSubscription();

    return () => {
      active = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (!subscriptionDetails || !auth?.user) return;
    const status = (subscriptionDetails.status || '').toUpperCase();
    const blocked = [ 'EXPIRED', 'SUSPENDED', 'CANCELLED' ];
    const shouldRenew =
      !subscriptionDetails.planExempt &&
      (blocked.includes(status) || status === 'PENDING');

    if (shouldRenew && auth.user.role === 'ADMIN') {
      navigate('/admin/renewal');
    }
  }, [subscriptionDetails, auth?.user, navigate]);

  useEffect(() => {
    const handleToggle = (event) => {
      const next = event?.detail?.visible;
      if (typeof next === 'boolean') {
        setMenuVisible(next);
      }
    };
    window.addEventListener('adminHeader:toggle', handleToggle as EventListener);
    window.addEventListener('adminHeader:set', handleToggle as EventListener);
    return () => {
      window.removeEventListener('adminHeader:toggle', handleToggle as EventListener);
      window.removeEventListener('adminHeader:set', handleToggle as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = prevTabRef.current;
    const hideForTab = (tabId: typeof activeTab) => tabId === 'fila';
    if (activeTab !== prev) {
      if (hideForTab(activeTab)) {
        localStorage.setItem('adminHeader:visible', 'false');
        window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }));
      } else if (hideForTab(prev) && !hideForTab(activeTab)) {
        localStorage.setItem('adminHeader:visible', 'true');
        window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: true } }));
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    const shouldOpen = Boolean((location.state as any)?.openNotifications);
    if (!shouldOpen) return;
    setNotificationsOpen(true);
    navigate('/admin/dashboard', { replace: true, state: {} });
  }, [location.state, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktopLayout(media.matches);
    onChange();
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
    } else {
      media.addListener(onChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', onChange);
      } else {
        media.removeListener(onChange);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('adminSidebar:compact', String(sidebarCompact));
  }, [sidebarCompact]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      event.preventDefault();
      setCommandOpen(true);
      setCommandQuery('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen && !commandOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerOpen(false);
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileDrawerOpen, commandOpen]);

  useEffect(() => {
    if (isDesktopLayout && mobileDrawerOpen) {
      setMobileDrawerOpen(false);
    }
  }, [isDesktopLayout, mobileDrawerOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!mobileDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileDrawerOpen]);


  useEffect(() => {
    if (!storeId) return;
    let active = true;
    const loadPayments = async () => {
      try {
        const data = await paymentService.listByStore(storeId, 20);
        if (active) setPaymentsHistory(data || []);
      } catch (error) {
        console.error('Não foi possível carregar histórico de pagamentos', error);
      }
    };
    loadPayments();
    return () => {
      active = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    const loadLinkStats = async () => {
      try {
        const data = await storeService.getLinkStats(storeId, 30);
        if (active) setLinkStats(data);
      } catch (error) {
        console.error('Não foi possível carregar estatísticas do link', error);
        if (active) setLinkStats(null);
      }
    };
    loadLinkStats();
    return () => {
      active = false;
    };
  }, [storeId]);

  /* =========================
   * CLIENTES PARA RELATÓRIO
   * ========================= */
  const customers = useMemo(() => {
    const byPhone = new Map();

    (orders || []).forEach((order) => {
      const key = order.phone || order.customerName || order.id;
      if (!byPhone.has(key)) {
        byPhone.set(key, { name: order.customerName || 'Cliente', phone: order.phone || '-' });
      }
    });

    return Array.from(byPhone.values());
  }, [orders]);

  /* =========================
   * RENDER
   * ========================= */
  if (!session?.store) {
    return <div className="ds-loading-page">Carregando painel da loja...</div>;
  }

  const openingHours = session?.store?.settings?.openingHours || [];
  const orderTypes = session?.store?.settings?.orderTypes || [];
  const setupChecklist = [
    {
      id: 'logo',
      label: 'Logo da loja',
      done: Boolean(session?.store?.settings?.logoUrl),
      action: 'Adicionar logo',
      onClick: () => setActiveTab('config'),
    },
    {
      id: 'description',
      label: 'Descrição da loja',
      done: Boolean(session?.store?.settings?.description?.trim()),
      action: 'Adicionar descrição',
      onClick: () => setActiveTab('config'),
    },
    {
      id: 'products',
      label: 'Produtos na vitrine',
      done: products.length > 0,
      action: 'Cadastrar produtos',
      onClick: () => setActiveTab('produtos'),
    },
    {
      id: 'hours',
      label: 'Horário de funcionamento',
      done: Array.isArray(openingHours) && openingHours.length > 0,
      action: 'Definir horários',
      onClick: () => setActiveTab('config'),
    },
    {
      id: 'orderTypes',
      label: 'Tipos de pedido',
      done: Array.isArray(orderTypes) && orderTypes.length > 0,
      action: 'Definir tipos',
      onClick: () => setActiveTab('config'),
    },
    {
      id: 'pix',
      label: 'Pix para recebimento',
      done: Boolean(session?.store?.settings?.pixKey),
      action: 'Configurar Pix',
      onClick: () => setActiveTab('config'),
    },
  ];



  const handleSaveBranding = async () => {
    if (!storeId) return;
    setSavingBranding(true);
    setError('');
    try {
      const payload = {
        name: brandingDraft.brandName,
        logoFile: brandingDraft.logoFile || undefined,
        logoUrl: brandingDraft.logoFile
          ? undefined
          : brandingDraft.logoUrl === ''
          ? null
          : brandingDraft.logoUrl || undefined,
        bannerFile: brandingDraft.bannerFile || undefined,
        bannerUrl: brandingDraft.bannerFile
          ? undefined
          : brandingDraft.bannerUrl === ''
          ? null
          : brandingDraft.bannerUrl || undefined,
        bannerPosition: brandingDraft.bannerPosition === 'top' ? 'top' : 'center',
        description: brandingDraft.description || undefined,
        primaryColor: brandingDraft.primaryColor,
        secondaryColor: brandingDraft.secondaryColor,
        pixKey: brandingDraft.pixKey?.trim() ?? '',
        contactEmail: brandingDraft.contactEmail?.trim() ?? '',
        promoMessage: brandingDraft.promoMessage?.trim() ?? '',
        address: brandingDraft.address?.trim() ?? '',
        deliveryRadiusKm: brandingDraft.deliveryRadiusKm,
        deliveryFee: brandingDraft.deliveryFee,
        prepBaseMinutes: brandingDraft.prepBaseMinutes,
        prepAttentionMinutes: brandingDraft.prepAttentionMinutes,
        socialLinks: brandingDraft.instagram ? [{ type: 'instagram', value: brandingDraft.instagram }] : [],
      };
      const updated = await storeService.update(storeId, payload);
      updateAuthStore(updated);
      setBranding({
        primaryColor: updated?.settings?.primaryColor,
        secondaryColor: updated?.settings?.secondaryColor,
        logoUrl: updated?.settings?.logoUrl,
        bannerUrl: updated?.settings?.bannerUrl,
        brandName: updated?.name,
      });
      showToast('Identidade atualizada com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao salvar identidade', err);
      setError('Não foi possível salvar a identidade da loja agora.');
      showToast('Não foi possível salvar a identidade da loja agora.', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleNavSelect = (id: string) => {
    if (id === 'cardapio') {
      if (storeSlug) navigate(`/${storeSlug}`);
      return;
    }
    if (id === 'fila') {
    openQueueMonitor();
      return;
    }
    if (id === 'motoboys' && !canUseMotoboys) {
      showToast('Disponível no plano Pro. Faça o upgrade para liberar entregadores.', 'info');
      navigate('/admin/renewal?focus=pro');
      return;
    }
    setActiveTab(id as typeof activeTab);
    setMobileDrawerOpen(false);
  };

  const sidebarGridClass = sidebarCompact
    ? 'w-full lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-5 xl:gap-6 lg:items-start'
    : 'w-full lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5 xl:gap-6 lg:items-start';

  return (
    <AdminLayout contextLabel="Painel da Loja">
      <div className="lg:hidden sticky top-2 z-[95]">
        <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2.5 flex items-center justify-between shadow-[0_16px_34px_-24px_rgba(15,23,42,0.45)]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Navegação</p>
            <p className="text-xs font-semibold text-slate-700 truncate">Acesso rápido do painel</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className={`ds-focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                notificationsOpen
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-label="Abrir notificações"
            >
              <Bell size={18} weight={notificationsOpen ? 'fill' : 'duotone'} />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="ds-focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              aria-label="Abrir menu"
            >
              <List size={16} weight="duotone" />
              Abrir
            </button>
          </div>
        </div>
      </div>

      <div className={sidebarGridClass}>
        <aside className="hidden lg:block">
          <div className={`sticky top-18 ds-admin-sidebar p-2.5 max-h-[calc(100vh-5.5rem)] overflow-y-auto overflow-x-visible ${sidebarCompact ? 'w-[72px]' : 'w-[280px]'}`}>
            <div className={`px-1 pb-2 flex items-center ${sidebarCompact ? 'justify-center' : 'justify-between'}`}>
              {!sidebarCompact && <p className="px-2 ds-admin-sidebar-title">Navegação</p>}
              <button
                type="button"
                onClick={() => setSidebarCompact((prev) => !prev)}
                className="ds-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20 transition"
                aria-label={sidebarCompact ? 'Expandir menu' : 'Minimizar menu'}
                title={sidebarCompact ? 'Expandir menu' : 'Minimizar menu'}
              >
                {sidebarCompact ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
              </button>
            </div>
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavSelect(item.id)}
                    title={item.disabled ? 'Disponível no plano Pro · clique para upgrade' : undefined}
                    aria-label={item.label}
                    className={`group relative ds-admin-sidebar-item ds-focus-ring flex items-center ${
                      sidebarCompact ? 'justify-center px-2.5' : 'justify-between gap-2'
                    } ${
                      isActive
                        ? 'ds-admin-sidebar-item-active'
                        : ''
                    } ${item.disabled ? 'opacity-80 cursor-pointer border border-violet-300/50 bg-violet-500/10 hover:bg-violet-500/20' : ''}`}
                  >
                    <span className={`inline-flex items-center ${sidebarCompact ? '' : 'gap-2'}`}>
                      <Icon size={16} weight={isActive ? 'fill' : 'duotone'} />
                      {!sidebarCompact && item.label}
                    </span>
                    {!sidebarCompact && item.id === 'motoboys' && item.disabled && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-violet-100 text-violet-700'}`}>
                        Pro
                      </span>
                    )}
                    {!sidebarCompact && item.id === 'motoboys' && !item.disabled && pendingMotoboyRequests > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                        {pendingMotoboyRequests}
                      </span>
                    )}
                    {sidebarCompact && (
                      <>
                        {item.id === 'motoboys' && item.disabled && (
                          <span className="absolute -top-1 -right-1 rounded-full bg-violet-600 text-white text-[9px] font-semibold px-1.5 py-0.5">
                            Pro
                          </span>
                        )}
                        {item.id === 'motoboys' && !item.disabled && pendingMotoboyRequests > 0 && (
                          <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 text-white text-[9px] font-semibold px-1.5 py-0.5">
                            {pendingMotoboyRequests}
                          </span>
                        )}
                        <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                          {item.label}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
      <section className="hidden md:flex relative z-[220] items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.5)] overflow-visible">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-slate-400">Workspace</p>
          <h2 className="text-lg font-black text-slate-900 leading-tight">{tabMeta[activeTab]?.title || 'Painel da loja'}</h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{tabMeta[activeTab]?.subtitle || 'Operação centralizada da loja.'}</p>
        </div>
        <div className="relative z-[260] flex items-center gap-2 shrink-0" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className={`ds-focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              notificationsOpen
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            aria-label="Abrir notificações"
          >
            <Bell size={18} weight={notificationsOpen ? 'fill' : 'duotone'} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white shadow-[0_22px_48px_-26px_rgba(15,23,42,0.48)] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/80">
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">Notificações</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">Prioridades da operação em tempo real</p>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNotificationCriticalOnly((prev) => !prev)}
                      className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${
                        notificationCriticalOnly
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {notificationCriticalOnly ? 'Só críticas' : 'Todas'}
                    </button>
                    {activeNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Marcar todas como lidas
                    </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="max-h-[58vh] overflow-y-auto p-2 space-y-1.5">
                {activeNotifications.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-sm font-semibold text-emerald-700">Operação estável</p>
                    <p className="text-xs text-emerald-700/80 mt-1">Sem pendências críticas no momento.</p>
                  </div>
                ) : (
                  activeNotifications.map((note) => {
                    return (
                      <div key={note.key} className={`rounded-xl border px-3 py-2 ${notificationToneClass(note.tone)}`}>
                        <div className="flex items-start gap-2">
                          <WarningCircle size={16} weight="duotone" className="mt-0.5 text-slate-600" />
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-800">{note.title}</p>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">{notificationRelativeTime(note.generatedAt)}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{note.description}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  note.action();
                                  setNotificationsOpen(false);
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                {note.actionLabel}
                              </button>
                              <button
                                type="button"
                                onClick={() => markNotificationRead(note.key)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Marcar lida
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {storeSlug && (
            <button
              type="button"
              onClick={() => openQueueMonitor()}
              className="ds-focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Monitor de pedidos
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCommandOpen(true);
              setCommandQuery('');
            }}
            className="hidden xl:inline-flex ds-focus-ring items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <MagnifyingGlass size={15} weight="duotone" />
            Buscar
            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">Ctrl K</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className="ds-focus-ring rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.7)] hover:opacity-95 transition"
          >
            Ajustes rápidos
          </button>
        </div>
      </section>

      {activeTab === 'resumo' && (
        <div className="space-y-4">
          <FormSection
            title="Avaliações e gorjetas"
            subtitle="Indicadores rápidos para acompanhar qualidade e repasse."
            variant="success"
            actions={
              <button
                type="button"
                onClick={async () => {
                  if (!storeId) return;
                  setReviewsLoading(true);
                  try {
                    const summary = await orderService.getReviewSummaryByStore(storeId);
                    const reviewsPromise = orderService.listReviewsByStore(storeId, 300).catch(() => []);
                    const payoutsPromise = canUseDeliveryReviewsAndTips
                      ? orderService.listTipPayoutsByStore(storeId, 300).catch(() => [])
                      : Promise.resolve([]);
                    const [reviews, payouts] = await Promise.all([reviewsPromise, payoutsPromise]);
                    setReviewsSummary(summary || null);
                    const reviewRows = Array.isArray(reviews) ? reviews : [];
                    setReviewsList(reviewRows);
                    const tipRows = reviewRows.filter((r: any) => Number(r?.tipAmount ?? r?.tip_amount ?? 0) > 0);
                    const paidRows = tipRows.filter((r: any) => String(r?.tipStatus ?? r?.tip_status ?? '').toUpperCase() === 'PAID');
                    const pendingRows = tipRows.filter((r: any) => String(r?.tipStatus ?? r?.tip_status ?? '').toUpperCase() === 'PENDING');
                    const paidAmount = paidRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount ?? r?.tip_amount ?? 0), 0);
                    const pendingAmount = pendingRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount ?? r?.tip_amount ?? 0), 0);
                    const tipOrders = tipRows.length;
                    const avgTipAmount = tipOrders > 0 ? (paidAmount + pendingAmount) / tipOrders : 0;
                    const payoutRows = Array.isArray(payouts) ? payouts : [];
                    const payoutPendingRows = payoutRows.filter((r: any) => String(r?.tipPayoutStatus || '').toUpperCase() !== 'PAID');
                    const payoutPaidRows = payoutRows.filter((r: any) => String(r?.tipPayoutStatus || '').toUpperCase() === 'PAID');
                    const payoutPendingAmount = payoutPendingRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount || 0), 0);
                    const payoutPaidAmount = payoutPaidRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount || 0), 0);
                    setTipsOverview({
                      paidAmount,
                      pendingAmount,
                      tipOrders,
                      paidTipOrders: paidRows.length,
                      pendingTipOrders: pendingRows.length,
                      avgTipAmount,
                      payoutPendingAmount,
                      payoutPendingCount: payoutPendingRows.length,
                      payoutPaidAmount,
                      payoutPaidCount: payoutPaidRows.length,
                    });
                  } finally {
                    setReviewsLoading(false);
                  }
                }}
                disabled={reviewsLoading}
                className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-60"
              >
                {reviewsLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            }
          >
            <div className={`grid gap-2 ${canUseDeliveryReviewsAndTips ? 'sm:grid-cols-2 xl:grid-cols-6' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] text-slate-500">Nota da loja</div>
                <div className="text-lg font-black text-slate-900">
                  {Number(reviewsSummary?.summary?.store_avg_rating || 0).toFixed(1)} ★
                </div>
                <div className="text-[11px] text-slate-500">
                  {Number(reviewsSummary?.summary?.total_reviews || 0)} avaliações
                  {Number(reviewsSummary?.summary?.total_reviews || 0) < 10 ? ' · amostra baixa' : ''}
                </div>
              </div>
              {canUseDeliveryReviewsAndTips ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] text-slate-500">Nota da entrega</div>
                    <div className="text-lg font-black text-slate-900">
                      {Number(reviewsSummary?.summary?.delivery_avg_rating || 0).toFixed(1)} ★
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {Number(reviewsSummary?.summary?.total_delivery_reviews || 0)} avaliações
                      {Number(reviewsSummary?.summary?.total_delivery_reviews || 0) < 10 ? ' · amostra baixa' : ''}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] text-emerald-700">Gorjetas pagas</div>
                    <div className="text-lg font-black text-emerald-700">{formatCurrency(tipsOverview.paidAmount || 0)}</div>
                    <div className="text-[11px] text-emerald-700/80">{tipsOverview.paidTipOrders} pagamento(s)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] text-amber-700">Gorjetas pendentes (cliente)</div>
                    <div className="text-lg font-black text-amber-700">{formatCurrency(tipsOverview.pendingAmount || 0)}</div>
                    <div className="text-[11px] text-amber-700/80">{tipsOverview.pendingTipOrders} pendente(s)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] text-orange-700">Repasse pendente (motoboy)</div>
                    <div className="text-lg font-black text-orange-700">{formatCurrency(tipsOverview.payoutPendingAmount || 0)}</div>
                    <div className="text-[11px] text-orange-700/80">{tipsOverview.payoutPendingCount} aguardando repasse</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] text-slate-500">Ticket médio gorjeta</div>
                    <div className="text-lg font-black text-slate-900">{formatCurrency(tipsOverview.avgTipAmount || 0)}</div>
                    <div className="text-[11px] text-slate-500">
                      {Number(reviewsSummary?.summary?.total_delivery_reviews || 0) > 0
                        ? `${((tipsOverview.tipOrders / Number(reviewsSummary?.summary?.total_delivery_reviews || 1)) * 100).toFixed(1)}% dos pedidos avaliados`
                        : 'Sem base de comparação'}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:col-span-1 xl:col-span-2">
                  <div className="text-[11px] text-violet-700">Avaliações de entrega e gorjetas</div>
                  <div className="text-sm font-bold text-violet-900">Disponível no plano Pro</div>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/renewal')}
                    className="mt-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Trocar assinatura
                  </button>
                </div>
              )}
            </div>
          </FormSection>

          <DashboardView
            orders={orders}
            customers={customers}
            setupChecklist={setupChecklist}
            storeUrl={storeUrl}
            storeName={storeName}
            storeLogo={brandingDraft.logoUrl}
            storeDescription={brandingDraft.description}
            linkStats={linkStats}
          />
        </div>
      )}

      <div className="pb-24 sm:pb-0">
        {activeTab === 'pedidos' && (
          <FormSection
            title="Pedidos"
            subtitle="Gestão e acompanhamento dos pedidos da loja."
            variant="primary"
            className="bg-white premium-card"
          >
            <OrdersView orders={orders} products={products} storeSlug={storeSlug} />
          </FormSection>
        )}

        {activeTab === 'avaliacoes' && (
          <FormSection
            title="Avaliações"
            subtitle="Veja nota, comentário e gorjeta por cliente."
            variant="success"
            className="bg-white premium-card"
          >
            <ReviewsView
              reviews={reviewsList}
              canUseDeliveryReviewsAndTips={canUseDeliveryReviewsAndTips}
              onUpgrade={() => navigate('/admin/renewal')}
              storeSlug={storeSlug}
            />
          </FormSection>
        )}

        {activeTab === 'produtos' && (
          <ProductManager
            products={products}
            onProductsChange={setProducts}
            storeSegment={auth?.store?.settings?.segment || 'outros'}
          />
        )}

        {activeTab === 'pagamentos' && (
          <FormSection
            title="Pagamentos"
            subtitle="Assinatura atual, ciclo e histórico financeiro."
            variant="success"
            className="bg-white premium-card"
          >
            <PaymentsView
              subscription={subscriptionDetails}
              loading={subscriptionLoading}
              error={subscriptionError}
              payments={paymentsHistory}
            />
          </FormSection>
        )}

        {activeTab === 'config' && (
          <FormSection
            title="Configurações"
            subtitle="Identidade visual, tipos de pedido e horários de funcionamento."
            variant="warning"
            className="premium-card-soft"
            contentClassName="space-y-4"
          >
            <div className="space-y-4 pb-24 sm:pb-4">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-400">Setup da loja</p>
                    <p className="text-sm font-bold text-slate-800">Organize por etapas para configurar mais rápido</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {hasBrandingChanges ? 'Alterações pendentes' : 'Tudo atualizado'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setConfigPanels((prev) => ({ ...prev, branding: true, orderTypes: false, hours: false }))}
                    className={`text-left rounded-xl border px-3 py-2 transition ${
                      configPanels.branding ? 'border-brand-primary/40 bg-brand-primary-soft' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">1. Perfil da loja</p>
                    <p className="text-[11px] text-slate-500">Marca, banner, contato e endereço</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigPanels((prev) => ({ ...prev, branding: false, orderTypes: true, hours: false }))}
                    className={`text-left rounded-xl border px-3 py-2 transition ${
                      configPanels.orderTypes ? 'border-brand-primary/40 bg-brand-primary-soft' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">2. Tipos de pedido</p>
                    <p className="text-[11px] text-slate-500">Entrega, retirada e mesa por plano</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigPanels((prev) => ({ ...prev, branding: false, orderTypes: false, hours: true }))}
                    className={`text-left rounded-xl border px-3 py-2 transition ${
                      configPanels.hours ? 'border-brand-primary/40 bg-brand-primary-soft' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">3. Horários da loja</p>
                    <p className="text-[11px] text-slate-500">Abertura e fechamento por dia</p>
                  </button>
                </div>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_12px_28px_-24px_rgba(15,23,42,0.4)]">
                <button
                  type="button"
                  onClick={() => setConfigPanels((prev) => ({ ...prev, branding: !prev.branding }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">Perfil da loja</p>
                    <p className="text-xs text-slate-500">Nome, logo, banner, cores e dados públicos.</p>
                  </div>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-transform ${
                      configPanels.branding ? 'rotate-180' : ''
                    }`}
                  >
                    <CaretRight size={14} weight="bold" />
                  </span>
                </button>
                {configPanels.branding && (
                  <div className="border-t border-slate-100 p-3 sm:p-4 bg-slate-50/40">
                    <BrandingSettings
                      branding={brandingDraft}
                      onChange={setBrandingDraft}
                      storeSlug={storeSlug}
                    />
                  </div>
                )}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_12px_28px_-24px_rgba(15,23,42,0.4)]">
                <button
                  type="button"
                  onClick={() => setConfigPanels((prev) => ({ ...prev, orderTypes: !prev.orderTypes }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">Tipos de pedido</p>
                    <p className="text-xs text-slate-500">Entrega, retirada e mesa por plano e operação.</p>
                  </div>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-transform ${
                      configPanels.orderTypes ? 'rotate-180' : ''
                    }`}
                  >
                    <CaretRight size={14} weight="bold" />
                  </span>
                </button>
                {configPanels.orderTypes && (
                  <div className="border-t border-slate-100 p-4">
                    <OrderTypeSettingsCard />
                  </div>
                )}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_12px_28px_-24px_rgba(15,23,42,0.4)]">
                <button
                  type="button"
                  onClick={() => setConfigPanels((prev) => ({ ...prev, hours: !prev.hours }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">Horários da operação</p>
                    <p className="text-xs text-slate-500">Controle dias e horários de abertura da loja.</p>
                  </div>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-transform ${
                      configPanels.hours ? 'rotate-180' : ''
                    }`}
                  >
                    <CaretRight size={14} weight="bold" />
                  </span>
                </button>
                {configPanels.hours && (
                  <div className="border-t border-slate-100 p-4">
                    <OpeningHoursCard />
                  </div>
                )}
              </section>
            </div>
            <div className="hidden sm:flex sticky bottom-3 z-40 items-center justify-between rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.45)]">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {hasBrandingChanges ? 'Alterações prontas para salvar' : 'Tudo sincronizado'}
                </p>
                <p className="text-[11px] text-slate-500">Salva os dados de perfil e identidade visual da loja.</p>
              </div>
              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={savingBranding || !hasBrandingChanges}
                className="rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.7)] hover:opacity-95 disabled:opacity-60"
              >
                {savingBranding ? 'Salvando...' : 'Salvar identidade'}
              </button>
            </div>
            <div
              className="sm:hidden fixed left-0 right-0 px-4 z-50 ds-safe-fab"
            >
              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={savingBranding || !hasBrandingChanges}
                className="w-full rounded-2xl bg-brand-gradient text-white py-4 text-sm font-semibold shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {savingBranding ? 'Salvando...' : hasBrandingChanges ? 'Salvar alterações' : 'Sem alterações pendentes'}
              </button>
            </div>
          </FormSection>
        )}

        {activeTab === 'fila' && (
          <FormSection
            title="Central de Pedidos"
            subtitle="Operação em tempo real dos pedidos da loja."
            variant="neutral"
            className="bg-white premium-card"
          >
            <GrillQueue />
          </FormSection>
        )}

        {activeTab === 'motoboys' && (
          <FormSection
            title="Entregadores"
            subtitle="Vínculos, solicitações e status dos motoboys."
            variant="primary"
            className="premium-card"
          >
            <AdminMotoboys />
          </FormSection>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>

      {!isDesktopLayout && notificationsOpen && (
        <div className="lg:hidden ds-sheet-backdrop z-[130]" onClick={() => setNotificationsOpen(false)}>
          <aside className="ds-sheet-panel rounded-t-3xl max-h-[78vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="sm:hidden ds-sheet-handle" />
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">Notificações</p>
                <p className="text-sm font-semibold text-slate-800">Prioridades da operação</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="ds-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                aria-label="Fechar notificações"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="p-4 space-y-2.5">
              {activeNotifications.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-sm font-semibold text-emerald-700">Operação estável</p>
                  <p className="text-xs text-emerald-700/80 mt-1">Sem pendências críticas no momento.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNotificationCriticalOnly((prev) => !prev)}
                      className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${
                        notificationCriticalOnly
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {notificationCriticalOnly ? 'Só críticas' : 'Todas'}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Marcar todas como lidas
                    </button>
                  </div>
                  {activeNotifications.map((note) => (
                  <div key={`mobile-${note.key}`} className={`rounded-xl border px-3 py-2.5 ${notificationToneClass(note.tone)}`}>
                    <div className="flex items-start gap-2">
                      <WarningCircle size={16} weight="duotone" className="mt-0.5 text-slate-600" />
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800">{note.title}</p>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">{notificationRelativeTime(note.generatedAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{note.description}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              note.action();
                              setNotificationsOpen(false);
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            {note.actionLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => markNotificationRead(note.key)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                          >
                            Marcar lida
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {commandOpen && (
        <div
          className="ds-sheet-backdrop z-[13000] px-4 items-center sm:items-center"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="ds-sheet-panel relative z-[13010] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sm:hidden ds-sheet-handle" />
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <MagnifyingGlass size={16} className="text-slate-500" />
                <input
                  autoFocus
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Buscar ação no painel..."
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCommandOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Esc
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommandActions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  Nenhuma ação encontrada.
                </div>
              ) : (
                filteredCommandActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.run();
                      setCommandOpen(false);
                    }}
                    className="w-full text-left rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 px-3 py-2.5 transition"
                  >
                    <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!isDesktopLayout && mobileDrawerOpen && (
        <div className="lg:hidden ds-sheet-backdrop z-[120]" onClick={() => setMobileDrawerOpen(false)}>
          <aside className="ds-sheet-panel rounded-t-3xl max-h-[78vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="sm:hidden ds-sheet-handle" />
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">Navegação</p>
                <p className="text-sm font-semibold text-slate-800">Escolha uma seção</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="ds-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                aria-label="Fechar menu"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavSelect(item.id)}
                    title={item.disabled ? 'Disponível no plano Pro · clique para upgrade' : undefined}
                    className={`ds-focus-ring flex items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    } ${item.disabled ? 'opacity-85 cursor-pointer border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100' : 'hover:bg-slate-50'}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={17} weight={isActive ? 'fill' : 'duotone'} />
                      {item.label}
                    </span>
                    {item.id === 'motoboys' && item.disabled && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-violet-100 text-violet-700'}`}>
                        Pro
                      </span>
                    )}
                    {item.id === 'motoboys' && !item.disabled && pendingMotoboyRequests > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                        {pendingMotoboyRequests}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}



