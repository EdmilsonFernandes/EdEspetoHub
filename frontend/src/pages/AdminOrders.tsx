// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { useAuth } from '../contexts/AuthContext';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { orderService } from '../services/orderService';
import { formatAddress, formatCurrency, formatDateTime, formatOrderDisplayId, formatOrderStatus, formatOrderType } from '../utils/format';
import { getPaymentMethodMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatSelectedModifiers } from '../utils/productModifiers';
import { Hash, Storefront, Truck, ChartBar, ClipboardText, CreditCard, Package, Gear, Scooter, Star, UsersThree, CheckSquare, SquaresFour, Rows } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminDesktopSidebar } from '../components/Admin/AdminDesktopSidebar';
import { PaymentAuditPanel } from '../components/Admin/PaymentAuditPanel';
import { PaymentTechnicalModal } from '../components/Admin/PaymentTechnicalModal';

export function AdminOrders() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [postalSavingId, setPostalSavingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return localStorage.getItem('adminOrdersView') === 'table' ? 'table' : 'cards';
  });

  // Payment audit states
  const [orderPaymentOpen, setOrderPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderPaymentAudit, setSelectedOrderPaymentAudit] = useState<any | null>(null);
  const [orderPaymentAuditLoading, setOrderPaymentAuditLoading] = useState(false);
  const [orderPaymentTechnicalOpen, setOrderPaymentTechnicalOpen] = useState(false);

  const storeId = auth?.store?.id;
  const storeSlug = auth?.store?.slug;
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedPreference = localStorage.getItem('adminSidebar:compact');
    if (savedPreference === null) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return savedPreference === 'true';
  });
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR' || userRole === 'LOJISTA';
  const isVip = Boolean(auth?.store?.settings?.planExempt || auth?.subscription?.planExempt);
  const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
  const subscriptionStatus = String(auth?.subscription?.status || '').toUpperCase();
  const canUseMotoboys = Boolean(
    isVip ||
      auth?.features?.motoboyManagement ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );

  useEffect(() => {
    localStorage.setItem('adminSidebar:compact', String(sidebarCompact));
  }, [sidebarCompact]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktopLayout(media.matches);
    onChange();
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);
  useEffect(() => {
    if (!isDesktopLayout || !sidebarCompact) return;
    setSidebarCompact(false);
  }, [isDesktopLayout, sidebarCompact]);

  const desktopNavItems = useMemo(
    () =>
      (isOperatorUser
        ? [
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'cardapio', label: 'Loja Online', icon: Package },
            { id: 'fila', label: 'Gestor de Pedidos', icon: CheckSquare },
          ]
        : [
            { id: 'resumo', label: 'Resumo', icon: ChartBar },
            { id: 'pedidos', label: 'Histórico de Pedidos', icon: ClipboardText },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'estoque', label: 'Estoque', icon: Package },
            { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree },
            { id: 'config', label: 'Configurações', icon: Gear },
            { id: 'fila', label: 'Gestor de Pedidos', icon: CheckSquare },
            { id: 'cardapio', label: 'Loja Online', icon: Package },
          ]),
    [isOperatorUser, canUseMotoboys]
  );

  const handleNavSelect = (id: string) => {
    if (id === 'cardapio') {
      if (storeSlug) navigate(`/${storeSlug}`);
      return;
    }
    if (id === 'fila') {
      navigate('/admin/queue');
      return;
    }
    if (id === 'pedidos') {
      navigate('/admin/orders');
      return;
    }
    if (id === 'motoboys' && !canUseMotoboys) {
      navigate('/admin/renewal?focus=pro');
      return;
    }
    navigate('/admin/dashboard', { state: { activeTab: id } });
  };

  useEffect(() => {
    if (!storeId && !storeSlug) return;

    const storeIdentifier = storeId || storeSlug;
    const unsubscribeOrders = orderService.subscribeAll(storeIdentifier, setOrders);

    return () => {
      unsubscribeOrders?.();
    };
  }, [storeId, storeSlug]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const orderId = String(params.get('orderId') || '').trim();
    if (!orderId) return;
    setStatusFilter('all');
    setDateFilter('');
    setQuery(orderId);
  }, [location.search]);

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
    if (st === 'ready_for_delivery' || st === 'waiting_for_motoboy' || st === 'in_delivery' || st === 'dispatched') return 'ready';
    return st || 'pending';
  };

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      if (statusFilter !== 'all') {
        const st = canonicalStatus(order.status);
        if (st !== String(statusFilter).toLowerCase()) return false;
      }
      if (dateFilter) {
        const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt);
        if (!Number.isFinite(date.getTime())) return false;
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
        if (localDate !== dateFilter) return false;
      }
      if (!normalized) return true;
      const haystack = [
        order.customerName,
        order.name,
        order.phone,
        order.id,
        formatOrderDisplayId(order.id, storeSlug),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [sortedOrders, statusFilter, query, dateFilter]);

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
    if (st === 'ready' || st === 'dispatched' || st === 'in_delivery') return 'bg-violet-100 text-violet-700';
    if (st === 'done' || st === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (st === 'cancelled') return 'bg-slate-100 text-slate-600';
    return 'bg-red-100 text-red-700';
  };
  const statusAccent = (status) => {
    const st = String(status || '').toLowerCase();
    if (st === 'pending') return 'border-l-amber-400 bg-gradient-to-r from-amber-50/70 to-white';
    if (st === 'preparing') return 'border-l-sky-400 bg-gradient-to-r from-sky-50/70 to-white';
    if (st === 'ready' || st === 'dispatched' || st === 'in_delivery') return 'border-l-violet-400 bg-gradient-to-r from-violet-50/70 to-white';
    if (st === 'done' || st === 'delivered') return 'border-l-emerald-400 bg-gradient-to-r from-emerald-50/70 to-white';
    if (st === 'cancelled') return 'border-l-slate-300 bg-gradient-to-r from-slate-50 to-white';
    return 'border-l-rose-400 bg-gradient-to-r from-rose-50/70 to-white';
  };
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar farinha');
    const selected = formatSelectedModifiers(item?.selectedModifiers || []);
    if (selected.length) labels.push(`+ ${selected.join(', ')}`);
    return labels.length ? `(${labels.join(' • ')})` : '';
  };
  const formatPaymentStatus = (status) => {
    const normalized = (status || '').toString().toUpperCase();
    if (normalized === 'PAID') return 'Pago';
    if (normalized === 'PENDING') return 'Pendente';
    return normalized || 'Pendente';
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
      order.type === 'delivery' && order.deliveryFee !== null && order.deliveryFee !== undefined
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
      if (!map.has(key)) map.set(key, { ...item, qty: 0, unitPrice });
      const current = map.get(key);
      current.qty = Number(current.qty || 0) + qty;
      map.set(key, current);
    });
    return Array.from(map.values());
  };
  const renderMoneyBreakdown = (order: any, compact = false) => {
    const money = getOrderMoney(order);
    return (
      <div className={compact ? 'w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5' : 'mt-2 w-full sm:mt-0 sm:w-auto'}>
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
          <span className="flex flex-col whitespace-nowrap rounded-xl border border-slate-900/10 bg-white px-2.5 py-1.5 shadow-[0_6px_18px_-14px_rgba(15,23,42,0.45)]">
            <span className="text-slate-500">Total</span>
            <span className="text-slate-900 font-black text-base leading-none">{formatCurrency(money.total)}</span>
          </span>
        </div>
      </div>
    );
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setQuery('');
    setDateFilter('');
  };

  const refreshOrders = async () => {
    const storeIdentifier = storeId || storeSlug;
    if (!storeIdentifier) return;
    try {
      const list = await orderService.fetchAll(storeIdentifier);
      setOrders(list || []);
    } catch (error) {
      console.error('Erro ao atualizar pedidos', error);
    }
  };

  const handleFulfillmentModeChange = async (order: any, nextMode: 'distance' | 'postal') => {
    if (!order?.id || String(order?.type || '').toLowerCase() !== 'delivery') return;
    try {
      setPostalSavingId(order.id);
      await orderService.updateFulfillmentMode(order.id, nextMode);
      await refreshOrders();
    } catch (error: any) {
      alert(error?.message || 'Não foi possível atualizar o modo de entrega.');
    } finally {
      setPostalSavingId(null);
    }
  };

  const handlePostalTrackAndPost = async (order: any) => {
    if (!order?.id) return;
    const currentCode = String(order?.shipment?.trackingCode || '').trim();
    const trackingCode = String(window.prompt('Código de rastreio:', currentCode) || '').trim();
    if (!trackingCode) return;
    const currentUrl = String(order?.shipment?.trackingUrl || '').trim();
    const trackingUrl = String(
      window.prompt('Link de rastreio (opcional):', currentUrl) || ''
    ).trim();
    try {
      setPostalSavingId(order.id);
      await orderService.updatePostalShipment(order.id, {
        trackingCode,
        trackingUrl: trackingUrl || undefined,
        markPosted: true,
      });
      await refreshOrders();
    } catch (error: any) {
      alert(error?.message || 'Não foi possível salvar o rastreio.');
    } finally {
      setPostalSavingId(null);
    }
  };

  const openOrderPayment = (order: any) => {
    if (!order?.id || !storeId) return;
    setSelectedOrder(order);
    setSelectedOrderPaymentAudit(null);
    setOrderPaymentOpen(true);
    void loadOrderPaymentAudit(order.id, true);
  };

  const closeOrderPayment = () => {
    setOrderPaymentOpen(false);
    setSelectedOrder(null);
    setSelectedOrderPaymentAudit(null);
    setOrderPaymentTechnicalOpen(false);
  };

  const loadOrderPaymentAudit = async (orderIdRaw: string, silent = false) => {
    const orderId = String(orderIdRaw || '').trim();
    if (!orderId || !storeId) return null;
    setOrderPaymentAuditLoading(true);
    try {
      const payload = await orderService.getPaymentAudit(orderId, storeId);
      setSelectedOrderPaymentAudit(payload || null);
      return payload;
    } catch (error: any) {
      if (!silent) {
        alert(error?.message || 'Não foi possível carregar os detalhes do pagamento agora.');
      }
      return null;
    } finally {
      setOrderPaymentAuditLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('adminOrdersView', viewMode);
    } catch {}
  }, [viewMode]);

  if (!auth?.store) {
    return (
      <div className="p-6 space-y-3">
        <div className="ds-skeleton h-20 w-full" />
        <div className="ds-skeleton h-24 w-full" />
        <div className="ds-skeleton h-24 w-full" />
      </div>
    );
  }

  return (
    <AdminLayout contextLabel="Pedidos" showHeader={false} fluid>
      <div
        className={`w-full space-y-6 lg:space-y-0 lg:grid lg:items-start lg:gap-0 ${
          sidebarCompact ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'
        }`}
      >
        <AdminDesktopSidebar
          items={desktopNavItems.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            disabled: item.disabled,
            badge: item.id === 'motoboys' && item.disabled ? 'Pro' : undefined,
            tone: item.id === 'motoboys' && item.disabled ? 'violet' : 'default',
          }))}
          activeId="pedidos"
          compact={sidebarCompact}
          onToggleCompact={() => setSidebarCompact((prev) => !prev)}
          onSelect={handleNavSelect}
          onLogout={() => {
            markManualLogoutRedirect('admin', '/hub');
            logout();
            navigate('/hub', { replace: true });
          }}
        />
        <div className="min-w-0 flex-1 space-y-6">
        <AdminHeader contextLabel="Pedidos" />

        <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] relative z-20">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Histórico de Pedidos</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{filteredOrders.length}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Acompanhe status, filtros e histórico dos pedidos.</p>
            </div>
          </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                    statusFilter === filter.id
                      ? 'bg-white text-slate-900 border-slate-200 shadow-[0_4px_14px_rgba(15,23,42,0.08)]'
                      : 'bg-transparent text-slate-600 border-transparent hover:bg-white/80'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:ml-auto w-full lg:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full sm:w-44 ds-select ds-focus-ring py-2 text-sm"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar cliente, telefone ou ID do pedido"
                className="w-full sm:w-64 ds-input ds-focus-ring py-2 text-sm"
              />
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 gap-0.5 shrink-0">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <SquaresFour size={13} weight={viewMode === 'cards' ? 'fill' : 'duotone'} />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Rows size={13} weight={viewMode === 'table' ? 'fill' : 'duotone'} />
                  Tabela
                </button>
              </div>
              {(statusFilter !== 'all' || dateFilter || query) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-lg text-xs font-bold border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition shrink-0"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mx-auto max-w-md ds-empty-state rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8">
                <div className="text-4xl">🧾</div>
                <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum pedido por aqui ainda.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que entrarem pedidos, eles aparecem aqui com status e detalhes.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 ds-btn ds-btn-secondary ds-focus-ring px-4 py-2 text-xs font-bold"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-4">
              <div className="sm:hidden space-y-3">
                {filteredOrders.map((order, index) => {
                  const paymentMeta = getPaymentMethodMeta(order.payment);
                  const groupedItems = groupOrderItems(order.items || []);
                  const previewItems = groupedItems.slice(0, 2);
                  const remaining = groupedItems.length - previewItems.length;
                  return (
                    <div
                      key={order.id || `${order.customerName}-${index}`}
                      className={`overflow-hidden rounded-[22px] bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.15)] ring-1 ${statusAccent(order.status).includes('emerald') ? 'ring-emerald-100' : statusAccent(order.status).includes('amber') ? 'ring-amber-100' : statusAccent(order.status).includes('sky') ? 'ring-sky-100' : statusAccent(order.status).includes('rose') ? 'ring-rose-100' : 'ring-slate-100'} ds-interactive-card`}
                    >
                      {/* Header do card */}
                      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">#{shortId(order.id)}</span>
                            <span className="text-[10px] text-slate-400">{formatDateTime(order.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-[15px] font-black text-slate-900">
                            {order.customerName || order.name || 'Cliente'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {(() => { const meta = orderTypeMeta(order); return (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.pill}`}>
                                {meta.icon}<span>{meta.label}</span>
                              </span>
                            ); })()}
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyles(order.status)}`}>
                              {formatOrderStatus(order.status, order.type)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {renderMoneyBreakdown(order, true)}
                        </div>
                      </div>

                      {/* Pagamento + telefone */}
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
                        {paymentMeta.icon && <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-3.5 w-3.5 object-contain" />}
                        <span className="font-semibold text-slate-700">{paymentMeta.label}</span>
                        <span className="text-slate-300">·</span>
                        <span>{order.phone || 'Sem telefone'}</span>
                        {order?.paymentMethod === 'MERCADO_PAGO' && (
                          <button type="button" onClick={() => openOrderPayment(order)} className="ml-auto rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Ver pagamento
                          </button>
                        )}
                      </div>

                      {/* Entrega postal */}
                      {String(order?.type || '').toLowerCase() === 'delivery' && (
                        <div className="border-t border-slate-100 px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">Entrega:</span>
                            <button type="button" disabled={postalSavingId === order.id} onClick={() => handleFulfillmentModeChange(order, 'distance')} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${String(order?.fulfillmentMode || 'distance').toLowerCase() === 'distance' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Local</button>
                            <button type="button" disabled={postalSavingId === order.id} onClick={() => handleFulfillmentModeChange(order, 'postal')} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${String(order?.fulfillmentMode || 'distance').toLowerCase() === 'postal' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Postal</button>
                            {String(order?.fulfillmentMode || '').toLowerCase() === 'postal' && (
                              <button type="button" disabled={postalSavingId === order.id} onClick={() => handlePostalTrackAndPost(order)} className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">Rastreio + Postado</button>
                            )}
                          </div>
                          {order?.shipment?.trackingCode && (
                            <p className="mt-1 text-[11px] text-slate-500">Código: <span className="font-semibold">{order.shipment.trackingCode}</span></p>
                          )}
                        </div>
                      )}

                      {/* Itens */}
                      {previewItems.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-2.5 space-y-1.5">
                          {previewItems.map((item, itemIndex) => (
                            <div key={`${item.id || item.name}-${itemIndex}`} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{item.qty}</span>
                                <span className="truncate text-[12px] font-semibold text-slate-700">{item.name}</span>
                              </div>
                              <span className="shrink-0 text-[12px] font-semibold text-slate-600">{formatCurrency((item.unitPrice ?? item.price ?? 0) * item.qty)}</span>
                            </div>
                          ))}
                          {remaining > 0 && <p className="text-[11px] text-slate-400">+{remaining} item(ns)</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block space-y-4">
                {filteredOrders.map((order, index) => (
                  <div
                    key={order.id || `${order.customerName}-${index}`}
                    className={`rounded-[24px] border border-l-4 ${statusAccent(order.status)} p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] flex flex-col gap-4 ds-interactive-card`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 font-bold uppercase tracking-[0.12em]">
                            Pedido #{shortId(order.id)}
                          </span>
                          <span>{formatDateTime(order.createdAt)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          {(() => {
                            const meta = orderTypeMeta(order);
                            return (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${meta.pill}`}>
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
                        <p className="font-extrabold text-slate-800 text-base leading-tight">{order.customerName || order.name || 'Cliente'}</p>
                        <p className="text-xs text-slate-500">{order.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Pagamento</p>
                        {(() => {
                          const paymentMeta = getPaymentMethodMeta(order.payment);
                          return (
                            <div className="flex flex-col gap-1">
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
                              <span className="text-xs text-slate-500 mb-2">
                                {formatPaymentStatus(order.paymentStatus)}
                              </span>
                              {order?.paymentMethod === 'MERCADO_PAGO' && (
                                <button
                                  type="button"
                                  onClick={() => openOrderPayment(order)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-700"
                                >
                                  Ver pagamento
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Endereço</p>
                        <p className="font-semibold text-slate-700">{formatAddress(order.address || order.deliveryAddress) || '-'}</p>
                        {order.type === 'delivery' && order.deliveryFee !== null && order.deliveryFee !== undefined && (
                          <p className="text-xs text-slate-500">Frete: {formatCurrency(order.deliveryFee)}</p>
                        )}
                      </div>
                    </div>
                    {String(order?.type || '').toLowerCase() === 'delivery' && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Fluxo de entrega</p>
                          <span className="text-xs font-bold text-slate-700">
                            {String(order?.fulfillmentMode || 'distance').toLowerCase() === 'postal' ? 'Postal' : 'Local'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={postalSavingId === order.id}
                            onClick={() => handleFulfillmentModeChange(order, 'distance')}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                              String(order?.fulfillmentMode || 'distance').toLowerCase() === 'distance'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            Entrega local
                          </button>
                          <button
                            type="button"
                            disabled={postalSavingId === order.id}
                            onClick={() => handleFulfillmentModeChange(order, 'postal')}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                              String(order?.fulfillmentMode || 'distance').toLowerCase() === 'postal'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            Envio postal
                          </button>
                          {String(order?.fulfillmentMode || '').toLowerCase() === 'postal' && (
                            <button
                              type="button"
                              disabled={postalSavingId === order.id}
                              onClick={() => handlePostalTrackAndPost(order)}
                              className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-300 bg-white text-slate-700"
                            >
                              Informar rastreio
                            </button>
                          )}
                        </div>
                        {order?.shipment?.trackingCode && (
                          <div className="text-xs text-slate-600">
                            Código de rastreio: <span className="font-semibold">{order.shipment.trackingCode}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {groupOrderItems(order.items || []).length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-xs uppercase text-slate-400 mb-2">Itens</p>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
                          {groupOrderItems(order.items || []).map((item, itemIndex) => (
                            <div key={`${item.id || item.productId || item.name || 'item'}-${itemIndex}`} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                  {item.imageUrl ? (
                                    <img
                                      src={resolveAssetUrl(item.imageUrl)}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                      🧾
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold">
                                    {item.qty}x {item.name}
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
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
                              </div>
                              <span className="font-semibold">
                                {formatCurrency((item.unitPrice ?? item.price ?? 0) * item.qty)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
	            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
	              <table className="min-w-full text-sm">
	                <thead className="text-left text-xs uppercase text-slate-500">
	                  <tr>
	                    <th className="py-2 pr-4 pl-3">Data</th>
	                    <th className="py-2 pr-4">Cliente</th>
	                    <th className="py-2 pr-4 hidden md:table-cell">Tipo</th>
	                    <th className="py-2 pr-4 hidden lg:table-cell">Pagamento</th>
	                    <th className="py-2 pr-4 hidden lg:table-cell">Itens</th>
	                    <th className="py-2 pr-4">Status</th>
	                    <th className="py-2 pr-3 text-right">Total</th>
	                  </tr>
	                </thead>
	                <tbody className="divide-y divide-slate-100">
	                  {filteredOrders.map((order, index) => {
	                    const paymentMeta = getPaymentMethodMeta(order.payment);
	                    const typeMeta = orderTypeMeta(order);
	                    return (
	                      <tr
	                        key={order.id || `${order.customerName}-${index}`}
	                        className="text-slate-700 hover:bg-slate-50 transition-colors duration-150"
	                      >
	                        <td className="py-3 pr-4 pl-4 whitespace-nowrap">
	                          {formatDateTime(order.createdAt)}
	                        </td>
	                        <td className="py-3 pr-4">
	                          <div className="font-semibold">{order.customerName || order.name || 'Cliente'}</div>
	                          <div className="text-xs text-slate-400">{order.phone || '-'}</div>
	                        </td>
	                        <td className="py-3 pr-4 whitespace-nowrap hidden md:table-cell">
	                          <span
	                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${typeMeta.pill}`}
	                          >
	                            {typeMeta.icon}
	                            <span>{typeMeta.label}</span>
	                          </span>
	                        </td>
	                        <td className="py-3 pr-4 whitespace-nowrap hidden lg:table-cell">
	                          <div className="flex flex-col gap-1">
	                            <span className="inline-flex items-center gap-2">
	                              {paymentMeta.icon && (
	                                <img
	                                  src={paymentMeta.icon}
	                                  alt={paymentMeta.label}
	                                  className="h-4 w-4 object-contain"
	                                />
	                              )}
	                              {paymentMeta.label}
	                            </span>
	                            <span className="text-xs text-slate-500 mb-2">
	                              {formatPaymentStatus(order.paymentStatus)}
	                            </span>
                              {order?.paymentMethod === 'MERCADO_PAGO' && (
                                <button
                                  type="button"
                                  onClick={() => openOrderPayment(order)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-700"
                                >
                                  Ver pagamento
                                </button>
                              )}
                            </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-600 min-w-[180px] hidden lg:table-cell">
                          {(order.items || []).length === 0
                            ? '-'
                            : order.items
                                .map((item) => `${item.qty}x ${item.name} ${formatItemOptions(item)}`.trim())
                                .join(', ')}
                        </td>
	                        <td className="py-3 pr-4">
	                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles(order.status)}`}>
	                            {formatOrderStatus(order.status, order.type)}
	                          </span>
	                        </td>
	                        <td className="py-3 pr-4 min-w-[220px]">
                            {renderMoneyBreakdown(order)}
	                        </td>
	                      </tr>
	                    );
	                  })}
	                </tbody>
	              </table>
	            </div>
	          )}
        </div>
        </div>
      </div>
      {orderPaymentOpen && selectedOrder && (
        <div className="fixed inset-0 z-[320] bg-slate-950/55 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Pagamento do pedido</p>
              <h3 className="text-lg font-black text-slate-900">{selectedOrder?.customerName || selectedOrder?.name || 'Pedido'}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Status: <strong>{formatPaymentStatus(selectedOrder?.paymentStatus)}</strong>
                {selectedOrder?.paymentExpiresAt ? ` • expira em ${formatDateTime(selectedOrder.paymentExpiresAt)}` : ''}
              </p>
            </div>

            <div className="mt-3">
              <PaymentAuditPanel
                title="Informações de pagamento do pedido"
                summary={selectedOrderPaymentAudit?.summary}
                events={selectedOrderPaymentAudit?.events || []}
                showTechnicalButton={true}
                technicalLoading={orderPaymentAuditLoading}
                onTechnicalClick={async () => {
                  const payload = selectedOrderPaymentAudit || (await loadOrderPaymentAudit(String(selectedOrder?.id || ''), false));
                  if (payload) setOrderPaymentTechnicalOpen(true);
                }}
              />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeOrderPayment}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentTechnicalModal
        open={orderPaymentTechnicalOpen}
        title="Detalhes técnicos do pagamento do pedido"
        audit={selectedOrderPaymentAudit}
        onClose={() => setOrderPaymentTechnicalOpen(false)}
      />
    </AdminLayout>
  );
}


