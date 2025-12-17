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
  LogOut,
  CreditCard,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { productService } from './services/productService';
import { orderService } from './services/orderService';
import { authService } from './services/authService';
import { customerService } from './services/customerService';
import { storeService } from './services/storeService';
import { MenuView } from './components/Client/MenuView';
import { CartView } from './components/Client/CartView';
import { SuccessView } from './components/Client/SuccessView';
import { DashboardView } from './components/Admin/DashboardView';
import { ProductManager } from './components/Admin/ProductManager';
import { GrillQueue } from './components/Admin/GrillQueue';
import { BrandingSettings } from './components/Admin/BrandingSettings';
import { apiClient } from './config/apiClient';
import { SubscriptionStatus } from './components/Admin/SubscriptionStatus';
import { PlanSelection } from './components/Client/PlanSelection';
import { SubscriptionGate } from './components/Client/SubscriptionGate';
import { PlatformStores } from './components/Admin/PlatformStores';
import {
  formatCurrency,
  formatOrderStatus,
  formatOrderType,
  formatPaymentMethod,
  formatPhoneInput,
} from './utils/format';
import { exportToCsv } from './utils/export';
import './index.css';
import { planService } from './services/planService';
import { subscriptionService } from './services/subscriptionService';
import { platformService } from './services/platformService';

const DEFAULT_AREA_CODE = '12';
const initialCustomer = { name: '', phone: formatPhoneInput('', DEFAULT_AREA_CODE), address: '', table: '', type: 'delivery' };
const defaultPaymentMethod = 'debito';
const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || '5512996797210';
const PIX_KEY = process.env.REACT_APP_PIX_KEY || '';
const defaultBranding = {
  brandName: 'Churras Sites',
  espetoId: process.env.REACT_APP_DEFAULT_STORE || 'espetinhodatony',
  logoUrl: '/logo.svg',
  primaryColor: '#b91c1c',
  accentColor: '#111827',
  tagline: 'Crie seu site de pedidos de churrasco em minutos',
  instagram: '',
};

const brandingStorageKey = (storeSlug) => `brandingSettings:${storeSlug || defaultBranding.espetoId}`;

const resolveStoreSlug = () => {
  if (typeof window === 'undefined') return defaultBranding.espetoId;
  const path = window.location.pathname.split('/').filter(Boolean);
  if (path[ 0 ] === 'loja' || path[ 0 ] === 'store' || path[ 0 ] === 'chamanoespeto') return path[ 1 ];

  const query = new URLSearchParams(window.location.search);
  return query.get('store') || null;
};

const getPersistedBranding = (storeSlug = defaultBranding.espetoId) => {
  const saved = localStorage.getItem(brandingStorageKey(storeSlug));
  if (!saved) return { ...defaultBranding, espetoId: storeSlug };
  try
  {
    const parsed = JSON.parse(saved);
    return { ...defaultBranding, espetoId: storeSlug, ...parsed };
  } catch (error)
  {
    console.error('Erro ao carregar branding salvo', error);
    return { ...defaultBranding, espetoId: storeSlug };
  }
};

function App() {
  const [ user, setUser ] = useState(null);
  const [ products, setProducts ] = useState([]);
  const [ orders, setOrders ] = useState([]);
  const [ customers, setCustomers ] = useState([]);
  const [ view, setView ] = useState(resolveStoreSlug() ? 'menu' : 'landing');
  const [ adminTab, setAdminTab ] = useState('dashboard');
  const [ cart, setCart ] = useState({});
  const [ customer, setCustomer ] = useState(initialCustomer);
  const [ paymentMethod, setPaymentMethod ] = useState(defaultPaymentMethod);
  const [ lastOrder, setLastOrder ] = useState(null);
  const [ loginForm, setLoginForm ] = useState({ username: '', password: '', espetoId: defaultBranding.espetoId });
  const [ loginError, setLoginError ] = useState('');
  const [ branding, setBranding ] = useState(() => getPersistedBranding(defaultBranding.espetoId));
  const [ storeSlug, setStoreSlug ] = useState(resolveStoreSlug());
  const [ storeInfo, setStoreInfo ] = useState(null);
  const [ storeError, setStoreError ] = useState('');
  const [ subscription, setSubscription ] = useState(null);
  const [ plans, setPlans ] = useState([]);
  const [ platformStores, setPlatformStores ] = useState([]);
  const [ subscriptionLoading, setSubscriptionLoading ] = useState(false);
  const [ platformLoading, setPlatformLoading ] = useState(false);
  const [ isRegistering, setIsRegistering ] = useState(false);
  const [ registerForm, setRegisterForm ] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    storeName: '',
    logoUrl: '',
    primaryColor: '#b91c1c',
    secondaryColor: '#111827',
  });
  const [ reportFilter, setReportFilter ] = useState({
    mode: 'all',
    month: '',
    year: new Date().getFullYear().toString(),
    start: '',
    end: '',
  });

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
    planService
      .list()
      .then(setPlans)
      .catch((error) => console.error('Erro ao carregar planos', error));
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    const initialStoreSlug = storeSlug || defaultBranding.espetoId;

    if (savedSession)
    {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
      setView('admin');
      setLoginForm((prev) => ({ ...prev, espetoId: parsedSession.storeSlug || prev.espetoId }));
      setBranding(getPersistedBranding(parsedSession.storeSlug || initialStoreSlug));
    }

    if (initialStoreSlug)
    {
      apiClient.setOwnerId(initialStoreSlug);
    }
  }, [ storeSlug ]);

  useEffect(() => {
    let cancelled = false;
    const activeSlug = storeSlug || defaultBranding.espetoId;

    if (!activeSlug)
    {
      setProducts([]);
      return undefined;
    }

    productService
      .listBySlug(activeSlug)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((error) => console.error('Erro ao carregar produtos', error));

    return () => {
      cancelled = true;
    };
  }, [ storeSlug ]);

  useEffect(() => {
    if (!storeSlug)
    {
      setStoreInfo(null);
      setBranding((prev) => ({ ...defaultBranding, ...prev, espetoId: defaultBranding.espetoId }));
      return;
    }

    setStoreError('');
    storeService
      .fetchBySlug(storeSlug)
      .then((data) => {
        setStoreInfo(data);
        setSubscription(data.subscription || null);
        setBranding((prev) => ({
          ...prev,
          espetoId: data.slug,
          brandName: data.name || prev.brandName,
          logoUrl: data.settings?.logo_url || prev.logoUrl,
          primaryColor: data.settings?.primary_color || prev.primaryColor,
          accentColor: data.settings?.secondary_color || prev.accentColor,
          instagram: data.owner_email || prev.instagram,
        }));
        apiClient.setOwnerId(data.id || data.slug);
        setView((prev) => (prev === 'landing' ? 'menu' : prev));
      })
      .catch((error) => {
        console.error('Erro ao carregar loja', error);
        setStoreError('Não foi possível carregar esta loja.');
        setView('landing');
      });
  }, [ storeSlug ]);

  const resolvedStoreSlug = useMemo(
    () => storeSlug || user?.storeSlug || branding?.espetoId || defaultBranding.espetoId,
    [ storeSlug, user?.storeSlug, branding?.espetoId ]
  );

  useEffect(() => {
    if (!resolvedStoreSlug) return;
    apiClient.setOwnerId(storeInfo?.id || resolvedStoreSlug);
    setBranding((prev) => {
      if (prev.espetoId === resolvedStoreSlug) return prev;
      return getPersistedBranding(resolvedStoreSlug);
    });
  }, [ resolvedStoreSlug, storeInfo?.id ]);

  useEffect(() => {
    if (!storeInfo?.id) return;
    setSubscriptionLoading(true);
    subscriptionService
      .getByStore(storeInfo.id)
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false));
  }, [ storeInfo?.id ]);

  useEffect(() => {
    if (!user?.storeSlug)
    {
      setOrders([]);
      setCustomers([]);
      return undefined;
    }

    let cancelled = false;

    apiClient.setOwnerId(storeInfo?.id || user.storeSlug);
    orderService
      .fetchAll(storeInfo?.id || user.storeSlug)
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });

    customerService.fetchAll().then(setCustomers).catch(() => setCustomers([]));

    return () => {
      cancelled = true;
    };
  }, [ user?.storeSlug, storeInfo?.id ]);

  useEffect(() => {
    if (adminTab !== 'platform') return;
    setPlatformLoading(true);
    platformService
      .listStores()
      .then(setPlatformStores)
      .catch((error) => console.error('Erro ao carregar lojas', error))
      .finally(() => setPlatformLoading(false));
  }, [ adminTab ]);

    useEffect(() => {
      const storageKey = brandingStorageKey(branding.espetoId || resolvedStoreSlug);
      localStorage.setItem(storageKey, JSON.stringify(branding));
      document.documentElement.style.setProperty('--primary-color', branding.primaryColor || defaultBranding.primaryColor);
      document.documentElement.style.setProperty('--accent-color', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
    }, [ branding, resolvedStoreSlug ]);

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [ cart ]);
  const brandInitials = useMemo(
    () => branding.brandName?.split(' ').map((part) => part?.[ 0 ]).join('').slice(0, 2).toUpperCase() || 'ED',
    [ branding.brandName ]
  );
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [ branding.instagram ]);

  const filteredOrders = useMemo(() => {
    if (!reportFilter.mode || reportFilter.mode === 'all') return orders;

    return orders.filter((order) => {
      const date = getOrderDateValue(order);
      if (!date) return false;

      if (reportFilter.mode === 'month' && reportFilter.month)
      {
        const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthString === reportFilter.month;
      }

      if (reportFilter.mode === 'year' && reportFilter.year)
      {
        return String(date.getFullYear()) === reportFilter.year;
      }

      if (reportFilter.mode === 'range' && reportFilter.start && reportFilter.end)
      {
        const startDate = new Date(reportFilter.start);
        const endDate = new Date(reportFilter.end);
        endDate.setHours(23, 59, 59, 999);
        return date >= startDate && date <= endDate;
      }

      return true;
    });
  }, [ orders, reportFilter, getOrderDateValue ]);

  const filteredTotal = useMemo(
    () => filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0),
    [ filteredOrders ]
  );

  const updateCart = (item, qty) => {
    setCart((previous) => {
      const currentQty = previous[ item.id ]?.qty || 0;
      const nextQty = currentQty + qty;
      if (nextQty <= 0)
      {
        const copy = { ...previous };
        delete copy[ item.id ];
        return copy;
      }
      return { ...previous, [ item.id ]: { ...item, qty: nextQty } };
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
    if (!customer.name || !customer.phone)
    {
      alert('Preencha Nome e Telefone');
      return;
    }

    if (customer.type === 'delivery' && !customer.address)
    {
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

    await orderService.save(order, storeInfo?.id || storeSlug);
    customerService.fetchAll().then(setCustomers).catch(() => { });

    if (isPickup)
    {
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

    try
    {
      const session = await authService.login(loginForm.username, loginForm.password);
      const sessionData = {
        token: session.token,
        username: session.user?.email || loginForm.username,
        storeSlug: session.store?.slug,
      };
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      setBranding(getPersistedBranding(sessionData.storeSlug));
      setUser(sessionData);
      setStoreSlug(session.store?.slug || sessionData.storeSlug);
      setView('admin');
    } catch (error)
    {
      setLoginError(error.message || 'Falha ao autenticar');
    }
  };

  const updateBranding = (updater) => {
    setBranding((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return nextState;
    });
  };

  const handleCreateStore = async (event) => {
    event?.preventDefault();
    setStoreError('');
    setIsRegistering(true);

    try
    {
      const result = await storeService.create(registerForm);
      const redirectUrl = result.redirectUrl || `/chamanoespeto/${result.store?.slug || result.slug}`;
      setBranding((prev) => ({
        ...prev,
        espetoId: result.store?.slug || result.slug,
        brandName: registerForm.storeName,
        primaryColor: registerForm.primaryColor,
        accentColor: registerForm.secondaryColor || registerForm.primaryColor,
        logoUrl: registerForm.logoUrl || prev.logoUrl,
      }));
      setLoginForm((prev) => ({ ...prev, espetoId: result.store?.slug || result.slug, username: registerForm.email }));
      setRegisterForm((prev) => ({ ...prev, password: '', storeName: '', fullName: '', email: '', phone: '', address: '' }));
      window.location.href = redirectUrl;
    } catch (error)
    {
      setStoreError(error.message || 'Não foi possível criar sua loja');
    } finally
    {
      setIsRegistering(false);
    }
  };

  const goToDemoStore = () => {
    setStoreSlug(defaultBranding.espetoId);
    setView('menu');
  };

  const logout = () => {
    localStorage.removeItem('adminSession');
    setUser(null);
    setLoginForm({ username: '', password: '', espetoId: defaultBranding.espetoId });
    const fallbackBranding = getPersistedBranding(defaultBranding.espetoId);
    apiClient.setOwnerId(fallbackBranding.espetoId);
    setBranding(fallbackBranding);
    setView(storeSlug ? 'menu' : 'landing');
  };

  const requireAdminSession = (nextView) => {
    if (!user)
    {
      setLoginError('Faça login para acessar esta área protegida.');
      setView('login');
      return;
    }
    setView(nextView);
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

  const handleRenewSubscription = async (planId) => {
    if (!storeInfo?.id) return;
    setSubscriptionLoading(true);
    try
    {
      if (subscription?.id)
      {
        const renewed = await subscriptionService.renew(subscription.id, { planId });
        setSubscription(renewed);
      } else
      {
        const created = await subscriptionService.create({ storeId: storeInfo.id, planId });
        setSubscription(created);
      }
      setView('admin');
    } catch (error)
    {
      console.error('Erro ao renovar assinatura', error);
      setSubscription((prev) => ({ ...prev, status: prev?.status || 'EXPIRED' }));
    } finally
    {
      setSubscriptionLoading(false);
    }
  };

  const openPlanSelection = () => {
    setView('plans');
  };

  const isSubscriptionBlocked = [ 'EXPIRED', 'SUSPENDED' ].includes(subscription?.status);

  const suspendStoreSubscription = async (subscriptionId) => {
    if (!subscriptionId) return;
    await platformService.suspendSubscription(subscriptionId);
    setPlatformStores((prev) =>
      prev.map((store) =>
        store.subscription?.id === subscriptionId ? { ...store, subscription: { ...store.subscription, status: 'SUSPENDED' } } : store
      )
    );
  };

  const reactivateStoreSubscription = async (subscriptionId) => {
    if (!subscriptionId) return;
    const updated = await platformService.reactivateSubscription(subscriptionId);
    setPlatformStores((prev) =>
      prev.map((store) => (store.subscription?.id === subscriptionId ? { ...store, subscription: updated } : store))
    );
  };

  if (isSubscriptionBlocked && view !== 'plans')
  {
    return <SubscriptionGate status={subscription?.status} onSelectPlans={openPlanSelection} />;
  }

  if (view === 'plans')
  {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <PlanSelection plans={plans} onSelect={handleRenewSubscription} loading={subscriptionLoading} />
      </div>
    );
  }

  if (view === 'admin' && user)
  {
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
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'dashboard' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button
              onClick={() => setAdminTab('products')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'products' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <Package size={18} /> Produtos
            </button>
            <button
              onClick={() => setAdminTab('queue')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'queue' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <UtensilsCrossed size={18} /> Fila do Churrasqueiro
            </button>
            <button
              onClick={() => setAdminTab('reports')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'reports' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <FileText size={18} /> Relatório Vendas
            </button>
            <button
              onClick={() => setAdminTab('subscription')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'subscription' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <CreditCard size={18} /> Assinatura
            </button>
            <button
              onClick={() => setAdminTab('platform')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'platform' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <Building2 size={18} /> Plataforma
            </button>
            <button
              onClick={() => setAdminTab('branding')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${adminTab === 'branding' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
              <ChefHat size={18} /> Aparência da Loja
            </button>
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                {user.name?.[ 0 ]?.toUpperCase() || user.username?.[ 0 ]?.toUpperCase() || 'U'}
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

          {subscription?.status === 'EXPIRING' && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 flex items-center gap-3">
              <AlertTriangle size={18} />
              <div className="flex-1">
                <p className="font-bold">Assinatura vencendo</p>
                <p className="text-sm">Renove seu plano para não interromper os pedidos.</p>
              </div>
              <button onClick={openPlanSelection} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Renovar agora
              </button>
            </div>
          )}

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
                            className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
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
          {adminTab === 'subscription' && (
            <div className="space-y-4">
              <SubscriptionStatus subscription={subscription} onRenew={handleRenewSubscription} plans={plans} />
            </div>
          )}
          {adminTab === 'platform' && (
            <div className="space-y-4">
              {platformLoading ? (
                <div className="text-gray-500">Carregando lojas...</div>
              ) : (
                <PlatformStores
                  stores={platformStores}
                  onSuspend={suspendStoreSubscription}
                  onReactivate={reactivateStoreSubscription}
                />
              )}
            </div>
          )}
          {adminTab === 'branding' && <BrandingSettings branding={branding} onChange={updateBranding} />}
        </main>
      </div>
    );
  }

  if (view === 'landing')
  {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary text-white font-black flex items-center justify-center">CS</div>
              <div>
                <p className="text-lg font-bold text-gray-900">Churras Sites</p>
                <p className="text-sm text-gray-500">Plataforma multi-loja para pedidos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={goToDemoStore}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                Ver loja demo
              </button>
              <button
                onClick={() => setView('menu')}
                className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90"
              >
                Acessar minha loja
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8 items-start">
          <section className="space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wide">
              Plataforma multi-loja
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
              Crie sites de pedidos de churrasco com logo, cores e produtos personalizados
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Cadastre-se, configure a identidade visual do seu espeto e publique um link exclusivo para seus clientes
              fazerem pedidos online.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border rounded-xl shadow-sm">
                <p className="font-semibold text-gray-900">Identidade visual flexível</p>
                <p className="text-sm text-gray-500">Logo, cores e slug exclusivo por loja.</p>
              </div>
              <div className="p-4 bg-white border rounded-xl shadow-sm">
                <p className="font-semibold text-gray-900">Gestão completa</p>
                <p className="text-sm text-gray-500">Produtos, status Aberto/Fechado e fila do churrasqueiro.</p>
              </div>
            </div>
          </section>

          <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Criar minha loja</h2>
              <p className="text-sm text-gray-500">Preencha os dados abaixo para gerar seu site automaticamente.</p>
            </div>

            {storeError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">{storeError}</div>}

            <form className="space-y-3" onSubmit={handleCreateStore}>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                  <input
                    required
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <input
                    required
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Senha</label>
                  <input
                    required
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Telefone</label>
                  <input
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Endereço completo</label>
                <input
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Nome da loja</label>
                <input
                  required
                  value={registerForm.storeName}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, storeName: e.target.value }))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Ex.: Espetinho do João"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">URL do logo</label>
                  <input
                    value={registerForm.logoUrl}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Cor principal</label>
                  <input
                    type="color"
                    value={registerForm.primaryColor}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Cor secundária</label>
                  <input
                    type="color"
                    value={registerForm.secondaryColor}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Slug da loja</label>
                  <input
                    disabled
                    value={(registerForm.storeName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                    className="w-full border rounded-lg p-3 bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {isRegistering ? 'Criando sua loja...' : 'Criar minha loja agora'}
              </button>
            </form>
          </section>
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
              onClick={() => requireAdminSession('grill')}
              className="flex items-center gap-2 px-3 py-2 rounded-full font-semibold border border-primary text-primary bg-white hover:bg-gray-50"
            >
              <ChefHat size={18} /> Fila do churrasqueiro
            </button>
            <button
              onClick={() => {
                setView('login');
                setLoginError('');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white font-semibold hover:opacity-90"
            >
              <LayoutDashboard size={18} /> Área admin
            </button>
          </div>
          <div className="flex md:hidden items-center gap-3 text-gray-400">
            <button
              onClick={() => {
                setView('login');
                setLoginError('');
              }}
              className="hover:text-primary transition-colors"
            >
              <User size={20} />
            </button>
            <button onClick={() => requireAdminSession('grill')} className="hover:text-primary transition-colors">
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
              <p className="text-sm text-gray-500">Use as credenciais salvas na tabela admin_users (padrão: admin / admin123).</p>
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
                placeholder="senha do admin"
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
          user ? (
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
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
              <p className="text-gray-700 font-semibold">Faça login para acessar a visão do churrasqueiro.</p>
              <button
                onClick={() => setView('login')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Entrar agora
              </button>
            </div>
          )
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
