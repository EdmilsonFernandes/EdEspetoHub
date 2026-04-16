// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, PaperPlaneTilt, Clock, MapPinLine, InstagramLogo, ArrowLeft, Eye, EyeSlash, ClipboardText, House, Receipt, Buildings, Heart } from '@phosphor-icons/react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { customerAccountService } from '../services/customerAccountService';
import { storeService } from '../services/storeService';
import { mapsService } from '../services/mapsService';
import { condominiumService } from '../services/condominiumService';
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { CartViewCondominium } from '../components/Client/CartViewCondominium';
import { SuccessView } from '../components/Client/SuccessView';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatOrderDisplayId, formatOrderStatus, formatOrderType, formatPaymentMethod } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
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
const PUBLIC_ORDER_ALERT_TTL_MS = 3 * 60 * 60 * 1000;
const CUSTOMER_REMEMBER_EMAIL_KEY = 'jnk_customer_auth_email';
const NATIVE_NAV_VISIBILITY_EVENT = 'jnc:native-nav-visibility';

const getOrderStatusTone = (status?: string) => {
  const normalized = String(status || '').trim().toLowerCase();
  const tones: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    preparing: 'bg-sky-100 text-sky-700 border-sky-200',
    ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ready_for_delivery: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    waiting_for_motoboy: 'bg-violet-100 text-violet-700 border-violet-200',
    in_delivery: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    dispatched: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    finished: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return tones[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const isTerminalRecentOrder = (entry?: { status?: string; paymentStatus?: string }) => {
  const status = String(entry?.status || '').trim().toLowerCase();
  const paymentStatus = String(entry?.paymentStatus || '').trim().toUpperCase();
  if ([ 'done', 'delivered', 'finished', 'cancelled', 'rejected' ].includes(status)) return true;
  if (!status && paymentStatus === 'PAID') return true;
  if (paymentStatus === 'PAID' && [ 'ready', 'dispatched' ].includes(status)) return true;
  return false;
};

export function StorePage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [customerSession, setCustomerSession] = useState<any | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [showCustomerAccount, setShowCustomerAccount] = useState(false);
  const [customerAccountLoading, setCustomerAccountLoading] = useState(false);
  const [customerAccountError, setCustomerAccountError] = useState('');
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
  const [customerAuthForm, setCustomerAuthForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });
  const [rememberCustomerEmail, setRememberCustomerEmail] = useState(() => {
    try {
      return Boolean(localStorage.getItem(CUSTOMER_REMEMBER_EMAIL_KEY));
    } catch {
      return false;
    }
  });
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    label: 'Casa',
    recipientName: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  useEffect(() => {
    try {
      const rememberedEmail = localStorage.getItem(CUSTOMER_REMEMBER_EMAIL_KEY);
      if (rememberedEmail) {
        setCustomerAuthForm((prev) => ({ ...prev, email: rememberedEmail }));
      }
    } catch {
      // ignore
    }
  }, []);

  const formatPhoneBr = (value: string) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const formatCepBr = (value: string) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };
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
  const [postalEnabled, setPostalEnabled] = useState(false);
  const [postalOriginZip, setPostalOriginZip] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'distance' | 'postal'>('distance');
  const [postalQuoteLoading, setPostalQuoteLoading] = useState(false);
  const [postalQuote, setPostalQuote] = useState<any | null>(null);
  const [selectedPostalServiceCode, setSelectedPostalServiceCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [openingHours, setOpeningHours] = useState([]);
  const [orderTypes, setOrderTypes] = useState([ 'pickup', 'table' ]);
  const [storeSubscription, setStoreSubscription] = useState(null);
  const [storePlanExempt, setStorePlanExempt] = useState(false);
  const [storeReviewSummary, setStoreReviewSummary] = useState<any | null>(null);
  const [storeOrderingEnabled, setStoreOrderingEnabled] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [reorderApplied, setReorderApplied] = useState(false);
  const autoTrackRef = useRef(false);
  const staffDefaultTypeAppliedRef = useRef(false);
  const reorderTtlMs = 30 * 24 * 60 * 60 * 1000;
  const publicOrderTtlMs = PUBLIC_ORDER_ALERT_TTL_MS;
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
  const [condominiumCheckoutContext, setCondominiumCheckoutContext] = useState<any | null>(null);
  const [condominiumCheckoutLoading, setCondominiumCheckoutLoading] = useState(false);
  const customersStorageKey = useMemo(
    () => `customers:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
  const customerSessionStorageKey = useMemo(
    () => `customerSession:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
  const checkoutCustomerStorageKey = useMemo(
    () => `checkoutCustomer:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
  const guestPushIdStorageKey = 'jnk_mobile_push_guest_id';
  const condominiumSlugFromQuery = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return String(new URLSearchParams(window.location.search).get('condominio') || '').trim();
  }, [storeSlug]);
  const resolvedWhatsApp = useMemo(() => {
    const raw = storePhone || WHATSAPP_NUMBER;
    const digits = (raw || '').toString().replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  }, [storePhone]);

  const openWhatsAppUrl = (phoneValue: string, message?: string) => {
    const phone = String(phoneValue || '').replace(/\D/g, '');
    if (!phone) return;
    const nativeUrl = message
      ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `whatsapp://send?phone=${phone}`;
    const webUrl = message
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?phone=${phone}`;

    if (Capacitor.isNativePlatform()) {
      window.location.href = nativeUrl;
      return;
    }

    window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

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
  const isNativeRuntime = Capacitor.isNativePlatform();
  const showAdminWebReturnBar = isStoreAdmin && !isNativeRuntime && view !== 'menu';
  const showClientWebBottomNav = !isNativeRuntime && !isStoreAdmin && view === 'menu';
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
  const isPostalDelivery = customer.type === 'delivery' && deliveryMode === 'postal';
  const selectedPostalService = useMemo(() => {
    if (!isPostalDelivery) return null;
    const services = Array.isArray(postalQuote?.quote?.services) ? postalQuote.quote.services : [];
    if (!services.length) return null;
    const exact = services.find((service: any) => String(service?.serviceCode || '') === String(selectedPostalServiceCode || ''));
    return exact || services[0];
  }, [isPostalDelivery, postalQuote, selectedPostalServiceCode]);
  const deliveryFeeValue = useMemo(() => {
    if (customer.type !== 'delivery') return 0;
    if (isPostalDelivery) {
      const value = Number(selectedPostalService?.price || 0);
      return Number.isFinite(value) && value > 0 ? value : 0;
    }
    const value = getNumeric(deliveryFee);
    if (!value || value <= 0) return 0;
    return value;
  }, [customer.type, deliveryFee, isPostalDelivery, selectedPostalService]);
  const isCondominiumCheckout = Boolean(condominiumCheckoutContext?.condominium?.slug);
  const condominiumFulfillmentMode = String(customer?.condominiumFulfillmentMode || 'pickup_at_stall');
  const condominiumApartmentFee = useMemo(() => {
    const value = Number(
      condominiumCheckoutContext?.link?.apartmentDeliveryFee ??
      condominiumCheckoutContext?.store?.condominiumLink?.apartmentDeliveryFee ??
      0
    );
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [condominiumCheckoutContext]);
  const condominiumFeeValue = isCondominiumCheckout && condominiumFulfillmentMode === 'apartment_delivery'
    ? condominiumApartmentFee
    : 0;
  const isCondominiumPreOrderPreview = Boolean(
    isCondominiumCheckout &&
    condominiumCheckoutContext?.event &&
    !condominiumCheckoutContext?.event?.canOrderInCondominium
  );
  const condominiumPreOrderTitle = useMemo(() => {
    if (!isCondominiumPreOrderPreview) return '';
    return 'Agenda ainda não liberada';
  }, [isCondominiumPreOrderPreview]);
  const condominiumPreOrderMessage = useMemo(() => {
    if (!isCondominiumPreOrderPreview) return '';
    const startsAt = condominiumCheckoutContext?.event?.startsAt ? new Date(condominiumCheckoutContext.event.startsAt) : null;
    const startsAtValid = startsAt && !Number.isNaN(startsAt.getTime());
    const startsLabel = startsAtValid
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        }).format(startsAt)
      : '';
    return startsLabel
      ? `Você pode explorar o cardápio agora, mas os pedidos desse condomínio abrem em ${startsLabel}.`
      : 'Você pode explorar o cardápio agora, mas os pedidos desse condomínio ainda não foram liberados.';
  }, [isCondominiumPreOrderPreview, condominiumCheckoutContext]);
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
    () => cartItemsTotal + deliveryFeeValue + condominiumFeeValue,
    [cartItemsTotal, deliveryFeeValue, condominiumFeeValue]
  );

  useEffect(() => {
    const shouldHideNativeNav =
      view === 'cart' ||
      view === 'success' ||
      (view === 'menu' && cartItemsCount > 0);
    window.dispatchEvent(
      new CustomEvent(NATIVE_NAV_VISIBILITY_EVENT, {
        detail: { hidden: shouldHideNativeNav },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent(NATIVE_NAV_VISIBILITY_EVENT, {
          detail: { hidden: false },
        })
      );
    };
  }, [cartItemsCount, view]);
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
  const loggedDeliveryNeedsSavedAddress = Boolean(
    customerSession?.token &&
    customer.type === 'delivery' &&
    !customerAddresses.length
  );
  const deliveryValidation = useMemo(() => {
    if (customer.type !== 'delivery' || !deliveryRadiusValue) {
      if (customer.type === 'delivery' && !String(customer.number || '').trim()) {
        return { blocked: true, reason: 'Informe o número do endereço para finalizar a entrega.' };
      }
      if (customer.type === 'delivery' && isPostalDelivery) {
        const cepDigits = String(customer.cep || '').replace(/\D/g, '');
        if (cepDigits.length !== 8) {
          return { blocked: true, reason: 'Informe o CEP para cotar envio postal.' };
        }
        if (!selectedPostalService) {
          return { blocked: true, reason: 'Calcule e selecione o frete postal para finalizar.' };
        }
      }
      return { blocked: false, reason: '' };
    }
    if (isPostalDelivery) {
      const cepDigits = String(customer.cep || '').replace(/\D/g, '');
      if (cepDigits.length !== 8) {
        return { blocked: true, reason: 'Informe o CEP para cotar envio postal.' };
      }
      if (!selectedPostalService) {
        return { blocked: true, reason: 'Calcule e selecione o frete postal para finalizar.' };
      }
      if (!String(customer.number || '').trim()) {
        return { blocked: true, reason: 'Informe o número do endereço para finalizar.' };
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
  }, [customer.number, customer.type, customer.cep, deliveryCheck.status, deliveryRadiusValue, storeCoords, isPostalDelivery, selectedPostalService]);

  const resolveItemPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return Number(item?.price) || 0;
  };

  const reconcileLocalStockAfterCheckout = (orderedItems: any[] = []) => {
    if (!Array.isArray(orderedItems) || orderedItems.length === 0) return;
    const byProduct = orderedItems.reduce((acc: Record<string, number>, entry: any) => {
      const productId = String(entry?.id || entry?.productId || '').trim();
      const qty = Math.max(0, Number(entry?.qty ?? entry?.quantity ?? 0));
      if (!productId || qty <= 0) return acc;
      acc[productId] = (acc[productId] || 0) + qty;
      return acc;
    }, {});
    if (!Object.keys(byProduct).length) return;

    setProducts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((product: any) => {
        const productId = String(product?.id || '').trim();
        const orderedQty = byProduct[productId] || 0;
        if (!orderedQty) return product;
        if (!Boolean(product?.manageStock)) return product;
        const currentStock = Math.max(0, Number(product?.stockQuantity ?? 0));
        const nextStock = Math.max(0, currentStock - orderedQty);
        return { ...product, stockQuantity: nextStock };
      })
    );
  };

  const applyStoreMeta = (store: any) => {
    if (!store) return;
    const name = store.name || store.slug || 'Já no Caminho';
    const description = `Vitrine online e pedidos da loja ${name}.`;
    const logo = resolveAssetUrl(store.settings?.logoUrl) || getStoreAvatarUrl(store.slug, store.name);
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
    const normalized: Array<{ id: string; createdAt: number; type?: string; accessToken?: string; status?: string; paymentStatus?: string }> = [];
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
        status: entry?.status ? String(entry.status) : undefined,
        paymentStatus: entry?.paymentStatus ? String(entry.paymentStatus) : undefined,
      });
    });
    return normalized.slice(0, 3);
  };

  const persistCustomerSession = (session: any | null) => {
    if (session?.token) {
      localStorage.setItem('customerSession', JSON.stringify(session));
      localStorage.setItem(customerSessionStorageKey, JSON.stringify(session));
      setCustomerSession(session);
      return;
    }
    localStorage.removeItem('customerSession');
    localStorage.removeItem(customerSessionStorageKey);
    setCustomerSession(null);
  };

  const getOrCreateGuestPushId = () => {
    try {
      const existing = String(localStorage.getItem(guestPushIdStorageKey) || '').trim();
      if (existing) return existing;
      const generated =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(guestPushIdStorageKey, generated);
      return generated;
    } catch {
      return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  };

  const hydrateCustomerFromAddress = (address: any | null) => {
    if (!address) return;
    setCustomer((prev: any) => {
      const next = {
        ...prev,
        name: prev?.name || address.recipientName || customerSession?.user?.fullName || '',
        phone: prev?.phone || address.phone || customerSession?.user?.phone || '',
        cep: address.cep || prev?.cep || '',
        street: address.street || prev?.street || '',
        number: address.number || prev?.number || '',
        complement: address.complement || prev?.complement || '',
        neighborhood: address.neighborhood || prev?.neighborhood || '',
        city: address.city || prev?.city || '',
        state: address.state || prev?.state || '',
      };
      const street = String(next.street || '').trim();
      const number = String(next.number || '').trim();
      const streetWithNumber = street ? (number ? `${street}, ${number}` : street) : '';
      next.address = [
        streetWithNumber,
        next.complement,
        next.neighborhood,
        next.city && next.state ? `${next.city} - ${next.state}` : next.city,
        next.cep && `CEP ${next.cep}`,
      ].filter(Boolean).join(' | ');
      return next;
    });
  };

  const refreshCustomerData = async () => {
    try {
      const [me, addresses, orders] = await Promise.all([
        customerAccountService.me(),
        customerAccountService.listAddresses(),
        customerAccountService.listOrders(),
      ]);
      const nextSession = { ...(customerSession || {}), user: me };
      persistCustomerSession(nextSession);
      setCustomerAddresses(Array.isArray(addresses) ? addresses : []);
      setCustomerOrders(Array.isArray(orders) ? orders : []);
      const preferred =
        (Array.isArray(addresses) ? addresses : []).find((item: any) => item?.isDefault) ||
        (Array.isArray(addresses) ? addresses[0] : null);
      hydrateCustomerFromAddress(preferred || null);
    } catch {
      persistCustomerSession(null);
      setCustomerAddresses([]);
      setCustomerOrders([]);
    }
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
    if (storeOrderingEnabled || user?.token) return;
    setCart({});
    if (view === 'cart' || view === 'success') {
      setView('menu');
    }
  }, [storeOrderingEnabled, user?.token, view]);

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
    }
    const savedCustomerSession =
      localStorage.getItem('customerSession') || localStorage.getItem(customerSessionStorageKey);
    if (savedCustomerSession) {
      try {
        const parsedCustomerSession = JSON.parse(savedCustomerSession);
        if (parsedCustomerSession?.token) {
          setCustomerSession(parsedCustomerSession);
          localStorage.setItem('customerSession', JSON.stringify(parsedCustomerSession));
        }
      } catch {
        localStorage.removeItem('customerSession');
        localStorage.removeItem(customerSessionStorageKey);
      }
    }

    const savedCustomers = localStorage.getItem(customersStorageKey);
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers) || []);
      } catch (error) {
        console.error('Falha ao carregar clientes salvos', error);
      }
    }
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
            logoUrl: resolveAssetUrl(data.settings?.logoUrl) || getStoreAvatarUrl(data.slug, data.name),
            bannerUrl: resolveAssetUrl(data.settings?.bannerUrl) || prev.bannerUrl,
            primaryColor: data.settings?.primaryColor || prev.primaryColor,
            accentColor: data.settings?.secondaryColor || prev.accentColor,
            instagram: instagramLink || prev.instagram,
          }));
          const normalizedHours = normalizeOpeningHours(data.settings?.openingHours || []);
          setOpeningHours(normalizedHours);
          const baseTypes = Array.isArray(data.settings?.orderTypes) && data.settings.orderTypes.length > 0
            ? data.settings.orderTypes
            : [ 'pickup', 'table' ];
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
          setPostalEnabled(Boolean(data.settings?.postalEnabled));
          setPostalOriginZip(String(data.settings?.postalOriginZip || ''));
          setStoreOpenNow(typeof data.openNow === 'boolean' ? data.openNow : isStoreOpenNow(normalizedHours));
          setStoreSubscription(data.subscription || null);
          setStorePlanExempt(Boolean(data.settings?.planExempt || data.subscription?.planExempt));
          setStoreOrderingEnabled(data.settings?.isOrderingEnabled !== false);
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
    let recentOrdersInterval: number | null = null;
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
              const data = await orderService.getPublicById(entry.id);
              return {
                ...entry,
                status: String(data?.status || entry?.status || '').trim() || undefined,
                type: String(data?.type || entry?.type || '').trim() || undefined,
                paymentStatus: String(data?.paymentStatus || entry?.paymentStatus || '').trim() || undefined,
              };
            } catch {
              return null;
            }
          })
        );
        const valid = checked.filter((entry) => Boolean(entry) && !isTerminalRecentOrder(entry as any));
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

      void hydrateRecentPublicOrders();
      recentOrdersInterval = window.setInterval(() => {
        void hydrateRecentPublicOrders();
      }, 60000);

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
      if (recentOrdersInterval) {
        window.clearInterval(recentOrdersInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [storeSlug, customersStorageKey, checkoutCustomerStorageKey, customerSessionStorageKey]);

  useEffect(() => {
    let active = true;
    const slug = String(condominiumSlugFromQuery || '').trim();
    if (!slug || !storeSlug) {
      setCondominiumCheckoutContext(null);
      return () => {
        active = false;
      };
    }

    setCondominiumCheckoutLoading(true);
    condominiumService
      .listStores(slug)
      .then((payload) => {
        if (!active) return;
        const storeContext = (Array.isArray(payload?.stores) ? payload.stores : []).find(
          (item: any) => String(item?.slug || '').trim() === String(storeSlug || '').trim()
        );
        const event = payload?.event || payload?.condominium?.eventSummary || storeContext?.condominiumEvent || null;
        if (!storeContext) {
          setCondominiumCheckoutContext(null);
          return;
        }

        const link = storeContext?.condominiumLink || {};
        const feeValue = Number(link?.apartmentDeliveryFee || 0);
        setCondominiumCheckoutContext({
          condominium: payload?.condominium || storeContext?.condominium || null,
          event,
          store: storeContext,
          link,
          feeValue: Number.isFinite(feeValue) && feeValue > 0 ? feeValue : 0,
        });
        setCustomer((prev: any) => ({
          ...prev,
          type: 'pickup',
          condominiumFulfillmentMode: prev?.condominiumFulfillmentMode || 'pickup_at_stall',
        }));
      })
      .catch(() => {
        if (active) setCondominiumCheckoutContext(null);
      })
      .finally(() => {
        if (active) setCondominiumCheckoutLoading(false);
      });

    return () => {
      active = false;
    };
  }, [condominiumSlugFromQuery, storeSlug]);

  useEffect(() => {
    const sessionName = String(customerSession?.user?.fullName || '').trim();
    const sessionPhone = String(customerSession?.user?.phone || '').trim();
    if (!sessionName && !sessionPhone) return;

    setCustomer((prev: any) => {
      const prevName = String(prev?.name || '').trim();
      const prevPhone = String(prev?.phone || '').trim();
      const nextName = prevName || sessionName;
      const nextPhone = prevPhone || sessionPhone;

      if (nextName === prevName && nextPhone === prevPhone) {
        return prev;
      }

      return {
        ...prev,
        name: nextName,
        phone: nextPhone,
      };
    });
  }, [customerSession?.user?.fullName, customerSession?.user?.phone]);

  useEffect(() => {
    if (!customerSession?.token) {
      setCustomerAddresses([]);
      setCustomerOrders([]);
      return;
    }
    refreshCustomerData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSession?.token]);

  useEffect(() => {
    if (!customerSession?.token) return;
    if (customer.type !== 'delivery') return;
    const hasAddressData = Boolean(
      String(customer.cep || '').trim() ||
      String(customer.street || '').trim() ||
      String(customer.neighborhood || '').trim() ||
      String(customer.city || '').trim() ||
      String(customer.state || '').trim()
    );
    if (hasAddressData) return;
    const preferred =
      customerAddresses.find((item: any) => item?.isDefault) ||
      customerAddresses[0];
    if (preferred) {
      hydrateCustomerFromAddress(preferred);
    }
  }, [
    customerSession?.token,
    customer.type,
    customer.cep,
    customer.street,
    customer.neighborhood,
    customer.city,
    customer.state,
    customerAddresses,
  ]);

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
    if (isPostalDelivery) {
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
  }, [customer.type, deliveryAddress, deliveryRadiusValue, storeCoords, storeSlug, manualDeliveryCoords, isPostalDelivery]);

  useEffect(() => {
    if (!manualDeliveryCoords) return;
    const rawAddress = String(deliveryAddress || '').toLowerCase();
    if (!rawAddress.includes('localização atual')) {
      setManualDeliveryCoords(null);
    }
  }, [deliveryAddress, manualDeliveryCoords]);

  useEffect(() => {
    if (customer.type !== 'delivery') {
      setDeliveryMode('distance');
      setPostalQuote(null);
      setSelectedPostalServiceCode('');
      return;
    }
    if (!postalEnabled && deliveryMode !== 'distance') {
      setDeliveryMode('distance');
    }
  }, [customer.type, postalEnabled, deliveryMode]);

  useEffect(() => {
    if (!isPostalDelivery) return;
    setPostalQuote(null);
    setSelectedPostalServiceCode('');
  }, [customer.cep, isPostalDelivery, cartItemsCount, storeSlug]);

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

  const handleCalculatePostalQuote = async () => {
    if (!storeSlug) {
      showToast('Loja não especificada.', 'error');
      return;
    }
    const destinationZip = String(customer.cep || '').replace(/\D/g, '');
    if (destinationZip.length !== 8) {
      showToast('Informe um CEP válido para cotar envio postal.', 'warning');
      return;
    }
    if (!validCartItems.length) {
      showToast('Adicione ao menos 1 item para cotar frete postal.', 'warning');
      return;
    }
    setPostalQuoteLoading(true);
    try {
      const payload = {
        destinationZip,
        items: validCartItems.map((item: any) => ({
          productId: item.id,
          quantity: Number(item.qty || 1),
        })),
      };
      const quote = await storeService.quotePostalBySlug(storeSlug, payload);
      setPostalQuote(quote || null);
      const services = Array.isArray(quote?.quote?.services) ? quote.quote.services : [];
      if (services.length > 0) {
        const sorted = [ ...services ].sort((a: any, b: any) => Number(a?.price || 0) - Number(b?.price || 0));
        const defaultService = sorted[0];
        setSelectedPostalServiceCode(String(defaultService?.serviceCode || ''));
      } else {
        setSelectedPostalServiceCode('');
      }
      showToast('Frete postal calculado.', 'success');
    } catch (error: any) {
      const message =
        error?.details?.message ||
        error?.error?.details?.message ||
        error?.error?.message ||
        error?.message ||
        'Não foi possível calcular o frete postal agora.';
      setPostalQuote(null);
      setSelectedPostalServiceCode('');
      showToast(message, 'error');
    } finally {
      setPostalQuoteLoading(false);
    }
  };

  const updateCart = (item, qty, options) => {
    const cookingPoint = options?.cookingPoint ?? item?.cookingPoint;
    const passSkewer = Boolean(options?.passSkewer ?? item?.passSkewer);
    const selectedModifiers = normalizeSelectedModifiers(
      options?.selectedModifiers ?? item?.selectedModifiers ?? [],
      item?.modifiers || []
    );
    const cartKey = `${item.id}:${cookingPoint || ''}:${passSkewer ? '1' : '0'}:${getModifiersSignature(selectedModifiers)}`;
    setCart((previous) => {
      const manageStock = Boolean(item?.manageStock);
      const stockQuantityRaw = Number(item?.stockQuantity ?? 0);
      const stockQuantity = Number.isFinite(stockQuantityRaw) ? Math.max(0, Math.floor(stockQuantityRaw)) : 0;
      const totalForProduct = Object.values(previous || {}).reduce((acc: number, entry: any) => {
        if (!entry || String(entry?.id) !== String(item?.id)) return acc;
        return acc + Math.max(0, Number(entry?.qty || 0));
      }, 0);
      let safeQty = Number(qty || 0);

      if (manageStock && safeQty > 0) {
        if (totalForProduct >= stockQuantity) {
          showToast(
            stockQuantity > 0
              ? `Só temos ${stockQuantity} unidade${stockQuantity === 1 ? '' : 's'} disponível${stockQuantity === 1 ? '' : 'is'} deste produto.`
              : 'Produto esgotado no momento.',
            'warning'
          );
          return previous;
        }
        if (totalForProduct + safeQty > stockQuantity) {
          safeQty = Math.max(0, stockQuantity - totalForProduct);
          showToast(
            `Limite de estoque atingido. Máximo disponível: ${stockQuantity} unidade${stockQuantity === 1 ? '' : 's'}.`,
            'warning'
          );
          if (safeQty <= 0) {
            return previous;
          }
        }
      }

      const currentQty = previous[cartKey]?.qty || 0;
      const nextQty = currentQty + safeQty;
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

  const clearCart = () => {
    setCart({});
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

  const checkout = async (extra?: { cashTendered?: number | null; condominiumOrder?: any } | null) => {
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
    const condominiumOrderPayload = extra?.condominiumOrder || null;
    const isCondominiumOrder = Boolean(condominiumOrderPayload && condominiumCheckoutContext?.condominium?.slug);
    if (!storeOpenNow && !isCondominiumOrder) {
      showToast('Loja fechada no momento. Tente novamente durante o horário de atendimento.', 'warning');
      return;
    }
    if (isCondominiumOrder && !condominiumCheckoutContext?.event?.canOrderInCondominium) {
      showToast('A feira deste condomínio não está aceitando pedidos agora.', 'warning');
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

    const requiresPhone = !customerSession?.token && !isStoreAdmin;
    const phoneDigits = String(customer.phone || '').replace(/\D/g, '');
    if (!effectiveCustomerName || (requiresPhone && phoneDigits.length < 10)) {
      showToast(requiresPhone ? 'Preencha nome e telefone para continuar.' : 'Preencha seu nome para continuar.', 'warning');
      return;
    }

    if (!isCondominiumOrder && customer.type === 'delivery' && !customer.address) {
      showToast('Informe o endereço completo para entrega.', 'warning');
      return;
    }
    if (!isCondominiumOrder && customer.type === 'delivery' && !String(customer.number || '').trim()) {
      showToast('Informe o número da casa para entrega.', 'warning');
      return;
    }

    if (!isCondominiumOrder && customer.type === 'table' && !customer.table) {
      showToast('Informe o número da mesa.', 'warning');
      return;
    }
    if (!isCondominiumOrder && customer.type === 'delivery' && isPostalDelivery) {
      const cepDigits = String(customer.cep || '').replace(/\D/g, '');
      if (cepDigits.length !== 8) {
        showErrorNotice('Informe um CEP válido para cotar envio postal.');
        return;
      }
      if (!selectedPostalService) {
        showErrorNotice('Calcule e selecione o frete postal antes de finalizar.');
        return;
      }
    }
    if (!isCondominiumOrder && customer.type === 'delivery' && !isPostalDelivery && deliveryRadiusValue) {
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
    const condominiumMode = String(condominiumOrderPayload?.fulfillmentMode || 'pickup_at_stall').toLowerCase();
    const isApartmentCondominiumDelivery = isCondominiumOrder && condominiumMode === 'apartment_delivery';
    const condominiumAddress = isCondominiumOrder
      ? [
          condominiumCheckoutContext?.condominium?.name,
          isApartmentCondominiumDelivery
            ? [
                customer.block && `Bloco/Torre ${customer.block}`,
                customer.apartment && `Apto ${customer.apartment}`,
                customer.reference,
              ].filter(Boolean).join(' | ')
            : (condominiumCheckoutContext?.link?.pickupInstructions || condominiumCheckoutContext?.event?.pickupLocation || 'Retirada na barraca'),
        ].filter(Boolean).join(' | ')
      : '';

    const order = {
      customerName: effectiveCustomerName,
      guestPushId: getOrCreateGuestPushId(),
      phone: customer.phone,
      address: isCondominiumOrder ? condominiumAddress : (deliveryAddress || customer.address),
      table: isCondominiumOrder ? undefined : customer.table,
      type: isCondominiumOrder ? 'pickup' : customer.type,
      fulfillmentMode: isCondominiumOrder
        ? (isApartmentCondominiumDelivery ? 'condominium_apartment' : 'condominium_pickup')
        : customer.type === 'delivery' ? (isPostalDelivery ? 'postal' : 'distance') : undefined,
      condominiumOrder: isCondominiumOrder
        ? {
            condominiumId: condominiumCheckoutContext?.condominium?.id || condominiumOrderPayload?.condominiumId,
            condominiumSlug: condominiumCheckoutContext?.condominium?.slug || condominiumSlugFromQuery,
            eventId: condominiumCheckoutContext?.event?.id || condominiumOrderPayload?.eventId,
            fulfillmentMode: isApartmentCondominiumDelivery ? 'apartment_delivery' : 'pickup_at_stall',
            block: customer.block || condominiumOrderPayload?.block || '',
            tower: customer.tower || condominiumOrderPayload?.tower || '',
            apartment: customer.apartment || condominiumOrderPayload?.apartment || '',
            reference: customer.reference || condominiumOrderPayload?.reference || '',
          }
        : undefined,
      postalShipment:
        customer.type === 'delivery' && isPostalDelivery && selectedPostalService
          ? {
              provider: String(postalQuote?.quote?.provider || 'internal_postal_v1'),
              serviceCode: String(selectedPostalService?.serviceCode || ''),
              serviceName: String(selectedPostalService?.serviceName || selectedPostalService?.serviceCode || ''),
              estimatedDays: Number(selectedPostalService?.estimatedDays || 0) || undefined,
              price: Number(selectedPostalService?.price || 0) || undefined,
              currency: String(selectedPostalService?.currency || 'BRL'),
              originZip: String(postalQuote?.originZip || ''),
              destinationZip: String(postalQuote?.destinationZip || ''),
            }
          : undefined,
      paymentMethod: payment,
      deliveryFee: isCondominiumOrder && condominiumFeeValue > 0
        ? condominiumFeeValue
        : customer.type === 'delivery' && deliveryFeeValue > 0 ? deliveryFeeValue : undefined,
      cashTendered: cashTendered !== null ? cashTendered : undefined,
      items: validCartItems.map((item: any) => ({
        productId: item.id,
        quantity: item.qty,
        cookingPoint: item.cookingPoint,
        passSkewer: item.passSkewer,
        selectedModifiers: item.selectedModifiers || [],
        isPrinted: Boolean(canUseAdminPrintFlow),
      })),
    };

    if (!storeSlug) {
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

    if (isDemo) {
      const demoId = `demo-${Date.now()}`;
      reconcileLocalStockAfterCheckout(validCartItems);
      setCart({});
      setCustomer(initialCustomer);
      setDeliveryMode('distance');
      setPostalQuote(null);
      setSelectedPostalServiceCode('');
      setPaymentMethod(defaultPaymentMethod);
      setLastOrder({
        id: demoId,
        type: customer.type,
        payment,
        phone: sanitizedPhoneKey || customer.phone,
        pixKey,
        table: customer.table,
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
          customerName: effectiveCustomerName,
          paymentMethod: payment,
          cashTendered: cashTendered !== null ? cashTendered : null,
          items: validCartItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.qty,
            price: item.price * item.qty,
            cookingPoint: item.cookingPoint,
            passSkewer: item.passSkewer,
            selectedModifiers: item.selectedModifiers || [],
          })),
          phone: customer.phone,
          fulfillmentMode: customer.type === 'delivery' ? (isPostalDelivery ? 'postal' : 'distance') : undefined,
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
        customer.type === 'delivery'
          ? `🚚 Modalidade: ${isPostalDelivery ? `Envio postal (${selectedPostalService?.serviceName || selectedPostalService?.serviceCode || 'postal'})` : 'Entrega local'}`
          : '',
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

      const targetNumber = resolvedWhatsApp || WHATSAPP_NUMBER;
      const phone = String(targetNumber || '').replace(/\D/g, '');
      openWhatsAppUrl(phone, messageLines.join('\n'));
    }
    // Evita abrir uma segunda janela do WhatsApp automaticamente.
    // O acompanhamento fica no botão da tela de sucesso e no histórico recente.

    reconcileLocalStockAfterCheckout(validCartItems);

    if (storeSlug) {
      productService
        .listPublicBySlug(storeSlug)
        .then((freshProducts) => {
          if (Array.isArray(freshProducts)) setProducts(freshProducts);
        })
        .catch(() => {});
    }

    setCart({});
    setCustomer(initialCustomer);
    setDeliveryMode('distance');
    setPostalQuote(null);
    setSelectedPostalServiceCode('');
    setPaymentMethod(defaultPaymentMethod);
    setLastOrder({
      id: createdOrder?.id,
      type: customer.type,
      payment,
      phone: sanitizedPhoneKey || customer.phone,
      pixKey,
      table: customer.table,
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
        status: String(createdOrder?.status || 'pending'),
        paymentStatus: String(createdOrder?.paymentStatus || 'PENDING'),
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
  };

  const requireAdminSession = () => {
    if (!isStoreAdmin) {
      navigate(storeSlug ? `/admin?slug=${encodeURIComponent(storeSlug)}` : '/admin');
      return;
    }
    navigate('/admin/queue');
  };
  const handleStoreSessionLogout = () => {
    try {
      localStorage.removeItem('adminSession');
    } catch {}
    setUser(null);
    navigate('/', { replace: true });
  };

  const handleCustomerLogout = () => {
    persistCustomerSession(null);
    setCustomerAddresses([]);
    setCustomerOrders([]);
    setShowCustomerAccount(false);
    showToast('Sessão de cliente encerrada.', 'success');
  };

  const handleCustomerAuthSubmit = async () => {
    if (customerAccountLoading) return;
    setCustomerAccountLoading(true);
    setCustomerAccountError('');
    try {
      let response: any;
      if (customerAuthMode === 'register') {
        if (!customerAuthForm.termsAccepted || !customerAuthForm.lgpdAccepted) {
          throw new Error('Aceite os termos de uso e a política de privacidade para criar sua conta.');
        }
        response = await customerAccountService.register({
          fullName: String(customerAuthForm.fullName || '').trim(),
          email: String(customerAuthForm.email || '').trim(),
          password: String(customerAuthForm.password || ''),
          phone: String(customerAuthForm.phone || '').trim(),
          termsAccepted: Boolean(customerAuthForm.termsAccepted),
          lgpdAccepted: Boolean(customerAuthForm.lgpdAccepted),
        });
      } else {
        response = await customerAccountService.login({
          email: String(customerAuthForm.email || '').trim(),
          password: String(customerAuthForm.password || ''),
        });
      }

      if (!response?.token) {
        throw new Error('Falha ao autenticar cliente.');
      }
      try {
        const email = String(customerAuthForm.email || '').trim().toLowerCase();
        if (rememberCustomerEmail && email) {
          localStorage.setItem(CUSTOMER_REMEMBER_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(CUSTOMER_REMEMBER_EMAIL_KEY);
        }
      } catch {
        // ignore
      }
      persistCustomerSession(response);
      setCustomerAuthForm((prev) => ({ ...prev, password: '' }));
      setShowCustomerPassword(false);
      await refreshCustomerData();
      showToast(customerAuthMode === 'register' ? 'Cadastro concluído.' : 'Login realizado.', 'success');
    } catch (error: any) {
      setCustomerAccountError(error?.message || 'Não foi possível autenticar.');
    } finally {
      setCustomerAccountLoading(false);
    }
  };

  const handleCustomerForgotPassword = async () => {
    const email = String(customerAuthForm.email || '').trim();
    if (!email) {
      setCustomerAccountError('Informe o e-mail para recuperar a senha.');
      return;
    }
    setCustomerAccountLoading(true);
    setCustomerAccountError('');
    try {
      await customerAccountService.forgotPassword(email);
      setCustomerAccountError('Enviamos um link de recuperação para seu e-mail.');
    } catch (error: any) {
      setCustomerAccountError(error?.message || 'Não foi possível enviar recuperação.');
    } finally {
      setCustomerAccountLoading(false);
    }
  };

  const handleCreateAddress = async () => {
    if (!customerSession?.token || customerAccountLoading) return;
    setCustomerAccountLoading(true);
    setCustomerAccountError('');
    try {
      await customerAccountService.createAddress(newAddressForm);
      await refreshCustomerData();
      setNewAddressForm({
        label: 'Casa',
        recipientName: '',
        phone: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      });
      setShowNewAddressForm(false);
      showToast('Endereço salvo.', 'success');
    } catch (error: any) {
      setCustomerAccountError(error?.message || 'Falha ao salvar endereço.');
    } finally {
      setCustomerAccountLoading(false);
    }
  };

  const handleNewAddressCepLookup = async () => {
    const rawCep = String(newAddressForm.cep || '').replace(/\D/g, '');
    if (rawCep.length !== 8 || customerAccountLoading) return;
    setCustomerAccountLoading(true);
    setCustomerAccountError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();
      if (data?.erro) {
        setCustomerAccountError('CEP não encontrado.');
        return;
      }
      setNewAddressForm((prev) => ({
        ...prev,
        street: String(data?.logradouro || ''),
        neighborhood: String(data?.bairro || ''),
        city: String(data?.localidade || ''),
        state: String(data?.uf || '').toUpperCase().slice(0, 2),
        complement: prev?.complement || String(data?.complemento || ''),
      }));
    } catch {
      setCustomerAccountError('Não foi possível consultar o CEP agora.');
    } finally {
      setCustomerAccountLoading(false);
    }
  };

  const handleUseAddressForCheckout = (address: any) => {
    hydrateCustomerFromAddress(address);
    setView('cart');
    setShowCustomerAccount(false);
    showToast('Endereço aplicado no checkout.', 'success');
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
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-sans overflow-x-hidden no-x-scroll ${isNativeRuntime ? 'ds-native-nav-content' : 'pb-28 sm:pb-24'}`}>
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
      {view !== 'menu' && view !== 'cart' && (
        <div className="bg-white shadow-md px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-gray-100">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border shadow-sm bg-white flex-shrink-0 flex items-center justify-center"
            style={{ borderColor: branding?.primaryColor, color: branding?.primaryColor }}
          >
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.brandName} 
                className="w-full h-full object-cover" 
                onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, branding?.brandName); }}
              />
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
        {orderNotice && !showPrintPrompt && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4">
            <div className="flex flex-wrap items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="text-sm font-semibold">
                Pedido enviado para a fila
                <span className="block text-xs text-slate-300 font-medium">
                  #{formatOrderDisplayId(orderNotice.id, storeSlug)}
                </span>
              </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      const phone = String(storePhone || '').replace(/\D/g, '');
                      openWhatsAppUrl(phone);
                    }}
                    className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:opacity-90 transition-all"
                  >
                    Falar no WhatsApp
                  </button>
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
                          onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, branding?.brandName); }}
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

                  <PlatformTrustFooter className="pt-1" />
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
              <div className="fixed bottom-20 left-4 right-4 z-[110] sm:relative sm:bottom-0 sm:left-0 sm:right-0 sm:mx-6 rounded-[1.75rem] border border-emerald-200/60 bg-white/92 backdrop-blur-xl px-4 py-3 shadow-[0_18px_42px_-22px_rgba(16,185,129,0.35)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      recentPublicOrders[0]?.accessToken
                        ? `/pedido/${recentPublicOrders[0].id}?ot=${encodeURIComponent(recentPublicOrders[0].accessToken)}`
                        : `/pedido/${recentPublicOrders[0].id}`
                    )
                  }
                  className="min-w-0 flex flex-1 items-center gap-3 text-left active:scale-[0.99]"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                    <span className="absolute inset-0 rounded-2xl border border-emerald-100" />
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                      Pedido em andamento
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-900">
                        #{formatOrderDisplayId(recentPublicOrders[0]?.id, storeSlug)}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          getOrderStatusTone(recentPublicOrders[0]?.status)
                        }`}
                      >
                        {formatOrderStatus(recentPublicOrders[0]?.status, recentPublicOrders[0]?.type)}
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() =>
                    navigate(
                      recentPublicOrders[0]?.accessToken
                        ? `/pedido/${recentPublicOrders[0].id}?ot=${encodeURIComponent(recentPublicOrders[0].accessToken)}`
                        : `/pedido/${recentPublicOrders[0].id}`
                    )
                  }
                  className="btn-press shrink-0 rounded-2xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white shadow-[0_12px_24px_-12px_rgba(5,150,105,0.5)] transition-all hover:bg-emerald-700 active:scale-95"
                >
                  Acompanhar
                </button>
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
              onClearCart={clearCart}
              onProceed={() => setView('cart')}
              onOpenQueue={isStoreAdmin ? requireAdminSession : undefined}
              onOpenAdmin={isStoreAdmin && normalizedRole === 'admin' ? () => navigate('/admin/dashboard') : undefined}
              onLogout={isStoreAdmin ? handleStoreSessionLogout : undefined}
              onOpenCustomerAccount={!isStoreAdmin ? () => setShowCustomerAccount(true) : undefined}
              isCustomerAuthenticated={Boolean(customerSession?.token)}
              userRole={normalizedRole}
              isAuthenticated={Boolean(user?.token)}
              isOpenNow={storeOpenNow}
              whatsappNumber={storePhone}
              promoMessage={promoMessage}
              todayHoursLabel={todayHoursLabel}
              storeAddress={storeAddress}
              storeCoords={storeCoords}
              storeDescription={storeDescription}
              reviewSummary={storeReviewSummary}
              deliveryFeeLabel={
                orderTypes.includes('delivery')
                  ? (() => {
                      const feeValue = getNumeric(deliveryFee);
                      return feeValue !== null && feeValue > 0 ? `Taxa ${formatCurrency(Number(feeValue))}` : 'Entrega grátis';
                    })()
                  : ''
              }
              orderTypes={orderTypes}
              compactHeader={isMobile}
              staffView={Boolean(canUseAdminPrintFlow)}
              isOrderingEnabled={storeOrderingEnabled || Boolean(user?.token)}
              preOrderBlocked={isCondominiumPreOrderPreview}
              preOrderBlockedTitle={condominiumPreOrderTitle}
              preOrderBlockedMessage={condominiumPreOrderMessage}
            />
          </div>
        )}
        {view === 'cart' && isCondominiumCheckout ? (
          <CartViewCondominium
            cart={cart}
            customer={customer}
            customers={customers}
            paymentMethod={paymentMethod}
            condominiumCheckoutContext={condominiumCheckoutContext}
            allowCustomerAutocomplete={Boolean(user?.token)}
            guestPhoneRequired={!customerSession?.token && !isStoreAdmin}
            checkoutDisabled={!cartItemsCount || condominiumCheckoutLoading || !condominiumCheckoutContext?.event?.canOrderInCondominium}
            checkoutDisabledReason={
              !cartItemsCount
                ? 'Adicione pelo menos 1 item para continuar.'
                : condominiumCheckoutLoading
                ? 'Carregando dados da feira.'
                : !condominiumCheckoutContext?.event?.canOrderInCondominium
                ? 'Esta agenda ainda nao esta aceitando pedidos.'
                : ''
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
            onBack={() => setView('menu')}
          />
        ) : view === 'cart' && (
          <CartView
            cart={cart}
            customer={customer}
            customers={customers}
            paymentMethod={paymentMethod}
            allowedOrderTypes={orderTypes}
            allowCustomerAutocomplete={Boolean(user?.token)}
            tablePhoneOptional={canUseAdminPrintFlow}
            guestPhoneRequired={!customerSession?.token && !isStoreAdmin}
            occupiedTables={occupiedTables}
            deliveryRadiusKm={deliveryRadiusValue}
            deliveryFee={deliveryFeeValue}
            deliveryCheck={deliveryCheck}
            deliveryMode={deliveryMode}
            postalEnabled={postalEnabled}
            postalOriginZip={postalOriginZip}
            postalQuote={postalQuote}
            postalQuoteLoading={postalQuoteLoading}
            selectedPostalServiceCode={selectedPostalServiceCode}
            onUseCurrentLocation={handleUseCurrentLocation}
            onChangeDeliveryMode={setDeliveryMode}
            onCalculatePostalQuote={handleCalculatePostalQuote}
            onSelectPostalService={setSelectedPostalServiceCode}
            storeAddress={storeAddress}
            storeCoords={storeCoords}
            deliveryCoords={deliveryCoords}
            isCustomerLogged={Boolean(customerSession?.token)}
            savedAddresses={customerAddresses}
            onApplySavedAddress={(address: any) => {
              hydrateCustomerFromAddress(address);
              showToast('Endereço aplicado no checkout.', 'success');
            }}
            onOpenAddressManager={() => setShowCustomerAccount(true)}
            checkoutDisabled={!cartItemsCount || deliveryValidation.blocked || loggedDeliveryNeedsSavedAddress}
            checkoutDisabledReason={
              !cartItemsCount
                ? 'Adicione pelo menos 1 item para continuar.'
                : loggedDeliveryNeedsSavedAddress
                ? 'Cadastre um endereço na sua conta para finalizar entrega.'
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
            onBack={() => setView('menu')}
            storeLabel={storeName || branding?.brandName || ''}
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
              onNewOrder={() => setView('menu')}
            />
          </div>
        )}
      </main>

      {isStoreAdmin && view === 'menu' && <AdminMobileBottomNav />}

      {showCustomerAccount && !isStoreAdmin && (
        <div className="fixed inset-0 z-[9998] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center px-3 py-5">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] border border-slate-200/80 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.75)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-extrabold">Conta do cliente</p>
                <h3 className="text-xl font-black text-slate-900">
                  {customerSession?.user ? 'Meu perfil' : 'Entrar ou criar conta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerAccount(false)}
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 hover:bg-white"
              >
                Fechar
              </button>
            </div>

            {!customerSession?.token ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setCustomerAuthMode('login')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${customerAuthMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerAuthMode('register')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${customerAuthMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Cadastro
                  </button>
                </div>
                {customerAuthMode === 'register' && (
                  <input
                    value={customerAuthForm.fullName}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nome completo"
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                )}
                {customerAuthMode === 'register' && (
                  <input
                    value={customerAuthForm.phone}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, phone: formatPhoneBr(e.target.value) }))}
                    placeholder="Telefone (opcional)"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                )}
                <input
                  value={customerAuthForm.email}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="E-mail"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                />
                <div className="relative">
                  <input
                    type={showCustomerPassword ? 'text' : 'password'}
                    value={customerAuthForm.password}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Senha"
                    autoComplete={customerAuthMode === 'register' ? 'new-password' : 'current-password'}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showCustomerPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showCustomerPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showCustomerPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                  </button>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberCustomerEmail}
                    onChange={(e) => setRememberCustomerEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                  />
                  Lembrar meu e-mail neste aparelho
                </label>
                {customerAuthMode === 'register' && (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
                    <label className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                      <input
                        type="checkbox"
                        checked={customerAuthForm.termsAccepted}
                        onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, termsAccepted: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                      />
                      <span>Li e aceito os <a href="/terms" target="_blank" rel="noreferrer" className="font-black text-slate-900 underline underline-offset-2">Termos de Uso</a>.</span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                      <input
                        type="checkbox"
                        checked={customerAuthForm.lgpdAccepted}
                        onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, lgpdAccepted: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                      />
                      <span>Autorizo o uso dos meus dados conforme a <a href="/terms#lgpd" target="_blank" rel="noreferrer" className="font-black text-slate-900 underline underline-offset-2">Política de Privacidade e LGPD</a>.</span>
                    </label>
                  </div>
                )}
                {customerAccountError ? (
                  <p className="text-sm text-rose-600">{customerAccountError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={customerAccountLoading}
                  onClick={handleCustomerAuthSubmit}
                  className="w-full rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_18px_30px_-20px_rgba(15,23,42,0.85)] active:scale-[0.99] disabled:opacity-60"
                >
                  {customerAccountLoading ? 'Processando...' : customerAuthMode === 'register' ? 'Criar conta' : 'Entrar'}
                </button>
                {customerAuthMode === 'login' && (
                  <button
                    type="button"
                    onClick={handleCustomerForgotPassword}
                    className="w-full text-center text-xs font-semibold text-sky-700 hover:text-sky-800"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">{customerSession?.user?.fullName}</p>
                  <p className="text-xs text-slate-500">{customerSession?.user?.email}</p>
                  <button
                    type="button"
                    onClick={handleCustomerLogout}
                    className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sair da conta
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-3 space-y-2 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-extrabold">Endereços</p>
                  {customerAddresses.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum endereço salvo ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerAddresses.map((address: any) => (
                        <div key={address.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                          <p className="text-sm font-semibold text-slate-700">
                            {address.label || 'Endereço'} {address.isDefault ? '• Principal' : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            {address.street}, {address.number || 's/n'} - {address.neighborhood} - {address.city}/{address.state}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUseAddressForCheckout(address)}
                              className="rounded-lg bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-2.5 py-1 text-[11px] font-bold text-white"
                            >
                              Usar no checkout
                            </button>
                            {!address.isDefault && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await customerAccountService.setDefaultAddress(address.id);
                                  await refreshCustomerData();
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                              >
                                Tornar principal
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm((prev) => !prev)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      {showNewAddressForm ? 'Fechar cadastro de endereço' : 'Cadastrar novo endereço'}
                    </button>
                  </div>
                  {showNewAddressForm && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <input value={newAddressForm.label} onChange={(e) => setNewAddressForm((p) => ({ ...p, label: e.target.value }))} placeholder="Apelido" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.recipientName} onChange={(e) => setNewAddressForm((p) => ({ ...p, recipientName: e.target.value }))} placeholder="Nome do recebedor" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.phone} onChange={(e) => setNewAddressForm((p) => ({ ...p, phone: formatPhoneBr(e.target.value) }))} placeholder="Telefone" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <div className="flex gap-2">
                          <input value={newAddressForm.cep} onBlur={handleNewAddressCepLookup} onChange={(e) => setNewAddressForm((p) => ({ ...p, cep: formatCepBr(e.target.value) }))} placeholder="CEP" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                          <button type="button" onClick={handleNewAddressCepLookup} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                            Buscar CEP
                          </button>
                        </div>
                        <input value={newAddressForm.street} onChange={(e) => setNewAddressForm((p) => ({ ...p, street: e.target.value }))} placeholder="Rua" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.number} onChange={(e) => setNewAddressForm((p) => ({ ...p, number: e.target.value }))} placeholder="Número" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.complement} onChange={(e) => setNewAddressForm((p) => ({ ...p, complement: e.target.value }))} placeholder="Complemento" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.neighborhood} onChange={(e) => setNewAddressForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bairro" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.city} onChange={(e) => setNewAddressForm((p) => ({ ...p, city: e.target.value }))} placeholder="Cidade" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input value={newAddressForm.state} onChange={(e) => setNewAddressForm((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateAddress}
                        disabled={customerAccountLoading}
                        className="rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-3 py-2 text-xs font-bold text-white shadow-[0_12px_22px_-18px_rgba(15,23,42,0.75)] disabled:opacity-60"
                      >
                        Salvar endereço
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-extrabold">Meus pedidos</p>
                  {customerOrders.length === 0 ? (
                    <p className="text-sm text-slate-500 mt-2">Sem pedidos vinculados ainda.</p>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-44 overflow-y-auto">
                      {customerOrders.slice(0, 8).map((order: any) => (
                        <button
                          key={order.id}
                          onClick={() => navigate(`/pedido/${order.id}`)}
                          className="w-full text-left rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 hover:bg-slate-100"
                        >
                          <p className="text-sm font-semibold text-slate-700">
                            #{formatOrderDisplayId(order.id, order?.store?.slug || storeSlug)} • {order?.store?.name || 'Loja'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleString('pt-BR')} • {formatCurrency(Number(order.total || 0))}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {showClientWebBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl lg:hidden">
          <div className="grid h-[4.75rem] grid-cols-4 items-center gap-2 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0px)]">
            <button
              type="button"
              onClick={() => navigate('/hub')}
              className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]"
            >
              <House size={18} weight="duotone" />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.08em]">Início</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/cliente/pedidos')}
              className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]"
            >
              <Receipt size={18} weight="duotone" />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.08em]">Pedidos</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/hub?panel=condominios')}
              className={`flex flex-col items-center justify-center rounded-2xl py-1 transition-all duration-150 ease-out active:scale-[0.94] ${
                condominiumSlugFromQuery
                  ? 'bg-[#336886]/10 text-[#336886] shadow-[0_8px_18px_-16px_rgba(51,104,134,0.7)] ring-1 ring-[#336886]/15'
                  : 'text-slate-400'
              }`}
            >
              <Buildings size={18} weight={condominiumSlugFromQuery ? 'fill' : 'duotone'} />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.08em]">Condo</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/hub?favorites=1')}
              className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]"
            >
              <Heart size={18} weight="regular" />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.08em]">Favoritos</span>
            </button>
          </div>
        </nav>
      )}

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


