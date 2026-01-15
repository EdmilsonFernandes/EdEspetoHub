// @ts-nocheck
import { BarChart3, ChefHat, CreditCard, Package, Settings, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { BrandingSettings } from '../components/Admin/BrandingSettings';
import DashboardView from '../components/Admin/DashboardView';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { ProductManager } from '../components/Admin/ProductManager';
import { StoreIdentityCard } from '../components/Admin/StoreIdentityCard';
import { OrderTypeSettingsCard } from '../components/Admin/OrderTypeSettingsCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { subscriptionService } from '../services/subscriptionService';
import { formatCurrency, formatDateTime, formatOrderStatus, formatOrderType, formatPaymentMethod } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const OrdersView = ({ orders, products }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
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
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (dateFilter) {
        const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt);
        if (!Number.isFinite(date.getTime())) return false;
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (localDate !== dateFilter) return false;
      }
      if (!normalized) return true;
      const haystack = [order.customerName, order.name, order.phone, order.id, order.id?.slice(0, 8)]
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
  const shortId = (value) => (value ? String(value).slice(0, 8) : '');

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
            placeholder="Buscar cliente, telefone ou pedido (ex: 89035f7b)"
            className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-slate-500">Nenhum pedido por aqui ainda.</div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
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
                  <p className="font-semibold text-slate-700">{formatPaymentMethod(order.payment)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Endereco</p>
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
        </div>
      )}
    </div>
  );
};

const PaymentsView = ({ subscription, loading, error }) => {
  const plan = subscription?.plan;
  const planLabel = plan?.displayName || plan?.name || 'Plano nao identificado';
  const priceValue = subscription?.latestPaymentAmount ?? plan?.price ?? 0;
  const method = (subscription?.paymentMethod || '').toUpperCase();
  const methodLabel =
    method === 'CREDIT_CARD'
      ? 'Cartao de credito'
      : method === 'BOLETO'
      ? 'Boleto'
      : method === 'PIX'
      ? 'Pix'
      : method || 'Nao informado';
  const expiresLabel = subscription?.endDate ? formatDateTime(subscription.endDate) : '—';
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
            <p className="text-lg font-semibold text-slate-900 mt-2">{methodLabel}</p>
            <p className="text-xs text-slate-500 mt-1">{paymentStatus}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)] space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Ciclo</p>
          <h3 className="text-lg font-bold text-slate-900 mt-2">Proximo vencimento</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Expira em</p>
          <p className="text-lg font-semibold text-slate-900 mt-2">{expiresLabel}</p>
          <p className="text-xs text-slate-500 mt-1">Ultimo pagamento: {paidAtLabel}</p>
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
  const { auth, hydrated, setAuth } = useAuth();
  const { branding, setBranding } = useTheme();
  const { showToast } = useToast();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pedidos' | 'produtos' | 'config' | 'fila' | 'pagamentos'>(() => {
    return (location.state as any)?.activeTab || 'resumo';
  });

  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
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
      instagram: instagramHandle?.replace('@', '') || '',
    });
  }, [
    session?.store?.name,
    session?.store?.settings?.logoUrl,
    session?.store?.settings?.description,
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
          setSubscriptionError(err.message || 'Nao foi possivel carregar a assinatura.');
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
      setError('Nao foi possivel salvar a identidade da loja.');
      showToast('Nao foi possivel salvar a identidade da loja', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <AdminLayout contextLabel="Painel da Loja">
      <div className="flex justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm inline-flex gap-2">
        {[
          { id: 'resumo', label: 'Resumo', icon: BarChart3 },
          { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
          { id: 'produtos', label: 'Produtos', icon: Package },
          { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
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
          <OrdersView orders={orders} products={products} />
        </div>
      )}

      {activeTab === 'produtos' && <ProductManager products={products} />}

      {activeTab === 'pagamentos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <PaymentsView
            subscription={subscriptionDetails}
            loading={subscriptionLoading}
            error={subscriptionError}
          />
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
            <StoreIdentityCard
              branding={branding}
              socialLinks={socialLinks}
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
