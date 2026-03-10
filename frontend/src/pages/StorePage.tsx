// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, PaperPlaneTilt, Clock, MapPinLine, InstagramLogo, ArrowLeft } from '@phosphor-icons/react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { storeService } from '../services/storeService';
import { mapsService } from '../services/mapsService';
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { SuccessView } from '../components/Client/SuccessView';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatOrderDisplayId, formatOrderType, formatPaymentMethod } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getPersistedBranding, brandingStorageKey, defaultBranding, initialCustomer, defaultPaymentMethod, WHATSAPP_NUMBER, PIX_KEY } from '../constants';
import { isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
import {
  formatSelectedModifiers,
  getModifiersSignature,
  getModifiersTotal,
  normalizeSelectedModifiers,
} from '../utils/productModifiers';
import { getCartPricing } from '../utils/orderPricing';

const WEEKDAY_LABELS = [ 'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado' ];

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
  const [storeName, setStoreName] = useState('');
  const [storeSegment, setStoreSegment] = useState('outros');
  const [storePixKey, setStorePixKey] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [openingHours, setOpeningHours] = useState([]);
  const [orderTypes, setOrderTypes] = useState([ 'delivery', 'pickup', 'table' ]);
  const [storeSubscription, setStoreSubscription] = useState(null);
  const [storePlanExempt, setStorePlanExempt] = useState(false);
  const [storeReviewSummary, setStoreReviewSummary] = useState<any | null>(null);
  const [topProducts, setTopProducts] = useState([]);
  const [reorderApplied, setReorderApplied] = useState(false);
  const autoTrackRef = useRef(false);
  const reorderTtlMs = 30 * 24 * 60 * 60 * 1000;
  const publicOrderTtlMs = 24 * 60 * 60 * 1000;
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
  const weeklyHoursRows = useMemo(() => {
    const normalized = normalizeOpeningHours(openingHours);
    const today = new Date().getDay();
    return normalized.map((entry) => {
      const label = WEEKDAY_LABELS[entry.day] || `Dia ${entry.day}`;
      const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
      const value =
        entry.enabled === false
          ? 'Fechado'
          : intervals.length
            ? intervals.map((interval) => `${interval.start} - ${interval.end}`).join(' • ')
            : 'Horário livre';
      return {
        day: entry.day,
        label,
        value,
        isToday: entry.day === today,
      };
    });
  }, [openingHours]);
  const closedStateStoreName = useMemo(() => {
    const exactName = String(storeName || '').trim();
    if (exactName) return exactName;
    const fromSlug = String(storeSlug || '')
      .trim()
      .replace(/[-_]+/g, ' ');
    if (fromSlug) return fromSlug;
    const fallbackBrand = String(branding?.brandName || '').trim();
    return fallbackBrand || 'Loja';
  }, [storeName, storeSlug, branding?.brandName]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const isDemo = storeSlug === 'demo' || storeSlug === 'test-store';
  const isStoreAdmin =
    Boolean(user?.token) &&
    Boolean(user?.store?.slug) &&
    Boolean(storeSlug) &&
    user.store.slug === storeSlug;
  const normalizedRole = String(user?.role || '').toLowerCase();
  const hasAdminPrintAccess = normalizedRole === 'admin';
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);

  const cartPricing = useMemo(() => getCartPricing(cart), [cart]);
  const cartItemsTotal = cartPricing.discountedSubtotal;
  const cartDiscountTotal = cartPricing.discountTotal;
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
    const street = String(customer.street || '').trim();
    const number = String(customer.number || '').trim();
    const streetWithNumber = street ? (number ? `${street}, ${number}` : street) : '';
    const parts = [
      streetWithNumber,
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
    storePlanExempt ||
    !isSubscriptionKnown ||
    (subscriptionStatus &&
      ![ 'PENDING', 'CANCELLED', 'SUSPENDED', 'EXPIRED' ].includes(subscriptionStatus));
  const showInactiveState = view === 'menu' && isSubscriptionKnown && !isSubscriptionActive;
  const showClosedState = view === 'menu' && isSubscriptionActive && !storeOpenNow;
  const deliveryValidation = useMemo(() => {
    if (customer.type !== 'delivery' || !deliveryRadiusValue) {
      if (customer.type === 'delivery' && !String(customer.number || '').trim()) {
        return { blocked: true, reason: 'Informe o número do endereço para finalizar a entrega.' };
      }
      return { blocked: false, reason: '' };
    }
    if (!String(customer.number || '').trim()) {
      return { blocked: true, reason: 'Informe o número do endereço para finalizar a entrega.' };
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
  }, [customer.number, customer.type, deliveryCheck.status, deliveryRadiusValue, storeCoords]);

  const resolveItemPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return Number(item?.price) || 0;
  };

  const applyStoreMeta = (store: any) => {
    if (!store) return;
    const name = store.name || store.slug || 'Já no Caminho';
    const description = `Vitrine online e pedidos da loja ${name}.`;
    const logo = resolveAssetUrl(store.settings?.logoUrl) || '/janocaminho.jpg';
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

    document.title = `${name} | Já no Caminho`;
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

  const normalizeRecentPublicEntries = (entries: any[]) => {
    const now = Date.now();
    const unique = new Set<string>();
    const normalized: Array<{ id: string; createdAt: number; type?: string; accessToken?: string }> = [];
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const id = String(entry?.id || '').trim();
      const createdAt = Number(entry?.createdAt || 0);
      if (!id || !Number.isFinite(createdAt) || createdAt <= 0) return;
      if (now - createdAt > publicOrderTtlMs) return;
      if (unique.has(id)) return;
      unique.add(id);
      normalized.push({
        id,
        createdAt,
        type: entry?.type,
        accessToken: entry?.accessToken ? String(entry.accessToken) : undefined,
      });
    });
    return normalized.slice(0, 3);
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
            bannerUrl: resolveAssetUrl(data.settings?.bannerUrl) || prev.bannerUrl,
            primaryColor: data.settings?.primaryColor || prev.primaryColor,
            accentColor: data.settings?.secondaryColor || prev.accentColor,
            instagram: instagramLink || prev.instagram,
          }));
          const normalizedHours = normalizeOpeningHours(data.settings?.openingHours || []);
          setOpeningHours(normalizedHours);
          const baseTypes = Array.isArray(data.settings?.orderTypes) && data.settings.orderTypes.length > 0
            ? data.settings.orderTypes
            : [ 'delivery', 'pickup', 'table' ];
          const deliveryEnabled = canUseDeliveryBySubscription(data.subscription, data.settings);
          const allowedTypes = deliveryEnabled
            ? baseTypes
            : baseTypes.filter((type: string) => String(type || '').toLowerCase() !== 'delivery');
          setOrderTypes(allowedTypes.length ? allowedTypes : [ 'pickup', 'table' ]);
          setStorePhone(data.owner?.phone || '');
          setStoreAddress(data.settings?.address || data.owner?.address || '');
          setStoreDescription(data.settings?.description || '');
          setStoreName(data.name || '');
          setStoreSegment(String(data.settings?.segment || 'outros').toLowerCase());
          setPromoMessage(data.settings?.promoMessage || '');
          setStorePixKey(data.settings?.pixKey || '');
          setDeliveryRadiusKm(data.settings?.deliveryRadiusKm ?? '');
          setDeliveryFee(data.settings?.deliveryFee ?? '');
          setStoreOpenNow(isStoreOpenNow(normalizedHours));
          setStoreSubscription(data.subscription || null);
          setStorePlanExempt(Boolean(data.settings?.planExempt || data.subscription?.planExempt));
          setStoreReviewSummary(data.reviewSummary || null);
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
    let cancelledRecentLoad = false;
    if (storeSlug) {
      orderService.fetchHighlightsBySlug(storeSlug)
        .then((items) => setTopProducts(items || []))
        .catch(() => setTopProducts([]));
    }
    if (storeSlug) {
      const hydrateRecentPublicOrders = async () => {
        let lastEntry: any = null;
        let listEntries: any[] = [];
        try {
          const raw = localStorage.getItem(`lastOrder:${storeSlug}`);
          lastEntry = raw ? JSON.parse(raw) : null;
        } catch {
          lastEntry = null;
        }
        try {
          const rawList = localStorage.getItem(`lastOrders:${storeSlug}`);
          listEntries = rawList ? JSON.parse(rawList) : [];
        } catch {
          listEntries = [];
        }

        const candidates = normalizeRecentPublicEntries([
          ...(lastEntry ? [lastEntry] : []),
          ...(Array.isArray(listEntries) ? listEntries : []),
        ]);

        if (!candidates.length) {
          if (!cancelledRecentLoad) {
            setLastPublicOrderId('');
            setRecentPublicOrders([]);
          }
          localStorage.removeItem(`lastOrder:${storeSlug}`);
          localStorage.removeItem(`lastOrders:${storeSlug}`);
          return;
        }

        const checked = await Promise.all(
          candidates.map(async (entry) => {
            try {
              await orderService.getPublicById(entry.id);
              return entry;
            } catch {
              return null;
            }
          })
        );
        const valid = checked.filter(Boolean);
        if (cancelledRecentLoad) return;

        setRecentPublicOrders(valid);
        setLastPublicOrderId(valid[0]?.id || '');

        if (valid.length) {
          localStorage.setItem(`lastOrders:${storeSlug}`, JSON.stringify(valid));
          localStorage.setItem(`lastOrder:${storeSlug}`, JSON.stringify(valid[0]));
        } else {
          localStorage.removeItem(`lastOrder:${storeSlug}`);
          localStorage.removeItem(`lastOrders:${storeSlug}`);
        }
      };

      hydrateRecentPublicOrders();

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
      cancelledRecentLoad = true;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [storeSlug]);

  useEffect(() => {
    if (!Array.isArray(orderTypes) || !orderTypes.length) return;
    if (orderTypes.includes(customer.type)) return;
    const fallbackType = orderTypes.includes('delivery') ? 'delivery' : orderTypes[0];
    setCustomer((prev) => ({ ...prev, type: fallbackType }));
  }, [orderTypes, customer.type]);

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
        const selectedModifiers = normalizeSelectedModifiers(item.selectedModifiers || [], product.modifiers || []);
        const modifiersSignature = getModifiersSignature(selectedModifiers);
        const key = `${product.id}:${cookingPoint}:${passSkewer ? '1' : '0'}:${modifiersSignature}`;
        const unitPrice = resolveItemPrice(product) + getModifiersTotal(selectedModifiers);
        nextCart[key] = {
          ...product,
          key,
          price: unitPrice,
          originalPrice: product?.price,
          qty: Number(item.quantity || item.qty || 1),
          cookingPoint,
          passSkewer,
          selectedModifiers,
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
    // Mantém o usuário na tela de sucesso para evitar confusão com múltiplas abas/janelas.
    autoTrackRef.current = true;
  }, [view, lastOrder?.id]);

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
    const selectedModifiers = normalizeSelectedModifiers(
      options?.selectedModifiers ?? item?.selectedModifiers ?? [],
      item?.modifiers || []
    );
    const cartKey = `${item.id}:${cookingPoint || ''}:${passSkewer ? '1' : '0'}:${getModifiersSignature(selectedModifiers)}`;
    setCart((previous) => {
      const currentQty = previous[cartKey]?.qty || 0;
      const nextQty = currentQty + qty;
      if (nextQty <= 0) {
        const copy = { ...previous };
        delete copy[cartKey];
        return copy;
      }
      const unitPrice = resolveItemPrice(item) + getModifiersTotal(selectedModifiers);
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
          selectedModifiers,
          bundlePromoActive: Boolean(item?.bundlePromoActive),
          bundlePromoQty: item?.bundlePromoQty ?? null,
          bundlePromoPrice: item?.bundlePromoPrice ?? null,
        },
      };
    });
  };

  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar farinha');
    const selected = formatSelectedModifiers(item?.selectedModifiers || []);
    if (selected.length) labels.push(`+ ${selected.join(', ')}`);
    return labels.length ? `(${labels.join(' • ')})` : '';
  };

  const handleCustomerChange = (nextCustomer) => {
    const normalizedName = nextCustomer.name?.trim().toLowerCase();
    const matchedCustomer = customers.find(
      (entry) => entry.name?.trim().toLowerCase() === normalizedName
    );

    const phoneFromMatch = !nextCustomer.phone && matchedCustomer?.phone ? matchedCustomer.phone : nextCustomer.phone;
    const updatedCustomer = { ...nextCustomer, phone: phoneFromMatch || '' };
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

  const checkout = async (extra?: { cashTendered?: number | null } | null) => {
    const isSubscriptionActive =
      storePlanExempt ||
      subscriptionStatus &&
      ![ 'PENDING', 'CANCELLED', 'SUSPENDED', 'EXPIRED' ].includes(subscriptionStatus);
    if (!isSubscriptionActive) {
      showToast('Loja com assinatura inativa. Tente novamente mais tarde.', 'warning');
      return;
    }
    if (!storeOpenNow) {
      showToast('Loja fechada no momento. Tente novamente durante o horário de atendimento.', 'warning');
      return;
    }
    const requiresPhone = customer.type !== 'table';
    if (!customer.name || (requiresPhone && !customer.phone)) {
      showToast(requiresPhone ? 'Preencha nome e telefone para continuar.' : 'Preencha seu nome para continuar.', 'warning');
      return;
    }

    if (customer.type === 'delivery' && !customer.address) {
      showToast('Informe o endereço completo para entrega.', 'warning');
      return;
    }
    if (customer.type === 'delivery' && !String(customer.number || '').trim()) {
      showToast('Informe o número da casa para entrega.', 'warning');
      return;
    }

    if (customer.type === 'table' && !customer.table) {
      showToast('Informe o número da mesa.', 'warning');
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

    const payment = paymentMethod;
    const cashTendered =
      payment === 'dinheiro' && extra?.cashTendered !== undefined && extra?.cashTendered !== null
        ? Number(extra.cashTendered)
        : null;

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
      cashTendered: cashTendered !== null ? cashTendered : undefined,
      items: Object.values(cart).map((item) => ({
        productId: item.id,
        quantity: item.qty,
        cookingPoint: item.cookingPoint,
        passSkewer: item.passSkewer,
        selectedModifiers: item.selectedModifiers || [],
      })),
    };

    if (!storeSlug) {
      showToast('Loja não especificada.', 'error');
      return;
    }

    const printableItems = Object.values(cart).map((item: any) => {
      const unitBase = resolveItemPrice(item);
      const modifiersTotal = getModifiersTotal(item.selectedModifiers || []);
      const unitPrice = Number(unitBase + modifiersTotal);
      const quantity = Number(item.qty || 0);
      return {
        name: item.name,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        options: formatItemOptions(item),
      };
    });

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
        customerName: customer.name,
        address: deliveryAddress || customer.address,
        total: orderTotal,
        items: printableItems,
        queueRank: null,
        createdAt: Date.now(),
      });
      if (hasAdminPrintAccess) {
        setShowPrintPrompt(true);
      }
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
          cashTendered: cashTendered !== null ? cashTendered : null,
          items: Object.values(cart).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.qty,
            price: item.price * item.qty,
            cookingPoint: item.cookingPoint,
            passSkewer: item.passSkewer,
            selectedModifiers: item.selectedModifiers || [],
          })),
          phone: customer.phone,
          deliveryFee: customer.type === 'delivery' && deliveryFeeValue > 0 ? deliveryFeeValue : null,
          total: orderTotal,
          store: { name: 'Já no Caminho Demo', slug: storeSlug },
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

    const trackingLink =
      typeof window !== 'undefined' && createdOrder?.id
        ? createdOrder?.accessToken
          ? `${window.location.origin}/pedido/${createdOrder.id}?ot=${encodeURIComponent(String(createdOrder.accessToken))}`
          : `${window.location.origin}/pedido/${createdOrder.id}`
        : '';
    const shouldNotifyOwner = !isStoreAdmin && (customer.type === 'pickup' || customer.type === 'table');
    if (shouldNotifyOwner) {
      const itemsList = Object.values(cart)
        .map((item) => `• ${item.qty}x ${item.name} ${formatItemOptions(item)}`.trim())
        .join('\n');
      const customerLabel = customer.phone
        ? `👤 Cliente: *${customer.name}* (${customer.phone})`
        : `👤 Cliente: *${customer.name}*`;

      const messageLines = [
        `*Novo pedido - ${branding?.brandName || 'Já no Caminho'}*`,
        storeSlug ? `🏷️ Loja: ${storeSlug}` : '',
        storeAddress ? `📍 Loja: ${storeAddress}` : '',
        '',
        customerLabel,
        `🛒 Tipo: ${formatOrderType(customer.type)}`,
        customer.table ? `🪑 Mesa: ${customer.table}` : '',
        payment ? `💳 Pagamento: ${formatPaymentMethod(payment)}` : '',
        customer.address ? `📌 Endereço do cliente: ${customer.address}` : '',
        '',
        '*Itens do pedido:*',
        itemsList,
        '',
        deliveryFeeValue > 0 ? `🚚 Frete: ${formatCurrency(deliveryFeeValue)}` : '',
        `💰 *Total: ${formatCurrency(orderTotal)}*`,
        payment === 'pix' && pixKey ? `🔑 Pix da loja: ${pixKey}` : '',
        trackingLink ? `🔎 Acompanhar pedido: ${trackingLink}` : '',
      ].filter(Boolean);

      const encodedMessage = encodeURIComponent(messageLines.join('\n'));
      const targetNumber = resolvedWhatsApp || WHATSAPP_NUMBER;
      window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, '_blank');
    }
    // Evita abrir uma segunda janela do WhatsApp automaticamente.
    // O acompanhamento fica no botão da tela de sucesso e no histórico recente.

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
      customerName: customer.name,
      address: deliveryAddress || customer.address,
      total: orderTotal,
      items: printableItems,
      queueRank: createdOrder?.queueRank ?? createdOrder?.queuePosition ?? null,
      createdAt: Date.now(),
    });
    if (hasAdminPrintAccess) {
      setShowPrintPrompt(true);
    }
    if (createdOrder?.id && !user?.token) {
      const entry = {
        id: createdOrder.id,
        createdAt: Date.now(),
        type: customer.type,
        accessToken: createdOrder?.accessToken ? String(createdOrder.accessToken) : undefined,
      };
      localStorage.setItem(`lastOrder:${storeSlug}`, JSON.stringify(entry));
      if (entry.accessToken) {
        localStorage.setItem(`orderAccess:${entry.id}`, entry.accessToken);
      }
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
          selectedModifiers: item.selectedModifiers || [],
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
    navigate('/admin/queue');
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

  const printLastOrderReceipt = () => {
    if (!hasAdminPrintAccess) return;
    if (!lastOrder?.id) return;
    if (isGeneratingPrint) return;

    const payload = {
      orderId: lastOrder.id,
      orderDisplayId: formatOrderDisplayId(lastOrder.id, storeSlug),
      createdAt: (lastOrder?.createdAt ? new Date(lastOrder.createdAt) : new Date()).toLocaleString('pt-BR'),
      customerName: lastOrder?.customerName || 'Cliente',
      table: lastOrder?.table || '',
      type: formatOrderType(lastOrder?.type),
      queueRank: Number(lastOrder?.queueRank ?? 0) || null,
      items: (Array.isArray(lastOrder?.items) ? lastOrder.items : []).map((item: any) => {
        const quantity = Number(item?.quantity ?? item?.qty ?? 0);
        const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0);
        return {
          name: String(item?.name || 'Item'),
          quantity,
          lineTotal: Number(item?.lineTotal ?? quantity * unitPrice),
          options: item?.options ? String(item.options) : '',
        };
      }),
      total: Number(lastOrder?.total || 0),
      paymentMethod: formatPaymentMethod(lastOrder?.payment),
      storeName: storeName || branding?.brandName || 'Já no Caminho',
    };

    if (!payload.items.length) {
      console.error('[print] payload vazio ou sem itens', payload);
      showToast('Pedido sem itens para imprimir.', 'error');
      return;
    }
    setIsGeneratingPrint(true);
    showToast('Gerando cupom...', 'success');

    const escapeHtml = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const itemsHtml = payload.items
      .map((item: any) => {
        const qty = Number(item?.quantity || 0);
        const name = escapeHtml(item?.name || 'Item');
        const lineTotal = formatCurrency(Number(item?.lineTotal || 0));
        const options = item?.options ? `<div class="opt">  ${escapeHtml(item.options)}</div>` : '';
        return `<div class="item"><span>${qty}x ${name}</span><span>${lineTotal}</span></div>${options}`;
      })
      .join('');

    const queueText = payload.queueRank ? `#${String(payload.queueRank).padStart(2, '0')}` : '--';
    const receiptHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Imprimir</title>
  <style>
    * { box-sizing: border-box; }
    body { width: 58mm; margin: 0; padding: 2mm; font-family: 'Courier New', monospace; font-size: 12px; color: black; background: white; line-height: 1.35; }
    .center { text-align: center; }
    .header { text-align: center; font-weight: bold; text-transform: uppercase; }
    .item { display: flex; justify-content: space-between; margin: 2px 0; }
    .opt { font-size: 10px; margin-left: 2ch; }
    hr { border: none; border-top: 1px dashed black; margin: 4px 0; }
    .strong { font-weight: 700; }
    .tail { white-space: pre-line; }
    @media print { @page { size: 58mm auto; margin: 0; } }
  </style>
</head>
<body>
  <div class="header">${escapeHtml(payload.storeName || 'SERTANEJO NO ESPETO')}</div>
  <div class="center">Ja no Caminho</div>
  <hr />
  <div class="strong">#Fila: ${queueText}</div>
  <div>Pedido: #${escapeHtml(payload.orderDisplayId)}</div>
  <div>Cliente: ${escapeHtml(payload.customerName)}</div>
  <div>Data: ${escapeHtml(payload.createdAt)}</div>
  <hr />
  ${itemsHtml}
  <hr />
  <div class="item strong"><span>TOTAL</span><span>${escapeHtml(formatCurrency(Number(payload.total || 0)))}</span></div>
  <div class="tail">\n\n</div>
</body>
</html>`;
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const frame = document.getElementById('silent-printer') as HTMLIFrameElement | null;
    if (!frame) {
      URL.revokeObjectURL(url);
      setIsGeneratingPrint(false);
      showToast('Falha ao iniciar impressão.', 'error');
      return;
    }
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      frame.onload = null;
      frame.src = 'about:blank';
      URL.revokeObjectURL(url);
      setIsGeneratingPrint(false);
    };
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (error) {
          console.error('[print] erro ao imprimir', error);
          alert('Clique novamente para confirmar a impressão');
        } finally {
          window.setTimeout(cleanup, 2000);
        }
      }, 300);
    };
    frame.src = url;
  };

  useEffect(() => {
    if (!hasAdminPrintAccess) {
      setShowPrintPrompt(false);
    }
  }, [hasAdminPrintAccess]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-sans pb-28 sm:pb-24 overflow-x-hidden no-x-scroll">
      {isDemo && view === 'menu' && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-amber-900">
            <span>
              Demo da vitrine ativa. Veja o fluxo completo para entender como funciona.
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
            {Number(storeReviewSummary?.totalReviews || 0) > 0 && (
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                {Number(storeReviewSummary?.avgStoreRating || 0).toFixed(1)} ★ ({Number(storeReviewSummary?.totalReviews || 0)} avaliações)
              </p>
            )}
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
          <div className="min-h-[72vh] bg-[#f7f7f7]">
            <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
              <div className="grid gap-4 md:grid-cols-2 md:items-start">
                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)]">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={branding?.logoUrl || '/janocaminho.jpg'}
                          alt={closedStateStoreName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Perfil da loja</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#1a1a1a] break-words">
                          {closedStateStoreName}
                        </h1>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                          <Clock size={14} weight="bold" />
                          Fechado no momento
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-[#666666]">
                      O atendimento está fechado agora. Veja os horários abaixo e volte no próximo período.
                    </p>
                    {todayHoursLabel && (
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Hoje:</span> {todayHoursLabel}
                      </p>
                    )}
                  </div>

                  {storeDescription && (
                    <div className="rounded-3xl bg-white p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sobre</p>
                      <p className="mt-2 text-sm text-[#666666] break-words">{storeDescription}</p>
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/')}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                  >
                    <ArrowLeft size={16} weight="bold" />
                    Voltar ao início
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Contato e endereço</p>
                    <div className="mt-3 space-y-3">
                      {instagramHandle && (
                        <a
                          href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-2 text-sm font-semibold text-[#0a66c2] hover:underline break-all"
                        >
                          <InstagramLogo size={18} weight="fill" className="mt-0.5 shrink-0" />
                          <span>{instagramHandle}</span>
                        </a>
                      )}
                      {storeAddress && (
                        <div className="flex items-start gap-2 text-sm text-[#666666] break-words">
                          <MapPinLine size={18} weight="bold" className="mt-0.5 shrink-0 text-slate-500" />
                          <span>{storeAddress}</span>
                        </div>
                      )}
                      {!instagramHandle && !storeAddress && (
                        <p className="text-sm text-slate-500">Nenhum contato cadastrado.</p>
                      )}
                    </div>
                  </div>

                  {weeklyHoursRows.length > 0 && (
                    <div className="rounded-3xl bg-white p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Horários da semana</p>
                      <div className="mt-3 divide-y divide-slate-100">
                        {weeklyHoursRows.map((row) => (
                          <div
                            key={`${row.day}-${row.label}`}
                            className={`flex items-center justify-between gap-3 py-2 text-sm ${
                              row.isToday ? 'font-bold text-slate-900 bg-amber-50/70 px-2 rounded-lg' : 'text-[#666666]'
                            }`}
                          >
                            <span className="min-w-0">{row.label}</span>
                            <span className="text-right break-words">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 text-center">
                    <a
                      href="https://www.janocaminho.com.br"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
                    >
                      <span className="h-4 w-4 rounded-full overflow-hidden border border-slate-200">
                        <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
                      </span>
                      Desenvolvido por Já no Caminho
                    </a>
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
                Falta cadastrar os produtos para a vitrine aparecer. Se você é o responsável pela loja, clique abaixo para configurar.
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
              <div className="mx-3 sm:mx-6 rounded-3xl premium-card-glass px-4 py-4 text-sm text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-emerald-700 font-extrabold">
                    Acompanhar pedidos recentes
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recentPublicOrders.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() =>
                          navigate(
                            entry.accessToken
                              ? `/pedido/${entry.id}?ot=${encodeURIComponent(entry.accessToken)}`
                              : `/pedido/${entry.id}`
                          )
                        }
                        className="btn-press px-3 py-1.5 rounded-full bg-white/70 text-emerald-900 text-[11px] font-extrabold border border-emerald-200 hover:bg-emerald-100/70"
                      >
                        #{formatOrderDisplayId(entry.id, storeSlug)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      navigate(
                        recentPublicOrders[0]?.accessToken
                          ? `/pedido/${recentPublicOrders[0].id}?ot=${encodeURIComponent(recentPublicOrders[0].accessToken)}`
                          : `/pedido/${recentPublicOrders[0].id}`
                      )
                    }
                    className="btn-press px-4 py-2 rounded-xl bg-[linear-gradient(120deg,#16a34a,#059669)] text-white text-xs font-extrabold shadow-[0_22px_48px_-32px_rgba(5,150,105,0.6)]"
                  >
                    Acompanhar agora
                  </button>
                </div>
              </div>
            )}
            <MenuView
              products={products}
              topProducts={topProducts}
              cart={cart}
              branding={branding}
              segment={storeSegment}
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
            pricingSummary={{
              subtotal: cartPricing.subtotal,
              discountTotal: cartDiscountTotal,
              total: cartItemsTotal,
            }}
            onChangeCustomer={handleCustomerChange}
            onChangePayment={setPaymentMethod}
            onUpdateCart={updateCart}
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
              onPrintReceipt={hasAdminPrintAccess ? printLastOrderReceipt : undefined}
              onTrackOrder={
                hasAdminPrintAccess
                  ? undefined
                  : () => {
                      if (lastOrder?.id) {
                        navigate(`/pedido/${lastOrder.id}`);
                      }
                    }
              }
              onNewOrder={() => setView('menu')}
            />
          </div>
        )}
      </main>

      {showPrintPrompt && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <p className="text-sm text-slate-500 uppercase tracking-[0.2em] font-semibold">Pedido confirmado</p>
            <h3 className="mt-2 text-lg font-black text-slate-900">
              Pedido #{formatOrderDisplayId(lastOrder?.id, storeSlug)} confirmado com sucesso!
            </h3>
            <p className="mt-2 text-sm text-slate-600">Deseja imprimir o cupom agora?</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPrintPrompt(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Não, apenas fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintPrompt(false);
                  printLastOrderReceipt();
                }}
                disabled={isGeneratingPrint}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                {isGeneratingPrint ? 'Gerando cupom...' : 'Sim, imprimir agora'}
              </button>
            </div>
          </div>
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

      <iframe
        id="silent-printer"
        title="silent-printer"
        style={{
          visibility: 'hidden',
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: 0,
          height: 0,
          border: 'none',
        }}
      />

    </div>
  );
}

  const canUseDeliveryBySubscription = (subscription: any, settings: any) => {
    const isVip = Boolean(settings?.planExempt || subscription?.planExempt);
    if (isVip) return true;
    const status = String(subscription?.status || '').toUpperCase();
    if (status === 'TRIAL') return true;
    if (Boolean(subscription?.features?.deliveryMode)) return true;
    const planName = String(subscription?.plan?.name || '').toLowerCase();
    return planName.includes('pro') || planName.includes('vip');
  };

