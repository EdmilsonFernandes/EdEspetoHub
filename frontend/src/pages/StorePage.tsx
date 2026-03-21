// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
<<<<<<< HEAD
import { ShoppingCart, PaperPlaneTilt } from '@phosphor-icons/react';
=======
import { ShoppingCart, PaperPlaneTilt, Clock, MapPinLine, InstagramLogo, ArrowLeft } from '@phosphor-icons/react';
>>>>>>> main
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { storeService } from '../services/storeService';
<<<<<<< HEAD
=======
import { mapsService } from '../services/mapsService';
>>>>>>> main
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { SuccessView } from '../components/Client/SuccessView';
import { useToast } from '../contexts/ToastContext';
<<<<<<< HEAD
import { formatCurrency, formatOrderDisplayId, formatPaymentMethod, formatPhoneInput } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getPersistedBranding, brandingStorageKey, defaultBranding, initialCustomer, defaultPaymentMethod, DEFAULT_AREA_CODE, WHATSAPP_NUMBER, PIX_KEY } from '../constants';
import { formatOpeningHoursSummary, isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
=======
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
import { printReceiptAsImage } from '../utils/printReceiptImage';

const WEEKDAY_LABELS = [ 'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado' ];
>>>>>>> main

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
<<<<<<< HEAD
  const [storeEmail, setStoreEmail] = useState('');
  const [storePixKey, setStorePixKey] = useState('');
=======
  const [storeName, setStoreName] = useState('');
  const [storeSegment, setStoreSegment] = useState('outros');
  const [storePixKey, setStorePixKey] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
>>>>>>> main
  const [promoMessage, setPromoMessage] = useState('');
  const [openingHours, setOpeningHours] = useState([]);
  const [orderTypes, setOrderTypes] = useState([ 'delivery', 'pickup', 'table' ]);
  const [storeSubscription, setStoreSubscription] = useState(null);
<<<<<<< HEAD
  const [topProducts, setTopProducts] = useState([]);
  const [reorderApplied, setReorderApplied] = useState(false);
  const autoTrackRef = useRef(false);
  const [lastPublicOrderId, setLastPublicOrderId] = useState('');
  const [recentPublicOrders, setRecentPublicOrders] = useState([]);
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
=======
  const [storePlanExempt, setStorePlanExempt] = useState(false);
  const [storeReviewSummary, setStoreReviewSummary] = useState<any | null>(null);
  const [storeOrderingEnabled, setStoreOrderingEnabled] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [reorderApplied, setReorderApplied] = useState(false);
  const autoTrackRef = useRef(false);
  const staffDefaultTypeAppliedRef = useRef(false);
  const reorderTtlMs = 30 * 24 * 60 * 60 * 1000;
  const publicOrderTtlMs = 24 * 60 * 60 * 1000;
  const [lastPublicOrderId, setLastPublicOrderId] = useState('');
  const [recentPublicOrders, setRecentPublicOrders] = useState([]);
  const [lastOrderItems, setLastOrderItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [orderNotice, setOrderNotice] = useState(null);
  const [tableNotice, setTableNotice] = useState(null);
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [storeCoords, setStoreCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [manualDeliveryCoords, setManualDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryCheck, setDeliveryCheck] = useState({ status: 'idle', distanceKm: null, durationMin: null });
>>>>>>> main
  const customersStorageKey = useMemo(
    () => `customers:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
<<<<<<< HEAD
=======
  const checkoutCustomerStorageKey = useMemo(
    () => `checkoutCustomer:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
>>>>>>> main
  const resolvedWhatsApp = useMemo(() => {
    const raw = storePhone || WHATSAPP_NUMBER;
    const digits = (raw || '').toString().replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  }, [storePhone]);
<<<<<<< HEAD
=======

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

>>>>>>> main
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
<<<<<<< HEAD
  const weeklyHours = useMemo(() => formatOpeningHoursSummary(openingHours), [openingHours]);
=======
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
>>>>>>> main
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const isDemo = storeSlug === 'demo' || storeSlug === 'test-store';
  const isStoreAdmin =
    Boolean(user?.token) &&
    Boolean(user?.store?.slug) &&
    Boolean(storeSlug) &&
    user.store.slug === storeSlug;
<<<<<<< HEAD

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);
=======
  const normalizedRole = String(user?.role || '').toLowerCase();
  const hasAdminPrintAccess = normalizedRole === 'admin';
  const canUseAdminPrintFlow = hasAdminPrintAccess || isStoreAdmin;
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutLockRef = useRef(false);

  const cartPricing = useMemo(() => getCartPricing(cart), [cart]);
  const validCartItems = useMemo(
    () => Object.values(cart).filter((item: any) => Number(item?.qty || 0) > 0),
    [cart]
  );
  const cartItemsCount = useMemo(
    () => validCartItems.reduce((acc: number, item: any) => acc + Number(item?.qty || 0), 0),
    [validCartItems]
  );
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
>>>>>>> main
  const instagramHandle = useMemo(() => (branding.instagram ? `@${branding.instagram.replace('@', '')}` : ''), [branding.instagram]);
  const subscriptionStatus = storeSubscription?.status;
  const isSubscriptionKnown = storeSubscription !== null && storeSubscription !== undefined;
  const isSubscriptionActive =
<<<<<<< HEAD
=======
    storePlanExempt ||
>>>>>>> main
    !isSubscriptionKnown ||
    (subscriptionStatus &&
      ![ 'PENDING', 'CANCELLED', 'SUSPENDED', 'EXPIRED' ].includes(subscriptionStatus));
  const showInactiveState = view === 'menu' && isSubscriptionKnown && !isSubscriptionActive;
  const showClosedState = view === 'menu' && isSubscriptionActive && !storeOpenNow;
<<<<<<< HEAD
=======
  const deliveryValidation = useMemo(() => {
    if (customer.type !== 'delivery' || !deliveryRadiusValue) {
      if (customer.type === 'delivery' && !String(customer.number || '').trim()) {
        return { blocked: true, reason: 'Informe o número do endereço para finalizar a entrega.' };
      }
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
    if (!String(customer.number || '').trim()) {
      return { blocked: true, reason: 'Informe o número do endereço para finalizar a entrega.' };
    }
    return { blocked: false, reason: '' };
  }, [customer.number, customer.type, deliveryCheck.status, deliveryRadiusValue, storeCoords]);
>>>>>>> main

  const resolveItemPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return Number(item?.price) || 0;
  };

  const applyStoreMeta = (store: any) => {
    if (!store) return;
<<<<<<< HEAD
    const name = store.name || store.slug || 'Chama no Espeto';
    const description = `Cardápio online e pedidos da loja ${name}.`;
    const logo = resolveAssetUrl(store.settings?.logoUrl) || '/chama-no-espeto.jpeg';
=======
    const name = store.name || store.slug || 'Já no Caminho';
    const description = `Vitrine online e pedidos da loja ${name}.`;
    const logo = resolveAssetUrl(store.settings?.logoUrl) || '/janocaminho.jpg';
>>>>>>> main
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

<<<<<<< HEAD
    document.title = `${name} | Chama no Espeto`;
=======
    document.title = `${name} | Já no Caminho`;
>>>>>>> main
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

<<<<<<< HEAD
=======
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

>>>>>>> main
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
<<<<<<< HEAD
=======
    if (storeOrderingEnabled || user?.token) return;
    setCart({});
    if (view === 'cart' || view === 'success') {
      setView('menu');
    }
  }, [storeOrderingEnabled, user?.token, view]);

  useEffect(() => {
>>>>>>> main
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
<<<<<<< HEAD
=======
    const savedCheckoutCustomer = localStorage.getItem(checkoutCustomerStorageKey);
    if (savedCheckoutCustomer) {
      try {
        const parsed = JSON.parse(savedCheckoutCustomer);
        const savedName = String(parsed?.name || '').trim();
        const savedPhone = String(parsed?.phone || '').trim();
        if (savedName || savedPhone) {
          setCustomer((prev) => ({
            ...prev,
            name: prev.name || savedName,
            phone: prev.phone || savedPhone,
          }));
        }
      } catch (error) {
        console.error('Falha ao carregar dados salvos do checkout', error);
      }
    }
>>>>>>> main

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
<<<<<<< HEAD
=======
            bannerUrl: resolveAssetUrl(data.settings?.bannerUrl) || prev.bannerUrl,
>>>>>>> main
            primaryColor: data.settings?.primaryColor || prev.primaryColor,
            accentColor: data.settings?.secondaryColor || prev.accentColor,
            instagram: instagramLink || prev.instagram,
          }));
          const normalizedHours = normalizeOpeningHours(data.settings?.openingHours || []);
          setOpeningHours(normalizedHours);
<<<<<<< HEAD
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
=======
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
          setStoreOrderingEnabled(data.settings?.isOrderingEnabled !== false);
          setStoreReviewSummary(data.reviewSummary || null);
>>>>>>> main
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
<<<<<<< HEAD
=======
    let cancelledRecentLoad = false;
>>>>>>> main
    if (storeSlug) {
      orderService.fetchHighlightsBySlug(storeSlug)
        .then((items) => setTopProducts(items || []))
        .catch(() => setTopProducts([]));
    }
    if (storeSlug) {
<<<<<<< HEAD
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
=======
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
>>>>>>> main
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadStore(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
<<<<<<< HEAD
      document.removeEventListener('visibilitychange', handleVisibility);
    };
=======
      cancelledRecentLoad = true;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [storeSlug, customersStorageKey, checkoutCustomerStorageKey]);

  useEffect(() => {
    if (!storeSlug) return undefined;
    let cancelled = false;
    let intervalId: any = null;

    const loadTableStatus = async () => {
      try {
        const data = await orderService.fetchTableStatusBySlug(storeSlug);
        if (cancelled) return;
        const next = Array.isArray(data?.occupiedTables)
          ? data.occupiedTables.map((value: any) => String(value || '').trim()).filter(Boolean)
          : [];
        setOccupiedTables(next);
      } catch {
        if (!cancelled) {
          setOccupiedTables([]);
        }
      }
    };

    loadTableStatus();
    intervalId = window.setInterval(loadTableStatus, 15000);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [storeSlug]);

  const resolveDefaultOrderType = (types: string[]) => {
    if (!Array.isArray(types) || !types.length) return 'table';
    if (canUseAdminPrintFlow && types.includes('table')) return 'table';
    if (types.includes('delivery')) return 'delivery';
    return types[0];
  };

  useEffect(() => {
    if (!Array.isArray(orderTypes) || !orderTypes.length) return;
    const current = String(customer.type || '').trim();
    if (orderTypes.includes(current)) return;
    const fallbackType = resolveDefaultOrderType(orderTypes);
    setCustomer((prev) => ({ ...prev, type: fallbackType }));
  }, [orderTypes, customer.type, canUseAdminPrintFlow]);

  useEffect(() => {
    if (!canUseAdminPrintFlow) {
      staffDefaultTypeAppliedRef.current = false;
      return;
    }
    if (staffDefaultTypeAppliedRef.current) return;
    if (!Array.isArray(orderTypes) || !orderTypes.includes('table')) return;
    if (customer.type === 'table') {
      staffDefaultTypeAppliedRef.current = true;
      return;
    }
    setCustomer((prev) => ({ ...prev, type: 'table' }));
    staffDefaultTypeAppliedRef.current = true;
  }, [canUseAdminPrintFlow, orderTypes, customer.type]);

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
>>>>>>> main
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
<<<<<<< HEAD
        const key = `${product.id}:${cookingPoint}:${passSkewer ? '1' : '0'}`;
        nextCart[key] = {
          ...product,
          key,
          qty: Number(item.quantity || item.qty || 1),
          cookingPoint,
          passSkewer,
=======
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
>>>>>>> main
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
<<<<<<< HEAD
    if (!orderTypes.length) return;
    if (!orderTypes.includes(customer.type)) {
      setCustomer((prev) => ({ ...prev, type: orderTypes[0] }));
    }
  }, [orderTypes, customer.type]);

  useEffect(() => {
=======
>>>>>>> main
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
<<<<<<< HEAD
    if (autoTrackRef.current) return;
    autoTrackRef.current = true;
    const timeout = window.setTimeout(() => {
      navigate(`/pedido/${lastOrder.id}`);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [view, lastOrder?.id, navigate]);
=======
    // Mantém o usuário na tela de sucesso para evitar confusão com múltiplas abas/janelas.
    autoTrackRef.current = true;
  }, [view, lastOrder?.id]);
>>>>>>> main

  useEffect(() => {
    if (user?.token) {
      setLastPublicOrderId('');
    }
  }, [user?.token]);

  useEffect(() => {
<<<<<<< HEAD
    setMapCoords(null);
    setMapFailed(false);
    setMapAttempted(false);
=======
    setStoreCoords(null);
>>>>>>> main
  }, [storeAddress]);

  useEffect(() => {
    if (!storeSlug) return;
    const cached = localStorage.getItem(`store:coords:${storeSlug}`);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
<<<<<<< HEAD
      if (parsed?.lat && parsed?.lon) {
        setMapCoords(parsed);
=======
      if (parsed?.lat && (parsed?.lng || parsed?.lon)) {
        setStoreCoords({ lat: Number(parsed.lat), lng: Number(parsed.lng ?? parsed.lon) });
>>>>>>> main
      }
    } catch (error) {
      console.error('Falha ao ler cache do mapa', error);
    }
  }, [storeSlug]);

  useEffect(() => {
<<<<<<< HEAD
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
=======
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
    const hasManualCoords = Boolean(manualDeliveryCoords?.lat && manualDeliveryCoords?.lng);
    if ((!address && !hasManualCoords) || !storeCoords) {
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
        let coords = hasManualCoords ? manualDeliveryCoords : await resolveCachedRoute();
        if (!coords && !hasManualCoords) {
          const geo = await mapsService.geocode(address);
          coords = { lat: Number(geo.lat), lng: Number(geo.lng) };
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(coords));
          }
        }
        if (!coords) {
          throw new Error('Não foi possível localizar o endereço informado.');
        }
        setDeliveryCoords(coords);
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
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [customer.type, deliveryAddress, deliveryRadiusValue, storeCoords, storeSlug, manualDeliveryCoords]);

  useEffect(() => {
    if (!manualDeliveryCoords) return;
    const rawAddress = String(deliveryAddress || '').toLowerCase();
    if (!rawAddress.includes('localização atual')) {
      setManualDeliveryCoords(null);
    }
  }, [deliveryAddress, manualDeliveryCoords]);

  const handleUseCurrentLocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Geolocalização indisponível neste dispositivo.', 'warning');
      return;
    }
    if (!storeCoords) {
      showToast('Endereço da loja ainda não foi configurado para validar entrega.', 'warning');
      return;
    }

    setDeliveryCheck({ status: 'loading', distanceKm: null, durationMin: null });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const coords = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
          };
          setManualDeliveryCoords(coords);
          setDeliveryCoords(coords);
          setCustomer((prev) => ({
            ...prev,
            street: prev.street || 'Localização atual',
            address: prev.address || 'Localização atual (GPS)',
          }));
          const route = await mapsService.route(storeCoords, coords);
          setDeliveryCheck({
            status: route.distanceKm <= deliveryRadiusValue ? 'ok' : 'out',
            distanceKm: route.distanceKm,
            durationMin: route.durationMin ?? null,
          });
          showToast('Localização atual aplicada.', 'success');
        } catch (error) {
          console.error('Falha ao validar entrega por geolocalização', error);
          setDeliveryCheck({ status: 'error', distanceKm: null, durationMin: null });
          showToast('Não foi possível validar sua localização agora.', 'error');
        }
      },
      () => {
        setDeliveryCheck({ status: 'error', distanceKm: null, durationMin: null });
        showToast('Permita o acesso à localização para usar este recurso.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };
>>>>>>> main

  const updateCart = (item, qty, options) => {
    const cookingPoint = options?.cookingPoint ?? item?.cookingPoint;
    const passSkewer = Boolean(options?.passSkewer ?? item?.passSkewer);
<<<<<<< HEAD
    const cartKey = `${item.id}:${cookingPoint || ''}:${passSkewer ? '1' : '0'}`;
=======
    const selectedModifiers = normalizeSelectedModifiers(
      options?.selectedModifiers ?? item?.selectedModifiers ?? [],
      item?.modifiers || []
    );
    const cartKey = `${item.id}:${cookingPoint || ''}:${passSkewer ? '1' : '0'}:${getModifiersSignature(selectedModifiers)}`;
>>>>>>> main
    setCart((previous) => {
      const currentQty = previous[cartKey]?.qty || 0;
      const nextQty = currentQty + qty;
      if (nextQty <= 0) {
        const copy = { ...previous };
        delete copy[cartKey];
        return copy;
      }
<<<<<<< HEAD
      const unitPrice = resolveItemPrice(item);
=======
      const unitPrice = resolveItemPrice(item) + getModifiersTotal(selectedModifiers);
>>>>>>> main
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
<<<<<<< HEAD
=======
          selectedModifiers,
          bundlePromoActive: Boolean(item?.bundlePromoActive),
          bundlePromoQty: item?.bundlePromoQty ?? null,
          bundlePromoPrice: item?.bundlePromoPrice ?? null,
>>>>>>> main
        },
      };
    });
  };

  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
<<<<<<< HEAD
    if (item?.passSkewer) labels.push('passar varinha');
=======
    if (item?.passSkewer) labels.push('passar farinha');
    const selected = formatSelectedModifiers(item?.selectedModifiers || []);
    if (selected.length) labels.push(`+ ${selected.join(', ')}`);
>>>>>>> main
    return labels.length ? `(${labels.join(' • ')})` : '';
  };

  const handleCustomerChange = (nextCustomer) => {
    const normalizedName = nextCustomer.name?.trim().toLowerCase();
    const matchedCustomer = customers.find(
      (entry) => entry.name?.trim().toLowerCase() === normalizedName
    );

    const phoneFromMatch = !nextCustomer.phone && matchedCustomer?.phone ? matchedCustomer.phone : nextCustomer.phone;
<<<<<<< HEAD
    const formattedPhone = formatPhoneInput(phoneFromMatch, DEFAULT_AREA_CODE);

    const updatedCustomer = { ...nextCustomer, phone: formattedPhone };
=======
    const updatedCustomer = { ...nextCustomer, phone: phoneFromMatch || '' };
>>>>>>> main
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

<<<<<<< HEAD
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
=======
  const checkout = async (extra?: { cashTendered?: number | null } | null) => {
    if (checkoutLockRef.current || checkoutLoading) return;
    checkoutLockRef.current = true;
    setCheckoutLoading(true);
    try {
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
    const isStaffTableOrder = customer.type === 'table' && canUseAdminPrintFlow;
    const normalizedTable = String(customer.table || '').trim();
    const effectiveCustomerName =
      String(customer.name || '').trim() || (isStaffTableOrder && normalizedTable ? `Cliente Mesa ${normalizedTable}` : '');

    if (!validCartItems.length) {
      showToast('Adicione pelo menos 1 item para finalizar o pedido.', 'warning');
      return;
    }

    const requiresPhone = !(customer.type === 'table' && canUseAdminPrintFlow);
    if (!effectiveCustomerName || (requiresPhone && !customer.phone)) {
      showToast(requiresPhone ? 'Preencha nome e telefone para continuar.' : 'Preencha seu nome para continuar.', 'warning');
>>>>>>> main
      return;
    }

    if (customer.type === 'delivery' && !customer.address) {
<<<<<<< HEAD
      alert('Informe o endereço completo para entrega.');
=======
      showToast('Informe o endereço completo para entrega.', 'warning');
      return;
    }
    if (customer.type === 'delivery' && !String(customer.number || '').trim()) {
      showToast('Informe o número da casa para entrega.', 'warning');
>>>>>>> main
      return;
    }

    if (customer.type === 'table' && !customer.table) {
<<<<<<< HEAD
      alert('Informe o número da mesa.');
      return;
    }

    const isPickup = customer.type === 'pickup';
    const payment = paymentMethod;
=======
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
>>>>>>> main

    const sanitizedPhone = customer.phone.replace(/\D/g, '');
    const sanitizedPhoneKey = sanitizedPhone.length >= 10 ? `+55${sanitizedPhone}` : '';
    const pixKey = storePixKey || PIX_KEY || sanitizedPhoneKey;

    const order = {
<<<<<<< HEAD
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      table: customer.table,
      type: customer.type,
      paymentMethod: payment,
      items: Object.values(cart).map((item) => ({
=======
      customerName: effectiveCustomerName,
      phone: customer.phone,
      address: deliveryAddress || customer.address,
      table: customer.table,
      type: customer.type,
      paymentMethod: payment,
      deliveryFee: customer.type === 'delivery' && deliveryFeeValue > 0 ? deliveryFeeValue : undefined,
      cashTendered: cashTendered !== null ? cashTendered : undefined,
      items: validCartItems.map((item: any) => ({
>>>>>>> main
        productId: item.id,
        quantity: item.qty,
        cookingPoint: item.cookingPoint,
        passSkewer: item.passSkewer,
<<<<<<< HEAD
=======
        selectedModifiers: item.selectedModifiers || [],
        isPrinted: Boolean(canUseAdminPrintFlow),
>>>>>>> main
      })),
    };

    if (!storeSlug) {
<<<<<<< HEAD
      alert('Loja não especificada.');
      return;
    }

=======
      showToast('Loja não especificada.', 'error');
      return;
    }

    const printableItems = validCartItems.map((item: any) => {
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

>>>>>>> main
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
<<<<<<< HEAD
      });
=======
        customerName: effectiveCustomerName,
        address: deliveryAddress || customer.address,
        total: orderTotal,
        items: printableItems,
        queueRank: null,
        createdAt: Date.now(),
      });
      if (canUseAdminPrintFlow) {
        setShowPrintPrompt(true);
      }
      localStorage.setItem(
        checkoutCustomerStorageKey,
        JSON.stringify({ name: effectiveCustomerName, phone: customer.phone })
      );
      if (customer.type === 'table' && customer.table) {
        setOccupiedTables((prev) => {
          const normalized = String(customer.table || '').trim();
          if (!normalized || prev.includes(normalized)) return prev;
          return [ ...prev, normalized ];
        });
      }
>>>>>>> main
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
<<<<<<< HEAD
          customerName: customer.name,
          paymentMethod: payment,
          items: Object.values(cart).map((item) => ({
=======
          customerName: effectiveCustomerName,
          paymentMethod: payment,
          cashTendered: cashTendered !== null ? cashTendered : null,
          items: validCartItems.map((item: any) => ({
>>>>>>> main
            id: item.id,
            name: item.name,
            quantity: item.qty,
            price: item.price * item.qty,
            cookingPoint: item.cookingPoint,
            passSkewer: item.passSkewer,
<<<<<<< HEAD
          })),
          phone: customer.phone,
          total: cartTotal,
          store: { name: 'Chama no Espeto Demo', slug: storeSlug },
=======
            selectedModifiers: item.selectedModifiers || [],
          })),
          phone: customer.phone,
          deliveryFee: customer.type === 'delivery' && deliveryFeeValue > 0 ? deliveryFeeValue : null,
          total: orderTotal,
          store: { name: 'Já no Caminho Demo', slug: storeSlug },
>>>>>>> main
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
<<<<<<< HEAD
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
        `💰 *TOTAL: ${formatCurrency(cartTotal)}*`,
        payment === 'pix' && pixKey ? `💳 Pagamento via PIX: ${pixKey}` : '',
        payment === 'pix'
          ? PIX_KEY
            ? `💳 Pagamento via PIX: ${PIX_KEY}`
            : '💳 Gerar Pix para retirada na loja'
          : ''
=======
      const backendMessage =
        error?.details?.message ||
        error?.error?.details?.message ||
        error?.error?.message ||
        error?.message;
      if (error?.code === 'ORDER-005') {
        showErrorNotice(backendMessage || 'Adicione ao menos 1 item válido para finalizar o pedido.');
        return;
      }
      if (error?.code === 'ORDER-003') {
        showTableNotice(backendMessage || 'Mesa já está ocupada. Finalize o pedido atual antes de criar outro.');
        return;
      }
      showErrorNotice(backendMessage || 'Não foi possível enviar o pedido agora.');
      return;
    }
    const nextCustomers = [
      { name: effectiveCustomerName, phone: customer.phone, table: customer.table },
      ...customers.filter((entry) => entry.name !== effectiveCustomerName),
    ].slice(0, 50);
    setCustomers(nextCustomers);
    localStorage.setItem(customersStorageKey, JSON.stringify(nextCustomers));
    localStorage.setItem(
      checkoutCustomerStorageKey,
      JSON.stringify({ name: effectiveCustomerName, phone: customer.phone })
    );
    customerService.fetchAll().then(setCustomers).catch(() => {});

    const trackingLink =
      typeof window !== 'undefined' && createdOrder?.id
        ? createdOrder?.accessToken
          ? `${window.location.origin}/pedido/${createdOrder.id}?ot=${encodeURIComponent(String(createdOrder.accessToken))}`
          : `${window.location.origin}/pedido/${createdOrder.id}`
        : '';
    const shouldNotifyOwner = !isStoreAdmin && (customer.type === 'pickup' || customer.type === 'table');
    if (shouldNotifyOwner) {
      const itemsList = validCartItems
        .map((item: any) => `• ${item.qty}x ${item.name} ${formatItemOptions(item)}`.trim())
        .join('\n');
      const customerLabel = customer.phone
        ? `👤 Cliente: *${effectiveCustomerName}* (${customer.phone})`
        : `👤 Cliente: *${effectiveCustomerName}*`;

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
>>>>>>> main
      ].filter(Boolean);

      const encodedMessage = encodeURIComponent(messageLines.join('\n'));
      const targetNumber = resolvedWhatsApp || WHATSAPP_NUMBER;
      window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, '_blank');
    }
<<<<<<< HEAD

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
=======
    // Evita abrir uma segunda janela do WhatsApp automaticamente.
    // O acompanhamento fica no botão da tela de sucesso e no histórico recente.
>>>>>>> main

    setCart({});
    setCustomer(initialCustomer);
    setPaymentMethod(defaultPaymentMethod);
<<<<<<< HEAD

=======
>>>>>>> main
    setLastOrder({
      id: createdOrder?.id,
      type: customer.type,
      payment,
      phone: sanitizedPhoneKey || customer.phone,
      pixKey,
      table: customer.table,
<<<<<<< HEAD
    });
    if (createdOrder?.id && !user?.token) {
      const entry = { id: createdOrder.id, createdAt: Date.now(), type: customer.type };
      localStorage.setItem(`lastOrder:${storeSlug}`, JSON.stringify(entry));
=======
      customerName: effectiveCustomerName,
      address: deliveryAddress || customer.address,
      total: orderTotal,
      items: printableItems,
      queueRank: createdOrder?.queueRank ?? createdOrder?.queuePosition ?? null,
      createdAt: Date.now(),
    });
    if (canUseAdminPrintFlow) {
      setShowPrintPrompt(true);
    }
    if (customer.type === 'table' && customer.table) {
      setOccupiedTables((prev) => {
        const normalized = String(customer.table || '').trim();
        if (!normalized || prev.includes(normalized)) return prev;
        return [ ...prev, normalized ];
      });
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
>>>>>>> main
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
<<<<<<< HEAD
    }
    setView(isStoreAdmin ? 'menu' : 'success');
    if (isStoreAdmin) {
      showOrderNotice(createdOrder?.id);
    }
=======
      const lastItemsPayload = {
        savedAt: Date.now(),
        items: validCartItems.map((item: any) => ({
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
    showToast('Pedido enviado com sucesso.', 'success', { durationMs: 3000 });
    if (isStoreAdmin) {
      showOrderNotice(createdOrder?.id);
    }
    } finally {
      checkoutLockRef.current = false;
      setCheckoutLoading(false);
    }
>>>>>>> main
  };

  const requireAdminSession = () => {
    if (!isStoreAdmin) {
      navigate(storeSlug ? `/admin?slug=${encodeURIComponent(storeSlug)}` : '/admin');
      return;
    }
<<<<<<< HEAD
    navigate(storeSlug ? `/admin/dashboard` : '/admin', { state: { activeTab: 'fila' } });
=======
    navigate('/admin/queue');
  };
  const handleStoreSessionLogout = () => {
    try {
      localStorage.removeItem('adminSession');
    } catch {}
    setUser(null);
    if (storeSlug) {
      navigate(`/${storeSlug}`, { replace: true });
      return;
    }
    navigate('/', { replace: true });
>>>>>>> main
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

<<<<<<< HEAD
=======
  const printLastOrderReceipt = async () => {
    if (!canUseAdminPrintFlow) return;
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
    try {
      const queueText = payload.queueRank ? `#${String(payload.queueRank).padStart(2, '0')}` : '--';
      const normalizedType = String(payload.type || '').toLowerCase();
      const normalizedTable = String(payload.table || '').trim();
      const locationIdentifier =
        normalizedType === 'pickup'
          ? 'RETIRADA'
          : normalizedType === 'table'
          ? (normalizedTable ? `MESA ${normalizedTable}` : 'MESA')
          : '';
      await printReceiptAsImage({
        storeName: payload.storeName || 'SERTANEJO NO ESPETO',
        platformName: 'Já no Caminho',
        queueLabel: queueText,
        orderLabel: `#${payload.orderDisplayId}`,
        customerLabel: payload.customerName,
        locationLabel: locationIdentifier,
        tableLabel: payload.table ? String(payload.table) : '',
        dateLabel: payload.createdAt,
        items: payload.items.map((item: any) => ({
          quantity: Number(item?.quantity || 0),
          name: String(item?.name || 'Item'),
          lineTotal: formatCurrency(Number(item?.lineTotal || 0)),
          notes: item?.options ? String(item.options) : '',
        })),
        totalLabel: formatCurrency(Number(payload.total || 0)),
      });
    } catch (printError) {
      console.error('[print] erro ao imprimir', printError);
      showToast('Falha ao imprimir. Verifique popup/permissões no navegador.', 'error');
    } finally {
      setIsGeneratingPrint(false);
    }
  };

  useEffect(() => {
    if (!canUseAdminPrintFlow) {
      setShowPrintPrompt(false);
    }
  }, [canUseAdminPrintFlow]);

>>>>>>> main
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
<<<<<<< HEAD
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-sans pb-28 sm:pb-24">
=======
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-sans pb-28 sm:pb-24 overflow-x-hidden no-x-scroll">
>>>>>>> main
      {isDemo && view === 'menu' && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-amber-900">
            <span>
<<<<<<< HEAD
              Demo do cardápio ativa. Veja o fluxo completo para entender como funciona.
=======
              Demo da vitrine ativa. Veja o fluxo completo para entender como funciona.
>>>>>>> main
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
<<<<<<< HEAD
=======
            {Number(storeReviewSummary?.totalReviews || 0) > 0 && (
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                {Number(storeReviewSummary?.avgStoreRating || 0).toFixed(1)} ★ ({Number(storeReviewSummary?.totalReviews || 0)} avaliações)
              </p>
            )}
>>>>>>> main
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
<<<<<<< HEAD
        {orderNotice && (
=======
        {orderNotice && !showPrintPrompt && (
>>>>>>> main
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4">
            <div className="flex flex-wrap items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="text-sm font-semibold">
                Pedido enviado para a fila
                <span className="block text-xs text-slate-300 font-medium">
                  #{formatOrderDisplayId(orderNotice.id, storeSlug)}
                </span>
              </div>
<<<<<<< HEAD
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
=======
              {!hasAdminPrintAccess && (
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
              )}
>>>>>>> main
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
<<<<<<< HEAD
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
=======
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
>>>>>>> main
                      {instagramHandle && (
                        <a
                          href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
<<<<<<< HEAD
                          className="flex items-center justify-between gap-2 text-sm font-semibold text-[#0a66c2]"
                        >
                          <span>Instagram</span>
=======
                          className="flex items-start gap-2 text-sm font-semibold text-[#0a66c2] hover:underline break-all"
                        >
                          <InstagramLogo size={18} weight="fill" className="mt-0.5 shrink-0" />
>>>>>>> main
                          <span>{instagramHandle}</span>
                        </a>
                      )}
                      {storeAddress && (
<<<<<<< HEAD
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
=======
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
>>>>>>> main
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
<<<<<<< HEAD
                Falta cadastrar os produtos para o cardápio aparecer. Se você é o responsável pela loja, clique abaixo para configurar.
=======
                Falta cadastrar os produtos para a vitrine aparecer. Se você é o responsável pela loja, clique abaixo para configurar.
>>>>>>> main
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
<<<<<<< HEAD
            {!user?.token && recentPublicOrders.length > 0 && (
              <div className="mx-3 sm:mx-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-semibold">Acompanhar pedidos recentes</span>
=======
              {!user?.token && recentPublicOrders.length > 0 && (
              <div className="mx-3 sm:mx-6 rounded-3xl premium-card-glass px-4 py-4 text-sm text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-emerald-700 font-extrabold">
                    Acompanhar pedidos recentes
                  </span>
>>>>>>> main
                  <div className="flex flex-wrap gap-2">
                    {recentPublicOrders.map((entry) => (
                      <button
                        key={entry.id}
<<<<<<< HEAD
                        onClick={() => navigate(`/pedido/${entry.id}`)}
                        className="px-2.5 py-1 rounded-full bg-white text-emerald-700 text-[11px] font-semibold border border-emerald-200 hover:bg-emerald-100"
=======
                        onClick={() =>
                          navigate(
                            entry.accessToken
                              ? `/pedido/${entry.id}?ot=${encodeURIComponent(entry.accessToken)}`
                              : `/pedido/${entry.id}`
                          )
                        }
                        className="btn-press px-3 py-1.5 rounded-full bg-white/70 text-emerald-900 text-[11px] font-extrabold border border-emerald-200 hover:bg-emerald-100/70"
>>>>>>> main
                      >
                        #{formatOrderDisplayId(entry.id, storeSlug)}
                      </button>
                    ))}
                  </div>
                </div>
<<<<<<< HEAD
                <button
                  onClick={() => navigate(`/pedido/${recentPublicOrders[0].id}`)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90"
                >
                  Acompanhar agora
                </button>
=======
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
>>>>>>> main
              </div>
            )}
            <MenuView
              products={products}
              topProducts={topProducts}
              cart={cart}
              branding={branding}
<<<<<<< HEAD
=======
              segment={storeSegment}
>>>>>>> main
              instagramHandle={instagramHandle}
              onUpdateCart={updateCart}
              onProceed={() => setView('cart')}
              onOpenQueue={isStoreAdmin ? requireAdminSession : undefined}
<<<<<<< HEAD
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
=======
              onOpenAdmin={isStoreAdmin && normalizedRole === 'admin' ? () => navigate('/admin/dashboard') : undefined}
              onLogout={isStoreAdmin ? handleStoreSessionLogout : undefined}
              userRole={normalizedRole}
              isAuthenticated={Boolean(user?.token)}
              isOpenNow={storeOpenNow}
              whatsappNumber={storePhone}
              promoMessage={promoMessage}
              todayHoursLabel={todayHoursLabel}
              storeAddress={storeAddress}
              storeCoords={storeCoords}
              compactHeader={isMobile}
              staffView={Boolean(canUseAdminPrintFlow)}
              isOrderingEnabled={storeOrderingEnabled || Boolean(user?.token)}
>>>>>>> main
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
<<<<<<< HEAD
            onChangeCustomer={handleCustomerChange}
            onChangePayment={setPaymentMethod}
            onCheckout={checkout}
=======
            tablePhoneOptional={canUseAdminPrintFlow}
            occupiedTables={occupiedTables}
            deliveryRadiusKm={deliveryRadiusValue}
            deliveryFee={deliveryFeeValue}
            deliveryCheck={deliveryCheck}
            onUseCurrentLocation={handleUseCurrentLocation}
            storeAddress={storeAddress}
            storeCoords={storeCoords}
            deliveryCoords={deliveryCoords}
            checkoutDisabled={!cartItemsCount || deliveryValidation.blocked}
            checkoutDisabledReason={
              !cartItemsCount
                ? 'Adicione pelo menos 1 item para continuar.'
                : deliveryValidation.reason
            }
            pricingSummary={{
              subtotal: cartPricing.subtotal,
              discountTotal: cartDiscountTotal,
              total: cartItemsTotal,
            }}
            onChangeCustomer={handleCustomerChange}
            onChangePayment={setPaymentMethod}
            onUpdateCart={updateCart}
            onCheckout={checkout}
            checkoutLoading={checkoutLoading}
>>>>>>> main
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
<<<<<<< HEAD
              onTrackOrder={() => {
                if (lastOrder?.id) {
                  navigate(`/pedido/${lastOrder.id}`);
                }
              }}
=======
              onPrintReceipt={canUseAdminPrintFlow ? printLastOrderReceipt : undefined}
              onTrackOrder={
                canUseAdminPrintFlow
                  ? undefined
                  : () => {
                      if (lastOrder?.id) {
                        navigate(`/pedido/${lastOrder.id}`);
                      }
                    }
              }
>>>>>>> main
              onNewOrder={() => setView('menu')}
            />
          </div>
        )}
      </main>

<<<<<<< HEAD
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
=======
      {showPrintPrompt && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <p className="text-sm text-slate-500 uppercase tracking-[0.2em] font-semibold">Pedido finalizado</p>
            <h3 className="mt-2 text-lg font-black text-slate-900">
              Pedido #{formatOrderDisplayId(lastOrder?.id, storeSlug)} finalizado!
            </h3>
            <p className="mt-2 text-sm text-slate-600">Escolha a próxima ação.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPrintPrompt(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Finalizar pedido
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
                {isGeneratingPrint ? 'Gerando cupom...' : 'Imprimir Cupom'}
              </button>
            </div>
          </div>
>>>>>>> main
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

<<<<<<< HEAD
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
=======
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

>>>>>>> main
