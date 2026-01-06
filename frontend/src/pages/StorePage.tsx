// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Send } from 'lucide-react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { storeService } from '../services/storeService';
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { SuccessView } from '../components/Client/SuccessView';
import { formatCurrency, formatPaymentMethod, formatPhoneInput } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getPersistedBranding, brandingStorageKey, defaultBranding, initialCustomer, defaultPaymentMethod, DEFAULT_AREA_CODE, WHATSAPP_NUMBER, PIX_KEY } from '../constants';
import { isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';

export function StorePage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState('menu');
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [lastOrder, setLastOrder] = useState(null);
  const [branding, setBranding] = useState(() => getPersistedBranding(storeSlug || defaultBranding.espetoId));
  const [storeOpenNow, setStoreOpenNow] = useState(true);
  const [storePhone, setStorePhone] = useState('');
  const [openingHours, setOpeningHours] = useState([]);
  const [planName, setPlanName] = useState('');
  const customersStorageKey = useMemo(
    () => `customers:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
  const resolvedWhatsApp = useMemo(() => {
    const raw = storePhone || WHATSAPP_NUMBER;
    const digits = (raw || '').toString().replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  }, [storePhone]);

  const todayHoursLabel = useMemo(() => {
    if (!openingHours?.length) return '';
    const today = openingHours.find((entry) => entry.day === new Date().getDay());
    if (!today || today.enabled === false) return 'Fechado hoje';
    const intervals = Array.isArray(today.intervals) ? today.intervals : [];
    if (!intervals.length) return '';
    return intervals.map((interval) => `${interval.start}–${interval.end}`).join(' • ');
  }, [openingHours]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [branding.instagram]);

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
    }

    const savedCustomers = localStorage.getItem(customersStorageKey);
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers) || []);
      } catch (error) {
        console.error('Falha ao carregar clientes salvos', error);
      }
    }

    if (!storeSlug) {
      console.warn('No store slug provided');
      setIsLoading(false);
      setLoadError('Loja não especificada');
      return;
    }

    const loadStore = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setLoadError(null);
      }

      try {
        const data = await storeService.fetchBySlug(storeSlug);
        if (data) {
          const socialLinks = data.settings?.socialLinks || [];
          const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;

          setBranding((prev) => ({
            ...prev,
            espetoId: data.slug || prev.espetoId,
            brandName: data.name || prev.brandName,
            logoUrl: resolveAssetUrl(data.settings?.logoUrl) || prev.logoUrl,
            primaryColor: data.settings?.primaryColor || prev.primaryColor,
            accentColor: data.settings?.secondaryColor || prev.accentColor,
            instagram: instagramLink || prev.instagram,
          }));
          const normalizedHours = normalizeOpeningHours(data.settings?.openingHours || []);
          setOpeningHours(normalizedHours);
          setStorePhone(data.owner?.phone || '');
          setPlanName(data.subscription?.plan?.name || '');
          const openNow =
            typeof data.openNow === 'boolean'
              ? data.openNow
              : isStoreOpenNow(normalizedHours, data.open);
          setStoreOpenNow(openNow);
        }
      } catch (error) {
        console.error('Erro ao carregar loja', error);
        if (!silent) {
          setBranding((prev) => ({
            ...prev,
            espetoId: storeSlug,
            brandName: prev.brandName || 'Espetaria',
          }));
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    };

    const loadProducts = async () => {
      try {
        const loadedProducts = await productService.listPublicBySlug(storeSlug);
        setProducts(loadedProducts || []);
      } catch (error) {
        console.error('Erro ao carregar produtos', error);
      }
    };

    loadStore(false);
    loadProducts();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadStore(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [storeSlug]);

  useEffect(() => {
    const storageKey = brandingStorageKey(branding.espetoId);
    localStorage.setItem(storageKey, JSON.stringify(branding));
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor || defaultBranding.primaryColor);
    document.documentElement.style.setProperty('--accent-color', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
    document.documentElement.style.setProperty('--color-primary', branding.primaryColor || defaultBranding.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
  }, [branding]);

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

    if (customer.type === 'table' && !customer.table) {
      alert('Informe o número da mesa.');
      return;
    }

    const isPickup = customer.type === 'pickup';
    const payment = paymentMethod;

    const sanitizedPhone = customer.phone.replace(/\D/g, '');
    const sanitizedPhoneKey = sanitizedPhone.length >= 10 ? `+55${sanitizedPhone}` : '';
    const pixKey = PIX_KEY || sanitizedPhoneKey;

    const order = {
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      table: customer.table,
      type: customer.type,
      paymentMethod: payment,
      items: Object.values(cart).map((item) => ({
        productId: item.id,
        quantity: item.qty,
      })),
    };

    if (!storeSlug) {
      alert('Loja não especificada.');
      return;
    }

    await orderService.createBySlug(order, storeSlug);
    const nextCustomers = [
      { name: customer.name, phone: customer.phone, table: customer.table },
      ...customers.filter((entry) => entry.name !== customer.name),
    ].slice(0, 50);
    setCustomers(nextCustomers);
    localStorage.setItem(customersStorageKey, JSON.stringify(nextCustomers));
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
        customer.table ? `🪑 *Mesa:* ${customer.table}` : '',
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
      const targetNumber = resolvedWhatsApp || WHATSAPP_NUMBER;
      window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, '_blank');
    }

    setCart({});
    setCustomer(initialCustomer);
    setPaymentMethod(defaultPaymentMethod);

    setLastOrder({
      type: customer.type,
      payment,
      phone: sanitizedPhoneKey || customer.phone,
      pixKey,
      table: customer.table,
    });
    setView('success');
  };

  const requireAdminSession = () => {
    if (!user) {
      navigate('/admin');
      return;
    }
    navigate(storeSlug ? `/chamanoespeto/${storeSlug}/orders` : '/admin');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-red-500 dark:border-t-red-500 animate-spin"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-semibold">Carregando loja...</p>
        </div>
      </div>
    );
  }

  // Fallback UI if no products and no error
  const hasContent = products.length > 0 || !loadError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans pb-24">
      {view !== 'menu' && (
        <div className="bg-white shadow-md px-4 py-4 flex items-center gap-4 sticky top-0 z-40 border-b border-gray-100">
          <div
            className="w-12 h-12 rounded-full overflow-hidden border shadow-sm bg-white flex items-center justify-center"
            style={{ borderColor: branding?.primaryColor, color: branding?.primaryColor }}
          >
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-lg">{branding?.brandName?.slice(0, 2)?.toUpperCase() || 'ES'}</span>
            )}
          </div>
          <div className="flex-1 leading-tight">
            <h1 className="text-lg font-bold text-gray-900">{branding?.brandName || 'Seu Espeto'}</h1>
            <p className="text-xs text-gray-500">{branding?.tagline}</p>
          </div>
          <button
            onClick={() => setView('menu')}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Voltar ao cardápio
          </button>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'menu' && products.length === 0 ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-6xl">🍖</div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cardápio vazio</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">O cardápio desta loja ainda não foi configurado. Volte em breve!</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-lg bg-brand-gradient text-white font-semibold hover:opacity-90 transition-all"
              >
                Voltar para início
              </button>
            </div>
          </div>
        ) : view === 'menu' && products.length > 0 && (
          <MenuView
            products={products}
            cart={cart}
            branding={branding}
            instagramHandle={instagramHandle}
            onUpdateCart={updateCart}
            onProceed={() => setView('cart')}
            onOpenQueue={user?.token ? requireAdminSession : undefined}
            onOpenAdmin={user?.token ? () => navigate('/admin/dashboard') : undefined}
            isOpenNow={storeOpenNow}
            whatsappNumber={storePhone}
            todayHoursLabel={todayHoursLabel}
            planName={planName}
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
              table={lastOrder?.table}
              onNewOrder={() => setView('menu')}
            />
          </div>
        )}
      </main>

      {view === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setView('cart')}
            className="w-full bg-brand-gradient text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.02] transition-all"
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
