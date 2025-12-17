import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
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
import { storeService } from './services/storeService';
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
  brandName: 'Churras Sites',
  espetoId: process.env.REACT_APP_DEFAULT_STORE || 'espetinhodatony',
  logoUrl: '/logo.svg',
  primaryColor: '#b91c1c',
  accentColor: '#111827',
  tagline: 'Crie seu site de pedidos de churrasco em minutos',
  instagram: '',
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

// Landing Page Component
function LandingPage() {
  const navigate = useNavigate();
  const [storeError, setStoreError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
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

  const handleCreateStore = async (event) => {
    event?.preventDefault();
    setStoreError('');
    setIsRegistering(true);

    try {
      const result = await storeService.create(registerForm);
      navigate(`/${result.slug}`);
    } catch (error) {
      setStoreError(error.message || 'Não foi possível criar sua loja');
    } finally {
      setIsRegistering(false);
    }
  };

  const goToDemoStore = () => {
    navigate('/test-store');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile-first header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-black flex items-center justify-center shadow-lg">
                CS
              </div>
              <div className="hidden sm:block">
                <p className="text-lg font-bold text-gray-900">Churras Sites</p>
                <p className="text-sm text-gray-500">Plataforma multi-loja</p>
              </div>
            </div>
            
            {/* Mobile menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={goToDemoStore}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="hidden sm:inline">Ver loja demo</span>
                <span className="sm:hidden">Demo</span>
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                <span className="hidden sm:inline">Acessar admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero section - mobile first */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 sm:py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            
            {/* Left content */}
            <section className="space-y-6 lg:space-y-8">
              <div className="space-y-4">
                <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full uppercase tracking-wide border border-red-100">
                  🔥 Plataforma multi-loja
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 leading-tight">
                  Crie sites de pedidos de 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                    churrasco
                  </span> personalizados
                </h1>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl">
                  Configure a identidade visual do seu espeto e publique um link exclusivo para seus clientes fazerem pedidos online.
                </p>
              </div>
              
              {/* Features grid - mobile optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-white text-lg">🎨</span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">Identidade visual flexível</p>
                  <p className="text-sm text-gray-500">Logo, cores e slug exclusivo por loja.</p>
                </div>
                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-white text-lg">⚡</span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">Gestão completa</p>
                  <p className="text-sm text-gray-500">Produtos, status e fila do churrasqueiro.</p>
                </div>
                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-white text-lg">📱</span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">Mobile-first</p>
                  <p className="text-sm text-gray-500">Otimizado para celular e tablet.</p>
                </div>
                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-white text-lg">🚀</span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">Setup rápido</p>
                  <p className="text-sm text-gray-500">Sua loja online em minutos.</p>
                </div>
              </div>
            </section>

            {/* Right form - mobile optimized */}
            <section className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8 lg:sticky lg:top-24">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Criar minha loja</h2>
                <p className="text-sm text-gray-500">Preencha os dados para gerar seu site automaticamente.</p>
              </div>

              {storeError && (
                <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100 mb-6">
                  {storeError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleCreateStore}>
                {/* Personal info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                    <input
                      required
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      required
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Senha</label>
                    <input
                      required
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Telefone</label>
                    <input
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="(12) 99999-9999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Endereço completo</label>
                  <input
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>

                {/* Store info */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Configurações da loja</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Nome da loja</label>
                      <input
                        required
                        value={registerForm.storeName}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, storeName: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Ex.: Espetinho do João"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">URL do logo (opcional)</label>
                        <input
                          value={registerForm.logoUrl}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Cor principal</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={registerForm.primaryColor}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-12 border border-gray-200 rounded-xl cursor-pointer"
                          />
                          <input
                            type="text"
                            value={registerForm.primaryColor}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Cor secundária</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={registerForm.secondaryColor}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                            className="w-12 h-12 border border-gray-200 rounded-xl cursor-pointer"
                          />
                          <input
                            type="text"
                            value={registerForm.secondaryColor}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                            className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors text-sm font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">URL da loja</label>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl px-3 py-3">
                            /
                          </span>
                          <input
                            disabled
                            value={(registerForm.storeName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                            className="flex-1 border border-gray-200 rounded-r-xl p-3 bg-gray-50 text-gray-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isRegistering ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Criando sua loja...
                    </span>
                  ) : (
                    '🚀 Criar minha loja agora'
                  )}
                </button>
                
                <p className="text-xs text-gray-500 text-center">
                  Ao criar sua conta, você concorda com nossos termos de uso.
                </p>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// Store Component
function StoreApp() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
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
  const [storeSlug, setStoreSlug] = useState(storeSlug || 'test-store');
  const [storeInfo, setStoreInfo] = useState(null);
  const [storeError, setStoreError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
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
  const [reportFilter, setReportFilter] = useState({
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
    const savedSession = localStorage.getItem('adminSession');
    const initialOwnerId = storeSlug || defaultBranding.espetoId;

    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
      setView('admin');
      setLoginForm((prev) => ({ ...prev, espetoId: parsedSession.ownerId || prev.espetoId }));
      setBranding(getPersistedBranding(parsedSession.ownerId || initialOwnerId));
    }

    if (initialOwnerId) {
      apiClient.setOwnerId(initialOwnerId);
    }

    const unsubProd = productService.subscribe(setProducts);
    return () => {
      unsubProd();
    };
  }, [storeSlug]);

  useEffect(() => {
    if (!storeSlug) {
      setStoreInfo(null);
      setBranding((prev) => ({ ...defaultBranding, ...prev, espetoId: defaultBranding.espetoId }));
      return;
    }

    setStoreError('');
    storeService
      .fetchBySlug(storeSlug)
      .then((data) => {
        setStoreInfo(data);
        setBranding((prev) => ({
          ...prev,
          espetoId: data.slug,
          brandName: data.name || prev.brandName,
          logoUrl: data.settings?.logo_url || prev.logoUrl,
          primaryColor: data.settings?.primary_color || prev.primaryColor,
          accentColor: data.settings?.secondary_color || prev.accentColor,
          instagram: data.owner_email || prev.instagram,
        }));
        apiClient.setOwnerId(data.slug);
        setView((prev) => (prev === 'landing' ? 'menu' : prev));
      })
      .catch((error) => {
        console.error('Erro ao carregar loja', error);
        setStoreError('Não foi possível carregar esta loja.');
        setView('landing');
      });
  }, [storeSlug]);

  const resolvedOwnerId = useMemo(
    () => storeSlug || user?.ownerId || branding?.espetoId || defaultBranding.espetoId,
    [storeSlug, user?.ownerId, branding?.espetoId]
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
    if (!user?.ownerId) {
      setOrders([]);
      setCustomers([]);
      return undefined;
    }

    apiClient.setOwnerId(user.ownerId);
    const unsubscribe = orderService.subscribeAll(setOrders);
    customerService.fetchAll().then(setCustomers).catch(() => setCustomers([]));

    return () => {
      unsubscribe();
    };
  }, [user?.ownerId]);

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
      setStoreSlug(sessionData.ownerId || loginForm.espetoId);
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
    setView(storeSlug ? 'menu' : 'landing');
  };

  const requireAdminSession = (nextView) => {
    if (!user) {
      setLoginError('Faça login para acessar esta área protegida.');
      navigate('/admin');
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

  if (view === 'admin' && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-gray-800">{branding.brandName || 'Admin'}</p>
                <p className="text-xs text-gray-500">{user.name || 'Administrador'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('menu')} className="text-sm bg-gray-100 px-3 py-2 rounded-lg">
                Ver Loja
              </button>
              <button onClick={logout} className="text-sm text-red-600 px-3 py-2 rounded-lg hover:bg-red-50">
                Sair
              </button>
            </div>
          </div>
          
          {/* Mobile navigation */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'products', label: 'Produtos', icon: Package },
              { key: 'queue', label: 'Fila', icon: UtensilsCrossed },
              { key: 'reports', label: 'Relatórios', icon: FileText },
              { key: 'branding', label: 'Aparência', icon: ChefHat },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setAdminTab(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  adminTab === key 
                    ? 'text-white shadow-lg' 
                    : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                style={adminTab === key ? { backgroundColor: branding.primaryColor } : {}}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col min-h-screen">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    brandInitials
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">{branding.brandName || 'Admin'}</h1>
                  <p className="text-xs text-gray-500">{branding.espetoId || 'Painel de controle'}</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { key: 'products', label: 'Produtos', icon: Package },
                { key: 'queue', label: 'Fila do Churrasqueiro', icon: UtensilsCrossed },
                { key: 'reports', label: 'Relatório Vendas', icon: FileText },
                { key: 'branding', label: 'Aparência da Loja', icon: ChefHat },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setAdminTab(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${
                    adminTab === key 
                      ? 'text-white shadow-lg transform scale-[1.02]' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={adminTab === key ? { backgroundColor: branding.primaryColor } : {}}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </nav>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate text-gray-800">{user.name || 'Administrador'}</p>
                  <p className="text-xs text-gray-500 truncate">{user.username || 'admin'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={logout}
                  className="w-full border-2 border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <LogOut size={16} /> Sair
                </button>
                <button 
                  onClick={() => setView('menu')} 
                  className="w-full text-center text-xs font-medium hover:underline"
                  style={{ color: branding.primaryColor }}
                >
                  Ver Loja
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <header className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 capitalize">{adminTab}</h2>
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
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile-first header */}
        <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-black flex items-center justify-center shadow-lg">
                  CS
                </div>
                <div className="hidden sm:block">
                  <p className="text-lg font-bold text-gray-900">Churras Sites</p>
                  <p className="text-sm text-gray-500">Plataforma multi-loja</p>
                </div>
              </div>
              
              {/* Mobile menu */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={goToDemoStore}
                  className="px-3 py-2 sm:px-4 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="hidden sm:inline">Ver loja demo</span>
                  <span className="sm:hidden">Demo</span>
                </button>
                <button
                  onClick={() => setView('menu')}
                  className="px-3 py-2 sm:px-4 text-sm rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                >
                  <span className="hidden sm:inline">Acessar minha loja</span>
                  <span className="sm:hidden">Entrar</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero section - mobile first */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 sm:py-12 lg:py-16">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              
              {/* Left content */}
              <section className="space-y-6 lg:space-y-8">
                <div className="space-y-4">
                  <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full uppercase tracking-wide border border-red-100">
                    🔥 Plataforma multi-loja
                  </span>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 leading-tight">
                    Crie sites de pedidos de 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                      churrasco
                    </span> personalizados
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl">
                    Configure a identidade visual do seu espeto e publique um link exclusivo para seus clientes fazerem pedidos online.
                  </p>
                </div>
                
                {/* Features grid - mobile optimized */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3">
                      <span className="text-white text-lg">🎨</span>
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">Identidade visual flexível</p>
                    <p className="text-sm text-gray-500">Logo, cores e slug exclusivo por loja.</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3">
                      <span className="text-white text-lg">⚡</span>
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">Gestão completa</p>
                    <p className="text-sm text-gray-500">Produtos, status e fila do churrasqueiro.</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3">
                      <span className="text-white text-lg">📱</span>
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">Mobile-first</p>
                    <p className="text-sm text-gray-500">Otimizado para celular e tablet.</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-3">
                      <span className="text-white text-lg">🚀</span>
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">Setup rápido</p>
                    <p className="text-sm text-gray-500">Sua loja online em minutos.</p>
                  </div>
                </div>
              </section>

              {/* Right form - mobile optimized */}
              <section className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8 lg:sticky lg:top-24">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Criar minha loja</h2>
                  <p className="text-sm text-gray-500">Preencha os dados para gerar seu site automaticamente.</p>
                </div>

                {storeError && (
                  <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100 mb-6">
                    {storeError}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleCreateStore}>
                  {/* Personal info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                      <input
                        required
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Email</label>
                      <input
                        required
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Senha</label>
                      <input
                        required
                        type="password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Telefone</label>
                      <input
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="(12) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Endereço completo</label>
                    <input
                      value={registerForm.address}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>

                  {/* Store info */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Configurações da loja</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Nome da loja</label>
                        <input
                          required
                          value={registerForm.storeName}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, storeName: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                          placeholder="Ex.: Espetinho do João"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">URL do logo (opcional)</label>
                          <input
                            value={registerForm.logoUrl}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Cor principal</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={registerForm.primaryColor}
                              onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                              className="w-12 h-12 border border-gray-200 rounded-xl cursor-pointer"
                            />
                            <input
                              type="text"
                              value={registerForm.primaryColor}
                              onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                              className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Cor secundária</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={registerForm.secondaryColor}
                              onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                              className="w-12 h-12 border border-gray-200 rounded-xl cursor-pointer"
                            />
                            <input
                              type="text"
                              value={registerForm.secondaryColor}
                              onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                              className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">URL da loja</label>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl px-3 py-3">
                              /loja/
                            </span>
                            <input
                              disabled
                              value={(registerForm.storeName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                              className="flex-1 border border-gray-200 rounded-r-xl p-3 bg-gray-50 text-gray-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isRegistering ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Criando sua loja...
                      </span>
                    ) : (
                      '🚀 Criar minha loja agora'
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Ao criar sua conta, você concorda com nossos termos de uso.
                  </p>
                </form>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans pb-24">
      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-30 shadow-lg border-b border-gray-100">
        <div
          className="text-white p-2 text-center text-xs font-medium uppercase tracking-wider"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {branding.tagline}
        </div>
        <div className="px-4 py-3 sm:py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg overflow-hidden"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" />
                ) : (
                  brandInitials
                )}
              </div>
              <div>
                <h1 className="font-bold text-gray-800 leading-none text-lg sm:text-xl">{branding.brandName}</h1>
                <span className="text-xs text-gray-500">{branding.espetoId || 'Churrasco premium'}</span>
              </div>
            </div>
            
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => requireAdminSession('grill')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                <ChefHat size={18} /> Fila do churrasqueiro
              </button>
              <button
                onClick={() => {
                  setView('login');
                  setLoginError('');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <LayoutDashboard size={18} /> Área admin
              </button>
            </div>
            
            {/* Mobile buttons */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => {
                  setView('login');
                  setLoginError('');
                }}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <User size={20} />
              </button>
              <button 
                onClick={() => requireAdminSession('grill')} 
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChefHat size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'login' && (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg mx-auto mb-4"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    brandInitials
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Acesso do administrador</h2>
                <p className="text-sm text-gray-500">Entre com suas credenciais para acessar o painel.</p>
              </div>

              {loginError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl">
                  {loginError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="username">
                    Usuário
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="admin"
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
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="admin123"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="espetoId">
                    ID da loja
                  </label>
                  <input
                    id="espetoId"
                    type="text"
                    value={loginForm.espetoId}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, espetoId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="ex.: espetinhodatony"
                  />
                  <p className="text-xs text-gray-500">Identificador único da sua loja no sistema.</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  🔑 Entrar no painel
                </button>
                <button
                  type="button"
                  onClick={() => setView('menu')}
                  className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
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
          <div className="max-w-md mx-auto">
            <SuccessView
              orderType={lastOrder?.type}
              paymentMethod={lastOrder?.payment}
              pixKey={lastOrder?.pixKey}
              phone={lastOrder?.phone}
              onNewOrder={() => setView('menu')}
            />
          </div>
        )}
        {view === 'grill' && (
          user ? (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 text-gray-700 font-semibold mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    <ChefHat size={20} />
                  </div>
                  <h2 className="text-xl font-bold">Visão do Churrasqueiro</h2>
                </div>
                <GrillQueue />
              </div>
              <button
                onClick={() => setView('menu')}
                className="flex items-center gap-2 px-4 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <ShoppingCart size={18} /> Voltar para pedidos
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  <ChefHat size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Acesso restrito</h3>
                <p className="text-gray-600">Faça login para acessar a visão do churrasqueiro.</p>
                <button
                  onClick={() => setView('login')}
                  className="w-full py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  🔑 Entrar agora
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {view === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setView('cart')}
            className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.02] transition-all border border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span 
                className="px-3 py-1 rounded-xl text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {Object.values(cart).reduce((acc, item) => acc + item.qty, 0)}
              </span>
              <span className="font-bold">Ver sacola</span>
            </div>
            <span className="font-bold text-lg">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {view === 'cart' && (
        <div 
          className="fixed bottom-6 right-6 text-white rounded-full p-4 shadow-2xl md:hidden cursor-pointer transform hover:scale-110 transition-all" 
          style={{ backgroundColor: branding.primaryColor }}
          onClick={checkout}
        >
          <Send size={20} />
        </div>
      )}
    </div>
  );
}

export default App;
