// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { orderService } from '../services/orderService';
import { useNavigate } from 'react-router-dom';
import { ChefHat, LayoutDashboard, ShoppingCart, LogOut } from 'lucide-react';
import { StoreIdentityCard } from '../components/Admin/StoreIdentityCard';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { formatCurrency, formatDateTime, formatOrderStatus, formatOrderType, formatPaymentMethod } from '../utils/format';

export function AdminOrders() {
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return localStorage.getItem('adminOrdersView') === 'table' ? 'table' : 'cards';
  });
  const navigate = useNavigate();

  const storeId = auth?.store?.id;
  const storeSlug = auth?.store?.slug;
  const socialLinks = auth?.store?.settings?.socialLinks || [];
  const manualOpen = auth?.store?.open ?? true;
  const whatsappNumber = auth?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';

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

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
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
        const key = order.status || 'pending';
        acc[key] = (acc[key] || 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, pending: 0, preparing: 0, done: 0 }
    );
  }, [orders]);

  const statusStyles = (status) => {
    if (status === 'preparing') return 'bg-amber-100 text-amber-800';
    if (status === 'done') return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-700';
  };

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
    return <div style={{ padding: 24 }}>Carregando pedidos...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header
          className="p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${branding?.primaryColor || '#b91c1c'} 0%, ${branding?.secondaryColor || '#111827'} 100%)`,
            color: '#fff',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding?.brandName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black">{branding?.brandName?.slice(0, 2)?.toUpperCase() || 'ED'}</span>
              )}
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold opacity-90">Pedidos</p>
              <h1 className="text-xl font-black leading-tight">{branding?.brandName || auth?.store?.name}</h1>
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs opacity-80 hover:opacity-100"
                >
                  {instagramHandle}
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm font-semibold">Atalhos</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <LayoutDashboard size={14} /> Dashboard
              </button>
              <button
                onClick={() => navigate('/admin/queue')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <ChefHat size={14} /> Fila
              </button>
              <button
                onClick={() => navigate(auth?.store?.slug ? `/${auth.store.slug}` : '/')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <ShoppingCart size={14} /> Vitrine
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/admin');
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </header>

        <StoreIdentityCard
          branding={branding}
          socialLinks={socialLinks}
          manualOpen={manualOpen}
          whatsappNumber={whatsappNumber}
        />
        <OpeningHoursCard />

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Lista de pedidos</h2>
              <p className="text-sm text-slate-500">{filteredOrders.length} pedidos encontrados</p>
            </div>
          </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Todos', count: statusCounts.all },
                  { id: 'pending', label: 'Pendentes', count: statusCounts.pending },
                { id: 'preparing', label: 'Em preparo', count: statusCounts.preparing },
                { id: 'done', label: 'Finalizados', count: statusCounts.done },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
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
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full sm:w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por cliente, telefone..."
                className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
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
            <div className="py-12 text-center text-slate-500">Nenhum pedido por aqui ainda.</div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <div
                  key={order.id || `${order.customerName}-${index}`}
                  className="border border-slate-200 rounded-2xl p-4 flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                        {formatDateTime(order.createdAt)}
                      </p>
                      <h3 className="text-base font-bold text-slate-800">
                        {order.customerName || order.name || 'Cliente'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {formatOrderType(order.type)}
                        {order.table ? ` · Mesa ${order.table}` : ''}
                      </p>
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
                      <p className="text-xs uppercase text-slate-400">Telefone</p>
                      <p className="font-semibold text-slate-700">{order.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Pagamento</p>
                      <p className="font-semibold text-slate-700">{formatPaymentMethod(order.payment)}</p>
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
                          <div key={item.id || item.name} className="flex items-center justify-between">
                            <span>
                              {item.qty}x {item.name}
                            </span>
                            <span className="font-semibold">{formatCurrency((item.unitPrice ?? item.price ?? 0) * item.qty)}</span>
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
                <thead className="text-left text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Tipo</th>
                    <th className="py-2 pr-4 hidden lg:table-cell">Pagamento</th>
                    <th className="py-2 pr-4 hidden lg:table-cell">Itens</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id || `${order.customerName}-${index}`} className="text-slate-700">
                      <td className="py-3 pr-4 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold">{order.customerName || order.name || 'Cliente'}</div>
                        <div className="text-xs text-slate-400">{order.phone || '-'}</div>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap hidden md:table-cell">
                        {formatOrderType(order.type)}
                        {order.table ? ` · Mesa ${order.table}` : ''}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap hidden lg:table-cell">{formatPaymentMethod(order.payment)}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600 min-w-[180px] hidden lg:table-cell">
                        {(order.items || []).length === 0
                          ? '-'
                          : order.items
                              .map((item) => `${item.qty}x ${item.name}`)
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
