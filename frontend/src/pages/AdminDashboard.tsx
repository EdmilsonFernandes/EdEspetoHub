// @ts-nocheck
import { BarChart3, ChefHat, Package, Settings, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { BrandingSettings } from '../components/Admin/BrandingSettings';
import DashboardView from '../components/Admin/DashboardView';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { ProductManager } from '../components/Admin/ProductManager';
import { StoreIdentityCard } from '../components/Admin/StoreIdentityCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { formatCurrency, formatDateTime, formatOrderStatus, formatOrderType } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const OrdersView = ({ orders }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

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
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (localDate !== dateFilter) return false;
      }
      if (!normalized) return true;
      const haystack = [order.customerName, order.name, order.phone, order.id].filter(Boolean).join(' ').toLowerCase();
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
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, telefone..."
            className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-slate-500">Nenhum pedido por aqui ainda.</div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <div key={order.id || `${order.customerName}-${index}`} className="border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
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
              {order.items && order.items.length > 0 && (
                <div className="text-sm text-slate-600">
                  <strong>Itens:</strong> {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  session?: any;
}

export function AdminDashboard({ session: sessionProp }: Props) {
  const navigate = useNavigate();
  const { auth, hydrated, setAuth } = useAuth();
  const { branding, setBranding } = useTheme();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'pedidos' | 'produtos' | 'config' | 'fila'>('resumo');

  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const whatsappNumber = session?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const manualOpen = session?.store?.open ?? true;
  const [savingStatus, setSavingStatus] = useState(false);
  const [brandingDraft, setBrandingDraft] = useState(() => ({
    brandName: session?.store?.name || '',
    logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
    logoFile: '',
    primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
    secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
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
      primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
      secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
      instagram: instagramHandle?.replace('@', '') || '',
    });
  }, [
    session?.store?.name,
    session?.store?.settings?.logoUrl,
    session?.store?.settings?.primaryColor,
    session?.store?.settings?.secondaryColor,
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


  const toggleManualOpen = async () => {
    if (!storeId) return;
    setSavingStatus(true);
    try {
      const nextOpen = !manualOpen;
      const updated = await storeService.setStatus(storeId, nextOpen);
      updateAuthStore({ open: updated?.open ?? nextOpen });
    } catch (err) {
      console.error('Erro ao atualizar status manual', err);
      setError('Nao foi possivel atualizar o status da loja.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!storeId) return;
    setSavingBranding(true);
    setError('');
    try {
      const payload = {
        name: brandingDraft.brandName,
        logoFile: brandingDraft.logoFile || undefined,
        logoUrl: brandingDraft.logoFile ? undefined : brandingDraft.logoUrl || undefined,
        primaryColor: brandingDraft.primaryColor,
        secondaryColor: brandingDraft.secondaryColor,
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
    } catch (err) {
      console.error('Erro ao salvar identidade', err);
      setError('Nao foi possivel salvar a identidade da loja.');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="mx-auto p-4 space-y-6">
        <AdminHeader contextLabel="Painel da Loja" />

        <div className="flex justify-center">
          <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm inline-flex gap-2">
          {[
            { id: 'resumo', label: 'Resumo', icon: BarChart3 },
            { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'config', label: 'Configurações', icon: Settings },
            { id: 'fila', label: 'Fila do churrasqueiro', icon: ChefHat },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
          </div>
        </div>

        {activeTab === 'resumo' && <DashboardView orders={orders} customers={customers} />}

        {activeTab === 'pedidos' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <OrdersView orders={orders} />
          </div>
        )}

        {activeTab === 'produtos' && <ProductManager products={products} />}

        {activeTab === 'config' && (
          <div className="space-y-4">
              <StoreIdentityCard
                branding={branding}
                socialLinks={socialLinks}
                manualOpen={manualOpen}
                onToggleOpen={savingStatus ? undefined : toggleManualOpen}
                whatsappNumber={whatsappNumber}
              />
            <BrandingSettings branding={brandingDraft} onChange={setBrandingDraft} storeSlug={storeSlug} />
            <div className="flex justify-end">
              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {savingBranding ? 'Salvando...' : 'Salvar identidade'}
              </button>
            </div>
            <OpeningHoursCard />
          </div>
        )}

        {activeTab === 'fila' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <GrillQueue />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
