import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Send,
  UtensilsCrossed,
  User,
  ChefHat,
  LayoutDashboard,
  Package,
  FileText,
  LogOut
} from 'lucide-react';
import { productService } from './services/productService';
import { orderService } from './services/orderService';
import { authService } from './services/authService';
import { customerService } from './services/customerService';
import { MenuView } from './components/Client/MenuView';
import { CartView } from './components/Client/CartView';
import { SuccessView } from './components/Client/SuccessView';
import { DashboardView } from './components/Admin/DashboardView';
import { ProductManager } from './components/Admin/ProductManager';
import { GrillQueue } from './components/Admin/GrillQueue';
import { BrandingSettings } from './components/Admin/BrandingSettings';
import { apiClient } from './config/apiClient';
import {
  formatCurrency,
  formatOrderStatus,
  formatOrderType,
  formatPaymentMethod,
  formatPhoneInput,
} from './utils/format';
import { exportToCsv } from './utils/export';
import './index.css';

const DEFAULT_AREA_CODE = '12';
const initialCustomer = { name: '', phone: formatPhoneInput('', DEFAULT_AREA_CODE), address: '', table: '', type: 'delivery' };
const defaultPaymentMethod = 'debito';
const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || '5512996797210';
const PIX_KEY = process.env.REACT_APP_PIX_KEY || '';
const defaultBranding = {
  brandName: 'Datony',
  espetoId: 'espetinhodatony',
  logoUrl: '/logo-datony.svg',
  primaryColor: '#b91c1c',
  accentColor: '#111827',
  tagline: 'O melhor churrasco da região • Peça agora',
  instagram: 'espetinhodatony',
};

const brandingStorageKey = (ownerId) => `brandingSettings:${ownerId || defaultBranding.espetoId}`;

const getPersistedBranding = (ownerId = defaultBranding.espetoId) => {
  const saved = localStorage.getItem(brandingStorageKey(ownerId));
  if (!saved) return { ...defaultBranding, espetoId: ownerId };
  try {
    const parsed = JSON.parse(saved);
    return { ...defaultBranding, espetoId: ownerId, ...parsed };
  } catch (error) {
    console.error('Erro ao carregar branding salvo', error);
    return { ...defaultBranding, espetoId: ownerId };
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState('menu');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [lastOrder, setLastOrder] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', espetoId: defaultBranding.espetoId });
  const [loginError, setLoginError] = useState('');
  const [branding, setBranding] = useState(() => getPersistedBranding(defaultBranding.espetoId));
  const [reportFilter, setReportFilter] = useState({
    mode: 'all',
    month: '',
    year: new Date().getFullYear().toString(),
    start: '',
    end: '',
  });

  const requireAuth = useCallback(
    (nextView) => {
      if (user) {
        setView(nextView);
        return;
      }

      setLoginError('Faça login para acessar essa área protegida.');
      setView('login');
    },
    [user]
  );

  const formatOrderDate = (order) => {
    if (order.createdAt?.seconds) return new Date(order.createdAt.seconds * 1000).toLocaleString('pt-BR');
    if (order.createdAt) return new Date(order.createdAt).toLocaleString('pt-BR');
    if (order.timestamp) return new Date(order.timestamp).toLocaleString('pt-BR');
    return order.dateString || '';
  };

  const getOrderDateValue = useCallback((order) => {
    if (order.createdAt?.seconds) return new Date(order.createdAt.seconds * 1000);
    if (order.createdAt) return new Date(order.createdAt);
    if (order.timestamp) return new Date(order.timestamp);
    if (order.dateString) return new Date(order.dateString);
    return null;
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    let initialOwnerId = defaultBranding.espetoId;

    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      initialOwnerId = parsedSession.ownerId || initialOwnerId;
      setUser(parsedSession);
      setView('admin');
      setLoginForm((prev) => ({ ...prev, espetoId: parsedSession.ownerId || prev.espetoId }));
      setBranding(getPersistedBranding(initialOwnerId));
    }

    apiClient.setOwnerId(initialOwnerId);

    const unsubProd = productService.subscribe(setProducts);
    return () => {
      unsubProd();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return undefined;
    }

    const unsubOrders = orderService.subscribeAll(setOrders);
    return () => {
      unsubOrders();
    };
  }, [user?.ownerId]);

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      return;
    }

    customerService.fetchAll().then(setCustomers).catch(() => setCustomers([]));
  }, [user?.ownerId]);

  const resolvedOwnerId = useMemo(
    () => user?.ownerId || branding?.espetoId || defaultBranding.espetoId,
    [user?.ownerId, branding?.espetoId]
  );

  useEffect(() => {
    if (!resolvedOwnerId) return;
    apiClient.setOwnerId(resolvedOwnerId);
    setBranding((prev) => {
      if (prev.espetoId === resolvedOwnerId) return prev;
      return getPersistedBranding(resolvedOwnerId);
    });
  }, [resolvedOwnerId]);

  useEffect(() => {
    if (!user && (view === 'admin' || view === 'grill')) {
      setLoginError('Faça login para acessar essa área protegida.');
      setView('login');
    }
  }, [user, view]);

  useEffect(() => {
    const storageKey = brandingStorageKey(branding.espetoId || resolvedOwnerId);
    localStorage.setItem(storageKey, JSON.stringify(branding));
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor || defaultBranding.primaryColor);
    document.documentElement.style.setProperty('--accent-color', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
  }, [branding, resolvedOwnerId]);

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);
  const brandInitials = useMemo(
    () => branding.brandName?.split(' ').map((part) => part?.[0]).join('').slice(0, 2).toUpperCase() || 'ED',
    [branding.brandName]
  );
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [branding.instagram]);

  const filteredOrders = useMemo(() => {
    if (!reportFilter.mode || reportFilter.mode === 'all') return orders;

    return orders.filter((order) => {
      const date = getOrderDateValue(order);
      if (!date) return false;

      if (reportFilter.mode === 'month' && reportFilter.month) {
        const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthString === reportFilter.month;
      }

      if (reportFilter.mode === 'year' && reportFilter.year) {
        return String(date.getFullYear()) === reportFilter.year;
      }

      if (reportFilter.mode === 'range' && reportFilter.start && reportFilter.end) {
        const startDate = new Date(reportFilter.start);
        const endDate = new Date(reportFilter.end);
        endDate.setHours(23, 59, 59, 999);
        return date >= startDate && date <= endDate;
      }

      return true;
    });
  }, [orders, reportFilter, getOrderDateValue]);

  const filteredTotal = useMemo(
    () => filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0),
    [filteredOrders]
  );

  const updateCart = (item, qty) => {
    setCart((previous) => {
      const currentQty = previous[item.id]?.qty || 0;
      const nextQty = currentQty + qty;
      if (nextQty <= 0) {
        const copy = { ...previous };
        delete copy[item.id];
        return copy;
      }
      return { ...previous, [item.id]: { ...item, qty: nextQty } };
    });
  };

  const handleCustomerChange = (nextCustomer) => {
    const normalizedName = nextCustomer.name?.trim().toLowerCase();
    const matchedCustomer = customers.find(
      (entry) => entry.name?.trim().toLowerCase() === normalizedName
    );

    const phoneFromMatch = !nextCustomer.phone && matchedCustomer?.phone ? matchedCustomer.phone : nextCustomer.phone;

    const formattedPhone = formatPhoneInput(phoneFromMatch, DEFAULT_AREA_CODE);

    setCustomer({ ...nextCustomer, phone: formattedPhone });

    setCustomer({ ...nextCustomer, phone: phoneFromMatch });

  };

  const checkout = async () => {
    if (!customer.name || !customer.phone) {
      alert('Preencha Nome e Telefone');
      return;
    }

    if (customer.type === 'delivery' && !customer.address) {
      alert('Informe o endereço completo para entrega.');
      return;
    }

    const isPickup = customer.type === 'pickup';
    const payment = paymentMethod;

    const sanitizedPhone = customer.phone.replace(/\D/g, '');
    const sanitizedPhoneKey = sanitizedPhone.length >= 10 ? `+55${sanitizedPhone}` : '';
    const pixKey = PIX_KEY || sanitizedPhoneKey;


    const order = {
      ...customer,
      items: Object.values(cart),
      total: cartTotal,
      status: 'pending',
      payment
    };

    await orderService.save(order);
    customerService.fetchAll().then(setCustomers).catch(() => {});

    if (isPickup) {
      const itemsList = Object.values(cart)
        .map((item) => `▪ ${item.qty}x ${item.name}`)
        .join('\n');

      const messageLines = [
        '*NOVO PEDIDO - DATONY*',
        '------------------',
        `👤 *${customer.name}* (${customer.phone})`,
        `🛒 *Tipo:* ${customer.type}`,
        payment ? `💳 Pagamento: ${formatPaymentMethod(payment)}` : '',
        customer.address ? `📍 End: ${customer.address}` : '',
        '------------------',
        itemsList,
        '------------------',
        `💰 *TOTAL: ${formatCurrency(cartTotal)}*`,
        payment === 'pix' && pixKey ? `💳 Pagamento via PIX: ${pixKey}` : '',

        payment === 'pix'
          ? PIX_KEY
            ? `💳 Pagamento via PIX: ${PIX_KEY}`
            : '💳 Gerar Pix para retirada na loja'
          : ''

      ].filter(Boolean);

      const encodedMessage = encodeURIComponent(messageLines.join('\n'));
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    }

    setCart({});
    setCustomer(initialCustomer);
    setPaymentMethod(defaultPaymentMethod);

    setLastOrder({
      type: customer.type,
      payment,
      phone: sanitizedPhoneKey || customer.phone,
      pixKey,
    });
    setView('success');
  };

  const handleLogin = async (event) => {
    event?.preventDefault();
    setLoginError('');

    try {
      const session = await authService.login(loginForm.username, loginForm.password, loginForm.espetoId);
      const sessionData = { ...session, username: loginForm.username, espetoId: loginForm.espetoId };
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      setBranding(getPersistedBranding(sessionData.ownerId || loginForm.espetoId));
      setUser(sessionData);
      setView('admin');
    } catch (error) {
      setLoginError(error.message || 'Falha ao autenticar');
    }
  };

  const updateBranding = (updater) => {
    setBranding((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return nextState;
    });
  };

  const logout = () => {
    localStorage.removeItem('adminSession');
    setUser(null);
    setLoginForm({ username: '', password: '', espetoId: defaultBranding.espetoId });
    const fallbackBranding = getPersistedBranding(defaultBranding.espetoId);
    apiClient.setOwnerId(fallbackBranding.espetoId);
    setBranding(fallbackBranding);
    setView('menu');
  };

  const exportOrders = (dataset = filteredOrders) => {
    const headers = [
      { key: 'data', label: 'Data' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'pagamento', label: 'Pagamento' },
      { key: 'total', label: 'Total' },
      { key: 'status', label: 'Status' },
    ];

    const rows = dataset.map((order) => ({
      data: formatOrderDate(order),
      cliente: order.name,
      telefone: order.phone,
      tipo: formatOrderType(order.type),
      pagamento: formatPaymentMethod(order.payment),
      total: formatCurrency(order.total || 0),
      status: formatOrderStatus(order.status),
    }));

    exportToCsv('relatorio-vendas', headers, rows);
  };

  if (view === 'admin' && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ChefHat className="text-red-500" /> {branding.brandName || 'Admin'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">{branding.espetoId || 'Gerenciamento Profissional'}</p>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'dashboard' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button
              onClick={() => setAdminTab('products')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'products' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Package size={18} /> Produtos
            </button>
            <button
              onClick={() => setAdminTab('queue')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'queue' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <UtensilsCrossed size={18} /> Fila do Churrasqueiro
            </button>
            <button
              onClick={() => setAdminTab('reports')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'reports' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <FileText size={18} /> Relatório Vendas
            </button>
            <button
              onClick={() => setAdminTab('branding')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'branding' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <ChefHat size={18} /> Aparência da Loja
            </button>
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name || 'Administrador'}</p>
                <p className="text-xs text-gray-500 truncate">{user.username || 'admin'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full border border-gray-600 text-gray-300 py-2 rounded text-sm hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Sair
            </button>
            <button onClick={() => setView('menu')} className="w-full mt-2 text-center text-xs text-red-400 hover:underline">
              Ver Loja
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <header className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{adminTab}</h2>
            <div className="md:hidden">
              <button onClick={() => setView('menu')} className="text-sm bg-gray-200 px-3 py-1 rounded">
                Ir para Loja
              </button>
            </div>
          </header>

          {adminTab === 'dashboard' && <DashboardView orders={orders} customers={customers} />}
          {adminTab === 'products' && <ProductManager products={products} />}
          {adminTab === 'queue' && <GrillQueue />}
          {adminTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-3 justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-700">Histórico Completo</h3>
                  <span className="text-sm text-gray-500">{orders.length} pedidos</span>
                </div>
                <button
                  onClick={exportOrders}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                >
                  Exportar Excel (.csv)
                </button>
              </div>
              <div className="p-4 border-b bg-white grid md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Filtro</label>
                  <select
                    value={reportFilter.mode}
                    onChange={(e) => setReportFilter((prev) => ({ ...prev, mode: e.target.value }))}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="all">Todos os pedidos</option>
                    <option value="month">Por mês</option>
                    <option value="year">Por ano</option>
                    <option value="range">Intervalo específico</option>
                  </select>
                </div>

                {reportFilter.mode === 'month' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Mês</label>
                    <input
                      type="month"
                      value={reportFilter.month}
                      onChange={(e) => setReportFilter((prev) => ({ ...prev, month: e.target.value }))}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}

                {reportFilter.mode === 'year' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Ano</label>
                    <input
                      type="number"
                      min="2000"
                      value={reportFilter.year}
                      onChange={(e) => setReportFilter((prev) => ({ ...prev, year: e.target.value }))}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}

                {reportFilter.mode === 'range' && (
                  <div className="grid grid-cols-2 gap-2 md:col-span-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Início</label>
                      <input
                        type="date"
                        value={reportFilter.start}
                        onChange={(e) => setReportFilter((prev) => ({ ...prev, start: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Fim</label>
                      <input
                        type="date"
                        value={reportFilter.end}
                        onChange={(e) => setReportFilter((prev) => ({ ...prev, end: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-1">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total no período</p>
                    <p className="text-xl font-bold text-gray-800">{formatCurrency(filteredTotal)}</p>
                    <p className="text-[11px] text-gray-400">{filteredOrders.length} pedidos filtrados</p>
                  </div>
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Telefone</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Pagamento</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                    <tr key={order.id}>
                        <td className="p-3 text-gray-500">{formatOrderDate(order)}</td>
                        <td className="p-3 font-medium">{order.name}</td>

                        <td className="p-3 text-gray-600">{order.phone}</td>
                        <td className="p-3 uppercase text-xs font-bold">{formatOrderType(order.type)}</td>
                        <td className="p-3 uppercase text-xs font-bold text-gray-600">{formatPaymentMethod(order.payment)}</td>
                        <td className="p-3 font-bold text-green-600">{formatCurrency(order.total || 0)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {formatOrderStatus(order.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {adminTab === 'branding' && <BrandingSettings branding={branding} onChange={updateBranding} />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-24">
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div
          className="text-white p-1 text-center text-[10px] md:text-xs font-medium uppercase tracking-wider"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {branding.tagline}
        </div>
        <div className="p-4 flex flex-wrap gap-3 justify-between items-center max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-sm overflow-hidden"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" />
              ) : (
                brandInitials
              )}
            </div>
            <div>
              <h1 className="font-bold text-gray-800 leading-none">{branding.brandName}</h1>
              <span className="text-xs text-gray-500">{branding.espetoId || 'Churrasco premium'}</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => requireAuth('grill')}
              className="flex items-center gap-2 px-3 py-2 rounded-full font-semibold border border-primary text-primary bg-white hover:bg-gray-50"
            >
              <ChefHat size={18} /> Fila do churrasqueiro
            </button>
            <button
              onClick={() => requireAuth('admin')}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white font-semibold hover:opacity-90"
            >
              <LayoutDashboard size={18} /> Área admin
            </button>
          </div>
          <div className="flex md:hidden items-center gap-3 text-gray-400">
            <button onClick={() => requireAuth('admin')} className="hover:text-primary transition-colors">
              <User size={20} />
            </button>
            <button onClick={() => requireAuth('grill')} className="hover:text-primary transition-colors">
              <ChefHat size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {view === 'login' && (
          <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Acesso do administrador</h2>
              <p className="text-sm text-gray-500">Use usuário e senha definidos no banco (PGUSER/PGPASSWORD).</p>
            </div>

            {loginError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">{loginError}</div>}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="username">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="postgres"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="senha do banco"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="espetoId">
                ID do espeto / conta
              </label>
              <input
                id="espetoId"
                type="text"
                value={loginForm.espetoId}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, espetoId: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="ex.: espetinhodatony"
              />
              <p className="text-xs text-gray-500">Usado para buscar somente produtos, clientes e pedidos da sua conta.</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setView('menu')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
          {view === 'menu' && (
          <MenuView
            products={products}
            cart={cart}
            branding={branding}
            instagramHandle={instagramHandle}
            onUpdateCart={updateCart}
            onProceed={() => setView('cart')}
          />
        )}
          {view === 'cart' && (
            <CartView
              cart={cart}
              customer={customer}
              customers={customers}
              paymentMethod={paymentMethod}
              onChangeCustomer={handleCustomerChange}
              onChangePayment={setPaymentMethod}
              onCheckout={checkout}
              onBack={() => setView('menu')}
            />
          )}
        {view === 'success' && (
          <SuccessView
            orderType={lastOrder?.type}
            paymentMethod={lastOrder?.payment}
            pixKey={lastOrder?.pixKey}
            phone={lastOrder?.phone}
            onNewOrder={() => setView('menu')}

          />
        )}
        {view === 'grill' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <ChefHat className="text-red-500" /> Visão do Churrasqueiro
            </div>
            <GrillQueue />
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-600 rounded-lg border border-red-700 hover:bg-red-700"
            >
              <ShoppingCart size={16} /> Voltar para pedidos
            </button>
          </div>
        )}
      </main>

      {view === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setView('cart')}
            className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="bg-red-600 px-3 py-1 rounded-lg text-sm font-bold">
                {Object.values(cart).reduce((acc, item) => acc + item.qty, 0)}
              </span>
              <span className="font-bold">Ver sacola</span>
            </div>
            <span className="font-bold text-lg">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {view === 'cart' && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full p-3 shadow-lg md:hidden" onClick={checkout}>
          <Send size={20} />
        </div>
      )}
    </div>
  );
}

export default App;
