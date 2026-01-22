// @ts-nocheck
import { ChartBar, BookOpen, ChefHat, CreditCard, Package, Gear, ShoppingCart } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { BrandingSettings } from '../components/Admin/BrandingSettings';
import DashboardView from '../components/Admin/DashboardView';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { ProductManager } from '../components/Admin/ProductManager';
import { OrderTypeSettingsCard } from '../components/Admin/OrderTypeSettingsCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { subscriptionService } from '../services/subscriptionService';
import { paymentService } from '../services/paymentService';
import { formatCurrency, formatDateTime, formatOrderDisplayId, formatOrderStatus, formatOrderType } from '../utils/format';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

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
  const [ordersPageSize, setOrdersPageSize] = useState(9);
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
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
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
        const key = order.status || 'pending';
        acc[key] = (acc[key] || 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, pending: 0, preparing: 0, ready: 0, done: 0, cancelled: 0 }
    );
  }, [orders]);

  const statusStyles = (status) => {
    if (status === 'preparing') return 'bg-amber-100 text-amber-800';
    if (status === 'ready') return 'bg-sky-100 text-sky-700';
    if (status === 'done') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-600';
    return 'bg-red-100 text-red-700';
  };
  const shortId = (value) => formatOrderDisplayId(value, storeSlug);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Lista de pedidos</h2>
          <p className="text-sm text-slate-500">{filteredOrders.length} pedidos encontrados</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todos', count: statusCounts.all },
            { id: 'pending', label: 'Pendentes', count: statusCounts.pending },
            { id: 'preparing', label: 'Em preparo', count: statusCounts.preparing },
            { id: 'ready', label: 'Aguardando retirada', count: statusCounts.ready },
            { id: 'done', label: 'Finalizados', count: statusCounts.done },
            { id: 'cancelled', label: 'Cancelados', count: statusCounts.cancelled },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:-translate-y-0.5 active:scale-95 ${
                statusFilter === filter.id
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
            className="w-full sm:w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-brand-primary"
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
            className="w-full sm:w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, telefone ou pedido (ex: 89035f7b)"
            className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8">
            <div className="text-4xl">🧾</div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum pedido por aqui ainda.</p>
            <p className="text-xs text-slate-500 mt-1">
              Assim que entrarem pedidos, eles aparecem aqui com status e detalhes.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pagedOrders.map((order, index) => (
            <div
              key={order.id || `${order.customerName}-${index}`}
              className="border border-slate-200 rounded-3xl bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 font-semibold">
                      Pedido #{shortId(order.id)}
                    </span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      {formatOrderType(order.type)}
                      {order.table ? ` · Mesa ${order.table}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles(order.status)}`}>
                    {formatOrderStatus(order.status)}
                  </span>
                  <span className="text-sm font-bold text-brand-primary">
                    {formatCurrency(order.total || 0)}
                  </span>
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
                  <p className="font-semibold text-slate-700">{order.address || '-'}</p>
                </div>
              </div>

              {(order.items || []).length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs uppercase text-slate-400 mb-2">Itens</p>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
                    {order.items.map((item) => {
                      const quantity = item.qty ?? item.quantity ?? 1;
                      const image =
                        item.imageUrl || productsById.get(item.productId || item.id)?.imageUrl || '';
                      return (
                        <div key={item.id || item.name} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
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
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {quantity}x {item.name}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
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
                          <span className="font-semibold">
                            {formatCurrency((item.unitPrice ?? item.price ?? 0) * quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredOrders.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo {ordersStart}-{ordersEnd} de {filteredOrders.length}
                </span>
                <span>Pagina {ordersPage} de {ordersTotalPages}</span>
                <label className="flex items-center gap-2">
                  <span>Por pagina</span>
                  <select
                    value={ordersPageSize}
                    onChange={(event) => setOrdersPageSize(Number(event.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-brand-primary"
                  >
                    {[5, 9, 12, 15].map((size) => (
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

const PaymentsView = ({ subscription, loading, error, payments }) => {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const plan = subscription?.plan;
  const planLabel = plan?.displayName || plan?.name || 'Plano não identificado';
  const priceValue = subscription?.latestPaymentAmount ?? plan?.price ?? 0;
  const methodMeta = getPaymentMethodMeta(subscription?.paymentMethod);
  const expiresLabel = subscription?.endDate ? formatDateTime(subscription.endDate) : '—';
  const resolveDaysUntil = (value) => {
    if (!value) return null;
    const end = new Date(value).getTime();
    if (!Number.isFinite(end)) return null;
    const diffDays = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const expiresInDays = resolveDaysUntil(subscription?.endDate);
  const expiresHint =
    typeof expiresInDays === 'number'
      ? expiresInDays > 1
        ? `em ${expiresInDays} dias`
        : expiresInDays === 1
        ? 'em 1 dia'
        : expiresInDays === 0
        ? 'expira hoje'
        : `expirado há ${Math.abs(expiresInDays)} dia${Math.abs(expiresInDays) === 1 ? '' : 's'}`
      : '';
  const rawStatus = (subscription?.status || '').toUpperCase();
  const statusMap: Record<string, { label: string; tone: string }> = {
    TRIAL: { label: 'Trial ativo (7 dias)', tone: 'bg-emerald-100 text-emerald-700' },
    ACTIVE: { label: 'Assinatura ativa', tone: 'bg-emerald-100 text-emerald-700' },
    PENDING: { label: 'Aguardando pagamento', tone: 'bg-amber-100 text-amber-700' },
    EXPIRED: { label: 'Assinatura expirada', tone: 'bg-rose-100 text-rose-700' },
    SUSPENDED: { label: 'Assinatura suspensa', tone: 'bg-rose-100 text-rose-700' },
    CANCELLED: { label: 'Assinatura cancelada', tone: 'bg-slate-100 text-slate-600' },
  };
  const statusLabel = statusMap[rawStatus]?.label || subscription?.status || '—';
  const statusTone = statusMap[rawStatus]?.tone || 'bg-slate-100 text-slate-600';
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
    rawStatus === 'TRIAL'
      ? 'Sem cobranca durante o trial'
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

  if (loading) {
    return <div className="py-8 text-sm text-slate-500">Carregando dados de pagamento...</div>;
  }

  if (error) {
    return <div className="py-4 text-sm text-red-600">{error}</div>;
  }

  if (!subscription) {
    return <div className="py-8 text-sm text-slate-500">Nenhuma assinatura encontrada.</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.45)] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Plano atual</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">{planLabel}</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone}`}>
            {statusLabel}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Valor</p>
            <p className="text-lg font-semibold text-slate-900 mt-2">{formatCurrency(priceValue)}</p>
            <p className="text-xs text-slate-500 mt-1">Plano {plan?.billingCycle || 'mensal'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)] space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Ciclo</p>
          <h3 className="text-lg font-bold text-slate-900 mt-2">Próximo vencimento</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Expira em</p>
          <p className="text-lg font-semibold text-slate-900 mt-2">{expiresLabel}</p>
          {expiresHint && (
            <p className="text-xs font-semibold text-slate-600 mt-1">{expiresHint}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Ultimo pagamento: {paidAtLabel}</p>
        </div>
        {Array.isArray(payments) && payments.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Historico de pagamentos</p>
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
                .map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    {(() => {
                      const paymentMeta = getPaymentMethodMeta(payment.method);
                      const providerMeta = getPaymentProviderMeta(payment.provider);
                      const normalizedStatus = (payment.status || '').toUpperCase();
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
              ))}
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
  const { auth, hydrated, setAuth } = useAuth();
  const { branding, setBranding } = useTheme();
  const { showToast } = useToast();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pedidos' | 'produtos' | 'config' | 'fila' | 'pagamentos'>(() => {
    return (location.state as any)?.activeTab || 'resumo';
  });
  const [menuVisible, setMenuVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('adminHeader:visible') !== 'false';
  });

  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
  const storeUrl = storeSlug ? `https://www.chamanoespeto.com.br/${storeSlug}` : '';
  const storeName = session?.store?.name || 'Chama no Espeto';
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const whatsappNumber = session?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const [brandingDraft, setBrandingDraft] = useState(() => ({
    brandName: session?.store?.name || '',
    logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
    logoFile: '',
    description: session?.store?.settings?.description || '',
    primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
    secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
    pixKey: session?.store?.settings?.pixKey || '',
    contactEmail: session?.store?.settings?.contactEmail || '',
    promoMessage: session?.store?.settings?.promoMessage || '',
    instagram: instagramHandle?.replace('@', '') || '',
  }));
  const [savingBranding, setSavingBranding] = useState(false);

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


  /* =========================
   * PROTEÇÃO DE ROTA (ADMIN)
   * ========================= */
  useEffect(() => {
    console.count('AdminDashboard guard effect');
    if (!hydrated) return;

    if (!session?.token || session?.user?.role !== 'ADMIN' || !session?.store) {
      navigate('/admin');
      return;
    }

  }, [hydrated, navigate, session?.store, session?.token, session?.user?.role]);

  useEffect(() => {
    setBrandingDraft({
      brandName: session?.store?.name || '',
      logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
      logoFile: '',
      description: session?.store?.settings?.description || '',
      primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
      secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
      pixKey: session?.store?.settings?.pixKey || '',
      contactEmail: session?.store?.settings?.contactEmail || '',
      promoMessage: session?.store?.settings?.promoMessage || '',
      instagram: instagramHandle?.replace('@', '') || '',
    });
  }, [
    session?.store?.name,
    session?.store?.settings?.logoUrl,
    session?.store?.settings?.description,
    session?.store?.settings?.primaryColor,
    session?.store?.settings?.secondaryColor,
    session?.store?.settings?.pixKey,
    session?.store?.settings?.contactEmail,
    session?.store?.settings?.promoMessage,
    instagramHandle,
  ]);

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
        if (active) setSubscriptionDetails(data);
      } catch (err) {
        if (active) {
          setSubscriptionError(err.message || 'Não foi possível carregar a assinatura.');
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
    const handleToggle = (event) => {
      const next = event?.detail?.visible;
      if (typeof next === 'boolean') {
        setMenuVisible(next);
      }
    };
    window.addEventListener('adminHeader:toggle', handleToggle as EventListener);
    return () => window.removeEventListener('adminHeader:toggle', handleToggle as EventListener);
  }, []);


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
    return <div style={{ padding: 24 }}>Carregando painel da loja...</div>;
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
      label: 'Produtos no cardápio',
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
        logoUrl: brandingDraft.logoFile ? undefined : brandingDraft.logoUrl || undefined,
        description: brandingDraft.description || undefined,
        primaryColor: brandingDraft.primaryColor,
        secondaryColor: brandingDraft.secondaryColor,
        pixKey: brandingDraft.pixKey?.trim() ?? '',
        contactEmail: brandingDraft.contactEmail?.trim() ?? '',
        promoMessage: brandingDraft.promoMessage?.trim() ?? '',
        socialLinks: brandingDraft.instagram ? [{ type: 'instagram', value: brandingDraft.instagram }] : [],
      };
      const updated = await storeService.update(storeId, payload);
      updateAuthStore(updated);
      setBranding({
        primaryColor: updated?.settings?.primaryColor,
        secondaryColor: updated?.settings?.secondaryColor,
        logoUrl: updated?.settings?.logoUrl,
        brandName: updated?.name,
      });
      showToast('Identidade salva com sucesso', 'success');
    } catch (err) {
      console.error('Erro ao salvar identidade', err);
      setError('Não foi possível salvar a identidade da loja.');
      showToast('Não foi possível salvar a identidade da loja', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <AdminLayout contextLabel="Painel da Loja">
      {menuVisible ? (
        <div className="flex justify-center">
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex flex-wrap sm:flex-nowrap justify-center sm:justify-start gap-2 w-full max-w-5xl overflow-visible sm:overflow-x-auto no-scrollbar">
          {[
            { id: 'resumo', label: 'Resumo', shortLabel: 'Resumo', icon: ChartBar },
            { id: 'pedidos', label: 'Pedidos', shortLabel: 'Pedidos', icon: ShoppingCart },
            { id: 'produtos', label: 'Produtos', shortLabel: 'Produtos', icon: Package },
            { id: 'pagamentos', label: 'Pagamentos', shortLabel: 'Pag.', icon: CreditCard },
            { id: 'cardapio', label: 'Cardápio', shortLabel: 'Cardápio', icon: BookOpen },
            { id: 'config', label: 'Configurações', shortLabel: 'Config', icon: Gear },
            { id: 'fila', label: 'Fila do churrasqueiro', shortLabel: 'Fila', icon: ChefHat },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'cardapio') {
                    if (storeSlug) navigate(`/${storeSlug}`);
                    return;
                  }
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`cursor-pointer px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-all active:scale-95 hover:-translate-y-0.5 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center min-w-[96px] sm:min-w-0 border ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white border-brand-primary ring-2 ring-brand-primary/25 shadow-[0_8px_18px_rgba(15,23,42,0.16)]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
                }`}
              >
                <Icon size={16} weight="duotone" />
                <span className="leading-tight text-center max-w-[90px] sm:max-w-none line-clamp-2">
                  {tab.label}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      ) : null}

      {activeTab === 'resumo' && (
        <DashboardView
          orders={orders}
          customers={customers}
          setupChecklist={setupChecklist}
          storeUrl={storeUrl}
          storeName={storeName}
        />
      )}

      {activeTab === 'pedidos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <OrdersView orders={orders} products={products} storeSlug={storeSlug} />
        </div>
      )}

      {activeTab === 'produtos' && (
        <ProductManager products={products} onProductsChange={setProducts} />
      )}

      {activeTab === 'pagamentos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <PaymentsView
            subscription={subscriptionDetails}
            loading={subscriptionLoading}
            error={subscriptionError}
            payments={paymentsHistory}
          />
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          <BrandingSettings
            branding={brandingDraft}
            onChange={setBrandingDraft}
            storeSlug={storeSlug}
            onSave={handleSaveBranding}
            saving={savingBranding}
          />
          <OrderTypeSettingsCard />
          <OpeningHoursCard />
        </div>
      )}

      {activeTab === 'fila' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <GrillQueue />
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </AdminLayout>
  );
}
