// @ts-nocheck
import * as React from 'react';
import { ChartBar, BookOpen, Buildings, CheckSquare, ClipboardText, Clock, Compass, CreditCard, Package, Gear, X, Scooter, Hash, Storefront, Truck, CaretRight, Star, Bell, WarningCircle, MagnifyingGlass, UsersThree, PlugsConnected, CheckCircle, SealCheck, ShieldCheck, Printer, Stack, Sparkle, ChatCircle, ForkKnife, IdentificationCard } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { BrandingSettings } from '../components/Admin/BrandingSettings';
import { StoreCondominiumPanel } from '../components/Admin/StoreCondominiumPanel';
import { StoreDestinationPanel } from '../components/Admin/StoreDestinationPanel';
import DashboardView from '../components/Admin/DashboardView';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { ProductManager } from '../components/Admin/ProductManager';
import { InventoryManager } from '../components/Admin/InventoryManager';
import { OrderTypeSettingsCard } from '../components/Admin/OrderTypeSettingsCard';
import { ThermalPrinterSettingsCard } from '../components/Admin/ThermalPrinterSettingsCard';
import { DevicePermissionsCard } from '../components/Admin/DevicePermissionsCard';
import { Button } from '../components/ui/Button';
import { StoreUsersPanel } from '../components/Admin/StoreUsersPanel';
import { AdminMotoboys } from './AdminMotoboys';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { subscriptionService } from '../services/subscriptionService';
import { paymentService } from '../services/paymentService';
import { deliveryBillingService } from '../services/deliveryBillingService';
import { motoboyAdminService } from '../services/motoboyAdminService';
import { formatAddress, formatCurrency, formatDateTime, formatOrderDisplayId, formatOrderStatus, formatOrderType } from '../utils/format';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatSelectedModifiers } from '../utils/productModifiers';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { FormSection } from '../components/common/FormSection';
import { PremiumSelect } from '../components/common/PremiumSelect';
import { AppRobotLoader } from '../components/common/AppRobotLoader';
import { AdminDesktopSidebar } from '../components/Admin/AdminDesktopSidebar';
import { PaymentAuditPanel } from '../components/Admin/PaymentAuditPanel';
import { PaymentTechnicalModal } from '../components/Admin/PaymentTechnicalModal';
import { AccountMfaPanel } from '../components/Auth/AccountMfaPanel';
import mercadoPagoLogo from '../assets/mercado-pago-logo.svg';

const formatPlanCycle = (days: number) => {
  if (!Number.isFinite(days)) return '—';
  if (days >= 360) return 'Anual';
  if (days >= 30) return 'Mensal';
  return `${days} dias`;
};

const OrdersView = ({ orders, products, storeSlug, storeId, canViewTechnical, showToast }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);
  const [selectedOrderAudit, setSelectedOrderAudit] = useState<any>(null);
  const [technicalOrderLabel, setTechnicalOrderLabel] = useState('');
  const [technicalModalOpen, setTechnicalModalOpen] = useState(false);
  const [loadingAuditOrderId, setLoadingAuditOrderId] = useState('');
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
      return { label: table, pill: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Hash size={14} weight="duotone" /> };
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
    const itemCount = (order?.items || []).reduce(
      (sum: number, item: any) => sum + Number(item?.qty ?? item?.quantity ?? 1),
      0
    );
    return { total, fee: safeFee, itemsTotal, itemCount };
  };
  const groupOrderItems = (items: any[] = []) => {
    const map = new Map<string, any>();
    items.forEach((item: any) => {
      const qty = Number(item?.qty ?? item?.quantity ?? 1);
      const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0);
      const mods = formatSelectedModifiers(item?.selectedModifiers || []).join('|');
      const key = [
        String(item?.productId || item?.id || item?.name || ''),
        String(item?.name || ''),
        String(item?.cookingPoint || ''),
        item?.passSkewer ? '1' : '0',
        mods,
        String(unitPrice),
      ].join('::');
      if (!map.has(key)) {
        map.set(key, { ...item, qty: 0, unitPrice });
      }
      const current = map.get(key);
      current.qty = Number(current.qty || 0) + qty;
      map.set(key, current);
    });
    return Array.from(map.values());
  };
  const renderMoneyBreakdown = (order: any) => {
    const money = getOrderMoney(order);
    return (
      <div className="mt-2 w-full sm:mt-0 sm:w-auto">
        <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] font-semibold sm:flex-nowrap sm:justify-end">
          <span className="flex flex-col whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
            <span className="text-slate-500">Volume</span>
            <span className="text-slate-800">
              {money.itemCount} item{money.itemCount === 1 ? '' : 's'}
            </span>
          </span>
          <span className="flex flex-col whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2 py-1.5">
            <span className="text-slate-500">Frete</span>
            <span className="text-slate-800">{money.fee > 0 ? formatCurrency(money.fee) : '—'}</span>
          </span>
          <span className="flex flex-col whitespace-nowrap rounded-xl border border-brand-primary/20 bg-brand-primary-soft px-2 py-1.5">
            <span className="text-slate-500">Total</span>
            <span className="text-brand-primary font-extrabold">{formatCurrency(money.total)}</span>
          </span>
        </div>
      </div>
    );
  };

  const loadTechnicalAudit = async (order: any) => {
    const orderId = String(order?.id || '').trim();
    if (!orderId) return;
    setLoadingAuditOrderId(orderId);
    try {
      const payload = await orderService.getPaymentAudit(orderId, storeId);
      setSelectedOrderAudit(payload || null);
      setTechnicalOrderLabel(shortId(orderId));
      setTechnicalModalOpen(true);
    } catch (error: any) {
      if (showToast) {
        showToast(error?.message || 'Não foi possível carregar os detalhes técnicos do pagamento agora.', 'warning');
      }
    } finally {
      setLoadingAuditOrderId('');
    }
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
            { id: 'preparing', label: 'Em Preparação', count: statusCounts.preparing },
            { id: 'ready', label: 'Prontos', count: statusCounts.ready },
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
          <PremiumSelect
            value={periodFilter}
            onChange={(nextValue) => setPeriodFilter(nextValue)}
            className="w-full sm:w-36"
            options={[
              { value: 'all', label: 'Todo período' },
              { value: '7', label: 'Últimos 7 dias' },
              { value: '30', label: 'Últimos 30 dias' },
              { value: '90', label: 'Últimos 90 dias' },
            ]}
          />
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
                {(() => {
                  const groupedItems = groupOrderItems(order.items || []);
                  return (
                    <>
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
	                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
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

              {order?.onlinePayment && (
                <PaymentAuditPanel
                  summary={order.onlinePayment}
                  showTechnicalButton={Boolean(canViewTechnical)}
                  technicalLoading={loadingAuditOrderId === String(order?.id || '')}
                  onTechnicalClick={() => loadTechnicalAudit(order)}
                />
              )}

              {groupedItems.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs uppercase text-slate-400 mb-2">Itens</p>
                  <div className="grid sm:grid-cols-2 gap-2.5 text-sm text-slate-700">
                    {groupedItems.map((item, itemIndex) => {
                      const quantity = item.qty ?? item.quantity ?? 1;
                      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                      const subtotal = unitPrice * quantity;
                      const image =
                        item.imageUrl || productsById.get(item.productId || item.id)?.imageUrl || '';
                      return (
                        <div
                          key={`${item.id || item.productId || item.name || 'item'}-${itemIndex}`}
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
                    </>
                  );
                })()}
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
                  <PremiumSelect
                    value={String(ordersPageSize)}
                    onChange={(nextValue) => setOrdersPageSize(Number(nextValue))}
                    className="w-[110px]"
                    options={[10, 20, 30].map((size) => ({ value: String(size), label: String(size) }))}
                  />
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
      <PaymentTechnicalModal
        open={technicalModalOpen}
        title={technicalOrderLabel ? `Detalhes técnicos do pedido #${technicalOrderLabel}` : 'Detalhes técnicos do pagamento'}
        audit={selectedOrderAudit}
        onClose={() => setTechnicalModalOpen(false)}
      />
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
              <PremiumSelect
                value={String(pageSize)}
                onChange={(nextValue) => setPageSize(Number(nextValue))}
                className="w-[128px]"
                options={[10, 20, 30].map((size) => ({ value: String(size), label: `${size}/página` }))}
              />
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

const GatewayView = ({ storeId }) => {
  const location = useLocation();
  const [mpAccount, setMpAccount] = useState<any>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpActionLoading, setMpActionLoading] = useState(false);
  const oauthResult = useMemo(
    () => String(new URLSearchParams(location.search || '').get('paymentAccount') || '').trim().toLowerCase(),
    [location.search]
  );

  const loadMpAccount = useCallback(() => {
    if (!storeId) return;
    let cancelled = false;
    setMpLoading(true);
    storeService
      .getMercadoPagoAccount(storeId)
      .then((data) => { if (!cancelled) setMpAccount(data); })
      .catch(() => { if (!cancelled) setMpAccount(null); })
      .finally(() => { if (!cancelled) setMpLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  useEffect(() => {
    return loadMpAccount();
  }, [loadMpAccount]);

  // Após retorno do OAuth, recarregar status e limpar parâmetro da URL
  useEffect(() => {
    if (!oauthResult) return;
    loadMpAccount();
    const url = new URL(window.location.href);
    url.searchParams.delete('paymentAccount');
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', url.toString());
  }, [oauthResult]);

  const isConnected = Boolean(!mpLoading && mpAccount?.connected);
  const oauthMissing = mpAccount?.oauthConfigured === false;
  const validation = mpAccount?.validation || null;
  const gatewayState = mpLoading
    ? 'loading'
    : !isConnected
      ? oauthMissing ? 'pending' : 'available'
      : validation?.overallStatus === 'READY'
        ? 'ready'
        : validation?.overallStatus === 'LIMITED'
          ? 'limited'
          : validation?.overallStatus === 'ERROR'
            ? 'error'
            : 'connected';
  const stateTone =
    gatewayState === 'ready'
      ? {
          badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
          dot: 'bg-emerald-500',
          panel: 'border-emerald-100 bg-emerald-50/70',
          text: 'text-emerald-950',
          body: 'text-emerald-800/80',
        }
      : gatewayState === 'limited' || gatewayState === 'pending'
        ? {
            badge: 'bg-amber-50 text-amber-700 ring-amber-200',
            dot: 'bg-amber-500',
            panel: 'border-amber-100 bg-amber-50/70',
            text: 'text-amber-950',
            body: 'text-amber-800/80',
          }
        : gatewayState === 'error'
          ? {
              badge: 'bg-rose-50 text-rose-700 ring-rose-200',
              dot: 'bg-rose-500',
              panel: 'border-rose-100 bg-rose-50/70',
              text: 'text-rose-950',
              body: 'text-rose-800/80',
            }
          : {
              badge: 'bg-slate-50 text-slate-600 ring-slate-200',
              dot: 'bg-slate-400',
              panel: 'border-slate-200 bg-slate-50/80',
              text: 'text-slate-900',
              body: 'text-slate-500',
            };

  const paymentCapabilities = [
    {
      label: 'Pix',
      detail: validation?.pix?.detail || 'Cobrança instantânea com QR e Pix copia e cola.',
      available: Boolean(validation?.pix?.available),
      methods: validation?.pix?.methods || [],
    },
    {
      label: 'Crédito',
      detail: validation?.credit?.detail || 'Checkout seguro para cartão de crédito.',
      available: Boolean(validation?.credit?.available),
      methods: validation?.credit?.methods || [],
    },
    {
      label: 'Débito',
      detail: validation?.debit?.detail || 'Cobrança direta quando o método estiver ativo na conta.',
      available: Boolean(validation?.debit?.available),
      methods: validation?.debit?.methods || [],
    },
    { label: 'Manual', detail: 'Fallback imediato quando a loja optar pelo fluxo convencional.', available: true, methods: [] },
  ];

  const accountHeadline = mpLoading
    ? 'Verificando conexão'
    : !isConnected
      ? 'Nenhuma conta conectada'
      : gatewayState === 'ready'
        ? 'Conta conectada e validada'
        : gatewayState === 'limited'
          ? 'Conta conectada com ajustes pendentes'
          : gatewayState === 'error'
            ? 'Conta conectada, mas a validação falhou'
            : 'Conta Mercado Pago conectada';

  const accountDescription = !isConnected
    ? 'Conecte uma conta para liberar checkout online sem mudar a rotina dos pedidos manuais.'
    : gatewayState === 'ready'
      ? 'Pix, crédito e débito apareceram como meios ativos na validação automática desta conta.'
      : gatewayState === 'limited'
        ? 'A conta autorizou o acesso, mas alguns meios ainda precisam ser habilitados dentro do Mercado Pago.'
        : gatewayState === 'error'
          ? 'A conta conectou, porém não foi possível validar os meios automaticamente agora.'
          : 'A conta está conectada. Use a validação automática para confirmar os meios ativos.';

  return (
    <div className="space-y-4">
      <div className={`overflow-hidden rounded-[1.35rem] border shadow-[0_24px_70px_-46px_rgba(15,23,42,0.34)] ${
        isConnected ? 'border-[#009ee3]/25 bg-[linear-gradient(145deg,#ffffff_0%,#f4fbff_48%,#ffffff_100%)]' : 'border-slate-200 bg-white'
      }`}>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] lg:gap-6">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_34px_-28px_rgba(15,23,42,0.38)]">
                  <img src={mercadoPagoLogo} alt="Mercado Pago" className="h-8 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pagamentos Online</p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">Mercado Pago</h3>
                  <p className="mt-1 text-xs text-slate-500">Pix, crédito e débito com recebimento na conta da loja.</p>
                </div>
              </div>

              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${stateTone.badge}`}>
                <span className={`h-2 w-2 rounded-full ${mpLoading ? 'animate-pulse' : ''} ${stateTone.dot}`} />
                {mpLoading
                  ? 'Verificando'
                  : gatewayState === 'ready'
                    ? 'Validado'
                    : gatewayState === 'limited'
                      ? 'Revisar'
                      : gatewayState === 'error'
                        ? 'Erro'
                        : oauthMissing
                          ? 'Pendente'
                          : isConnected
                            ? 'Conectado'
                            : 'Disponível'}
              </span>
            </div>

            {oauthResult === 'connected' && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs font-semibold text-sky-700">
                Conexão concluída. O painel está validando quais meios dessa conta realmente estão prontos para uso.
              </div>
            )}

            {oauthResult === 'error' && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-xs font-semibold text-rose-700">
                O retorno do Mercado Pago falhou. Tente conectar novamente no mesmo navegador.
              </div>
            )}

            <div className={`rounded-2xl border px-4 py-4 ${stateTone.panel}`}>
              <div className="flex gap-3">
                {gatewayState === 'ready' ? (
                  <SealCheck size={24} weight="duotone" className="mt-0.5 shrink-0 text-emerald-600" />
                ) : gatewayState === 'limited' || oauthMissing ? (
                  <WarningCircle size={24} weight="duotone" className="mt-0.5 shrink-0 text-amber-600" />
                ) : gatewayState === 'error' ? (
                  <WarningCircle size={24} weight="duotone" className="mt-0.5 shrink-0 text-rose-600" />
                ) : (
                  <PlugsConnected size={24} weight="duotone" className="mt-0.5 shrink-0 text-[#009ee3]" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-black ${stateTone.text}`}>
                    {gatewayState === 'ready'
                      ? 'Cobrança online validada'
                      : gatewayState === 'limited'
                        ? 'Conta conectada, mas precisa de ajustes'
                        : gatewayState === 'error'
                          ? 'Validação automática indisponível'
                          : oauthMissing
                            ? 'Conexão Mercado Pago pendente'
                            : 'Pronto para conectar'}
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${stateTone.body}`}>
                    {gatewayState === 'ready'
                      ? 'Novos pedidos podem usar cobrança online e o valor segue para a conta Mercado Pago conectada.'
                      : gatewayState === 'limited'
                        ? 'A autorização foi concluída, mas a conta ainda precisa habilitar os meios apontados abaixo antes de depender do checkout online.'
                      : gatewayState === 'error'
                        ? 'A conta está conectada, porém a validação automática não conseguiu confirmar os meios disponíveis.'
                      : oauthMissing
                        ? 'A conexão ainda precisa ser configurada no servidor. Enquanto isso, a loja segue no modo convencional.'
                        : 'Ao conectar, o cliente paga no fluxo do pedido e a operação continua com fallback manual quando necessário.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {paymentCapabilities.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} weight="duotone" className={item.available ? 'text-emerald-500' : 'text-slate-300'} />
                    <span className="text-xs font-black text-slate-800">{item.label}</span>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-400">{item.detail}</p>
                  {item.methods?.length ? (
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">{item.methods.slice(0, 2).join(' · ')}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {Array.isArray(validation?.notes) && validation.notes.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pontos de atenção</p>
                <div className="mt-3 space-y-2">
                  {validation.notes.map((note: string, index: number) => (
                    <div key={`${note}-${index}`} className="flex gap-2 text-xs text-slate-600">
                      <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-200/80 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Status da conta</p>
              <div className="mt-3 flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  gatewayState === 'ready'
                    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                    : gatewayState === 'limited'
                      ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'
                      : gatewayState === 'error'
                        ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                        : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                }`}>
                  {gatewayState === 'ready' ? <SealCheck size={20} weight="duotone" /> : <CreditCard size={20} weight="duotone" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{accountHeadline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{accountDescription}</p>
                  {validation?.checkedAt ? (
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">
                      Validado em {formatDateTime(validation.checkedAt)}
                      {validation?.credentialMode === 'production'
                        ? ' · Produção'
                        : validation?.credentialMode === 'test'
                          ? ' · Teste'
                          : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              {!isConnected ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={!storeId || mpActionLoading || oauthMissing}
                    onClick={async () => {
                      if (!storeId) return;
                      setMpActionLoading(true);
                      try {
                        const canonicalOrigin = window.location.origin.replace('https://www.', 'https://');
                        const data = await storeService.createMercadoPagoConnectUrl(storeId, `${canonicalOrigin}${window.location.pathname}`);
                        if (data?.authUrl) window.location.href = data.authUrl;
                      } finally {
                        setMpActionLoading(false);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(0,158,227,0.75)] transition hover:bg-[#008dcc] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlugsConnected size={18} weight="duotone" />
                    {mpActionLoading ? 'Abrindo Mercado Pago...' : 'Conectar Mercado Pago'}
                  </button>
                  {!oauthMissing && (
                    <p className="text-center text-[11px] text-slate-400">Autorização feita no ambiente seguro do Mercado Pago.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Gerenciar conexão</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Ao desconectar, novos pedidos voltam automaticamente ao modo convencional.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!storeId || mpActionLoading}
                    onClick={async () => {
                      if (!storeId) return;
                      setMpActionLoading(true);
                      try {
                        const data = await storeService.disconnectMercadoPago(storeId);
                        setMpAccount(data);
                      } finally {
                        setMpActionLoading(false);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-black text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <X size={17} weight="bold" />
                    {mpActionLoading ? 'Desconectando...' : 'Desconectar gateway'}
                  </button>
                  <button
                    type="button"
                    disabled={!storeId || mpLoading || mpActionLoading}
                    onClick={() => {
                      loadMpAccount();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Clock size={17} weight="duotone" />
                    {mpLoading ? 'Atualizando...' : 'Validar novamente'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentsView = ({
  subscription,
  loading,
  error,
  payments,
  deliveryBillingCycle,
  deliveryBillingLoading,
  deliveryBillingError,
  deliveryBillingActionLoading,
  onOpenDeliveryBillingPayment,
}) => {
  const navigate = useNavigate();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const planSectionRef = useRef<HTMLDivElement | null>(null);
  const summarySectionRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const isVip = Boolean(subscription?.planExempt) || subscription?.plan?.name === 'vip';
  const plan = subscription?.plan;
  const planName = String(plan?.name || '').toLowerCase();
  const isBasicPlan = !isVip && planName.includes('basic');
  const rawStatus = (subscription?.status || '').toUpperCase();
  const isTrial = !isVip && rawStatus === 'TRIAL';
  const founderVipPromotion =
    subscription?.founderVipPromotion ||
    subscription?.store?.settings?.acquisitionAttribution?.founderVipPromotion ||
    null;
  const isFounderVipTrial = Boolean(isTrial && founderVipPromotion?.applied);
  const planLabel = isVip
    ? subscription?.plan?.displayName || subscription?.planExemptLabel || 'Cliente VIP'
    : isFounderVipTrial
    ? 'VIP fundador - 3 meses grátis'
    : plan?.displayName || plan?.name || 'Plano não identificado';
  const priceValue = isVip || isTrial ? 0 : (subscription?.latestPaymentAmount ?? plan?.price ?? 0);
  const methodMeta = isVip
    ? { label: 'Isento de plano', icon: null }
    : isTrial
    ? { label: 'Sem cobrança no período grátis', icon: null }
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
  const statusMap: Record<string, { label: string; tone: string; accent: string }> = {
    TRIAL: {
      label: isFounderVipTrial ? 'VIP fundador ativo' : 'Trial ativo',
      tone: 'bg-emerald-100 text-emerald-700',
      accent: 'border-l-emerald-400 bg-white',
    },
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
      : isFounderVipTrial
      ? 'Sem cobrança durante a campanha fundador'
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
    <div className="space-y-3">
      {!deliveryBillingLoading && deliveryBillingCycle && String(deliveryBillingCycle?.paymentStatus || '').toUpperCase() !== 'PAID' && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-[0_18px_40px_-32px_rgba(245,158,11,0.4)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Taxa de entregas pendente</p>
              <h3 className="mt-1 text-base font-black text-amber-950">
                Regularize este ciclo sem travar o checkout da loja
              </h3>
              <p className="mt-1 text-sm text-amber-900/80">
                Esta cobrança é interna da operação. O cliente continua comprando, mas o dono da loja precisa acompanhar este ciclo no painel.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-amber-900/80">
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1">
                  Status: {String(deliveryBillingCycle?.status || 'PENDING_PAYMENT').replace(/_/g, ' ')}
                </span>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1">
                  Total: {formatCurrency(Number(deliveryBillingCycle?.totalDue || 0))}
                </span>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1">
                  Entregas: {Number(deliveryBillingCycle?.deliveryCount || 0)}
                </span>
                {deliveryBillingCycle?.endDate && (
                  <span className="rounded-full border border-amber-200 bg-white px-3 py-1">
                    Fechamento: {formatDateTime(deliveryBillingCycle.endDate)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenDeliveryBillingPayment}
              disabled={deliveryBillingActionLoading}
              className="btn-press rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-black text-amber-800 shadow-[0_16px_32px_-24px_rgba(245,158,11,0.55)] hover:bg-amber-100 disabled:opacity-60"
            >
              {deliveryBillingActionLoading
                ? 'Abrindo cobrança...'
                : deliveryBillingCycle?.paymentLink
                ? 'Abrir cobrança'
                : 'Gerar cobrança'}
            </button>
          </div>
          {deliveryBillingError ? (
            <p className="mt-3 text-xs font-semibold text-amber-800/80">{deliveryBillingError}</p>
          ) : null}
        </div>
      )}

      <div className="md:hidden sticky top-2 z-20 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-sm">
        <p className="text-[10px] font-black tracking-[0.18em] uppercase text-slate-500">Acesso rápido</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="btn-press rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-extrabold text-sky-800"
          >
            Assinatura
          </button>
          <button
            type="button"
            onClick={() => summarySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="btn-press rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"
          >
            Resumo
          </button>
          <button
            type="button"
            onClick={() => historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="btn-press rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-700"
          >
            Histórico
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div
        ref={planSectionRef}
        className={`scroll-mt-24 rounded-3xl border border-slate-200 border-l-4 ${statusAccent} p-4 sm:p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.45)] space-y-6`}
      >
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
              {isVip
                ? 'Sem cobranca e sem vencimento'
                : isTrial
                ? 'Sem cobrança durante o período grátis'
                : `Plano ${plan?.billingCycle || 'mensal'}`}
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

      <div className="rounded-3xl border border-slate-200 border-l-4 border-l-slate-300 bg-white p-4 sm:p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)] space-y-4">
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
          <div ref={summarySectionRef} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-3">
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
          <div ref={historySectionRef} className="scroll-mt-24 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
            <div className="mt-3 md:hidden">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn-press w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Voltar ao topo
              </button>
            </div>
          </div>
        )}
      </div>
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
  const { auth, setAuth, logout } = useAuth();
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
  const [deliveryBillingCycle, setDeliveryBillingCycle] = useState<any>(null);
  const [deliveryBillingError, setDeliveryBillingError] = useState('');
  const [deliveryBillingLoading, setDeliveryBillingLoading] = useState(false);
  const [deliveryBillingActionLoading, setDeliveryBillingActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pedidos' | 'avaliacoes' | 'produtos' | 'estoque' | 'config' | 'fila' | 'pagamentos' | 'gateway' | 'motoboys' | 'usuarios' | 'condominios' | 'destinos'>(() => {
    const requestedTabFromState = String((location.state as any)?.activeTab || '').trim();
    const requestedTabFromQuery = String(new URLSearchParams(location.search || '').get('tab') || '').trim();
    const requestedTabFromSession =
      typeof window !== 'undefined' ? String(sessionStorage.getItem('admin:activeTab') || '').trim() : '';
    const requestedTab = requestedTabFromState || requestedTabFromQuery || requestedTabFromSession;
    if (requestedTab === 'pedidos') return 'fila';
    return (requestedTab as any) || 'fila';
  });
  const [configSection, setConfigSection] = useState('hub');
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
    const savedPreference = localStorage.getItem('adminSidebar:compact');
    if (savedPreference === null) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return savedPreference === 'true';
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [notificationCriticalOnly, setNotificationCriticalOnly] = useState(false);
  const [mfaPanelOpen, setMfaPanelOpen] = useState(false);
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
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('admin:activeTab', String(activeTab || 'fila'));
  }, [activeTab]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showReviewsCardMobile, setShowReviewsCardMobile] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 767px)').matches;
  });
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationsModalRef = useRef<HTMLDivElement | null>(null);
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
  const isOperatorUser = String(session?.user?.role || '').toUpperCase() === 'OPERATOR';
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const whatsappNumber = session?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const openConfigSection = React.useCallback((section = 'hub') => {
    setConfigSection(isOperatorUser ? 'printer' : section);
    setActiveTab('config');
  }, [isOperatorUser]);

  const desktopTabItems = useMemo(
    () =>
      (isOperatorUser
        ? [
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'cardapio', label: 'Loja Online', icon: Package },
            { id: 'config', label: 'Impressora', icon: Printer },
            { id: 'fila', label: 'Gestor de Pedidos', icon: CheckSquare },
          ]
        : [
            { id: 'resumo', label: 'Resumo', icon: ChartBar },
            { id: 'pedidos', label: 'Histórico de Pedidos', icon: ClipboardText },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'estoque', label: 'Estoque', icon: Stack },
            { id: 'destaques', label: 'Destaques', icon: Sparkle },
            { id: 'pagamentos', label: 'Assinatura e plano', icon: CreditCard },
            { id: 'gateway', label: 'Pagamentos online', icon: PlugsConnected },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'condominios', label: 'Condomínios', icon: Buildings },
            { id: 'destinos', label: 'Destinos', icon: Compass },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree, standalone: true },
            { id: 'config', label: 'Configurar loja', icon: Gear },
            { id: 'fila', label: 'Gestor de Pedidos', icon: CheckSquare },
          ]),
    [canUseMotoboys, isOperatorUser]
  );
  // Submenu direto de Configurações (lojista): cada item abre a seção correspondente
  // (perfil, horários, entrega...), pulando o hub de cards. O item 'config' (hub)
  // segue no array para a paleta de comandos Ctrl+K e para o activeNavItem; o sidebar
  // o oculta quando estes sub-itens existem. Operador (sem cfg-*) continua com 'config' único.
  const configNavItems = [
    { id: 'cfg-hub', label: 'Visão geral', icon: Gear },
    { id: 'cfg-profile', label: 'Perfil e marca', icon: IdentificationCard },
    { id: 'cfg-channels', label: 'Promo e contato', icon: ChatCircle },
    { id: 'cfg-delivery', label: 'Entrega e frete', icon: Truck },
    { id: 'cfg-ordering', label: 'Tipos de pedido', icon: ForkKnife },
    { id: 'cfg-hours', label: 'Horários', icon: Clock },
    { id: 'cfg-operation', label: 'Operação e som', icon: Bell },
    { id: 'cfg-printer', label: 'Impressora térmica', icon: Printer },
    { id: 'cfg-permissions', label: 'Permissões do app', icon: ShieldCheck },
  ];
  const navItems = useMemo(() => {
    if (isOperatorUser) return desktopTabItems;
    return [
      ...desktopTabItems,
      { id: 'cardapio', label: 'Loja Online', icon: Storefront, disabled: false, standalone: true },
      ...configNavItems,
    ];
  }, [desktopTabItems, isOperatorUser]);
  const tabMeta = useMemo(
    () => ({
      resumo: { title: 'Resumo executivo', subtitle: 'Visão consolidada da operação, receita e qualidade da loja.' },
      pedidos: { title: 'Histórico de Pedidos', subtitle: 'Acompanhe status, filtros e histórico dos pedidos em tempo real.' },
      avaliacoes: { title: 'Avaliações', subtitle: 'Notas e comentários dos clientes por pedido.' },
      produtos: { title: 'Produtos', subtitle: 'Gerencie catálogo, preço, disponibilidade e destaque da vitrine.' },
      estoque: { title: 'Estoque', subtitle: 'Monitore níveis, alertas e movimentações dos produtos.' },
      destaques: { title: 'Destaques patrocinados', subtitle: 'Solicite e acompanhe campanhas de destaque para o Hub.' },
      pagamentos: { title: 'Minha assinatura', subtitle: 'Controle assinatura, ciclo e eventos de cobrança da loja.' },
      gateway: { title: 'Pagamentos Online', subtitle: 'Conecte o Mercado Pago para aceitar Pix, crédito e débito online.' },
      config: { title: 'Configurar loja', subtitle: 'Organize perfil, canais, logística, pedidos e horários em blocos separados.' },
      fila: { title: 'Gestor de Pedidos', subtitle: 'Acompanhe pedidos em andamento e a fila da loja em tempo real.' },
      motoboys: { title: 'Entregadores', subtitle: 'Vínculos, documentos, solicitações e status de entrega.' },
      condominios: { title: 'Condomínios e feiras', subtitle: 'Solicite participação em condomínios e acompanhe aprovações da loja.' },
      destinos: { title: 'Destinos turísticos', subtitle: 'Solicite vínculo com chalés e pousadas onde sua loja entrega.' },
      usuarios: { title: 'Usuários', subtitle: 'Cadastre e gerencie acessos de admin e operador da loja.' },
    }),
    []
  );
  const openQueueMonitor = React.useCallback(
    (options?: { replace?: boolean }) => {
      setNotificationsOpen(false);
      setCommandOpen(false);
      navigate('/admin/queue', { replace: Boolean(options?.replace) });
    },
    [navigate]
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
            if (item.id === 'cardapio') {
              if (storeSlug) navigate(`/${storeSlug}`);
              return;
            }
            if (item.id === 'pedidos') {
              navigate('/admin/orders');
              return;
            }
            if (item.id === 'destaques') {
              navigate('/admin/highlights');
              return;
            }
            if (item.id === 'config') {
              openConfigSection('hub');
              return;
            }
            if (item.id === 'usuarios') {
              setActiveTab('usuarios');
              return;
            }
            if (item.id === 'fila') {
              openQueueMonitor();
              return;
            }
            setActiveTab(item.id as typeof activeTab);
          },
        })),
      {
        id: 'go-menu',
        label: 'Gestor de Pedidos',
        description: 'Abre a fila de pedidos em tempo real.',
        run: () => openQueueMonitor(),
      },
      {
        id: 'go-queue',
        label: 'Ver pedidos',
        description: 'Acessa a fila de pedidos da loja.',
        run: () => openQueueMonitor(),
      },
      {
        id: 'go-renewal',
        label: 'Trocar assinatura',
        description: 'Abre a tela de renovação/upgrade da assinatura.',
        run: () => navigate('/admin/renewal'),
      },
    ];
    // Hard guard: nunca exibir entrada de "Resumo/Resumo executivo" na paleta.
    return items.filter((item) => {
      const haystack = `${item.id} ${item.label} ${item.description}`.toLowerCase();
      return !haystack.includes('resumo executivo') && !/^tab-resumo$/.test(item.id) && item.label.toLowerCase() !== 'resumo';
    });
  }, [desktopTabItems, tabMeta, storeSlug, navigate, openQueueMonitor, openConfigSection]);
  const filteredCommandActions = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return commandActions;
    return commandActions.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(q));
  }, [commandActions, commandQuery]);

  useEffect(() => {
    if (!commandOpen) return;
    setSelectedCommandIndex(0);
  }, [commandOpen, commandQuery]);

  useEffect(() => {
    if (!commandOpen) return;
    if (filteredCommandActions.length === 0) {
      setSelectedCommandIndex(0);
      return;
    }
    if (selectedCommandIndex > filteredCommandActions.length - 1) {
      setSelectedCommandIndex(filteredCommandActions.length - 1);
    }
  }, [commandOpen, filteredCommandActions, selectedCommandIndex]);

  useEffect(() => {
    if (!canUseMotoboys && activeTab === 'motoboys') {
      setActiveTab('resumo');
    }
  }, [canUseMotoboys, activeTab]);

  useEffect(() => {
    if (!isOperatorUser) return;
    const disallowed = new Set(['resumo', 'pedidos', 'pagamentos', 'gateway', 'avaliacoes', 'motoboys', 'usuarios', 'estoque', 'condominios', 'destinos']);
    if (disallowed.has(activeTab)) {
      setActiveTab('fila');
    }
  }, [activeTab, isOperatorUser]);

  useEffect(() => {
    if (isOperatorUser && activeTab === 'config' && configSection !== 'printer') {
      setConfigSection('printer');
    }
  }, [activeTab, configSection, isOperatorUser]);
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
    storePhone: session?.store?.owner?.phone || '',
    promoMessage: session?.store?.settings?.promoMessage || '',
    isOrderingEnabled: session?.store?.settings?.isOrderingEnabled !== false,
    address: session?.store?.settings?.address || session?.store?.owner?.address || '',
    city: session?.store?.settings?.city || '',
    state: session?.store?.settings?.state || '',
    lat: session?.store?.settings?.lat ?? null,
    lng: session?.store?.settings?.lng ?? null,
    instagram: instagramHandle?.replace('@', '') || '',
    deliveryRadiusKm: session?.store?.settings?.deliveryRadiusKm || '',
    deliveryFee: session?.store?.settings?.deliveryFee || '',
    orderNotificationSound: session?.store?.settings?.orderNotificationSound || '',
    orderNotificationSoundDuration: Number(session?.store?.settings?.orderNotificationSoundDuration ?? 4),
    postalEnabled: session?.store?.settings?.postalEnabled === true,
    postalOriginZip: session?.store?.settings?.postalOriginZip || '',
    prepBaseMinutes: session?.store?.settings?.prepBaseMinutes || '20',
    prepAttentionMinutes: session?.store?.settings?.prepAttentionMinutes || '15',
    segment: session?.store?.settings?.segment || 'outros',
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
    const nextTabFromState = String((location.state as any)?.activeTab || '').trim();
    const nextTabFromQuery = String(new URLSearchParams(location.search || '').get('tab') || '').trim();
    const nextTab = nextTabFromState || nextTabFromQuery;
    if (!nextTab) return;
    if (nextTab === 'pedidos') {
      navigate('/admin/orders', { replace: true });
      return;
    }
    if (nextTab === 'fila') {
      openQueueMonitor({ replace: true });
      return;
    }
    const allowedTabs = new Set(
      isOperatorUser
        ? ['produtos', 'cardapio', 'config']
        : ['resumo', 'avaliacoes', 'produtos', 'estoque', 'config', 'pagamentos', 'gateway', 'motoboys', 'condominios', 'destinos', 'usuarios']
    );
    if (!allowedTabs.has(nextTab)) {
      navigate('/admin/dashboard', { replace: true, state: {} });
      return;
    }
    if (nextTab === 'config') {
      const nextSectionFromQuery = String(new URLSearchParams(location.search || '').get('section') || '').trim();
      setConfigSection(isOperatorUser ? 'printer' : nextSectionFromQuery || 'hub');
    }
    setActiveTab(nextTab as typeof activeTab);
    // Consome o estado de navegação para evitar "reaplicar" aba e causar pisca ao trocar de menu.
    navigate('/admin/dashboard', { replace: true, state: {} });
  }, [location.state, location.search, openQueueMonitor, navigate, isOperatorUser]);
  const [savingBranding, setSavingBranding] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const pendingNavigationActionRef = useRef<null | (() => void)>(null);

  const updateAuthStore = (updates) => {
    if (!auth?.store) return;
    const nextAuth = {
      ...auth,
      store: {
        ...auth.store,
        ...updates,
        settings: {
          ...auth.store.settings,
          ...(updates.settings || {}),
        },
      },
    };
    setAuth(nextAuth);
    try {
      if (nativeBiometricService.hasValidStoredAdminEnrollment()) {
        nativeBiometricService.enableAdmin(nextAuth);
      }
    } catch {
      // no-op
    }
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
      storePhone: session?.store?.owner?.phone || '',
      promoMessage: session?.store?.settings?.promoMessage || '',
      isOrderingEnabled: session?.store?.settings?.isOrderingEnabled !== false,
      address: session?.store?.settings?.address || session?.store?.owner?.address || '',
      city: session?.store?.settings?.city || '',
      state: session?.store?.settings?.state || '',
      lat: session?.store?.settings?.lat ?? null,
      lng: session?.store?.settings?.lng ?? null,
      instagram: instagramHandle?.replace('@', '') || '',
      deliveryRadiusKm: session?.store?.settings?.deliveryRadiusKm || '',
      deliveryFee: session?.store?.settings?.deliveryFee || '',
      orderNotificationSound: session?.store?.settings?.orderNotificationSound || '',
      orderNotificationSoundDuration: Number(session?.store?.settings?.orderNotificationSoundDuration ?? 4),
      postalEnabled: session?.store?.settings?.postalEnabled === true,
      postalOriginZip: session?.store?.settings?.postalOriginZip || '',
      prepBaseMinutes: session?.store?.settings?.prepBaseMinutes || '20',
      prepAttentionMinutes: session?.store?.settings?.prepAttentionMinutes || '15',
    segment: session?.store?.settings?.segment || 'outros',
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
    session?.store?.owner?.phone,
    session?.store?.settings?.promoMessage,
    session?.store?.settings?.isOrderingEnabled,
    session?.store?.settings?.address,
    session?.store?.settings?.city,
    session?.store?.settings?.state,
    session?.store?.settings?.lat,
    session?.store?.settings?.lng,
    session?.store?.owner?.address,
    session?.store?.settings?.deliveryRadiusKm,
    session?.store?.settings?.deliveryFee,
    session?.store?.settings?.orderNotificationSound,
    session?.store?.settings?.orderNotificationSoundDuration,
    session?.store?.settings?.postalEnabled,
    session?.store?.settings?.postalOriginZip,
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
      storePhone: normalize(session?.store?.owner?.phone),
      promoMessage: normalize(session?.store?.settings?.promoMessage),
      isOrderingEnabled: session?.store?.settings?.isOrderingEnabled !== false ? 'true' : 'false',
      address: normalize(session?.store?.settings?.address || session?.store?.owner?.address || ''),
      city: normalize(session?.store?.settings?.city),
      state: normalize(session?.store?.settings?.state),
      lat: normalize(session?.store?.settings?.lat),
      lng: normalize(session?.store?.settings?.lng),
      instagram: normalize(instagramHandle?.replace('@', '') || ''),
      deliveryRadiusKm: normalize(session?.store?.settings?.deliveryRadiusKm),
      deliveryFee: normalize(session?.store?.settings?.deliveryFee),
      orderNotificationSound: normalize(session?.store?.settings?.orderNotificationSound),
      orderNotificationSoundDuration: normalize(Number(session?.store?.settings?.orderNotificationSoundDuration ?? 4)),
      postalEnabled: session?.store?.settings?.postalEnabled === true ? 'true' : 'false',
      postalOriginZip: normalize(session?.store?.settings?.postalOriginZip),
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
      storePhone: normalize(brandingDraft.storePhone),
      promoMessage: normalize(brandingDraft.promoMessage),
      isOrderingEnabled: brandingDraft.isOrderingEnabled !== false ? 'true' : 'false',
      address: normalize(brandingDraft.address),
      city: normalize(brandingDraft.city),
      state: normalize(brandingDraft.state),
      lat: normalize(brandingDraft.lat),
      lng: normalize(brandingDraft.lng),
      instagram: normalize(brandingDraft.instagram),
      deliveryRadiusKm: normalize(brandingDraft.deliveryRadiusKm),
      deliveryFee: normalize(brandingDraft.deliveryFee),
      orderNotificationSound: normalize(brandingDraft.orderNotificationSound),
      orderNotificationSoundDuration: normalize(Number(brandingDraft.orderNotificationSoundDuration ?? 4)),
      postalEnabled: brandingDraft.postalEnabled === true ? 'true' : 'false',
      postalOriginZip: normalize(brandingDraft.postalOriginZip),
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
      const pendingTimestamps = (orders || [])
        .filter((order: any) => normalizeStatus(order?.status) === 'pending')
        .map((order: any) => normalizeTime(order?.createdAt))
        .filter((ts: number) => ts > 0);
      const oldestPendingTs =
        pendingTimestamps.length > 0 ? Math.min(...pendingTimestamps) : Date.now();
      const newestPendingTs =
        pendingTimestamps.length > 0 ? Math.max(...pendingTimestamps) : Date.now();
      result.push({
        key: `pending-orders:${pendingOrders}:${newestPendingTs}`,
        id: 'pending-orders',
        title: `${pendingOrders} pedido(s) pendente(s)`,
        description: 'Pedidos novos aguardando início da operação.',
        generatedAt: oldestPendingTs,
        tone: 'warning',
        actionLabel: 'Ver pedidos',
        action: () => openQueueMonitor(),
      });
    }
    if (readyOrders > 0) {
      const readyTimestamps = (orders || [])
        .filter((order: any) => normalizeStatus(order?.status) === 'ready')
        .map((order: any) => normalizeTime(order?.createdAt))
        .filter((ts: number) => ts > 0);
      const oldestReadyTs =
        readyTimestamps.length > 0 ? Math.min(...readyTimestamps) : Date.now();
      const newestReadyTs =
        readyTimestamps.length > 0 ? Math.max(...readyTimestamps) : Date.now();
      result.push({
        key: `ready-orders:${readyOrders}:${newestReadyTs}`,
        id: 'ready-orders',
        title: `${readyOrders} pedido(s) pronto(s)`,
        description: 'Pedidos prontos aguardando retirada/expedição.',
        generatedAt: oldestReadyTs,
        tone: 'info',
        actionLabel: 'Ver pedidos',
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
      const target = event.target as Node;
      const clickedToggle = Boolean(notificationsRef.current?.contains(target));
      const clickedModal = Boolean(notificationsModalRef.current?.contains(target));
      if (!clickedToggle && !clickedModal) {
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
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => {
      if (!media.matches) setShowReviewsCardMobile(true);
    };
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);
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
    if (!storeId) {
      setDismissedNotificationKeys((prev) => (prev.includes(noteKey) ? prev : [...prev, noteKey]));
      return;
    }
    const storageKey = `adminNotifications:dismissed:${storeId}`;
    setDismissedNotificationKeys((prev) => {
      const next = prev.includes(noteKey) ? prev : [...prev, noteKey];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };
  const clearAllNotifications = async () => {
    const keys = activeNotifications.map((note) => note.key);
    // Optimistic update: badge some imediatamente no app.
    setDismissedNotificationKeys((prev) => {
      const merged = new Set([...prev, ...keys]);
      return Array.from(merged);
    });
    setNotificationsOpen(false);

    if (!storeId) {
      return;
    }
    try {
      await fetch('/api/admin/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({ storeId }),
      });
    } catch {
      // Sem bloqueio: fallback local já aplicado.
    }
  };

  /* =========================
   * CARREGA PRODUTOS + PEDIDOS
   * ========================= */
  useEffect(() => {
    if (!storeId && !storeSlug) return;

    const storeIdentifier = storeId || storeSlug;
    const needsOrdersFeed = ['resumo', 'pedidos', 'fila'].includes(String(activeTab));

    const unsubscribeProducts = productService.subscribe(setProducts, storeIdentifier);
    const unsubscribeOrders = needsOrdersFeed
      ? orderService.subscribeAll(storeIdentifier, setOrders)
      : undefined;
    if (!needsOrdersFeed) {
      setOrders([]);
    }

    return () => {
      unsubscribeProducts?.();
      unsubscribeOrders?.();
    };
  }, [storeId, storeSlug, activeTab]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;

    const loadSubscription = async () => {
      setSubscriptionLoading(true);
      setSubscriptionError('');
      if (!isOperatorUser) {
        setDeliveryBillingLoading(true);
        setDeliveryBillingError('');
      }
      try {
        const [data, billingResponse] = await Promise.all([
          subscriptionService.getByStore(storeId),
          isOperatorUser ? Promise.resolve(null) : deliveryBillingService.getCurrentCycle(storeId).catch((error) => ({ __error: error })),
        ]);
        if (active) {
          setSubscriptionDetails(data);
          if (!isOperatorUser) {
            if (billingResponse && (billingResponse as any).__error) {
              setDeliveryBillingCycle(null);
              setDeliveryBillingError((billingResponse as any).__error?.message || 'Não foi possível carregar a cobrança de entregas agora.');
            } else {
              setDeliveryBillingCycle((billingResponse as any)?.cycle || null);
              setDeliveryBillingError('');
            }
          }
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
        if (active) {
          setSubscriptionLoading(false);
          if (!isOperatorUser) setDeliveryBillingLoading(false);
        }
      }
    };

    loadSubscription();

    return () => {
      active = false;
    };
  }, [storeId, isOperatorUser]);

  const handleOpenDeliveryBillingPayment = useCallback(async () => {
    if (!storeId || isOperatorUser) return;
    setDeliveryBillingActionLoading(true);
    setDeliveryBillingError('');
    try {
      const response = await deliveryBillingService.ensurePayment(storeId);
      const cycle = response?.cycle || null;
      setDeliveryBillingCycle(cycle);
      const paymentLink = String(cycle?.paymentLink || '').trim();
      if (paymentLink) {
        window.open(paymentLink, '_blank', 'noopener,noreferrer');
        showToast('Cobrança aberta em nova aba.', 'success');
      } else {
        showToast('Cobrança atualizada no painel.', 'success');
      }
    } catch (error: any) {
      setDeliveryBillingError(error?.message || 'Não foi possível abrir a cobrança de entregas agora.');
      showToast(error?.message || 'Não foi possível abrir a cobrança de entregas agora.', 'error');
    } finally {
      setDeliveryBillingActionLoading(false);
    }
  }, [isOperatorUser, showToast, storeId]);

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
    
    // On mount or tab change
    if (hideForTab(activeTab)) {
      localStorage.setItem('adminHeader:visible', 'false');
      window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }));
    } else {
      localStorage.setItem('adminHeader:visible', 'true');
      window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: true } }));
    }
    prevTabRef.current = activeTab;
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
    if (!isDesktopLayout || !sidebarCompact) return;
    setSidebarCompact(false);
  }, [isDesktopLayout, sidebarCompact]);

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
    if (!commandOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [commandOpen]);


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
    return (
      <AppRobotLoader
        fullScreen
        title="Abrindo painel da loja"
        subtitle="Preparando fila, vendas e configurações da operação."
      />
    );
  }

  const openingHours = session?.store?.settings?.openingHours || [];
  const orderTypes = session?.store?.settings?.orderTypes || [];
  const setupChecklist = [
    {
      id: 'logo',
      label: 'Logo da loja',
      done: Boolean(session?.store?.settings?.logoUrl),
      action: 'Adicionar logo',
      onClick: () => openConfigSection('profile'),
    },
    {
      id: 'description',
      label: 'Descrição da loja',
      done: Boolean(session?.store?.settings?.description?.trim()),
      action: 'Adicionar descrição',
      onClick: () => openConfigSection('profile'),
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
      onClick: () => openConfigSection('hours'),
    },
    {
      id: 'orderTypes',
      label: 'Tipos de pedido',
      done: Array.isArray(orderTypes) && orderTypes.length > 0,
      action: 'Definir tipos',
      onClick: () => openConfigSection('ordering'),
    },
    {
      id: 'pix',
      label: 'Pix para recebimento',
      done: Boolean(session?.store?.settings?.pixKey),
      action: 'Configurar Pix',
      onClick: () => openConfigSection('channels'),
    },
  ];



  const handleSaveBranding = async () => {
    if (!storeId) return;
    const normalizedCity = String(brandingDraft.city || '').trim();
    const normalizedState = String(brandingDraft.state || '').trim().toUpperCase();
    const normalizedAddress = String(brandingDraft.address || '').trim();
    const normalizeCoordinatePayload = (value: any) => {
      const raw = String(value ?? '').replace(',', '.').trim();
      if (!raw) return undefined;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return undefined;
      if (Math.abs(parsed) < 0.000001) return undefined;
      return parsed;
    };
    const latPayload = normalizeCoordinatePayload(brandingDraft.lat);
    const lngPayload = normalizeCoordinatePayload(brandingDraft.lng);
    if (!normalizedAddress || !normalizedCity || normalizedState.length !== 2) {
      setError('Preencha endereço, cidade e UF da loja para salvar a localização.');
      showToast('Preencha endereço, cidade e UF da loja para salvar a localização.', 'error');
      return;
    }
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
        storePhone: brandingDraft.storePhone?.trim() ?? '',
        promoMessage: brandingDraft.promoMessage?.trim() ?? '',
        isOrderingEnabled: brandingDraft.isOrderingEnabled !== false,
        address: normalizedAddress,
        city: normalizedCity,
        state: normalizedState,
        ...(latPayload !== undefined ? { lat: latPayload } : {}),
        ...(lngPayload !== undefined ? { lng: lngPayload } : {}),
        deliveryRadiusKm: brandingDraft.deliveryRadiusKm,
        deliveryFee: brandingDraft.deliveryFee,
        orderNotificationSound: brandingDraft.orderNotificationSound?.trim() ?? '',
        orderNotificationSoundDuration: Number(brandingDraft.orderNotificationSoundDuration ?? 4),
        postalEnabled: brandingDraft.postalEnabled === true,
        postalOriginZip: brandingDraft.postalOriginZip,
        prepBaseMinutes: brandingDraft.prepBaseMinutes,
        prepAttentionMinutes: brandingDraft.prepAttentionMinutes,
        socialLinks: brandingDraft.instagram ? [{ type: 'instagram', value: brandingDraft.instagram }] : [],
        segment: brandingDraft.segment || undefined,
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
      showToast('Identidade atualizada com sucesso.', 'success', { durationMs: 3000 });
    } catch (err) {
      console.error('Erro ao salvar identidade', err);
      setError('Não foi possível salvar a identidade da loja agora.');
      showToast('Não foi possível salvar a identidade da loja agora.', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  const isConfigDirty = activeTab === 'config' && hasBrandingChanges;
  const runOrConfirmDiscard = React.useCallback(
    (action: () => void) => {
      if (isConfigDirty) {
        pendingNavigationActionRef.current = action;
        setShowUnsavedChangesModal(true);
        return;
      }
      action();
    },
    [isConfigDirty]
  );

  useEffect(() => {
    if (!isConfigDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isConfigDirty]);


  const handleNavSelect = (id: string) => {
    runOrConfirmDiscard(() => {
      if (id.startsWith('cfg-')) {
        openConfigSection(id.slice(4) || 'hub');
        return;
      }
      if (id === 'cardapio') {
        if (storeSlug) navigate(`/${storeSlug}`);
        return;
      }
      if (id === 'usuarios') {
        setActiveTab('usuarios' as typeof activeTab);
        return;
      }
      if (id === 'fila') {
        openQueueMonitor();
        return;
      }
      if (id === 'pedidos') {
        navigate('/admin/orders');
        return;
      }
      if (id === 'destaques') {
        navigate('/admin/highlights');
        return;
      }
      if (id === 'config') {
        openConfigSection('hub');
        return;
      }
      if (id === 'motoboys' && !canUseMotoboys) {
        showToast('Disponível no plano Pro. Faça o upgrade para liberar entregadores.', 'info');
        navigate('/admin/renewal?focus=pro');
        return;
      }
      setActiveTab(id as typeof activeTab);
    });
  };

  const activeNavItem = (navItems || []).find((item) => item.id === activeTab);
  // No submenu de Configurações, destaca o sub-item ativo (ex: cfg-hours em vez de só 'config').
  const sidebarActiveId = !isOperatorUser && activeTab === 'config' ? `cfg-${configSection}` : activeTab;
  const ActiveTabIcon = activeNavItem?.icon || null;
  const hasStoreLocationConfigured = Boolean(
    String(brandingDraft.address || '').trim() &&
      String(brandingDraft.city || '').trim() &&
      String(brandingDraft.state || '').trim().length === 2
  );
  const profileReady = Boolean(
    String(brandingDraft.brandName || '').trim() &&
      String(brandingDraft.description || '').trim() &&
      (brandingDraft.logoUrl || brandingDraft.logoFile || brandingDraft.bannerUrl || brandingDraft.bannerFile)
  );
  const channelsReady = Boolean(
    String(brandingDraft.promoMessage || '').trim() ||
      String(brandingDraft.contactEmail || '').trim() ||
      String(brandingDraft.storePhone || '').trim() ||
      String(brandingDraft.pixKey || '').trim()
  );
  const configSectionMeta: Record<string, any> = {
    profile: {
      title: 'Perfil e marca',
      subtitle: 'Nome, descrição, logo, banner e cores da loja.',
      sections: ['identity', 'colors'],
      saveLabel: 'Salvar perfil e marca',
    },
    channels: {
      title: 'Promo e canais',
      subtitle: 'Mensagem do dia, contato oficial, Pix e presença da loja.',
      sections: ['promo', 'contact'],
      saveLabel: 'Salvar promo e canais',
    },
    delivery: {
      title: 'Entrega e logística',
      subtitle: 'Endereço, raio, frete, CEP de origem e tempos de preparo.',
      sections: ['delivery'],
      saveLabel: 'Salvar logística',
    },
    ordering: {
      title: 'Tipos de pedido',
      subtitle: 'Escolha como o cliente pode comprar na vitrine da loja.',
    },
    hours: {
      title: 'Horários de funcionamento',
      subtitle: 'Defina abertura e fechamento por dia da semana.',
    },
    operation: {
      title: 'Operação da loja',
      subtitle: 'URL pública, pedidos online e vinheta da fila.',
      sections: ['access'],
      saveLabel: 'Salvar operação',
    },
    printer: {
      title: 'Impressora térmica',
      subtitle: 'Escolha a impressora Bluetooth deste aparelho para imprimir direto pelo app.',
    },
    permissions: {
      title: 'Permissões do dispositivo',
      subtitle: 'Câmera, notificações, biometria e Bluetooth deste aparelho.',
    },
  };
  const configCards = [
    {
      id: 'profile',
      title: 'Perfil e marca',
      description: 'Nome, descrição, logo, banner e cores da vitrine.',
      icon: Storefront,
      badge: profileReady ? 'Configurado' : 'Revisar',
      tone: profileReady ? 'success' : 'warning',
      action: () => setConfigSection('profile'),
    },
    {
      id: 'channels',
      title: 'Promo e canais',
      description: 'Mensagem do dia, contato, Instagram e Pix manual.',
      icon: Star,
      badge: channelsReady ? 'Configurado' : 'Opcional',
      tone: channelsReady ? 'success' : 'neutral',
      action: () => setConfigSection('channels'),
    },
    {
      id: 'delivery',
      title: 'Entrega e logística',
      description: 'Endereço, raio, frete, envio postal e SLA da operação.',
      icon: Truck,
      badge: hasStoreLocationConfigured ? 'Configurado' : 'Obrigatório',
      tone: hasStoreLocationConfigured ? 'success' : 'warning',
      action: () => setConfigSection('delivery'),
    },
    {
      id: 'ordering',
      title: 'Tipos de pedido',
      description: 'Entrega, retirada e mesa conforme o plano da loja.',
      icon: CheckSquare,
      badge: Array.isArray(orderTypes) && orderTypes.length > 0 ? 'Ativo' : 'Revisar',
      tone: Array.isArray(orderTypes) && orderTypes.length > 0 ? 'success' : 'warning',
      action: () => setConfigSection('ordering'),
    },
    {
      id: 'printer',
      title: 'Impressora térmica',
      description: 'Impressora Bluetooth deste aparelho. Requer permissão de Dispositivos Próximos.',
      icon: Printer,
      badge: 'App Android',
      tone: 'neutral',
      action: () => setConfigSection('printer'),
    },
    {
      id: 'permissions',
      title: 'Permissões do dispositivo',
      description: 'Câmera, notificações push, biometria e Bluetooth do app.',
      icon: ShieldCheck,
      badge: 'App Android',
      tone: 'neutral',
      action: () => setConfigSection('permissions'),
    },
    {
      id: 'hours',
      title: 'Horários de funcionamento',
      description: 'Abertura e fechamento por dia, com faixas de atendimento.',
      icon: Clock,
      badge: Array.isArray(openingHours) && openingHours.length > 0 ? 'Configurado' : 'Revisar',
      tone: Array.isArray(openingHours) && openingHours.length > 0 ? 'success' : 'warning',
      action: () => setConfigSection('hours'),
    },
    {
      id: 'gateway',
      title: 'Pagamentos online',
      description: 'Conecte o Mercado Pago e acompanhe o status do gateway.',
      icon: PlugsConnected,
      badge: 'Abrir',
      tone: 'neutral',
      action: () => runOrConfirmDiscard(() => setActiveTab('gateway')),
    },
    {
      id: 'operation',
      title: 'Operação da loja',
      description: 'Pedidos online, slug público e vinheta de novos pedidos.',
      icon: Bell,
      badge: brandingDraft.isOrderingEnabled !== false ? 'Pedidos online ativos' : 'Somente cardápio',
      tone: brandingDraft.isOrderingEnabled !== false ? 'success' : 'neutral',
      action: () => setConfigSection('operation'),
    },
    {
      id: 'security',
      title: 'Segurança da conta',
      description: 'Verificação em duas etapas, biometria e aparelhos confiáveis.',
      icon: SealCheck,
      badge: 'Gerenciar',
      tone: 'neutral',
      action: () => setMfaPanelOpen(true),
    },
  ];
  const activeConfigMeta = activeTab === 'config' && configSection !== 'hub'
    ? configSectionMeta[configSection] || tabMeta.config
    : tabMeta.config;
  const activeSurfaceMeta = activeTab === 'config' ? activeConfigMeta : tabMeta[activeTab];
  const completedSetupSteps = setupChecklist.filter((item) => item.done).length;
  const focusedBrandingSection = activeTab === 'config' && ['profile', 'channels', 'delivery', 'operation'].includes(configSection);
  const showBrandingSaveBar = activeTab === 'config' && (configSection === 'hub' || focusedBrandingSection);

  return (
    <AdminLayout contextLabel="Painel da Loja" fluid>
      <div
        className={`w-full lg:grid lg:items-start lg:gap-0 ${
          sidebarCompact ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'
        }`}
      >
        <AdminDesktopSidebar
          items={navItems.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            disabled: item.disabled,
            badge:
              item.id === 'motoboys'
                ? item.disabled
                  ? 'Pro'
                  : pendingMotoboyRequests > 0
                  ? pendingMotoboyRequests
                  : undefined
                : undefined,
            tone: item.id === 'motoboys' && item.disabled ? 'violet' : item.id === 'motoboys' ? 'amber' : 'default',
          }))}
          activeId={sidebarActiveId}
          compact={sidebarCompact}
          onToggleCompact={() => setSidebarCompact((prev) => !prev)}
          onSelect={handleNavSelect}
          onLogout={() => {
            markManualLogoutRedirect('admin', '/hub');
            logout();
            navigate('/hub', { replace: true });
          }}

        />

        <div className="min-w-0 space-y-4 flex-1">
      {isConfigDirty && (
        <div className="fixed top-2 left-1/2 z-[12500] -translate-x-1/2 w-[calc(100%-1rem)] max-w-3xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 backdrop-blur px-4 py-2.5 shadow-[0_14px_32px_-24px_rgba(180,83,9,0.55)] flex items-center justify-between gap-3">
            <p className="text-xs sm:text-sm font-semibold text-amber-900">Alterações não salvas detectadas</p>
            <Button
              variant="success"
              size="sm"
              onClick={handleSaveBranding}
              loading={savingBranding}
            >
              Salvar agora
            </Button>
          </div>
        </div>
      )}
      {activeTab !== 'fila' && (
      <>
      <div className="md:hidden flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm px-3 py-2.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.18)]">
        <div className="flex items-center gap-2.5 min-w-0">
          {ActiveTabIcon && (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <ActiveTabIcon size={16} weight="duotone" className="text-slate-500" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-slate-400 leading-none mb-0.5">Seção atual</p>
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">{activeSurfaceMeta?.title || 'Painel'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('admin:open-global-nav'))}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 active:scale-[0.97] transition"
        >
          <Hash size={12} />
          Navegar
        </button>
      </div>
      <section className="hidden md:flex relative z-[220] items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.5)] overflow-visible">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-slate-400">Workspace</p>
          <h2 className="text-lg font-black text-slate-900 leading-tight">{activeSurfaceMeta?.title || 'Painel da loja'}</h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{activeSurfaceMeta?.subtitle || 'Gestão centralizada dos pedidos da loja.'}</p>
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
          {storeSlug && (
            <button
              type="button"
              onClick={() => openQueueMonitor()}
              className="ds-focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Pedidos ao vivo
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
            onClick={() => openConfigSection('hub')}
            className="ds-focus-ring rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.7)] hover:opacity-95 transition"
          >
            Configurar loja
          </button>
        </div>
      </section>
      </>
      )}

      {activeTab === 'resumo' && (
        <div className="space-y-4">
          {showReviewsCardMobile && (
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
          )}

          <DashboardView
            storeId={storeId}
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
            <OrdersView
              orders={orders}
              products={products}
              storeSlug={storeSlug}
              storeId={storeId}
              canViewTechnical={!isOperatorUser}
              showToast={showToast}
            />
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

        {activeTab === 'estoque' && (
          <InventoryManager
            onProductsChange={setProducts}
          />
        )}

        {activeTab === 'pagamentos' && (
          <FormSection
            title="Minha assinatura"
            subtitle="Assinatura atual, ciclo e histórico financeiro."
            variant="success"
            className="bg-white premium-card"
          >
            <PaymentsView
              subscription={subscriptionDetails}
              loading={subscriptionLoading}
              error={subscriptionError}
              payments={paymentsHistory}
              deliveryBillingCycle={deliveryBillingCycle}
              deliveryBillingLoading={deliveryBillingLoading}
              deliveryBillingError={deliveryBillingError}
              deliveryBillingActionLoading={deliveryBillingActionLoading}
              onOpenDeliveryBillingPayment={handleOpenDeliveryBillingPayment}
            />
          </FormSection>
        )}

        {activeTab === 'gateway' && (
          <FormSection
            title="Pagamentos Online"
            subtitle="Conecte o Mercado Pago para aceitar Pix, crédito e débito diretamente nos pedidos."
            variant="default"
            className="bg-white premium-card"
          >
            <GatewayView storeId={storeId} />
          </FormSection>
        )}

        {activeTab === 'config' && (
          <FormSection
            title={activeConfigMeta?.title || 'Configurar loja'}
            subtitle={activeConfigMeta?.subtitle || 'Organize a operação da loja em blocos separados.'}
            variant="warning"
            className="premium-card-soft"
            contentClassName="space-y-4"
          >
            <div className="space-y-4 pb-24 sm:pb-4">
              {configSection === 'hub' ? (
                <>
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">Central de configuração</p>
                        <h3 className="mt-1 text-base font-black text-slate-900">Ajuste a loja por responsabilidade</h3>
                        <p className="mt-1 text-sm text-slate-500">Abra só o bloco que precisa editar e mantenha a operação mais organizada no web e no app.</p>
                      </div>
                      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                        {completedSetupSteps}/{setupChecklist.length} itens base concluídos
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {setupChecklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className={`rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${
                            item.done
                              ? 'border-emerald-100 bg-emerald-50/80'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-800">{item.label}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                              item.done ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.done ? 'OK' : 'Pendente'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{item.action}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {configCards.map((card) => {
                      const Icon = card.icon;
                      const isSuccess = card.tone === 'success';
                      const isWarning = card.tone === 'warning';
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={card.action}
                          className={`group relative w-full overflow-hidden rounded-[1.4rem] border bg-white px-4 py-4 text-left shadow-[0_8px_28px_-16px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(15,23,42,0.28)] ${
                            isSuccess ? 'border-emerald-100' : isWarning ? 'border-amber-200' : 'border-slate-200'
                          }`}
                        >
                          {/* Barra lateral de status */}
                          <div className={`absolute left-0 top-0 h-full w-1 rounded-l-[1.4rem] ${
                            isSuccess ? 'bg-emerald-400' : isWarning ? 'bg-amber-400' : 'bg-slate-200'
                          }`} />

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              {/* Ícone com badge de status sobreposto */}
                              <div className="relative shrink-0">
                                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                                  isSuccess ? 'bg-emerald-50 text-emerald-600' : isWarning ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <Icon size={20} weight="duotone" />
                                </span>
                                {isSuccess && (
                                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                                    <CheckCircle size={9} weight="fill" className="text-white" />
                                  </span>
                                )}
                                {isWarning && (
                                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-400">
                                    <WarningCircle size={9} weight="fill" className="text-white" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900">{card.title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{card.description}</p>
                              </div>
                            </div>
                            <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                              isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isWarning ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}>
                              {card.badge}
                            </span>
                          </div>

                          <div className={`mt-4 flex items-center justify-between border-t pt-3 ${
                            isWarning ? 'border-amber-100' : 'border-slate-100'
                          }`}>
                            <span className={`text-xs font-semibold ${isWarning ? 'text-amber-600' : 'text-slate-500'}`}>
                              {isWarning ? 'Configurar agora' : card.id === 'gateway' ? 'Abrir gateway' : 'Ver ajustes'}
                            </span>
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-transform group-hover:translate-x-0.5 ${
                              isWarning ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}>
                              <CaretRight size={13} weight="bold" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.45)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfigSection('hub')}
                          aria-label="Voltar para categorias"
                          className="h-10 w-10 !rounded-2xl !px-0"
                        >
                          <CaretRight size={16} weight="bold" className="rotate-180" />
                        </Button>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] font-black text-slate-400">Bloco da loja</p>
                          <h3 className="mt-1 text-base font-black text-slate-900">{activeConfigMeta?.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">{activeConfigMeta?.subtitle}</p>
                        </div>
                      </div>
                      {focusedBrandingSection ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          {hasBrandingChanges ? 'Alterações pendentes' : 'Tudo sincronizado'}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {focusedBrandingSection && (
                    <BrandingSettings
                      branding={brandingDraft}
                      onChange={setBrandingDraft}
                      storeSlug={storeSlug}
                      title={activeConfigMeta?.title}
                      subtitle={activeConfigMeta?.subtitle}
                      visibleSections={activeConfigMeta?.sections}
                      hideSectionTabs
                      expandVisibleSections
                    />
                  )}
                  {configSection === 'ordering' && <OrderTypeSettingsCard />}
                  {configSection === 'printer' && <ThermalPrinterSettingsCard />}
                  {configSection === 'permissions' && <DevicePermissionsCard role="admin" session={auth} onOpenMfa={() => setMfaPanelOpen(true)} />}
                  {configSection === 'hours' && <OpeningHoursCard />}
                </>
              )}
            </div>
            {showBrandingSaveBar && (
              <>
                <div className="hidden sm:flex sticky bottom-3 z-40 items-center justify-between rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.45)]">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {hasBrandingChanges ? 'Alterações prontas para salvar' : 'Tudo sincronizado'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {focusedBrandingSection ? 'Salva apenas este bloco sem mexer no restante da operação.' : 'Salva os ajustes de perfil, canais, logística e operação da loja.'}
                    </p>
                  </div>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleSaveBranding}
                    loading={savingBranding}
                    disabled={!hasBrandingChanges}
                    className={!hasBrandingChanges ? 'bg-brand-gradient' : ''}
                  >
                    {activeConfigMeta?.saveLabel || 'Salvar alterações'}
                  </Button>
                </div>
                <div className="sm:hidden fixed left-0 right-0 px-4 z-50 ds-safe-fab">
                  <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    onClick={handleSaveBranding}
                    loading={savingBranding}
                    disabled={!hasBrandingChanges}
                    className={!hasBrandingChanges ? 'bg-brand-gradient' : ''}
                  >
                    {hasBrandingChanges ? activeConfigMeta?.saveLabel || 'Salvar alterações' : 'Sem alterações pendentes'}
                  </Button>
                </div>
              </>
            )}
          </FormSection>
        )}

        {activeTab === 'fila' && (
          <FormSection
            title="Pedidos ao vivo"
            subtitle="Fila de pedidos em tempo real."
            variant="neutral"
            className="bg-white premium-card !p-4 sm:!p-4 lg:!p-5"
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

        {activeTab === 'condominios' && (
          <FormSection
            title="Condomínios e feiras"
            subtitle="Solicite participação em condomínios e acompanhe aprovações da loja."
            variant="default"
            className="premium-card-soft"
          >
            <StoreCondominiumPanel storeId={storeId} />
          </FormSection>
        )}

        {activeTab === 'destinos' && (
          <FormSection
            title="Destinos turísticos"
            subtitle="Solicite vínculo com chalés e pousadas onde sua loja entrega."
            variant="default"
            className="premium-card-soft"
          >
            <StoreDestinationPanel storeId={storeId} />
          </FormSection>
        )}

        {activeTab === 'usuarios' && (
          <FormSection
            title="Usuários"
            subtitle="Cadastre e gerencie acessos internos da loja."
            variant="neutral"
            className="premium-card"
          >
            <StoreUsersPanel />
          </FormSection>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>

      {notificationsOpen && (
        <div className="fixed inset-0 z-[13000] bg-black/45 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center" onClick={() => setNotificationsOpen(false)}>
          <div
            ref={notificationsModalRef}
            className="w-full max-w-xl max-h-[82vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
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
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setNotificationCriticalOnly((prev) => !prev)}
                className={`text-[11px] font-semibold rounded-full border px-2.5 py-1 ${
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
            <div className="max-h-[calc(82vh-122px)] overflow-y-auto p-3 space-y-2">
              {activeNotifications.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-sm font-semibold text-emerald-700">Pedidos em dia</p>
                  <p className="text-xs text-emerald-700/80 mt-1">Sem pendências críticas no momento.</p>
                </div>
              ) : (
                activeNotifications.map((note) => (
                  <div key={`notifications-${note.key}`} className={`rounded-xl border px-3 py-2.5 ${notificationToneClass(note.tone)}`}>
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
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showUnsavedChangesModal && (
        <div className="fixed inset-0 z-[14000] bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_60px_-28px_rgba(15,23,42,0.55)]">
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-amber-700">Atenção</p>
            <h3 className="mt-2 text-lg font-black text-slate-900">Você tem alterações não salvas</h3>
            <p className="mt-2 text-sm text-slate-600">
              Deseja sair mesmo assim? As mudanças em Configurar loja serão perdidas.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedChangesModal(false);
                  pendingNavigationActionRef.current = null;
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingNavigationActionRef.current;
                  pendingNavigationActionRef.current = null;
                  setShowUnsavedChangesModal(false);
                  action?.();
                }}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {commandOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[22000] bg-black/45 backdrop-blur-sm px-4 flex items-center justify-center"
            onClick={() => setCommandOpen(false)}
          >
            <div
              className="relative z-[22010] w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <MagnifyingGlass size={16} className="text-slate-500" />
                  <input
                    autoFocus
                    value={commandQuery}
                    onChange={(event) => setCommandQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (filteredCommandActions.length === 0) return;
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setSelectedCommandIndex((prev) => (prev + 1) % filteredCommandActions.length);
                        return;
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setSelectedCommandIndex((prev) =>
                          prev <= 0 ? filteredCommandActions.length - 1 : prev - 1
                        );
                        return;
                      }
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        const target = filteredCommandActions[selectedCommandIndex] || filteredCommandActions[0];
                        if (target) {
                          target.run();
                          setCommandOpen(false);
                        }
                      }
                    }}
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
                  filteredCommandActions.map((action, index) => (
                    <button
                      key={action.id}
                      type="button"
                      onMouseEnter={() => setSelectedCommandIndex(index)}
                      onClick={() => {
                        action.run();
                        setCommandOpen(false);
                      }}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                        index === selectedCommandIndex
                          ? 'border-slate-300 bg-slate-100'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <AccountMfaPanel open={mfaPanelOpen} authMode="admin" onClose={() => setMfaPanelOpen(false)} />

    </AdminLayout>
  );
}
