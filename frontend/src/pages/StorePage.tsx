// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, PaperPlaneTilt } from '@phosphor-icons/react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { storeService } from '../services/storeService';
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { SuccessView } from '../components/Client/SuccessView';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatOrderDisplayId, formatPaymentMethod, formatPhoneInput } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getPersistedBranding, brandingStorageKey, defaultBranding, initialCustomer, defaultPaymentMethod, DEFAULT_AREA_CODE, WHATSAPP_NUMBER, PIX_KEY } from '../constants';
import { formatOpeningHoursSummary, isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';

export function StorePage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState('menu');
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [cashTendered, setCashTendered] = useState('');
  const [lastOrder, setLastOrder] = useState(null);
  const [branding, setBranding] = useState(() => getPersistedBranding(storeSlug || defaultBranding.espetoId));
  const [storeOpenNow, setStoreOpenNow] = useState(true);
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePixKey, setStorePixKey] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [openingHours, setOpeningHours] = useState([]);
  const [orderTypes, setOrderTypes] = useState([ 'delivery', 'pickup', 'table' ]);
  const [storeSubscription, setStoreSubscription] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [reorderApplied, setReorderApplied] = useState(false);
  const autoTrackRef = useRef(false);
  const reorderTtlMs = 30 * 24 * 60 * 60 * 1000;
  const [lastPublicOrderId, setLastPublicOrderId] = useState('');
  const [recentPublicOrders, setRecentPublicOrders] = useState([]);
  const [lastOrderItems, setLastOrderItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [orderNotice, setOrderNotice] = useState(null);
  const [tableNotice, setTableNotice] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempted, setMapAttempted] = useState(false);
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

  useEffect(() => {
    if (paymentMethod !== 'dinheiro' && cashTendered) {
      setCashTendered('');
    }
  }, [paymentMethod, cashTendered]);
  const storeUrl =
    storeSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/${storeSlug}`
      : '';

  const todayHoursLabel = useMemo(() => {
    if (!openingHours?.length) return '';
    const today = openingHours.find((entry) => entry.day === new Date().getDay());
    if (!today || today.enabled === false) return 'Fechado hoje';
    const intervals = Array.isArray(today.intervals) ? today.intervals : [];
    if (!intervals.length) return '';
    return intervals.map((interval) => `${interval.start}–${interval.end}`).join(' • ');
  }, [openingHours]);
  const weeklyHours = useMemo(() => formatOpeningHoursSummary(openingHours), [openingHours]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const isDemo = storeSlug === 'demo' || storeSlug === 'test-store';
  const isStoreAdmin =
    Boolean(user?.token) &&
    Boolean(user?.store?.slug) &&
    Boolean(storeSlug) &&
    user.store.slug === storeSlug;

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [branding.instagram]);
  const subscriptionStatus = storeSubscription?.status;
  const isSubscriptionKnown = storeSubscription !== null && storeSubscription !== undefined;
  const isSubscriptionActive =
    !isSubscriptionKnown ||
    (subscriptionStatus &&
      ![ 'PENDING', 'CANCELLED', 'SUSPENDED', 'EXPIRED' ].includes(subscriptionStatus));
  const showInactiveState = view === 'menu' && isSubscriptionKnown && !isSubscriptionActive;
  const showClosedState = view === 'menu' && isSubscriptionActive && !storeOpenNow;

  const resolveItemPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return Number(item?.price) || 0;
  };

  const applyStoreMeta = (store: any) => {
    if (!store) return;
    const name = store.name || store.slug || 'Chama no Espeto';
    const description = `Cardápio online e pedidos da loja ${name}.`;
    const logo = resolveAssetUrl(store.settings?.logoUrl) || '/chama-no-espeto.jpeg';
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const upsertMeta = (key: string, value: string, attr: 'name' | 'property' = 'name') => {
      if (!value) return;
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    };

    document.title = `${name} | Chama no Espeto`;
    upsertMeta('description', description, 'name');
    upsertMeta('og:title', name, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', logo, 'property');
    upsertMeta('og:url', url, 'property');
    upsertMeta('twitter:card', 'summary_large_image', 'name');
    upsertMeta('twitter:title', name, 'name');
    upsertMeta('twitter:description', description, 'name');
    upsertMeta('twitter:image', logo, 'name');

    const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    favicon.setAttribute('href', logo);
    document.head.appendChild(favicon);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(max-width: 640px)');
      const handleMedia = () => setIsMobile(media.matches);
      handleMedia();
      if (media.addEventListener) {
        media.addEventListener('change', handleMedia);
      } else {
        media.addListener(handleMedia);
      }
      return () => {
        if (media.removeEventListener) {
          media.removeEventListener('change', handleMedia);
        } else {
          media.removeListener(handleMedia);
        }
      };
    }
    return undefined;
  }, []);

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
          const allowedTypes = Array.isArray(data.settings?.orderTypes) && data.settings.orderTypes.length > 0
            ? data.settings.orderTypes
            : [ 'delivery', 'pickup', 'table' ];
          setOrderTypes(allowedTypes);
          setStorePhone(data.owner?.phone || '');
          setStoreAddress(data.owner?.address || '');
          setStoreDescription(data.settings?.description || '');
          setStoreEmail(data.settings?.contactEmail || '');
          setPromoMessage(data.settings?.promoMessage || '');
          setStorePixKey(data.settings?.pixKey || '');
          setStoreOpenNow(isStoreOpenNow(normalizedHours));
          setStoreSubscription(data.subscription || null);
          applyStoreMeta(data);
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
    if (storeSlug) {
      orderService.fetchHighlightsBySlug(storeSlug)
        .then((items) => setTopProducts(items || []))
        .catch(() => setTopProducts([]));
    }
    if (storeSlug) {
      try {
        const raw = localStorage.getItem(`lastOrder:${storeSlug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const shouldShow = parsed?.id;
          setLastPublicOrderId(shouldShow ? parsed.id : '');
        } else {
          setLastPublicOrderId('');
        }
      } catch {
        setLastPublicOrderId('');
      }

      try {
        const rawList = localStorage.getItem(`lastOrders:${storeSlug}`);
        if (rawList) {
          const parsedList = JSON.parse(rawList);
          if (Array.isArray(parsedList)) {
            setRecentPublicOrders(parsedList.slice(0, 3));
          } else {
            setRecentPublicOrders([]);
          }
        } else {
          setRecentPublicOrders([]);
        }
      } catch {
        setRecentPublicOrders([]);
      }

      try {
        const rawItems = localStorage.getItem(`lastOrderItems:${storeSlug}`);
        if (rawItems) {
          const parsedItems = JSON.parse(rawItems);
          const savedAt = Number(parsedItems?.savedAt || 0);
          const isFresh = savedAt && Date.now() - savedAt < reorderTtlMs;
          const items = Array.isArray(parsedItems?.items) ? parsedItems.items : [];
          if (items.length && isFresh) {
            setLastOrderItems(items);
          } else {
            localStorage.removeItem(`lastOrderItems:${storeSlug}`);
            setLastOrderItems([]);
          }
        } else {
          setLastOrderItems([]);
        }
      } catch {
        setLastOrderItems([]);
      }
    }

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
    if (!storeSlug || typeof window === 'undefined') return;
    if (autoTrackRef.current) return;
    autoTrackRef.current = true;
    const params = new URLSearchParams(window.location.search || '');
    const payload = {
      utm_source: params.get('utm_source') || params.get('source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    };
    storeService.trackPublicVisit(storeSlug, payload).catch(() => {});
  }, [storeSlug]);

  useEffect(() => {
    if (reorderApplied || !storeSlug || products.length === 0) return;
    const raw = localStorage.getItem(`reorder:${storeSlug}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      if (!items.length) return;
      const nextCart = {};
      items.forEach((item) => {
        const product =
          products.find((entry) => entry.id === item.productId) ||
          products.find((entry) => entry.name === item.name);
        if (!product) return;
        const cookingPoint = item.cookingPoint || '';
        const passSkewer = Boolean(item.passSkewer);
        const key = `${product.id}:${cookingPoint}:${passSkewer ? '1' : '0'}`;
        nextCart[key] = {
          ...product,
          key,
          qty: Number(item.quantity || item.qty || 1),
          cookingPoint,
          passSkewer,
        };
      });
      if (Object.keys(nextCart).length) {
        setCart(nextCart);
        setView('cart');
      }
      localStorage.removeItem(`reorder:${storeSlug}`);
      setReorderApplied(true);
    } catch (error) {
      console.error('Falha ao aplicar pedido repetido', error);
    }
  }, [products, storeSlug, reorderApplied]);

  useEffect(() => {
    if (!orderTypes.length) return;
    if (!orderTypes.includes(customer.type)) {
      setCustomer((prev) => ({ ...prev, type: orderTypes[0] }));
    }
  }, [orderTypes, customer.type]);

  useEffect(() => {
    const storageKey = brandingStorageKey(branding.espetoId);
    localStorage.setItem(storageKey, JSON.stringify(branding));
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor || defaultBranding.primaryColor);
    document.documentElement.style.setProperty('--accent-color', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
    document.documentElement.style.setProperty('--color-primary', branding.primaryColor || defaultBranding.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', branding.accentColor || branding.primaryColor || defaultBranding.accentColor);
  }, [branding]);

  useEffect(() => {
    if (view !== 'success' || !lastOrder?.id) {
      autoTrackRef.current = false;
      return;
    }
    if (autoTrackRef.current) return;
    autoTrackRef.current = true;
    const timeout = window.setTimeout(() => {
      navigate(`/pedido/${lastOrder.id}`);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [view, lastOrder?.id, navigate]);

  useEffect(() => {
    if (user?.token) {
      setLastPublicOrderId('');
    }
  }, [user?.token]);

  useEffect(() => {
    setMapCoords(null);
    setMapFailed(false);
    setMapAttempted(false);
  }, [storeAddress]);

  useEffect(() => {
    if (!storeSlug) return;
    const cached = localStorage.getItem(`store:coords:${storeSlug}`);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.lat && parsed?.lon) {
        setMapCoords(parsed);
      }
    } catch (error) {
      console.error('Falha ao ler cache do mapa', error);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!showInfoSheet || !storeAddress || mapCoords || mapLoading || mapFailed || mapAttempted) return;
    const controller = new AbortController();
    const loadCoords = async () => {
      setMapAttempted(true);
      setMapLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(storeAddress)}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
          const next = { lat: data[0].lat, lon: data[0].lon };
          setMapCoords(next);
          if (storeSlug) {
            localStorage.setItem(`store:coords:${storeSlug}`, JSON.stringify(next));
          }
        } else {
          setMapFailed(true);
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Falha ao carregar mapa', error);
          setMapFailed(true);
        }
      } finally {
        setMapLoading(false);
      }
    };
    loadCoords();
    return () => controller.abort();
  }, [showInfoSheet, storeAddress, mapCoords, mapLoading, mapFailed, storeSlug]);

  const updateCart = (item, qty, options) => {
    const cookingPoint = options?.cookingPoint ?? item?.cookingPoint;
    const passSkewer = Boolean(options?.passSkewer ?? item?.passSkewer);
    const cartKey = `${item.id}:${cookingPoint || ''}:${passSkewer ? '1' : '0'}`;
    setCart((previous) => {
      const currentQty = previous[cartKey]?.qty || 0;
      const nextQty = currentQty + qty;
      if (nextQty <= 0) {
        const copy = { ...previous };
        delete copy[cartKey];
        return copy;
      }
      const unitPrice = resolveItemPrice(item);
      return {
        ...previous,
        [cartKey]: {
          ...item,
          key: cartKey,
          price: unitPrice,
          originalPrice: item?.price,
          qty: nextQty,
          cookingPoint,
          passSkewer,
        },
      };
    });
  };

  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar varinha');
    return labels.length ? `(${labels.join(' • ')})` : '';
  };

  const handleCustomerChange = (nextCustomer) => {
    const normalizedName = nextCustomer.name?.trim().toLowerCase();
    const matchedCustomer = customers.find(
      (entry) => entry.name?.trim().toLowerCase() === normalizedName
    );

    const phoneFromMatch = !nextCustomer.phone && matchedCustomer?.phone ? matchedCustomer.phone : nextCustomer.phone;
    const formattedPhone = formatPhoneInput(phoneFromMatch, DEFAULT_AREA_CODE);

    const updatedCustomer = { ...nextCustomer, phone: formattedPhone };
    if (!user?.token && nextCustomer.type === 'table') {
      setLastPublicOrderId('');
      if (storeSlug) {
        localStorage.removeItem(`lastOrder:${storeSlug}`);
      }
    }
    setCustomer(updatedCustomer);
  };

  const showOrderNotice = (orderId) => {
    if (!orderId) return;
    setOrderNotice({ id: orderId });
    window.setTimeout(() => setOrderNotice(null), 3500);
  };

  const showTableNotice = (message) => {
    if (!message) return;
    setTableNotice({ message, tone: 'warn' });
    window.setTimeout(() => setTableNotice(null), 4000);
  };

  const showErrorNotice = (message) => {
    if (!message) return;
    setTableNotice({ message, tone: 'error' });
    window.setTimeout(() => setTableNotice(null), 4000);
  };

  const checkout = async () => {
    const isSubscriptionActive =
      subscriptionStatus &&
      ![ 'PENDING', 'CANCELLED', 'SUSPENDED', 'EXPIRED' ].includes(subscriptionStatus);
    if (!isSubscriptionActive) {
      alert('Loja com assinatura inativa. Tente novamente mais tarde.');
      return;
    }
    if (!storeOpenNow) {
      alert('Loja fechada no momento. Tente novamente durante o horario de atendimento.');
      return;
    }
    const requiresPhone = customer.type !== 'table';
    if (!customer.name || (requiresPhone && !customer.phone)) {
      alert(requiresPhone ? 'Preencha Nome e Telefone' : 'Preencha o Nome');
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
    const pixKey = storePixKey || PIX_KEY || sanitizedPhoneKey;

    const parsedCash =
      payment === 'dinheiro' && cashTendered
        ? Number(cashTendered.toString().replace(',', '.'))
        : null;

    const order = {
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      table: customer.table,
      type: customer.type,
      paymentMethod: payment,
      cashTendered: parsedCash && !Number.isNaN(parsedCash) ? parsedCash : undefined,
      items: Object.values(cart).map((item) => ({
        productId: item.id,
        quantity: item.qty,
        cookingPoint: item.cookingPoint,
        passSkewer: item.passSkewer,
      })),
    };

    if (!storeSlug) {
      alert('Loja não especificada.');
      return;
    }

    if (isDemo) {
      const demoId = `demo-${Date.now()}`;
      setCart({});
      setCustomer(initialCustomer);
      setPaymentMethod(defaultPaymentMethod);
      setCashTendered('');
      setLastOrder({
        id: demoId,
        type: customer.type,
        payment,
        phone: sanitizedPhoneKey || customer.phone,
        pixKey,
        table: customer.table,
        cashTendered: parsedCash && !Number.isNaN(parsedCash) ? parsedCash : null,
      });
      localStorage.setItem(
        `lastOrder:${storeSlug}`,
        JSON.stringify({ id: demoId, createdAt: Date.now(), type: customer.type })
      );
      sessionStorage.setItem(
        `demo:order:${demoId}`,
        JSON.stringify({
          id: demoId,
          status: 'pending',
          type: customer.type,
          table: customer.table,
          customerName: customer.name,
          paymentMethod: payment,
          cashTendered: parsedCash && !Number.isNaN(parsedCash) ? parsedCash : null,
          items: Object.values(cart).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.qty,
            price: item.price * item.qty,
            cookingPoint: item.cookingPoint,
            passSkewer: item.passSkewer,
          })),
          phone: customer.phone,
          total: cartTotal,
          store: { name: 'Chama no Espeto Demo', slug: storeSlug },
          createdAt: Date.now(),
        })
      );
      setView(isStoreAdmin ? 'menu' : 'success');
      if (isStoreAdmin) {
        showOrderNotice(demoId);
      }
      return;
    }

    let createdOrder;
    try {
      createdOrder = await orderService.createBySlug(order, storeSlug);
    } catch (error) {
      if (error?.code === 'ORDER-003') {
        showTableNotice(error.message || 'Mesa já está ocupada. Finalize o pedido atual antes de criar outro.');
        return;
      }
      showErrorNotice(error?.message || 'Não foi possível enviar o pedido agora.');
      return;
    }
    const nextCustomers = [
      { name: customer.name, phone: customer.phone, table: customer.table },
      ...customers.filter((entry) => entry.name !== customer.name),
    ].slice(0, 50);
    setCustomers(nextCustomers);
    localStorage.setItem(customersStorageKey, JSON.stringify(nextCustomers));
    customerService.fetchAll().then(setCustomers).catch(() => {});

    const shouldNotifyOwner = !isStoreAdmin && (customer.type === 'pickup' || customer.type === 'table');
    if (shouldNotifyOwner) {
    const itemsList = Object.values(cart)
      .map((item) => `▪ ${item.qty}x ${item.name} ${formatItemOptions(item)}`.trim())
      .join('\n');
    const customerLabel = customer.phone
      ? `👤 *${customer.name}* (${customer.phone})`
      : `👤 *${customer.name}*`;

    const messageLines = [
      `*NOVO PEDIDO - ${branding?.brandName || 'Chama no Espeto'}*`,
      storeSlug ? `🏷️ *Loja:* ${storeSlug}` : '',
      storeAddress ? `📍 *Endereço da loja:* ${storeAddress}` : '',
      '------------------',
      customerLabel,
      `🛒 *Tipo:* ${customer.type}`,
      customer.table ? `🪑 *Mesa:* ${customer.table}` : '',
      payment ? `💳 Pagamento: ${formatPaymentMethod(payment)}` : '',
        payment === 'dinheiro' && parsedCash
          ? `💵 Troco para: ${formatCurrency(parsedCash)}`
          : '',
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

    const trackingLink =
      typeof window !== 'undefined' && createdOrder?.id
        ? `${window.location.origin}/pedido/${createdOrder.id}`
        : '';
    const customerItemsList = Object.values(cart)
      .map((item) => `- ${item.qty}x ${item.name} ${formatItemOptions(item)}`.trim())
      .join('\n');
    const customerMessageLines = [
      `Pedido #${formatOrderDisplayId(createdOrder?.id, storeSlug)} - ${branding?.brandName || 'Chama no Espeto'}`,
      customerItemsList ? `Itens:\n${customerItemsList}` : '',
      `Total: ${formatCurrency(cartTotal)}`,
      payment === 'dinheiro' && parsedCash
        ? `Troco para: ${formatCurrency(parsedCash)}`
        : '',
      trackingLink ? `Acompanhar: ${trackingLink}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const customerNumber =
      sanitizedPhone.length >= 10
        ? sanitizedPhone.startsWith('55')
          ? sanitizedPhone
          : `55${sanitizedPhone}`
        : '';
    if (customerNumber && !isStoreAdmin) {
      window.open(
        `https://wa.me/${customerNumber}?text=${encodeURIComponent(customerMessageLines)}`,
        '_blank'
      );
    }

    setCart({});
    setCustomer(initialCustomer);
    setPaymentMethod(defaultPaymentMethod);
    setCashTendered('');

    setLastOrder({
      id: createdOrder?.id,
      type: customer.type,
      payment,
      cashTendered: parsedCash && !Number.isNaN(parsedCash) ? parsedCash : null,
      phone: sanitizedPhoneKey || customer.phone,
      pixKey,
      table: customer.table,
    });
    if (createdOrder?.id && !user?.token) {
      const entry = { id: createdOrder.id, createdAt: Date.now(), type: customer.type };
      localStorage.setItem(`lastOrder:${storeSlug}`, JSON.stringify(entry));
      setLastPublicOrderId(createdOrder.id);
      try {
        const rawList = localStorage.getItem(`lastOrders:${storeSlug}`);
        const parsedList = rawList ? JSON.parse(rawList) : [];
        const list = Array.isArray(parsedList) ? parsedList : [];
        const next = [entry, ...list.filter((item) => item?.id !== entry.id)].slice(0, 3);
        localStorage.setItem(`lastOrders:${storeSlug}`, JSON.stringify(next));
        setRecentPublicOrders(next);
      } catch {
        setRecentPublicOrders([entry]);
      }
      const lastItemsPayload = {
        savedAt: Date.now(),
        items: Object.values(cart).map((item: any) => ({
          productId: item.id,
          name: item.name,
          quantity: item.qty,
          cookingPoint: item.cookingPoint || '',
          passSkewer: Boolean(item.passSkewer),
        })),
      };
      localStorage.setItem(`lastOrderItems:${storeSlug}`, JSON.stringify(lastItemsPayload));
      setLastOrderItems(lastItemsPayload.items);
    }
    setView(isStoreAdmin ? 'menu' : 'success');
    if (isStoreAdmin) {
      showOrderNotice(createdOrder?.id);
    }
  };

  const requireAdminSession = () => {
    if (!isStoreAdmin) {
      navigate(storeSlug ? `/admin?slug=${encodeURIComponent(storeSlug)}` : '/admin');
      return;
    }
    navigate(storeSlug ? `/admin/dashboard` : '/admin', { state: { activeTab: 'fila' } });
  };
  const handleRepeatFromMenu = () => {
    if (!storeSlug || !lastOrderItems.length) return;
    localStorage.setItem(`reorder:${storeSlug}`, JSON.stringify({ items: lastOrderItems }));
    setReorderApplied(false);
    setView('cart');
  };
  const goToDemoGuide = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollToDemoFlow', 'true');
    }
    navigate('/');
  };
  const openProductsSetup = () => {
    if (storeSlug) {
      sessionStorage.setItem('admin:redirectTab', 'produtos');
      sessionStorage.setItem('admin:redirectSlug', storeSlug);
    }
    if (isStoreAdmin) {
      navigate('/admin/dashboard', { state: { activeTab: 'produtos' } });
      return;
    }
    if (storeSlug) {
      navigate(`/admin?slug=${encodeURIComponent(storeSlug)}&tab=produtos`);
      return;
    }
    navigate('/admin');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-sans pb-28 sm:pb-24">
      {isDemo && view === 'menu' && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-amber-900">
            <span>
              Demo do cardápio ativa. Veja o fluxo completo para entender como funciona.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={goToDemoGuide}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Voltar ao guia
              </button>
              <button
                onClick={() => navigate('/admin/demo')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Ver painel demo
              </button>
            </div>
          </div>
        </div>
      )}
      {view !== 'menu' && (
        <div className="bg-white shadow-md px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-gray-100">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border shadow-sm bg-white flex-shrink-0 flex items-center justify-center"
            style={{ borderColor: branding?.primaryColor, color: branding?.primaryColor }}
          >
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-sm sm:text-lg">{branding?.brandName?.slice(0, 2)?.toUpperCase() || 'ES'}</span>
            )}
          </div>
          <div className="flex-1 leading-tight min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{branding?.brandName || 'Seu Espeto'}</h1>
            <p className="text-xs text-gray-500 truncate">{branding?.tagline}</p>
          </div>
          <button
            onClick={() => setView('menu')}
            className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
          >
            Voltar
          </button>
        </div>
      )}

      <main className="mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-0 sm:py-6">
        {orderNotice && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4">
            <div className="flex flex-wrap items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="text-sm font-semibold">
                Pedido enviado para a fila
                <span className="block text-xs text-slate-300 font-medium">
                  #{formatOrderDisplayId(orderNotice.id, storeSlug)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!orderNotice?.id) return;
                  const link = `${window.location.origin}/pedido/${orderNotice.id}`;
                  navigator.clipboard.writeText(link);
                  showToast('Link do pedido copiado.', 'success');
                }}
                className="ml-auto px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-white/20 border border-white/10"
              >
                Copiar link
              </button>
            </div>
          </div>
        )}
        {tableNotice && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-white/10 text-white ${
                tableNotice.tone === 'error' ? 'bg-rose-600' : 'bg-amber-600'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
              <div className="text-sm font-semibold">
                {tableNotice.message}
              </div>
            </div>
          </div>
        )}
        {showInactiveState && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="text-center px-4 max-w-md">
              <div className="mb-4">
                <div className="text-6xl">🔒</div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loja inativa no momento</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Esta loja esta com a assinatura inativa. Entre em contato ou tente novamente mais tarde.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {storePhone && (
                  <a
                    href={`https://wa.me/${storePhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:opacity-90 transition-all"
                  >
                    Falar no WhatsApp
                  </a>
                )}
                <button
                  onClick={() => navigate(storeSlug ? `/admin?slug=${encodeURIComponent(storeSlug)}` : '/admin')}
                  className="px-6 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Sou o administrador
                </button>
              </div>
            </div>
          </div>
        )}
        {showClosedState && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="w-full max-w-4xl px-4">
              <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.65)]">
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] p-6 sm:p-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                        <img
                          src={branding?.logoUrl || '/chama-no-espeto.jpeg'}
                          alt={branding?.brandName || 'Chama no Espeto'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Atendimento</p>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {branding?.brandName || 'Loja fechada agora'}
                        </h2>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-800">
                      🕒 Loja fechada no momento
                    </div>
                    <p className="text-slate-600">
                      O atendimento esta fechado. Volte no proximo horario de funcionamento.
                    </p>
                    {todayHoursLabel && (
                      <p className="text-sm text-slate-500">Horario de hoje: {todayHoursLabel}</p>
                    )}
                    {storeDescription && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">Sobre a loja</p>
                        <p>{storeDescription}</p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                      >
                        Voltar ao inicio
                      </button>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Contato</p>
                      {instagramHandle && (
                        <a
                          href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 text-sm font-semibold text-[#0a66c2]"
                        >
                          <span>Instagram</span>
                          <span>{instagramHandle}</span>
                        </a>
                      )}
                      {storeAddress && (
                        <div className="text-sm text-slate-500">
                          <p className="font-semibold text-slate-700">Endereço</p>
                          <p>{storeAddress}</p>
                        </div>
                      )}
                    </div>
                    {weeklyHours.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Horarios da semana</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {weeklyHours.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 text-center">
                      <span className="font-semibold text-slate-500">Chama no Espeto</span> • plataforma de pedidos online
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!showInactiveState && !showClosedState && view === 'menu' && products.length === 0 ? (
          <div className="min-h-[80vh] flex items-center justify-center">
            <div className="text-center px-4">
              <div className="mb-4">
                <div className="text-6xl">🍖</div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loja ainda não configurada</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                Falta cadastrar os produtos para o cardápio aparecer. Se você é o responsável pela loja, clique abaixo para configurar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={openProductsSetup}
                  className="px-6 py-3 rounded-lg bg-brand-gradient text-white font-semibold hover:opacity-90 transition-all"
                >
                  Cadastrar produtos
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Voltar para início
                </button>
              </div>
            </div>
          </div>
        ) : !showInactiveState && !showClosedState && view === 'menu' && products.length > 0 && (
          <div className="space-y-4">
            {!user?.token && recentPublicOrders.length > 0 && (
              <div className="mx-3 sm:mx-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-semibold">Acompanhar pedidos recentes</span>
                  <div className="flex flex-wrap gap-2">
                    {recentPublicOrders.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => navigate(`/pedido/${entry.id}`)}
                        className="px-2.5 py-1 rounded-full bg-white text-emerald-700 text-[11px] font-semibold border border-emerald-200 hover:bg-emerald-100"
                      >
                        #{formatOrderDisplayId(entry.id, storeSlug)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/pedido/${recentPublicOrders[0].id}`)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90"
                  >
                    Acompanhar agora
                  </button>
                  {lastOrderItems.length > 0 && (
                    <button
                      onClick={handleRepeatFromMenu}
                      className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                    >
                      Pedir novamente
                    </button>
                  )}
                </div>
              </div>
            )}
            <MenuView
              products={products}
              topProducts={topProducts}
              cart={cart}
              branding={branding}
              instagramHandle={instagramHandle}
              onUpdateCart={updateCart}
              onProceed={() => setView('cart')}
              onOpenQueue={isStoreAdmin ? requireAdminSession : undefined}
              onOpenAdmin={isStoreAdmin ? () => navigate('/admin/dashboard') : undefined}
              isOpenNow={storeOpenNow}
              whatsappNumber={storePhone}
              contactEmail={storeEmail}
              promoMessage={promoMessage}
              storeUrl={storeUrl}
              todayHoursLabel={todayHoursLabel}
              storeAddress={storeAddress}
              compactHeader={isMobile}
              onOpenInfo={() => setShowInfoSheet(true)}
            />
          </div>
        )}
        {view === 'cart' && (
          <CartView
            cart={cart}
            customer={customer}
            customers={customers}
            paymentMethod={paymentMethod}
            cashTendered={cashTendered}
            allowedOrderTypes={orderTypes}
            allowCustomerAutocomplete={Boolean(user?.token)}
            onChangeCustomer={handleCustomerChange}
            onChangePayment={setPaymentMethod}
            onChangeCashTendered={setCashTendered}
            onCheckout={checkout}
            onBack={() => setView('menu')}
          />
        )}
        {view === 'success' && (
          <div className="max-w-md mx-auto px-2">
            <SuccessView
              orderType={lastOrder?.type}
              paymentMethod={lastOrder?.payment}
              pixKey={lastOrder?.pixKey}
              phone={lastOrder?.phone}
              table={lastOrder?.table}
              orderId={lastOrder?.id}
              cashTendered={lastOrder?.cashTendered}
              onTrackOrder={() => {
                if (lastOrder?.id) {
                  navigate(`/pedido/${lastOrder.id}`);
                }
              }}
              onNewOrder={() => setView('menu')}
            />
          </div>
        )}
      </main>

      {view === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:max-w-md sm:left-auto sm:right-6">
          <button
            onClick={() => setView('cart')}
            className="w-full bg-brand-gradient text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.02] transition-all text-sm sm:text-base"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {Object.values(cart).reduce((acc, item) => acc + item.qty, 0)}
              </span>
              <span className="font-bold truncate">Ver pedido</span>
            </div>
            <span className="font-bold text-base sm:text-lg ml-2 flex-shrink-0">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {view === 'cart' && (
        <div
          className="fixed bottom-6 right-6 text-white rounded-full p-3 sm:p-4 shadow-2xl sm:hidden cursor-pointer transform hover:scale-110 transition-all"
          style={{ backgroundColor: branding.primaryColor }}
          onClick={checkout}
        >
          <PaperPlaneTilt size={20} weight="duotone" />
        </div>
      )}

      {showInfoSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Info da loja</p>
                <h3 className="text-lg font-bold text-slate-900">{branding?.brandName || 'Chama no Espeto'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoSheet(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <div className="p-5 space-y-4">
              {storeAddress && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Endereço</p>
                  <p className="text-sm font-semibold text-slate-800">{storeAddress}</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                    >
                      Abrir no Google Maps
                    </a>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(storeAddress)}&navigate=yes`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-brand-primary text-brand-primary bg-brand-primary-soft hover:opacity-90 transition"
                    >
                      Abrir no Waze
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!storeAddress) return;
                        try {
                          await navigator.clipboard.writeText(storeAddress);
                          setCopiedAddress(true);
                          window.setTimeout(() => setCopiedAddress(false), 2000);
                        } catch (error) {
                          console.error('Falha ao copiar endereco', error);
                        }
                      }}
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                    >
                      {copiedAddress ? 'Endereço copiado' : 'Copiar endereco'}
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white sm:hidden">
                    {mapCoords ? (
                      <img
                        src={`https://staticmap.openstreetmap.de/staticmap.php?center=${mapCoords.lat},${mapCoords.lon}&zoom=16&size=600x300&markers=${mapCoords.lat},${mapCoords.lon},red-pushpin`}
                        alt="Mapa da loja"
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                        <span>
                          {mapLoading ? 'Carregando mapa...' : 'Mapa indisponível'}
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                        >
                          Abrir mapa
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {resolvedWhatsApp && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">WhatsApp</p>
                    <p className="text-sm font-semibold text-slate-800">{formatPhoneInput(storePhone)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/${resolvedWhatsApp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-full text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                    >
                      Conversar
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!storePhone) return;
                        try {
                          await navigator.clipboard.writeText(storePhone);
                          setCopiedPhone(true);
                          window.setTimeout(() => setCopiedPhone(false), 2000);
                        } catch (error) {
                          console.error('Falha ao copiar telefone', error);
                        }
                      }}
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                    >
                      {copiedPhone ? 'Telefone copiado' : 'Copiar telefone'}
                    </button>
                  </div>
                </div>
              )}
              {storeEmail && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Email</p>
                    <p className="text-sm font-semibold text-slate-800">{storeEmail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${storeEmail}`}
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                    >
                      Enviar email
                    </a>
                  </div>
                </div>
              )}

              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between text-slate-700 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Instagram</p>
                    <p className="text-sm font-semibold">{instagramHandle}</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-primary">Visitar</span>
                </a>
              )}

              {weeklyHours?.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Horarios</p>
                  <p className="text-sm font-semibold text-slate-800">{todayHoursLabel || 'Confira abaixo'}</p>
                  <div className="text-xs text-slate-500 space-y-1">
                    {weeklyHours.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
