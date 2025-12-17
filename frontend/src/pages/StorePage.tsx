import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Send, User, ChefHat, LayoutDashboard } from 'lucide-react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { storeService } from '../services/storeService';
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { SuccessView } from '../components/Client/SuccessView';
import { apiClient } from '../config/apiClient';
import { formatCurrency, formatPaymentMethod, formatPhoneInput } from '../utils/format';
import { getPersistedBranding, brandingStorageKey, defaultBranding, initialCustomer, defaultPaymentMethod, DEFAULT_AREA_CODE, WHATSAPP_NUMBER, PIX_KEY } from '../constants';

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

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);
  const brandInitials = useMemo(
    () => branding.brandName?.split(' ').map((part) => part?.[0]).join('').slice(0, 2).toUpperCase() || 'ED',
    [branding.brandName]
  );
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [branding.instagram]);

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
    }

    if (storeSlug) {
      apiClient.setOwnerId(storeSlug);
      storeService
        .fetchBySlug(storeSlug)
        .then((data) => {
          setBranding((prev) => ({
            ...prev,
            espetoId: data.slug,
            brandName: data.name || prev.brandName,
            logoUrl: data.settings?.logo_url || prev.logoUrl,
            primaryColor: data.settings?.primary_color || prev.primaryColor,
            accentColor: data.settings?.secondary_color || prev.accentColor,
            instagram: data.owner_email || prev.instagram,
          }));
        })
        .catch((error) => {
          console.error('Erro ao carregar loja', error);
        });
    }

    const unsubProd = productService.subscribe(setProducts);
    return () => {
      unsubProd();
    };
  }, [storeSlug]);

  useEffect(() => {
    const storageKey = brandingStorageKey(branding.espetoId);
    localStorage.setItem(storageKey, JSON.stringify(branding));
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor || defaultBranding.primaryColor);
    document.documentElement.style.setProperty('--accent-color', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
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

  const requireAdminSession = () => {
    if (!user) {
      navigate('/admin');
      return;
    }
    navigate(`/${storeSlug}/orders`);
  };

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
            
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={requireAdminSession}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                <ChefHat size={18} /> Fila do churrasqueiro
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <LayoutDashboard size={18} /> Área admin
              </button>
            </div>
            
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <User size={20} />
              </button>
              <button 
                onClick={requireAdminSession} 
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChefHat size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
