// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/orderService';
<<<<<<< HEAD
import { formatCurrency, formatDateTime, formatOrderDisplayId, formatOrderStatus, formatOrderType } from '../utils/format';
import { getPaymentMethodMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

export function AdminOrders() {
  const { auth } = useAuth();
=======
import { formatAddress, formatCurrency, formatDateTime, formatOrderDisplayId, formatOrderStatus, formatOrderType } from '../utils/format';
import { getPaymentMethodMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatSelectedModifiers } from '../utils/productModifiers';
import { Hash, Storefront, Truck, ChartBar, CreditCard, Package, Gear, Scooter, Star, ShoppingCart, UsersThree, CheckSquare } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { AdminDesktopSidebar } from '../components/Admin/AdminDesktopSidebar';

export function AdminOrders() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
>>>>>>> main
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return localStorage.getItem('adminOrdersView') === 'table' ? 'table' : 'cards';
  });

  const storeId = auth?.store?.id;
  const storeSlug = auth?.store?.slug;
<<<<<<< HEAD
=======
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedPreference = localStorage.getItem('adminSidebar:compact');
    if (savedPreference === null) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return savedPreference === 'true';
  });
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR' || userRole === 'CHURRASQUEIRO';
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
            { id: 'cardapio', label: 'Catálogo Online', icon: Package },
            { id: 'fila', label: 'Pedidos ao vivo', icon: CheckSquare },
          ]
        : [
            { id: 'resumo', label: 'Resumo', icon: ChartBar },
            { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree },
            { id: 'config', label: 'Configurações', icon: Gear },
            { id: 'fila', label: 'Pedidos ao vivo', icon: CheckSquare },
            { id: 'cardapio', label: 'Catálogo Online', icon: Package },
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
>>>>>>> main

  useEffect(() => {
    if (!storeId && !storeSlug) return;

    const storeIdentifier = storeId || storeSlug;
    const unsubscribeOrders = orderService.subscribeAll(storeIdentifier, setOrders);

    return () => {
      unsubscribeOrders?.();
    };
  }, [storeId, storeSlug]);

  const sortedOrders = useMemo(() => {
    const resolveTime = (value) => {
      if (!value) return 0;
      if (value.seconds) return value.seconds * 1000;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return [...(orders || [])].sort((a, b) => resolveTime(b.createdAt) - resolveTime(a.createdAt));
  }, [orders]);

<<<<<<< HEAD
  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
=======
  const canonicalStatus = (raw: any) => {
    const st = String(raw || '').toLowerCase();
    if (st === 'delivered') return 'done';
    if (st === 'ready_for_delivery' || st === 'waiting_for_motoboy') return 'ready';
    return st || 'pending';
  };

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      if (statusFilter !== 'all') {
        const st = canonicalStatus(order.status);
        if (st !== String(statusFilter).toLowerCase()) return false;
      }
>>>>>>> main
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
<<<<<<< HEAD
        const key = order.status || 'pending';
=======
        const key = canonicalStatus(order.status);
>>>>>>> main
        acc[key] = (acc[key] || 0) + 1;
        acc.all += 1;
        return acc;
      },
<<<<<<< HEAD
      { all: 0, pending: 0, preparing: 0, done: 0, cancelled: 0 }
=======
      { all: 0, pending: 0, preparing: 0, ready: 0, done: 0, cancelled: 0 }
>>>>>>> main
    );
  }, [orders]);

  const statusStyles = (status) => {
<<<<<<< HEAD
    if (status === 'preparing') return 'bg-amber-100 text-amber-800';
    if (status === 'done') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-600';
    return 'bg-red-100 text-red-700';
  };
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar varinha');
    return labels.length ? `(${labels.join(' • ')})` : '';
  };
  const shortId = (value) => formatOrderDisplayId(value, storeSlug);
=======
    const st = String(status || '').toLowerCase();
    if (st === 'pending') return 'bg-amber-100 text-amber-800';
    if (st === 'preparing') return 'bg-sky-100 text-sky-700';
    if (st === 'ready') return 'bg-violet-100 text-violet-700';
    if (st === 'done' || st === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (st === 'cancelled') return 'bg-slate-100 text-slate-600';
    return 'bg-red-100 text-red-700';
  };
  const statusAccent = (status) => {
    const st = String(status || '').toLowerCase();
    if (st === 'pending') return 'border-l-amber-400 bg-gradient-to-r from-amber-50/70 to-white';
    if (st === 'preparing') return 'border-l-sky-400 bg-gradient-to-r from-sky-50/70 to-white';
    if (st === 'ready') return 'border-l-violet-400 bg-gradient-to-r from-violet-50/70 to-white';
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
      <div className={compact ? 'w-full rounded-2xl border border-slate-200 bg-white p-2.5' : 'w-full sm:w-auto'}>
        <div className="grid grid-cols-3 gap-1.5 text-[10px] sm:text-[11px] font-semibold">
          <span className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
            <span className="text-slate-500">Volume</span>
            <span className="text-slate-800">
              {money.itemCount} item{money.itemCount === 1 ? '' : 's'}
            </span>
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
>>>>>>> main

  const clearFilters = () => {
    setStatusFilter('all');
    setQuery('');
    setDateFilter('');
  };

  useEffect(() => {
    try {
      localStorage.setItem('adminOrdersView', viewMode);
    } catch {}
  }, [viewMode]);

  if (!auth?.store) {
<<<<<<< HEAD
    return <div style={{ padding: 24 }}>Carregando pedidos...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="mx-auto py-8 px-4 space-y-6">
        <AdminHeader contextLabel="Pedidos" />

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
=======
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
            logout();
            navigate('/admin');
          }}
        />
        <div className="min-w-0 flex-1 space-y-6">
        <AdminHeader contextLabel="Pedidos" />

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative z-20">
>>>>>>> main
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Lista de pedidos</h2>
              <p className="text-sm text-slate-500">{filteredOrders.length} pedidos encontrados</p>
            </div>
          </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
<<<<<<< HEAD
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Todos', count: statusCounts.all },
                  { id: 'pending', label: 'Pendentes', count: statusCounts.pending },
                { id: 'preparing', label: 'Em preparo', count: statusCounts.preparing },
                { id: 'done', label: 'Finalizados', count: statusCounts.done },
                { id: 'cancelled', label: 'Cancelados', count: statusCounts.cancelled },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    statusFilter === filter.id
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
=======
              <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
	                {[
	                  { id: 'all', label: 'Todos', count: statusCounts.all },
	                  { id: 'pending', label: 'Pendentes', count: statusCounts.pending },
	                { id: 'preparing', label: 'Em Preparação', count: statusCounts.preparing },
	                { id: 'ready', label: 'Disponível para Coleta', count: statusCounts.ready },
	                { id: 'done', label: 'Finalizados', count: statusCounts.done },
	                { id: 'cancelled', label: 'Cancelados', count: statusCounts.cancelled },
	              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors duration-150 ${
                    statusFilter === filter.id
                      ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                      : 'bg-transparent text-slate-600 border-transparent hover:bg-white/70'
>>>>>>> main
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
<<<<<<< HEAD
                className="w-full sm:w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
=======
                className="w-full sm:w-44 ds-select ds-focus-ring py-2 text-sm"
>>>>>>> main
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
<<<<<<< HEAD
                placeholder="Buscar cliente, telefone ou pedido (ex: 89035f7b)"
                className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
=======
                placeholder="Buscar cliente, telefone ou ID do pedido"
                className="w-full sm:w-64 ds-input ds-focus-ring py-2 text-sm"
>>>>>>> main
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                    viewMode === 'cards'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                    viewMode === 'table'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tabela
                </button>
              </div>
              <button
                onClick={clearFilters}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
<<<<<<< HEAD
              <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8">
=======
              <div className="mx-auto max-w-md ds-empty-state rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8">
>>>>>>> main
                <div className="text-4xl">🧾</div>
                <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum pedido por aqui ainda.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que entrarem pedidos, eles aparecem aqui com status e detalhes.
                </p>
<<<<<<< HEAD
=======
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 ds-btn ds-btn-secondary ds-focus-ring px-4 py-2 text-xs font-bold"
                >
                  Limpar filtros
                </button>
>>>>>>> main
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-4">
<<<<<<< HEAD
              {filteredOrders.map((order, index) => (
                <div
                  key={order.id || `${order.customerName}-${index}`}
                  className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-4"
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
=======
              <div className="sm:hidden space-y-3">
                {filteredOrders.map((order, index) => {
                  const paymentMeta = getPaymentMethodMeta(order.payment);
                  const groupedItems = groupOrderItems(order.items || []);
                  const previewItems = groupedItems.slice(0, 2);
                  const remaining = groupedItems.length - previewItems.length;
                  return (
                    <div
                      key={order.id || `${order.customerName}-${index}`}
                      className={`rounded-2xl border border-slate-200 border-l-4 ${statusAccent(order.status)} p-4 shadow-sm space-y-3 ds-interactive-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 font-semibold">
                              Pedido #{shortId(order.id)}
                            </span>
                            <span>{formatDateTime(order.createdAt)}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            {order.customerName || order.name || 'Cliente'}
                          </p>
                          <div className="mt-1">
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
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyles(order.status)}`}>
                            {formatOrderStatus(order.status, order.type)}
                          </span>
                          {renderMoneyBreakdown(order, true)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {paymentMeta.icon && (
                          <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                        )}
                        <span className="font-semibold">{paymentMeta.label}</span>
                        <span className="text-slate-400">•</span>
                        <span>{order.phone || 'Sem telefone'}</span>
                      </div>
                      {previewItems.length > 0 && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 space-y-2">
                          {previewItems.map((item, itemIndex) => (
                            <div key={`${item.id || item.productId || item.name || 'item'}-${itemIndex}`} className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-700">
                                {item.qty}x {item.name}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency((item.unitPrice ?? item.price ?? 0) * item.qty)}
                              </span>
                            </div>
                          ))}
                          {remaining > 0 && (
                            <div className="text-[11px] text-slate-400">
                              + {remaining} item(ns)
                            </div>
                          )}
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
                    className={`border border-slate-200 border-l-4 ${statusAccent(order.status)} rounded-2xl p-5 shadow-sm flex flex-col gap-4 ds-interactive-card`}
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
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${meta.pill}`}>
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
                              <span className="text-xs text-slate-500">
                                {formatPaymentStatus(order.paymentStatus)}
                              </span>
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
	                          <span className="inline-flex items-center gap-2">
	                            {paymentMeta.icon && (
	                              <img
>>>>>>> main
                                src={paymentMeta.icon}
                                alt={paymentMeta.label}
                                className="h-4 w-4 object-contain"
                              />
                            )}
                            {paymentMeta.label}
<<<<<<< HEAD
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
                        {order.items.map((item) => (
                          <div key={item.id || item.name} className="flex items-center justify-between gap-3">
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
                                    🍖
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
                                      passar varinha
                                    </span>
                                  )}
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
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr className="bg-slate-100/80">
                    <th className="py-3 pr-4 pl-3 rounded-l-xl">Data</th>
                    <th className="py-3 pr-4">Cliente</th>
                    <th className="py-3 pr-4 hidden md:table-cell">Tipo</th>
                    <th className="py-3 pr-4 hidden lg:table-cell">Pagamento</th>
                    <th className="py-3 pr-4 hidden lg:table-cell">Itens</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-3 text-right rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order, index) => (
                    <tr
                      key={order.id || `${order.customerName}-${index}`}
                      className="text-slate-700 hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3 pr-4 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold">{order.customerName || order.name || 'Cliente'}</div>
                        <div className="text-xs text-slate-400">{order.phone || '-'}</div>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap hidden md:table-cell">
                        {formatOrderType(order.type)}
                        {order.table ? ` · Mesa ${order.table}` : ''}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap hidden lg:table-cell">
                        {(() => {
                          const paymentMeta = getPaymentMethodMeta(order.payment);
                          return (
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
                          );
                        })()}
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
                          {formatOrderStatus(order.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-brand-primary">
                        {formatCurrency(order.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
=======
                          </span>
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
    </AdminLayout>
  );
}


>>>>>>> main
