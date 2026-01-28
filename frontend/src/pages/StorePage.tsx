// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, PaperPlaneTilt } from '@phosphor-icons/react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { storeService } from '../services/storeService';
import { mapsService } from '../services/mapsService';
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
  const [lastOrder, setLastOrder] = useState(null);
  const [branding, setBranding] = useState(() => getPersistedBranding(storeSlug || defaultBranding.espetoId));
  const [storeOpenNow, setStoreOpenNow] = useState(true);
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storePixKey, setStorePixKey] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
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
  const [orderNotice, setOrderNotice] = useState(null);
  const [tableNotice, setTableNotice] = useState(null);
  const [storeCoords, setStoreCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [deliveryCheck, setDeliveryCheck] = useState({ status: 'idle', distanceKm: null, durationMin: null });
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

  const getNumeric = (value) => {
    if (value === null || value === undefined) return null;
    const raw = value.toString().trim();
    if (!raw) return null;
    const parsed = Number(raw.replace(',', '.'));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const haversineDistanceKm = (a, b) => {
    if (!a || !b) return null;
    const toRad = (val) => (val * Math.PI) / 180;
    const lat1 = Number(a.lat);
    const lon1 = Number(a.lng ?? a.lon);
    const lat2 = Number(b.lat);
    const lon2 = Number(b.lng ?? b.lon);
    if ([lat1, lon1, lat2, lon2].some((v) => Number.isNaN(v))) return null;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const radLat1 = toRad(lat1);
    const radLat2 = toRad(lat2);
    const aVal =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);
    const cVal = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    return 6371 * cVal;
  };

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

  const cartItemsTotal = useMemo(
    () => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0),
    [cart]
  );
  const deliveryRadiusValue = useMemo(() => {
    const value = getNumeric(deliveryRadiusKm);
    if (!value || value <= 0) return null;
    return value;
  }, [deliveryRadiusKm]);
  const deliveryFeeValue = useMemo(() => {
    if (customer.type !== 'delivery') return 0;
    const value = getNumeric(deliveryFee);
    if (!value || value <= 0) return 0;
    return value;
  }, [customer.type, deliveryFee]);
  const deliveryAddress = useMemo(() => {
    if (customer.type !== 'delivery') return customer.address || '';
    const parts = [
      customer.street && `${customer.street}, ${customer.number || 's/n'}`,
      customer.complement,
      customer.neighborhood,
      customer.city && customer.state ? `${customer.city} - ${customer.state}` : customer.city,
      customer.cep && `CEP ${customer.cep}`,
    ].filter(Boolean);
    return parts.join(' | ') || customer.address || '';
  }, [customer, customer.type]);
  const orderTotal = useMemo(
    () => cartItemsTotal + deliveryFeeValue,
    [cartItemsTotal, deliveryFeeValue]
  );
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [branding.instagram]);
  const subscriptionStatus = storeSubscription?.status;
  const isSubscriptionKnown = storeSubscription !== null && storeSubscription !== undefined;
  const isSubscriptionActive =
    !isSubscriptionKnown ||
    (subscriptionStatus &&
      ![ 'PENDING', 'CANCELLED', 'SUSPENDED', 'EXPIRED' ].includes(subscriptionStatus));
  const showInactiveState = view === 'menu' && isSubscriptionKnown && !isSubscriptionActive;
  const showClosedState = view === 'menu' && isSubscriptionActive && !storeOpenNow;
  const deliveryValidation = useMemo(() => {
    if (customer.type !== 'delivery' || !deliveryRadiusValue) {
      return { blocked: false, reason: '' };
    }
    if (deliveryCheck.status === 'loading') {
      return { blocked: true, reason: 'Validando distância de entrega...' };
    }
    if (deliveryCheck.status === 'idle' && !storeCoords) {
      return { blocked: true, reason: 'Endereço da loja ainda não configurado.' };
    }
    if (deliveryCheck.status === 'out') {
      return { blocked: true, reason: 'Esse endereço está fora do raio de entrega da loja.' };
    }
    if (deliveryCheck.status === 'error') {
      return { blocked: true, reason: 'Não foi possível validar a entrega.' };
    }
    if (deliveryCheck.status === 'idle') {
      return { blocked: true, reason: 'Informe o endereço para validar a entrega.' };
    }
    return { blocked: false, reason: '' };
  }, [customer.type, deliveryCheck.status, deliveryRadiusValue, storeCoords]);

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
          setStoreAddress(data.settings?.address || data.owner?.address || '');
          setStoreDescription(data.settings?.description || '');
          setPromoMessage(data.settings?.promoMessage || '');
          setStorePixKey(data.settings?.pixKey || '');
          setDeliveryRadiusKm(data.settings?.deliveryRadiusKm ?? '');
          setDeliveryFee(data.settings?.deliveryFee ?? '');
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
    setStoreCoords(null);
  }, [storeAddress]);

  useEffect(() => {
    if (!storeSlug) return;
    const cached = localStorage.getItem(`store:coords:${storeSlug}`);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.lat && (parsed?.lng || parsed?.lon)) {
        setStoreCoords({ lat: Number(parsed.lat), lng: Number(parsed.lng ?? parsed.lon) });
      }
    } catch (error) {
      console.error('Falha ao ler cache do mapa', error);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!storeAddress || storeCoords || !storeSlug) return;
    let attempts = 0;
    const loadCoords = async () => {
      try {
        const data = await mapsService.geocode(storeAddress);
        const next = { lat: Number(data.lat), lng: Number(data.lng) };
        setStoreCoords(next);
        localStorage.setItem(`store:coords:${storeSlug}`, JSON.stringify(next));
        return;
      } catch (error) {
        console.error('Falha ao carregar coordenadas da loja', error);
      }
      attempts += 1;
      if (attempts < 3) {
        window.setTimeout(loadCoords, 1200);
      }
    };
    loadCoords();
  }, [storeAddress, storeCoords, storeSlug]);


  useEffect(() => {
    if (customer.type !== 'delivery') {
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      return;
    }
    if (!deliveryRadiusValue) {
      setDeliveryCheck({ status: 'ok', distanceKm: null, durationMin: null });
      return;
    }
    const address = deliveryAddress?.trim() || '';
    if (!address || !storeCoords) {
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      return;
    }
    setDeliveryCheck((prev) =>
      prev.status === 'loading' ? prev : { status: 'loading', distanceKm: null, durationMin: null }
    );

    const normalized = address.toLowerCase().replace(/\s+/g, ' ').trim();
    const cacheKey = storeSlug ? `delivery:coords:${storeSlug}:${normalized}` : '';
    const resolveCachedRoute = async () => {
      if (!cacheKey) return null;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && (parsed?.lng || parsed?.lon)) {
          const coords = { lat: Number(parsed.lat), lng: Number(parsed.lng ?? parsed.lon) };
          setDeliveryCoords(coords);
          return coords;
        }
      } catch (error) {
        console.error('Falha ao ler cache de entrega', error);
      }
      return null;
    };

    const timeout = window.setTimeout(async () => {
      try {
        let coords = await resolveCachedRoute();
        if (!coords) {
          const geo = await mapsService.geocode(address);
          coords = { lat: Number(geo.lat), lng: Number(geo.lng) };
          setDeliveryCoords(coords);
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(coords));
          }
        }
        const route = await mapsService.route(storeCoords, coords);
        setDeliveryCheck({
          status: route.distanceKm <= deliveryRadiusValue ? 'ok' : 'out',
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
        });
      } catch (error) {
        console.error('Falha ao validar entrega', error);
        setDeliveryCheck({ status: 'error', distanceKm: null, durationMin: null });
        setDeliveryCoords(null);
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [customer.type, deliveryAddress, deliveryRadiusValue, storeCoords, storeSlug]);

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

    if (customer.type === 'delivery' && deliveryRadiusValue) {
      if (deliveryCheck.status === 'loading') {
        showErrorNotice('Validando distância de entrega. Aguarde um instante.');
        return;
      }
      if (deliveryCheck.status === 'out') {
        showErrorNotice('Esse endereço está fora do raio de entrega da loja.');
        return;
      }
      if (deliveryCheck.status !== 'ok') {
        showErrorNotice('Não foi possível validar a entrega. Revise o endereço.');
        return;
      }
    }

    const isPickup = customer.type === 'pickup';
    const payment = paymentMethod;

    const sanitizedPhone = customer.phone.replace(/\D/g, '');
    const sanitizedPhoneKey = sanitizedPhone.length >= 10 ? `+55${sanitizedPhone}` : '';
    const pixKey = storePixKey || PIX_KEY || sanitizedPhoneKey;

    const order = {
      customerName: customer.name,
      phone: customer.phone,
      address: deliveryAddress || customer.address,
      table: customer.table,
      type: customer.type,
      paymentMethod: payment,
      deliveryFee: customer.type === 'delivery' && deliveryFeeValue > 0 ? deliveryFeeValue : undefined,
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
      setLastOrder({
        id: demoId,
        type: customer.type,
        payment,
        phone: sanitizedPhoneKey || customer.phone,
        pixKey,
        table: customer.table,
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
          items: Object.values(cart).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.qty,
            price: item.price * item.qty,
            cookingPoint: item.cookingPoint,
            passSkewer: item.passSkewer,
          })),
          phone: customer.phone,
          deliveryFee: customer.type === 'delivery' && deliveryFeeValue > 0 ? deliveryFeeValue : null,
          total: orderTotal,
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
        customer.address ? `📍 End: ${customer.address}` : '',
        '------------------',
        itemsList,
        '------------------',
        deliveryFeeValue > 0 ? `🚚 Frete: ${formatCurrency(deliveryFeeValue)}` : '',
        `💰 *TOTAL: ${formatCurrency(orderTotal)}*`,
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
      deliveryFeeValue > 0 ? `Frete: ${formatCurrency(deliveryFeeValue)}` : '',
      `Total: ${formatCurrency(orderTotal)}`,
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
    setLastOrder({
      id: createdOrder?.id,
      type: customer.type,
      payment,
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
              promoMessage={promoMessage}
              todayHoursLabel={todayHoursLabel}
              storeAddress={storeAddress}
              storeCoords={storeCoords}
              compactHeader={isMobile}
            />
          </div>
        )}
        {view === 'cart' && (
          <CartView
            cart={cart}
            customer={customer}
            customers={customers}
            paymentMethod={paymentMethod}
            allowedOrderTypes={orderTypes}
            allowCustomerAutocomplete={Boolean(user?.token)}
            deliveryRadiusKm={deliveryRadiusValue}
            deliveryFee={deliveryFeeValue}
            deliveryCheck={deliveryCheck}
            storeAddress={storeAddress}
            storeCoords={storeCoords}
            deliveryCoords={deliveryCoords}
            checkoutDisabled={deliveryValidation.blocked}
            checkoutDisabledReason={deliveryValidation.reason}
            onChangeCustomer={handleCustomerChange}
            onChangePayment={setPaymentMethod}
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
            <span className="font-bold text-base sm:text-lg ml-2 flex-shrink-0">{formatCurrency(orderTotal)}</span>
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

    </div>
  );
}
