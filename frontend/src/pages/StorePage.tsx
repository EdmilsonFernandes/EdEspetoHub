// @ts-nocheck
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ShoppingCart, PaperPlaneTilt, Clock, MapPinLine, InstagramLogo, ArrowLeft, Eye, EyeSlash, ClipboardText, House, Receipt, Buildings, UserCircle, WarningCircle, X, Gear, Package, LockKey, Scooter, SignOut, Star, CreditCard, UsersThree, Mountains, Printer, Tent, MapTrifold } from '@phosphor-icons/react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { customerAccountService } from '../services/customerAccountService';
import { addressLookupService } from '../services/addressLookupService';
import { storeService } from '../services/storeService';
import { mapsService } from '../services/mapsService';
import { condominiumService } from '../services/condominiumService';
import { MenuView } from '../components/Client/MenuView';
import { CartView } from '../components/Client/CartView';
import { CartViewCondominium } from '../components/Client/CartViewCondominium';
import { SuccessView } from '../components/Client/SuccessView';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { ContextSideDrawer } from '../components/common/ContextSideDrawer';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { AppRobotLoader } from '../components/common/AppRobotLoader';
import { StoreAppPromoBanner } from '../components/common/StoreAppPromoBanner';
import { Image } from '../components/common/Image';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatOrderDisplayId, formatOrderStatus, formatOrderType, formatPaymentMethod } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import {
  getPersistedBranding,
  brandingStorageKey,
  defaultBranding,
  initialCustomer,
  defaultPaymentMethod,
  WHATSAPP_NUMBER,
  PICKUP_DISTANCE_WARNING_KM,
  PICKUP_DISTANCE_CONFIRMATION_KM,
} from '../constants';
import { formatOpeningHoursForDay, getCurrentClosingTimeLabel, isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
import {
  formatSelectedModifiers,
  getModifiersSignature,
  getModifiersTotal,
  normalizeSelectedModifiers,
} from '../utils/productModifiers';
import { getCartPricing } from '../utils/orderPricing';
import { printReceiptAsImage } from '../utils/printReceiptImage';
import { clearAllCustomerSessions } from '../utils/customerSessionStorage';
import { ADMIN_SESSION_EVENT, CUSTOMER_SESSION_EVENT, nativeBiometricService } from '../services/nativeBiometricService';
import { navigateBackOrFallback } from '../utils/navigation';
import { buildOrderTrackingPath, primeOrderTrackingNavigation } from '../utils/orderTrackingPrefetch';
import { buildDestinationInquiryMessage, prettifyDestinationLabel } from '../utils/destinationWhatsApp';
import { haversineKm } from '../utils/geo';
import { reconcileCartStock } from '../utils/cartStock';
import { normalizeCustomerOrderNote } from '../utils/customerOrderNote';
import { inputAssistProps } from '../utils/inputAssist';
import {
  buildStoreCheckoutDraftKey,
  createStoreCheckoutDraft,
  normalizeStoreCheckoutDraft,
} from '../utils/storeCheckoutDraft';
import {
  isOperationalSessionForStore,
  isOperationalStoreSession,
  isPublicStorefrontNavigation,
} from '../utils/storefrontSession';
import {
  WEEKDAY_LABELS,
  PUBLIC_ORDER_ALERT_TTL_MS,
  CUSTOMER_REMEMBER_EMAIL_KEY,
  NATIVE_NAV_VISIBILITY_EVENT,
  CHECKOUT_SLOW_FEEDBACK_MS,
  CHECKOUT_CREATE_ORDER_TIMEOUT_MS,
  STOREFRONT_PRODUCTS_REFRESH_TIMEOUT_MS,
  STOREFRONT_PRODUCTS_SLOW_FEEDBACK_MS,
  STOREFRONT_PRODUCTS_CACHE_MAX_AGE_MS,
  buildPublicPaymentSummary,
  PROFESSIONAL_LOCAL_PAYMENT_METHODS,
  PROFESSIONAL_PAYMENT_METHOD_MAP,
  resolveCheckoutPaymentMethods,
  resolveCheckoutPaymentSelection,
  resolveOrderPaymentMethodForCheckout,
  POSTAL_PREPAID_PAYMENT_METHODS,
  isPostalPrepaidPaymentMethod,
  getOrderStatusTone,
  isTerminalRecentOrder,
  haversineDistanceKm,
  canUseDeliveryBySubscription,
} from './storePageHelpers';


export function StorePage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout: logoutAdminContext } = useAuth();
  const { showToast } = useToast();
  const forcePublicStorefront = isPublicStorefrontNavigation(location.state);
  const readAdminSessionSnapshot = useCallback((candidate?: any | null) => {
    const session = candidate && typeof candidate === 'object' ? candidate : null;
    if (isOperationalStoreSession(session)) {
      return session;
    }
    try {
      const savedSession = localStorage.getItem('adminSession');
      if (!savedSession) {
        return null;
      }
      const parsedSession = JSON.parse(savedSession);
      if (isOperationalStoreSession(parsedSession)) {
        return parsedSession;
      }
    } catch {
      // ignore malformed admin session in local storage
    }
    return null;
  }, []);
  const [user, setUser] = useState(() => readAdminSessionSnapshot(auth));
  const isStoreAdmin = !forcePublicStorefront && isOperationalSessionForStore(user, storeSlug);
  const [adminAccountDrawerOpen, setAdminAccountDrawerOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState<any | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [showCustomerAccount, setShowCustomerAccount] = useState(false);
  const [customerAccountLoading, setCustomerAccountLoading] = useState(false);
  const [customerAccountError, setCustomerAccountError] = useState('');
  const [customerAccountNotice, setCustomerAccountNotice] = useState('');
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
  const [customerAuthForm, setCustomerAuthForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });
  const [customerAuthCheckoutPrompt, setCustomerAuthCheckoutPrompt] = useState(false);
  const [customerCheckoutResume, setCustomerCheckoutResume] = useState(null);
  const [customerVerifyPrompt, setCustomerVerifyPrompt] = useState<any | null>(null);
  const [customerVerifyCode, setCustomerVerifyCode] = useState('');
  const [customerVerifyLoading, setCustomerVerifyLoading] = useState(false);
  const [customerResendCooldown, setCustomerResendCooldown] = useState(0);
  const [customerResendLoading, setCustomerResendLoading] = useState(false);
  const [rememberCustomerEmail, setRememberCustomerEmail] = useState(() => {
    try {
      return Boolean(localStorage.getItem(CUSTOMER_REMEMBER_EMAIL_KEY));
    } catch {
      return false;
    }
  });
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [hubCoverageNotice, setHubCoverageNotice] = useState<{ message: string } | null>(null);
  const [myCondoPickup, setMyCondoPickup] = useState<{ label?: string | null; condominiumId?: string | null } | null>(null);
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
    lat: null,
    lng: null,
  });
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const syncAdminSession = useCallback((candidate?: any | null) => {
    setUser(readAdminSessionSnapshot(candidate));
  }, [readAdminSessionSnapshot]);
  const openAdminAccountDrawer = useCallback(() => {
    const session = readAdminSessionSnapshot();
    if (forcePublicStorefront || !isOperationalSessionForStore(session, storeSlug)) {
      return;
    }
    syncAdminSession(session);
    setAdminAccountDrawerOpen(true);
  }, [forcePublicStorefront, readAdminSessionSnapshot, storeSlug, syncAdminSession]);

  useEffect(() => {
    const warning = location.state && (location.state as any).hubCoverageWarning;
    if (!warning?.message) {
      setHubCoverageNotice(null);
      return;
    }
    setHubCoverageNotice({ message: String(warning.message) });
  }, [location.state]);

  useEffect(() => {
    const pickup = location.state && (location.state as any).myCondoPickup;
    if (!pickup?.label && !pickup?.condominiumId) {
      setMyCondoPickup(null);
      return;
    }
    setMyCondoPickup({
      label: pickup?.label ? String(pickup.label) : null,
      condominiumId: pickup?.condominiumId ? String(pickup.condominiumId) : null,
    });
  }, [location.state]);

  useLayoutEffect(() => {
    window.addEventListener('admin:open-account-drawer', openAdminAccountDrawer as EventListener);
    return () => window.removeEventListener('admin:open-account-drawer', openAdminAccountDrawer as EventListener);
  }, [openAdminAccountDrawer]);

  useEffect(() => {
    if (!isStoreAdmin) {
      setAdminAccountDrawerOpen(false);
    }
  }, [isStoreAdmin]);

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

  useEffect(() => {
    if (customerResendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCustomerResendCooldown((value) => Math.max(0, Number(value || 0) - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [customerResendCooldown]);

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
  const normalizeGeoText = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsSlow, setProductsSlow] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState('');
  const [productsRetryKey, setProductsRetryKey] = useState(0);
  const productRequestIdRef = useRef(0);
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState('menu');
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [lastOrder, setLastOrder] = useState(null);
  const [pendingWhatsApp, setPendingWhatsApp] = useState<(() => void) | null>(null);
  const [branding, setBranding] = useState(() => getPersistedBranding(storeSlug || defaultBranding.espetoId));
  const [storeOpenNow, setStoreOpenNow] = useState(true);
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeState, setStoreState] = useState('');
  const [storeSegment, setStoreSegment] = useState('outros');
  const [storePixKey, setStorePixKey] = useState('');
  const [paymentSummary, setPaymentSummary] = useState<any | null>(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [postalEnabled, setPostalEnabled] = useState(false);
  const [storeSettingsLoaded, setStoreSettingsLoaded] = useState(false);
  const [postalOriginZip, setPostalOriginZip] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'distance' | 'postal'>('distance');
  const [postalQuoteLoading, setPostalQuoteLoading] = useState(false);
  const [postalQuote, setPostalQuote] = useState<any | null>(null);
  const [selectedPostalServiceCode, setSelectedPostalServiceCode] = useState('');
  const postalQuoteAutoKeyRef = useRef('');
  const [promoMessage, setPromoMessage] = useState('');
  const [openingHours, setOpeningHours] = useState([]);
  const [orderTypes, setOrderTypes] = useState([ 'pickup', 'table' ]);
  const [reservationLeadTimeHours, setReservationLeadTimeHours] = useState<number | null>(null);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'info'>(
    () => (searchParams.get('tab') as 'products' | 'reviews' | 'info' | null) || 'products',
  );
  const changeTab = useCallback(
    (next: 'products' | 'reviews' | 'info') => {
      setActiveTab(next);
      setSearchParams(
        (prev) => {
          prev.set('tab', next);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [orderNotice, setOrderNotice] = useState(null);
  const [tableNotice, setTableNotice] = useState(null);
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [storeCoords, setStoreCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [manualDeliveryCoords, setManualDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryCheck, setDeliveryCheck] = useState({ status: 'idle', distanceKm: null, durationMin: null });
  const [condominiumCheckoutContext, setCondominiumCheckoutContext] = useState<any | null>(null);
  const [condominiumCheckoutLoading, setCondominiumCheckoutLoading] = useState(false);
  const openOrderTracking = useCallback((orderId?: string | null, accessToken?: string | null) => {
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) return;
    primeOrderTrackingNavigation(normalizedOrderId, accessToken);
    navigate(buildOrderTrackingPath(normalizedOrderId, accessToken));
  }, [navigate]);
  const customersStorageKey = useMemo(
    () => `customers:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
  const customerSessionStorageKey = useMemo(
    () => `customerSession:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );

  useEffect(() => {
    const recentOrder = recentPublicOrders[0];
    if (!isStoreAdmin && !customerSession?.token && recentOrder?.id) {
      primeOrderTrackingNavigation(recentOrder.id, recentOrder.accessToken);
    }
  }, [customerSession?.token, isStoreAdmin, recentPublicOrders]);
  const checkoutCustomerStorageKey = useMemo(
    () => `checkoutCustomer:${storeSlug || defaultBranding.espetoId}`,
    [storeSlug]
  );
  const checkoutDraftContext = isStoreAdmin ? 'staff' : 'public';
  const checkoutDraftStorageKey = useMemo(
    () => buildStoreCheckoutDraftKey(storeSlug || defaultBranding.espetoId, checkoutDraftContext),
    [checkoutDraftContext, storeSlug]
  );
  const restoredCheckoutDraftKeysRef = useRef<Record<string, boolean>>({});
  const readCustomerSessionSnapshot = useCallback((candidate?: any | null) => {
    const session = candidate && typeof candidate === 'object' ? candidate : null;
    if (session?.token) {
      return session;
    }
    try {
      const savedCustomerSession =
        localStorage.getItem('customerSession') || localStorage.getItem(customerSessionStorageKey);
      if (!savedCustomerSession) {
        return null;
      }
      const parsedCustomerSession = JSON.parse(savedCustomerSession);
      return parsedCustomerSession?.token ? parsedCustomerSession : null;
    } catch {
      clearAllCustomerSessions();
      return null;
    }
  }, [customerSessionStorageKey]);
  const syncCustomerSessionSnapshot = useCallback((candidate?: any | null) => {
    const nextSession = readCustomerSessionSnapshot(candidate);
    setCustomerSession(nextSession);
    if (nextSession?.token) {
      try {
        localStorage.setItem('customerSession', JSON.stringify(nextSession));
      } catch {
        // localStorage can fail in restricted webviews; keep the in-memory session.
      }
    }
    return nextSession;
  }, [readCustomerSessionSnapshot]);
  const guestPushIdStorageKey = 'jnk_mobile_push_guest_id';
  const condominiumSlugFromQuery = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return String(new URLSearchParams(window.location.search).get('condominio') || '').trim();
  }, [storeSlug]);
  const destinationContextFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const destinationSlug = String(params.get('destino') || '').trim();
    const placeSlug = String(params.get('hospedagem') || '').trim();
    const destinationName = String(params.get('destino_nome') || prettifyDestinationLabel(params.get('destino')) || '').trim();
    const placeName = String(params.get('hospedagem_nome') || prettifyDestinationLabel(params.get('hospedagem')) || '').trim();
    const placeAddress = String(params.get('hospedagem_endereco') || '').trim();
    const placeAddressNumber = String(params.get('hospedagem_numero') || '').trim();
    const placeDistrict = String(params.get('hospedagem_bairro') || '').trim();
    const placeCity = String(params.get('hospedagem_cidade') || '').trim();
    const placeState = String(params.get('hospedagem_uf') || '').trim();
    const placeZipCode = String(params.get('hospedagem_cep') || '').trim();
    const placeLat = String(params.get('hospedagem_lat') || '').trim();
    const placeLng = String(params.get('hospedagem_lng') || '').trim();
    return { destinationSlug, placeSlug, destinationName, placeName, placeAddress, placeAddressNumber, placeDistrict, placeCity, placeState, placeZipCode, placeLat, placeLng };
  }, [location.search]);
  const destinationStoreWhatsAppMessage = useMemo(() => {
    if (!destinationContextFromQuery.destinationName && !destinationContextFromQuery.placeName) return '';
    return buildDestinationInquiryMessage({
      destinationName: destinationContextFromQuery.destinationName,
      itemName: storeName || branding?.brandName || 'esta loja',
      itemType: 'loja/restaurante',
      placeName: destinationContextFromQuery.placeName,
      placeAddress: destinationContextFromQuery.placeAddress,
      placeAddressNumber: destinationContextFromQuery.placeAddressNumber,
      placeDistrict: destinationContextFromQuery.placeDistrict,
      placeCity: destinationContextFromQuery.placeCity,
      placeState: destinationContextFromQuery.placeState,
      placeZipCode: destinationContextFromQuery.placeZipCode,
      placeLat: destinationContextFromQuery.placeLat,
      placeLng: destinationContextFromQuery.placeLng,
      itemAddress: storeAddress,
      itemLat: storeCoords?.lat,
      itemLng: storeCoords?.lng,
      storeName: storeName || branding?.brandName || '',
      destinationSlug: destinationContextFromQuery.destinationSlug,
      placeSlug: destinationContextFromQuery.placeSlug,
    });
  }, [
    branding?.brandName,
    destinationContextFromQuery.destinationName,
    destinationContextFromQuery.destinationSlug,
    destinationContextFromQuery.placeAddress,
    destinationContextFromQuery.placeAddressNumber,
    destinationContextFromQuery.placeCity,
    destinationContextFromQuery.placeDistrict,
    destinationContextFromQuery.placeLat,
    destinationContextFromQuery.placeLng,
    destinationContextFromQuery.placeName,
    destinationContextFromQuery.placeSlug,
    destinationContextFromQuery.placeState,
    destinationContextFromQuery.placeZipCode,
    storeAddress,
    storeCoords?.lat,
    storeCoords?.lng,
    storeName,
  ]);
  const resolvedWhatsApp = useMemo(() => {
    const raw = storePhone || WHATSAPP_NUMBER;
    const digits = (raw || '').toString().replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  }, [storePhone]);

  const openWhatsAppUrl = (phoneValue: string, message?: string) => {
    const phone = String(phoneValue || '').replace(/\D/g, '');
    if (!phone) return;
    const webUrl = message
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?phone=${phone}`;

    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/browser')
        .then(({ Browser }) => Browser.open({ url: webUrl }))
        .catch(() => window.open(webUrl, '_blank', 'noopener,noreferrer'));
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

  const storeUrl =
    storeSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/${storeSlug}`
      : '';

  const todayHoursLabel = useMemo(() => {
    if (!openingHours?.length) return '';
    return formatOpeningHoursForDay(openingHours, new Date().getDay(), {
      closedLabel: 'Fechado hoje',
      openAllDayLabel: '24 horas',
    });
  }, [openingHours]);
  const todayClosingLabel = useMemo(() => getCurrentClosingTimeLabel(openingHours), [openingHours]);
  const weeklyHoursRows = useMemo(() => {
    const normalized = normalizeOpeningHours(openingHours);
    const today = new Date().getDay();
    return normalized.map((entry) => {
      const label = WEEKDAY_LABELS[entry.day] || `Dia ${entry.day}`;
      const value = formatOpeningHoursForDay([ entry ], entry.day, {
        closedLabel: 'Fechado',
        openAllDayLabel: '24 horas',
      });
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
  const storefrontContextKey = useMemo(() => {
    if (isStoreAdmin) {
      const storeKey = String(user?.store?.slug || storeSlug || '').trim() || 'store';
      const userKey = String(user?.user?.id || user?.user?.email || '').trim() || 'operator';
      return `store-admin:${storeKey}:${userKey}`;
    }
    if (customerSession?.token) {
      const customerKey = String(customerSession?.user?.id || customerSession?.user?.email || '').trim() || 'customer';
      return `store-customer:${customerKey}`;
    }
    return `store-guest:${String(storeSlug || '').trim() || 'guest'}`;
  }, [
    customerSession?.token,
    customerSession?.user?.email,
    customerSession?.user?.id,
    isStoreAdmin,
    storeSlug,
    user?.store?.slug,
    user?.user?.email,
    user?.user?.id,
  ]);
  const adminRoleLabel =
    [ 'ADMIN', 'LOJISTA' ].includes(String(user?.user?.role || '').toUpperCase())
      ? 'Administrador da loja'
      : 'Operador da loja';
  const adminUserRole = String(user?.user?.role || '').toUpperCase();
  const isOperatorStoreUser = adminUserRole === 'OPERATOR';
  const isNativeRuntime = Capacitor.isNativePlatform();
  const showAdminWebReturnBar = isStoreAdmin && !isNativeRuntime && view !== 'menu';
  const showClientWebBottomNav = !isNativeRuntime && !isStoreAdmin && view === 'menu';
  const showClientWebCheckoutContext = !isNativeRuntime && !isStoreAdmin && (view === 'cart' || view === 'success');
  const showPublicStoreAppHeader = !isStoreAdmin && [ 'cart', 'success' ].includes(String(view || ''));
  const [publicStoreHeaderScrolled, setPublicStoreHeaderScrolled] = useState(false);
  const publicStoreHeaderIsSolid = view !== 'menu' || publicStoreHeaderScrolled;
  const publicStoreHeaderTitle =
    view === 'cart'
      ? 'Revisar pedido'
      : view === 'success'
      ? 'Pedido enviado'
      : publicStoreHeaderIsSolid
      ? (storeName || branding?.brandName || 'Loja')
      : 'Pedido online';
  const publicStoreHeaderEyebrow = 'Já no Caminho';
  const publicStoreHeaderRight =
    view === 'menu' && publicStoreHeaderIsSolid ? (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-[0_12px_22px_-20px_rgba(21,58,76,0.38)] ${
        storeOpenNow
          ? 'border-emerald-200 bg-emerald-50/88 text-emerald-700'
          : 'border-amber-200 bg-amber-50/88 text-amber-700'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${storeOpenNow ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {storeOpenNow ? 'Aberto' : 'Fechado'}
      </span>
    ) : null;
  const publicStoreHeaderSubtitle =
    view === 'menu' && !publicStoreHeaderIsSolid
      ? (storeName || branding?.brandName || 'Vitrine e pedidos')
      : view === 'cart'
      ? 'Confira sua sacola'
      : view === 'success'
      ? 'Acompanhe o andamento'
      : storeOpenNow
      ? 'Vitrine e pedidos'
      : 'Loja fechada agora';
  const publicStoreHeaderPadding = showPublicStoreAppHeader
    ? 'pt-[calc(env(safe-area-inset-top)+4.35rem)] sm:pt-[calc(env(safe-area-inset-top)+4.9rem)]'
    : '';
  const handlePublicStoreHeaderBack = useCallback(() => {
    if (view === 'cart' || view === 'success') {
      setView('menu');
      return;
    }
    if (activeTab !== 'products') {
      changeTab('products');
      return;
    }
    navigateBackOrFallback(navigate, '/hub');
  }, [navigate, view, activeTab, changeTab]);
  useEffect(() => {
    if (!showPublicStoreAppHeader) {
      setPublicStoreHeaderScrolled(false);
      return;
    }

    if (view !== 'menu') {
      setPublicStoreHeaderScrolled(true);
      return;
    }

    let frame = 0;
    const updateHeaderState = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setPublicStoreHeaderScrolled((prev) => {
        const next = y > 72;
        return prev === next ? prev : next;
      });
    };
    const handleScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateHeaderState);
    };

    updateHeaderState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showPublicStoreAppHeader, view]);
  const normalizedRole = String(user?.user?.role || user?.role || '').toLowerCase();
  const isProfessionalCheckoutUser = isStoreAdmin && [
    'admin',
    'operator',
    'lojista',
    'store_owner',
    'super_admin',
    'motoboy',
    'entregador',
  ].includes(normalizedRole);
  const hasAdminPrintAccess = isStoreAdmin && normalizedRole === 'admin';
  const canUseAdminPrintFlow = isStoreAdmin;
  const adminStoreName = String(user?.store?.name || storeName || branding?.brandName || 'Minha loja').trim() || 'Minha loja';
  const adminStoreLogo = resolveAssetUrl(String(user?.store?.settings?.logoUrl || branding?.logoUrl || '')) || '';
  const adminOperatorName = String(user?.user?.fullName || user?.user?.name || '').trim();
  const adminOperatorEmail = String(user?.user?.email || '').trim();
  const adminSubscriptionStatus = String(user?.subscription?.status || '').toUpperCase();
  const adminPlanName = String(user?.subscription?.plan?.name || '').toLowerCase();
  const adminIsVip = Boolean(user?.store?.settings?.planExempt || user?.subscription?.planExempt);
  const canUseStoreMotoboys = Boolean(
    adminIsVip ||
      user?.features?.motoboyManagement ||
      adminSubscriptionStatus === 'TRIAL' ||
      adminPlanName.includes('pro') ||
      adminPlanName.includes('vip')
  );
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSlow, setCheckoutSlow] = useState(false);
  const checkoutLockRef = useRef(false);
  const checkoutSlowTimerRef = useRef(null);
  const clearCheckoutSlowTimer = useCallback(() => {
    if (checkoutSlowTimerRef.current) {
      window.clearTimeout(checkoutSlowTimerRef.current);
      checkoutSlowTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCheckoutSlowTimer(), [clearCheckoutSlowTimer]);

  const cartPricing = useMemo(() => getCartPricing(cart), [cart]);
  const validCartItems = useMemo(
    () => Object.values(cart).filter((item: any) => Number(item?.qty || 0) > 0),
    [cart]
  );
  const cartItemsCount = useMemo(
    () => validCartItems.reduce((acc: number, item: any) => acc + Number(item?.qty || 0), 0),
    [validCartItems]
  );
  const clearCheckoutDraft = useCallback(() => {
    try {
      localStorage.removeItem(checkoutDraftStorageKey);
    } catch {
      // localStorage can fail in restricted webviews.
    }
  }, [checkoutDraftStorageKey]);
  const persistCheckoutDraft = useCallback((viewOverride?: string) => {
    if (!storeSlug || cartItemsCount <= 0) return false;
    try {
      const draft = createStoreCheckoutDraft({
        cart,
        customer,
        paymentMethod,
        deliveryMode,
        selectedPostalServiceCode,
        view: viewOverride || view,
        context: checkoutDraftContext,
      });
      if (!draft) return false;
      localStorage.setItem(checkoutDraftStorageKey, JSON.stringify(draft));
      return true;
    } catch {
      return false;
    }
  }, [
    cart,
    cartItemsCount,
    checkoutDraftContext,
    checkoutDraftStorageKey,
    customer,
    deliveryMode,
    paymentMethod,
    selectedPostalServiceCode,
    storeSlug,
    view,
  ]);
  const cartItemsTotal = cartPricing.discountedSubtotal;
  const suggestedProducts = useMemo(
    () => products.filter((p: any) => !cart[p.id] && p.active !== false).slice(0, 10),
    [products, cart]
  );
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
  const availablePaymentMethods = useMemo(() => {
    const methods = resolveCheckoutPaymentMethods(paymentSummary, isProfessionalCheckoutUser && !isPostalDelivery);
    return isPostalDelivery
      ? methods.filter((method) => isPostalPrepaidPaymentMethod(method.id))
      : methods;
  }, [paymentSummary, isProfessionalCheckoutUser, isPostalDelivery]);
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

  useEffect(() => {
    if (!availablePaymentMethods.length) return;
    const nextPaymentMethod = resolveCheckoutPaymentSelection(
      paymentMethod,
      availablePaymentMethods,
      isProfessionalCheckoutUser && !isPostalDelivery
    );
    if (nextPaymentMethod === paymentMethod) return;
    setPaymentMethod(nextPaymentMethod);
  }, [availablePaymentMethods, isProfessionalCheckoutUser, paymentMethod]);

  useEffect(() => {
    if (!storeSlug) return;
    if (restoredCheckoutDraftKeysRef.current[checkoutDraftStorageKey]) return;
    restoredCheckoutDraftKeysRef.current[checkoutDraftStorageKey] = true;

    try {
      const draft = normalizeStoreCheckoutDraft(localStorage.getItem(checkoutDraftStorageKey));
      if (!draft) {
        localStorage.removeItem(checkoutDraftStorageKey);
        return;
      }

      setCart((prev: Record<string, any>) => {
        const hasCurrentItems = Object.values(prev || {}).some((item: any) => Number(item?.qty || 0) > 0);
        return hasCurrentItems ? prev : draft.cart;
      });
      setCustomer((prev: Record<string, any>) => ({
        ...prev,
        ...(draft.customer || {}),
      }));
      if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
      if (draft.deliveryMode) setDeliveryMode(draft.deliveryMode as any);
      setSelectedPostalServiceCode(draft.selectedPostalServiceCode || '');
      setView('cart');
      showToast('Pedido em andamento restaurado neste aparelho.', 'success', { durationMs: 2600 });
    } catch {
      try {
        localStorage.removeItem(checkoutDraftStorageKey);
      } catch {
        // no-op
      }
    }
  }, [checkoutDraftStorageKey, showToast, storeSlug]);

  useEffect(() => {
    if (!storeSlug) return;
    if (!restoredCheckoutDraftKeysRef.current[checkoutDraftStorageKey]) return;
    if (cartItemsCount > 0) {
      persistCheckoutDraft(view === 'success' ? 'cart' : view);
      return;
    }
    if (view === 'cart') {
      clearCheckoutDraft();
    }
  }, [
    cartItemsCount,
    checkoutDraftStorageKey,
    clearCheckoutDraft,
    persistCheckoutDraft,
    storeSlug,
    view,
  ]);
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
      ? `Você pode explorar a vitrine agora, mas os pedidos desse condomínio abrem em ${startsLabel}.`
      : 'Você pode explorar a vitrine agora, mas os pedidos desse condomínio ainda não foram liberados.';
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
  const preferredCustomerCoords = useMemo(() => {
    const customerLat = getNumeric(customer?.lat);
    const customerLng = getNumeric(customer?.lng);
    if (customerLat !== null && customerLng !== null) {
      return { lat: customerLat, lng: customerLng };
    }
    const preferredAddress =
      customerAddresses.find((item: any) => item?.isDefault) ||
      customerAddresses[0] ||
      null;
    const preferredLat = getNumeric(preferredAddress?.lat);
    const preferredLng = getNumeric(preferredAddress?.lng);
    if (preferredLat !== null && preferredLng !== null) {
      return { lat: preferredLat, lng: preferredLng };
    }
    return null;
  }, [customer?.lat, customer?.lng, customerAddresses]);
  const pickupDistanceFromHubState = useMemo(() => {
    const raw = getNumeric((location.state as any)?.hubDistanceKm);
    return raw !== null && raw >= 0 ? Number(raw.toFixed(1)) : null;
  }, [location.state]);
  const pickupDistanceKm = useMemo(() => {
    if (customer.type !== 'pickup') return null;
    if (storeCoords && preferredCustomerCoords) {
      const distance = haversineDistanceKm(storeCoords, preferredCustomerCoords);
      if (distance !== null && Number.isFinite(distance)) {
        return Number(distance.toFixed(1));
      }
    }
    return pickupDistanceFromHubState;
  }, [customer.type, haversineDistanceKm, pickupDistanceFromHubState, preferredCustomerCoords, storeCoords]);
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
      if (customer.type === 'delivery' && !isPostalDelivery) {
        const normalizedStoreCity = normalizeGeoText(storeCity);
        const normalizedStoreState = normalizeGeoText(storeState);
        const normalizedCustomerCity = normalizeGeoText(customer.city || '');
        const normalizedCustomerState = normalizeGeoText(customer.state || '');
        if (!normalizedStoreCity || !normalizedStoreState) {
          return { blocked: true, reason: 'A cidade de atendimento da loja ainda não foi configurada.' };
        }
        if (!normalizedCustomerCity || !normalizedCustomerState) {
          return { blocked: true, reason: 'Informe cidade e estado do endereço para validar a entrega.' };
        }
        if (normalizedStoreCity !== normalizedCustomerCity || normalizedStoreState !== normalizedCustomerState) {
          return { blocked: true, reason: 'Esta loja atende entregas apenas na cidade da operação até configurar o raio.' };
        }
      }
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
  }, [customer.number, customer.type, customer.cep, customer.city, customer.state, deliveryCheck.status, deliveryRadiusValue, storeCoords, isPostalDelivery, selectedPostalService, storeCity, storeState]);

  const reservationValidation = useMemo(() => {
    if (customer.type !== 'reservation') return { blocked: false, reason: '' };
    const raw = customer.scheduledFor;
    if (!raw || !String(raw).trim()) {
      return { blocked: true, reason: 'Escolha um horário futuro para a reserva.' };
    }
    const ts = new Date(raw).getTime();
    if (!Number.isFinite(ts)) {
      return { blocked: true, reason: 'Escolha um horário futuro para a reserva.' };
    }
    if (ts <= Date.now()) {
      return { blocked: true, reason: 'Escolha um horário futuro para a reserva.' };
    }
    return { blocked: false, reason: '' };
  }, [customer.type, customer.scheduledFor]);

  const postalPaymentValidation = useMemo(() => {
    if (!isPostalDelivery) return { blocked: false, reason: '' };
    if (!availablePaymentMethods.some((method) => isPostalPrepaidPaymentMethod(method.id))) {
      return {
        blocked: true,
        reason: 'Envio postal exige pagamento online. Ative Pix ou cartão online nesta loja.',
      };
    }
    const payment = resolveOrderPaymentMethodForCheckout(paymentMethod, false);
    if (!isPostalPrepaidPaymentMethod(payment)) {
      return {
        blocked: true,
        reason: 'Escolha Pix ou cartão online para finalizar envio postal.',
      };
    }
    return { blocked: false, reason: '' };
  }, [availablePaymentMethods, isPostalDelivery, paymentMethod]);

  const normalizeDeliveryCacheKey = useCallback((value: string) => {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }, []);

  const getDeliveryAddressCacheKey = useCallback((address: string) => {
    if (!storeSlug) return '';
    const normalized = normalizeDeliveryCacheKey(address);
    return normalized ? `delivery:validation:${storeSlug}:${normalized}` : '';
  }, [normalizeDeliveryCacheKey, storeSlug]);

  const validatedDeliverySignatureRef = useRef('');

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

  const syncCartItemsWithFreshProducts = (freshProducts: any[] = []) => {
    if (!Array.isArray(freshProducts) || freshProducts.length === 0) return;
    const byId = new Map<string, any>();
    freshProducts.forEach((product: any) => {
      const productId = String(product?.id || product?.productId || '').trim();
      if (productId) byId.set(productId, product);
    });
    if (!byId.size) return;

    setCart((previous: Record<string, any>) => {
      let changed = false;
      const nextCart = Object.entries(previous || {}).reduce((acc: Record<string, any>, [key, entry]: [string, any]) => {
        const productId = String(entry?.id || entry?.productId || '').trim();
        const fresh = productId ? byId.get(productId) : null;
        if (!fresh || fresh.active === false) {
          acc[key] = entry;
          return acc;
        }

        const selectedModifiers = Array.isArray(entry?.selectedModifiers) ? entry.selectedModifiers : [];
        const nextUnitPrice = Number((resolveItemPrice(fresh) + getModifiersTotal(selectedModifiers)).toFixed(2));
        const syncedEntry = {
          ...entry,
          name: fresh.name ?? entry.name,
          desc: fresh.desc ?? fresh.description ?? entry.desc,
          description: fresh.description ?? fresh.desc ?? entry.description,
          imageUrl: fresh.imageUrl ?? entry.imageUrl,
          price: nextUnitPrice,
          originalPrice: fresh.price ?? entry.originalPrice,
          promoActive: Boolean(fresh.promoActive),
          promoPrice: fresh.promoPrice ?? null,
          bundlePromoActive: Boolean(fresh.bundlePromoActive),
          bundlePromoQty: fresh.bundlePromoQty ?? null,
          bundlePromoPrice: fresh.bundlePromoPrice ?? null,
          manageStock: Boolean(fresh.manageStock),
          stockQuantity: Number(fresh.stockQuantity ?? entry.stockQuantity ?? 0),
          lowStockAlert: fresh.lowStockAlert ?? entry.lowStockAlert,
          active: fresh.active ?? entry.active,
        };

        if (
          syncedEntry.name !== entry.name ||
          syncedEntry.imageUrl !== entry.imageUrl ||
          Number(syncedEntry.price || 0) !== Number(entry.price || 0) ||
          Number(syncedEntry.stockQuantity || 0) !== Number(entry.stockQuantity || 0) ||
          Boolean(syncedEntry.promoActive) !== Boolean(entry.promoActive) ||
          Number(syncedEntry.promoPrice || 0) !== Number(entry.promoPrice || 0) ||
          Boolean(syncedEntry.bundlePromoActive) !== Boolean(entry.bundlePromoActive)
        ) {
          changed = true;
        }

        acc[key] = syncedEntry;
        return acc;
      }, {});

      return changed ? nextCart : previous;
    });
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
    clearAllCustomerSessions();
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
        lat: getNumeric(address?.lat),
        lng: getNumeric(address?.lng),
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

  const refreshCustomerData = async (baseSession = customerSession) => {
    try {
      const [me, addresses, orders] = await Promise.all([
        customerAccountService.me(),
        customerAccountService.listAddresses(),
        customerAccountService.listOrders(),
      ]);
      const nextSession = { ...(baseSession || customerSession || {}), user: me };
      const nextAddresses = Array.isArray(addresses) ? addresses : [];
      const nextOrders = Array.isArray(orders) ? orders : [];
      persistCustomerSession(nextSession);
      setCustomerAddresses(nextAddresses);
      setCustomerOrders(nextOrders);
      const preferred =
        nextAddresses.find((item: any) => item?.isDefault) ||
        nextAddresses[0] ||
        null;
      hydrateCustomerFromAddress(preferred || null);
      return { me, addresses: nextAddresses, orders: nextOrders };
    } catch {
      persistCustomerSession(null);
      setCustomerAddresses([]);
      setCustomerOrders([]);
      return null;
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
    if (storeOrderingEnabled || isStoreAdmin) return;
    setCart({});
    if (view === 'cart' || view === 'success') {
      setView('menu');
    }
  }, [isStoreAdmin, storeOrderingEnabled, view]);

  useEffect(() => {
    syncAdminSession(auth);
  }, [auth, syncAdminSession]);

  useEffect(() => {
    syncAdminSession();
    const handleAdminSessionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      syncAdminSession(customEvent?.detail ?? null);
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'adminSession') {
        syncAdminSession();
      }
    };
    window.addEventListener(ADMIN_SESSION_EVENT, handleAdminSessionUpdated as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(ADMIN_SESSION_EVENT, handleAdminSessionUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncAdminSession]);

  useEffect(() => {
    if (isStoreAdmin) return;
    syncCustomerSessionSnapshot();
    const handleCustomerSessionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      syncCustomerSessionSnapshot(customEvent?.detail ?? null);
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'customerSession' || event.key === customerSessionStorageKey) {
        syncCustomerSessionSnapshot();
      }
    };
    window.addEventListener(CUSTOMER_SESSION_EVENT, handleCustomerSessionUpdated as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CUSTOMER_SESSION_EVENT, handleCustomerSessionUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [customerSessionStorageKey, isStoreAdmin, syncCustomerSessionSnapshot]);

  useEffect(() => {
    if (isStoreAdmin) {
      setCustomerSession(null);
      setCustomerAddresses([]);
      setCustomerOrders([]);
      setShowCustomerAccount(false);
      setCustomerAuthCheckoutPrompt(false);
      setCustomerCheckoutResume(null);
      setCustomerVerifyPrompt(null);
      setCustomerVerifyCode('');
      setCustomerAccountError('');
      setCustomerAccountNotice('');
      setRecentPublicOrders([]);
      setLastPublicOrderId('');
      return;
    }

    syncCustomerSessionSnapshot();

    const savedCustomers = localStorage.getItem(customersStorageKey);
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers) || []);
      } catch (error) {
        console.error('Falha ao carregar clientes salvos', error);
      }
    }

    const savedCheckoutCustomer = localStorage.getItem(checkoutCustomerStorageKey);
    if (savedCheckoutCustomer && !customerSession?.token) {
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
  }, [isStoreAdmin, customersStorageKey, checkoutCustomerStorageKey, customerSessionStorageKey, customerSession?.token, syncCustomerSessionSnapshot]);

  useEffect(() => {
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
        setStoreSettingsLoaded(false);
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
            minOrderValue: Number(data.settings?.minOrderValue ?? 20),
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
          const parsedLead = Number(data.settings?.reservationLeadTimeHours);
          setReservationLeadTimeHours(Number.isFinite(parsedLead) && parsedLead > 0 ? parsedLead : null);
          setStorePhone(data.owner?.phone || '');
          setStoreAddress(data.settings?.address || data.owner?.address || '');
          setStoreDescription(data.settings?.description || '');
          setStoreName(data.name || '');
          setStoreCity(String(data.settings?.city || '').trim());
          setStoreState(String(data.settings?.state || '').trim().toUpperCase());
          setStoreSegment(String(data.settings?.segment || 'outros').toLowerCase());
          setPromoMessage(data.settings?.promoMessage || '');
          setStorePixKey(data.settings?.pixKey || '');
          setPaymentSummary(buildPublicPaymentSummary(data));
          setDeliveryRadiusKm(data.settings?.deliveryRadiusKm ?? '');
          setDeliveryFee(data.settings?.deliveryFee ?? '');
          setPostalEnabled(Boolean(data.settings?.postalEnabled));
          setPostalOriginZip(String(data.settings?.postalOriginZip || ''));
          if (Number.isFinite(Number(data.settings?.lat)) && Number.isFinite(Number(data.settings?.lng))) {
            const nextCoords = { lat: Number(data.settings.lat), lng: Number(data.settings.lng) };
            setStoreCoords(nextCoords);
            try {
              localStorage.setItem(`store:coords:${storeSlug}`, JSON.stringify(nextCoords));
            } catch {
              // ignore cache write failure
            }
          }
          setStoreOpenNow(typeof data.openNow === 'boolean' ? data.openNow : isStoreOpenNow(normalizedHours));
          setStoreSubscription(data.subscription || null);
          setStorePlanExempt(Boolean(data.settings?.planExempt || data.subscription?.planExempt));
          setStoreOrderingEnabled(data.settings?.isOrderingEnabled !== false);
          setStoreReviewSummary(data.reviewSummary || null);
          applyStoreMeta(data);
        }
      } catch (error) {
        console.error('Erro ao carregar loja', {
          error,
          storeSlug,
          isStoreAdmin,
          hasAdminSession: Boolean(user?.token),
          hasCustomerSession: Boolean(customerSession?.token),
        });
        if (!silent) {
          setBranding((prev) => ({
            ...prev,
            espetoId: storeSlug,
            brandName: prev.brandName || 'Espetaria',
          }));
        }
      } finally {
        setStoreSettingsLoaded(true);
        if (!silent) {
          setIsLoading(false);
        }
      }
    };

    const PRODUCTS_CACHE_KEY = `products_cache:${storeSlug}`;
    const readProductsCache = () => {
      const prefetched = productService.peekPublicBySlug(storeSlug);
      if (Array.isArray(prefetched) && prefetched.length) {
        return { data: prefetched, ts: Date.now() };
      }

      try {
        const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const ts = Number(parsed?.ts || 0);
        const data = Array.isArray(parsed?.data) ? parsed.data : [];
        if (!data.length) return null;
        if (ts && Date.now() - ts > STOREFRONT_PRODUCTS_CACHE_MAX_AGE_MS) {
          localStorage.removeItem(PRODUCTS_CACHE_KEY);
          return null;
        }
        return { data, ts };
      } catch {
        return null;
      }
    };
    const writeProductsCache = (list: any[]) => {
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ data: list, ts: Date.now() }));
      } catch {
        // storage cheio ou indisponivel
      }
    };
    const loadProducts = async ({ silent = false } = {}) => {
      const requestId = productRequestIdRef.current + 1;
      productRequestIdRef.current = requestId;
      const isLatestRequest = () => productRequestIdRef.current === requestId;
      const cached = readProductsCache();
      const hasCachedProducts = Boolean(cached?.data?.length);

      if (!silent) {
        setProductsLoadError('');
        setProductsSlow(false);
        if (hasCachedProducts) {
          setProducts(cached.data);
          setProductsLoading(false);
        } else {
          setProducts([]);
          setProductsLoading(true);
        }
      }

      const slowTimer = window.setTimeout(() => {
        if (isLatestRequest() && !hasCachedProducts) {
          setProductsSlow(true);
        }
      }, STOREFRONT_PRODUCTS_SLOW_FEEDBACK_MS);

      try {
        const list = (await productService.listPublicBySlug(storeSlug, {
          forceRefresh: true,
          timeoutMs: STOREFRONT_PRODUCTS_REFRESH_TIMEOUT_MS,
        })) || [];
        if (!isLatestRequest()) return;
        setProducts(list);
        syncCartItemsWithFreshProducts(list);
        setProductsLoadError('');
        writeProductsCache(list);
      } catch (error) {
        if (!isLatestRequest()) return;
        console.error('Erro ao carregar produtos públicos da loja', {
          error,
          storeSlug,
          isStoreAdmin,
          hasAdminSession: Boolean(user?.token),
          hasCustomerSession: Boolean(customerSession?.token),
        });
        const fallback = cached || readProductsCache();
        if (fallback?.data?.length) {
          setProducts(fallback.data);
          setProductsLoadError('');
        } else {
          setProductsLoadError('Não deu para carregar a vitrine agora. Verifique sua internet e tente novamente.');
        }
      } finally {
        window.clearTimeout(slowTimer);
        if (isLatestRequest()) {
          setProductsLoading(false);
          setProductsSlow(false);
        }
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
    if (storeSlug && !isStoreAdmin) {
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
        loadProducts({ silent: true });
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
  }, [isStoreAdmin, productsRetryKey, publicOrderTtlMs, reorderTtlMs, storeSlug]);

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
      const nextName = sessionName || prevName;
      const nextPhone = sessionPhone || prevPhone;

      if (nextName === prevName && nextPhone === prevPhone) {
        return prev;
      }

      return {
        ...prev,
        name: nextName,
        phone: nextPhone,
      };
    });
    localStorage.removeItem(checkoutCustomerStorageKey);
  }, [checkoutCustomerStorageKey, customerSession?.user?.fullName, customerSession?.user?.phone]);

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
    // Cliente final nunca defaulta para mesa — a pill é oculta mas o tipo vazava na badge (auditoria 16/08)
    const customerPool = canUseAdminPrintFlow ? types : types.filter((t) => t !== 'table');
    const pool = customerPool.length ? customerPool : types;
    if (pool.includes('delivery')) return 'delivery';
    return pool[0];
  };

  useEffect(() => {
    if (!Array.isArray(orderTypes) || !orderTypes.length) return;
    const current = String(customer.type || '').trim();
    const currentInvalid =
      !orderTypes.includes(current) ||
      (!canUseAdminPrintFlow && Boolean(customerSession?.token) && current === 'table');
    if (!currentInvalid) return;
    const fallbackType = resolveDefaultOrderType(orderTypes);
    setCustomer((prev) => ({ ...prev, type: fallbackType }));
  }, [orderTypes, customer.type, canUseAdminPrintFlow, customerSession?.token]);

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

  // Poll Mercado Pago payment status while on success screen and payment is pending
  // Only for customer context — admin/lojista/entregador pay on-site, no online payment needed
  useEffect(() => {
    if (view !== 'success') return;
    if (isStoreAdmin || isCondominiumCheckout) return;
    if (!lastOrder?.id || !lastOrder?.onlinePayment) return;
    const ps = String(lastOrder?.paymentStatus || '').toUpperCase();
    if (ps === 'PAID' || ps === 'FAILED') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await orderService.getPublicById(lastOrder.id);
        const nextPs = String(data?.paymentStatus || '').toUpperCase();
        if (!cancelled && (nextPs === 'PAID' || nextPs === 'FAILED')) {
          setLastOrder((prev: any) => prev ? { ...prev, paymentStatus: nextPs } : prev);
          if (!cancelled && nextPs === 'PAID' && customerSession?.token) {
            setTimeout(() => navigate('/cliente/pedidos'), 2500);
          }
          if (!cancelled && nextPs === 'FAILED') {
            cancelled = true;
            showToast('PIX expirado ou pagamento recusado. Faça um novo pedido.', 'warning', { durationMs: 4000 });
            setTimeout(() => setView('menu'), 3000);
          }
        }
      } catch {}
    };

    const intervalId = setInterval(() => { void poll(); }, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [view, lastOrder?.id, lastOrder?.paymentStatus, lastOrder?.onlinePayment]);

  useEffect(() => {
    if (isStoreAdmin) {
      setLastPublicOrderId('');
    }
  }, [isStoreAdmin]);

  // storeCoords is set directly from store data load (line ~1210).
  // No need to reset on storeAddress change — coords come from the same API response.

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
    console.warn('Loja sem coordenadas persistidas para validar entrega.', { storeSlug, storeAddress });
  }, [storeAddress, storeCoords, storeSlug]);

  const validateDeliveryAddress = useCallback(async () => {
    if (customer.type !== 'delivery' || isPostalDelivery) {
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      validatedDeliverySignatureRef.current = '';
      return true;
    }

    if (!deliveryRadiusValue) {
      setDeliveryCheck({ status: 'ok', distanceKm: null, durationMin: null });
      validatedDeliverySignatureRef.current = '';
      return true;
    }

    if (!storeCoords?.lat || !storeCoords?.lng) {
      setDeliveryCheck({ status: 'error', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      validatedDeliverySignatureRef.current = '';
      return false;
    }

    const address = String(deliveryAddress || '').trim();
    const persistedLat = getNumeric(customer?.lat);
    const persistedLng = getNumeric(customer?.lng);
    const hasPersistedCoords = persistedLat !== null && persistedLng !== null;
    const hasManualCoords = Boolean(manualDeliveryCoords?.lat && manualDeliveryCoords?.lng);
    if (!address && !hasManualCoords && !hasPersistedCoords) {
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      validatedDeliverySignatureRef.current = '';
      return false;
    }

    const validationSignature = hasManualCoords
      ? `gps:${Number(manualDeliveryCoords?.lat)}:${Number(manualDeliveryCoords?.lng)}`
      : hasPersistedCoords
        ? `saved:${Number(persistedLat)}:${Number(persistedLng)}`
      : `address:${normalizeDeliveryCacheKey(address)}`;
    const normalizedStoreCity = normalizeGeoText(storeCity || '');
    const normalizedStoreState = normalizeGeoText(storeState || '');
    const normalizedCustomerCity = normalizeGeoText(customer.city || '');
    const normalizedCustomerState = normalizeGeoText(customer.state || '');
    const canFallbackByCity =
      Boolean(normalizedStoreCity && normalizedStoreState && normalizedCustomerCity && normalizedCustomerState) &&
      normalizedStoreCity === normalizedCustomerCity &&
      normalizedStoreState === normalizedCustomerState;

    setDeliveryCheck({ status: 'loading', distanceKm: null, durationMin: null });

    try {
      let coords = hasManualCoords
        ? manualDeliveryCoords
        : hasPersistedCoords
          ? { lat: Number(persistedLat), lng: Number(persistedLng) }
          : null;
      let cachedRoute: { distanceKm: number; durationMin: number | null } | null = null;
      const cacheKey = hasManualCoords || hasPersistedCoords ? '' : getDeliveryAddressCacheKey(address);

      if (!coords && cacheKey) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          if (cached?.coords?.lat && (cached?.coords?.lng || cached?.coords?.lon)) {
            coords = {
              lat: Number(cached.coords.lat),
              lng: Number(cached.coords.lng ?? cached.coords.lon),
            };
          }
          if (cached?.route?.distanceKm) {
            cachedRoute = {
              distanceKm: Number(cached.route.distanceKm),
              durationMin: cached.route.durationMin == null ? null : Number(cached.route.durationMin),
            };
          }
        } catch (error) {
          console.error('Falha ao ler cache de validação de entrega', error);
        }
      }

      if (!coords && !hasManualCoords) {
        const geo = await mapsService.geocode(address);
        coords = { lat: Number(geo.lat), lng: Number(geo.lng) };
      }

      if (!coords?.lat || !coords?.lng) {
        throw new Error('Não foi possível localizar o endereço informado.');
      }

      setDeliveryCoords(coords);
      let route = cachedRoute;
      if (!route || !Number.isFinite(Number(route.distanceKm))) {
        route = { distanceKm: haversineKm(storeCoords, coords), durationMin: null };
      }
      const nextStatus = route.distanceKm <= deliveryRadiusValue ? 'ok' : 'out';

      setDeliveryCheck({
        status: nextStatus,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin ?? null,
      });
      validatedDeliverySignatureRef.current = validationSignature;

      if (!hasManualCoords && !hasPersistedCoords && cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ coords, route }));
        } catch {
          // ignore cache write failure
        }
      }

      return nextStatus === 'ok';
    } catch (error) {
      console.error('Falha ao validar entrega', error);
      if (canFallbackByCity) {
        setDeliveryCheck({ status: 'ok', distanceKm: null, durationMin: null });
        validatedDeliverySignatureRef.current = validationSignature;
        showToast('Entrega validada pelo endereço da cidade da loja. A distância exata será confirmada na operação.', 'warning');
        return true;
      }
      setDeliveryCheck({ status: 'error', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      validatedDeliverySignatureRef.current = '';
      return false;
    }
  }, [
    customer.type,
    customer.city,
    customer.state,
    customer.lat,
    customer.lng,
    deliveryAddress,
    deliveryRadiusValue,
    getDeliveryAddressCacheKey,
    haversineKm,
    isPostalDelivery,
    manualDeliveryCoords,
    normalizeDeliveryCacheKey,
    showToast,
    storeCoords,
    storeCity,
    storeState,
  ]);

  const deliveryValidationSignature = useMemo(() => {
    if (customer.type !== 'delivery' || isPostalDelivery || !deliveryRadiusValue) return '';
    if (manualDeliveryCoords?.lat && manualDeliveryCoords?.lng) {
      return `gps:${Number(manualDeliveryCoords.lat)}:${Number(manualDeliveryCoords.lng)}`;
    }
    const persistedLat = getNumeric(customer?.lat);
    const persistedLng = getNumeric(customer?.lng);
    if (persistedLat !== null && persistedLng !== null) {
      return `saved:${Number(persistedLat)}:${Number(persistedLng)}`;
    }
    const normalized = normalizeDeliveryCacheKey(deliveryAddress || '');
    return normalized ? `address:${normalized}` : '';
  }, [customer.type, customer.lat, customer.lng, deliveryAddress, deliveryRadiusValue, isPostalDelivery, manualDeliveryCoords, normalizeDeliveryCacheKey]);

  useEffect(() => {
    if (customer.type !== 'delivery') {
      validatedDeliverySignatureRef.current = '';
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      return;
    }
    if (isPostalDelivery) {
      validatedDeliverySignatureRef.current = '';
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      return;
    }
    if (!deliveryRadiusValue) {
      validatedDeliverySignatureRef.current = '';
      setDeliveryCheck({ status: 'ok', distanceKm: null, durationMin: null });
      return;
    }
    if (!deliveryValidationSignature) {
      validatedDeliverySignatureRef.current = '';
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
      return;
    }
    if (
      validatedDeliverySignatureRef.current &&
      validatedDeliverySignatureRef.current !== deliveryValidationSignature
    ) {
      validatedDeliverySignatureRef.current = '';
      setDeliveryCheck({ status: 'idle', distanceKm: null, durationMin: null });
      setDeliveryCoords(null);
    }
  }, [customer.type, deliveryRadiusValue, deliveryValidationSignature, isPostalDelivery]);

  useEffect(() => {
    if (!manualDeliveryCoords) return;
    const rawAddress = String(deliveryAddress || '').toLowerCase();
    if (!rawAddress.includes('localização atual')) {
      setManualDeliveryCoords(null);
    }
  }, [deliveryAddress, manualDeliveryCoords]);

  // Auto-validate delivery address when address is complete and status is idle
  useEffect(() => {
    if (customer.type !== 'delivery' || isPostalDelivery) return;
    if (deliveryCheck?.status !== 'idle') return;
    if (!deliveryValidationSignature) return;
    if (validatedDeliverySignatureRef.current === deliveryValidationSignature) return;
    const hasStructuredAddress = Boolean(
      String(customer.street || '').trim() &&
      String(customer.city || '').trim() &&
      String(customer.state || '').trim()
    );
    const hasCoords = Boolean(
      manualDeliveryCoords?.lat ||
      (getNumeric(customer?.lat) !== null && getNumeric(customer?.lng) !== null)
    );
    if (!hasStructuredAddress && !hasCoords) return;
    const timer = setTimeout(() => { validateDeliveryAddress(); }, 400);
    return () => clearTimeout(timer);
  }, [customer.type, customer.street, customer.city, customer.state, customer.lat, customer.lng, deliveryCheck?.status, deliveryValidationSignature, isPostalDelivery, manualDeliveryCoords, validateDeliveryAddress]);

  useEffect(() => {
    if (customer.type !== 'delivery') {
      setDeliveryMode('distance');
      setPostalQuote(null);
      setSelectedPostalServiceCode('');
      return;
    }
    if (!storeSettingsLoaded) return;
    if (!postalEnabled && deliveryMode !== 'distance') {
      setDeliveryMode('distance');
    }
  }, [customer.type, deliveryMode, postalEnabled, storeSettingsLoaded]);

  useEffect(() => {
    if (!isPostalDelivery) return;
    postalQuoteAutoKeyRef.current = '';
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
          const route = {
            distanceKm: haversineKm(storeCoords, coords),
            durationMin: null,
          };
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

  const handleCalculatePostalQuote = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!storeSlug) {
      if (!silent) showToast('Loja não especificada.', 'error');
      return false;
    }
    const destinationZip = String(customer.cep || '').replace(/\D/g, '');
    if (destinationZip.length !== 8) {
      if (!silent) showToast('Informe um CEP válido para cotar envio postal.', 'warning');
      return false;
    }
    if (!validCartItems.length) {
      if (!silent) showToast('Adicione ao menos 1 item para cotar frete postal.', 'warning');
      return false;
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
      if (!silent) showToast('Frete postal calculado.', 'success');
      return services.length > 0;
    } catch (error: any) {
      const message =
        error?.details?.message ||
        error?.error?.details?.message ||
        error?.error?.message ||
        error?.message ||
        'Não foi possível calcular o frete postal agora.';
      setPostalQuote(null);
      setSelectedPostalServiceCode('');
      if (!silent) showToast(message, 'error');
      return false;
    } finally {
      setPostalQuoteLoading(false);
    }
  }, [customer.cep, storeSlug, validCartItems, showToast]);

  useEffect(() => {
    if (!postalEnabled || !isPostalDelivery || postalQuoteLoading || selectedPostalService) return;
    const destinationZip = String(customer.cep || '').replace(/\D/g, '');
    if (!storeSlug || destinationZip.length !== 8 || !validCartItems.length) return;
    const itemsSignature = validCartItems
      .map((item: any) => `${String(item?.id || item?.productId || '')}:${Number(item?.qty || 1)}`)
      .join('|');
    const quoteKey = `${storeSlug}:${destinationZip}:${itemsSignature}`;
    if (!itemsSignature || postalQuoteAutoKeyRef.current === quoteKey) return;
    postalQuoteAutoKeyRef.current = quoteKey;
    void handleCalculatePostalQuote({ silent: true });
  }, [
    customer.cep,
    handleCalculatePostalQuote,
    isPostalDelivery,
    postalEnabled,
    postalQuoteLoading,
    selectedPostalService,
    storeSlug,
    validCartItems,
  ]);

  const updateCart = (item, qty, options) => {
    const catalogItem = products.find((product: any) => String(product?.id || '') === String(item?.id || '')) || item;
    const cookingPoint = options?.cookingPoint ?? item?.cookingPoint;
    const passSkewer = Boolean(options?.passSkewer ?? item?.passSkewer);
    const selectedModifiers = normalizeSelectedModifiers(
      options?.selectedModifiers ?? item?.selectedModifiers ?? [],
      item?.modifiers || []
    );
    const cartKey = `${item.id}:${cookingPoint || ''}:${passSkewer ? '1' : '0'}:${getModifiersSignature(selectedModifiers)}`;
    setCart((previous) => {
      const manageStock = Boolean(catalogItem?.manageStock ?? item?.manageStock);
      const stockQuantityRaw = Number(catalogItem?.stockQuantity ?? item?.stockQuantity ?? 0);
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
          manageStock,
          stockQuantity,
          lowStockAlert: catalogItem?.lowStockAlert ?? item?.lowStockAlert,
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
    clearCheckoutDraft();
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
    const addressFields = [ 'address', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state' ];
    const addressChanged = addressFields.some(
      (field) => String(customer?.[field] || '').trim() !== String(nextCustomer?.[field] || '').trim()
    );
    if (addressChanged) {
      updatedCustomer.lat = null;
      updatedCustomer.lng = null;
    }
    if (!isStoreAdmin && nextCustomer.type === 'table') {
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

  const validateCartStockBeforeCheckout = async () => {
    if (!storeSlug || isDemo) return true;

    if (Array.isArray(products) && products.length) {
      const localResult = reconcileCartStock(cart, products);
      if (!localResult.ok) {
        setCart(localResult.nextCart);
        showErrorNotice(localResult.message || 'Revise o carrinho: um item não possui estoque suficiente.');
        return false;
      }
    }

    const needsFreshStockCheck = validCartItems.some((item: any) => Boolean(item?.manageStock));
    if (!needsFreshStockCheck || canUseAdminPrintFlow) {
      return true;
    }

    try {
      const freshProducts = (await productService.listPublicBySlug(storeSlug, { forceRefresh: true })) || [];
      if (Array.isArray(freshProducts)) {
        setProducts(freshProducts);
        try {
          localStorage.setItem(`products_cache:${storeSlug}`, JSON.stringify({ data: freshProducts, ts: Date.now() }));
        } catch {
          // ignore storage limits
        }
        const result = reconcileCartStock(cart, freshProducts);
        if (!result.ok) {
          setCart(result.nextCart);
          showErrorNotice(result.message || 'Revise o carrinho: um item não possui estoque suficiente.');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Falha ao validar estoque antes do checkout', { error, storeSlug });
      showErrorNotice('Não foi possível validar o estoque agora. Tente novamente.');
      return false;
    }
  };

  const checkout = async (extra?: { cashTendered?: number | null; condominiumOrder?: any } | null) => {
    if (checkoutLockRef.current || checkoutLoading) return;
    checkoutLockRef.current = true;
    setCheckoutLoading(true);
    setCheckoutSlow(false);
    clearCheckoutSlowTimer();
    checkoutSlowTimerRef.current = window.setTimeout(() => {
      setCheckoutSlow(true);
    }, CHECKOUT_SLOW_FEEDBACK_MS);
    try {
    persistCheckoutDraft('cart');
    const latestAdminSession = !forcePublicStorefront && !isStoreAdmin && !customerSession?.token ? readAdminSessionSnapshot() : null;
    const recoveredStoreAdminSession = isOperationalSessionForStore(latestAdminSession, storeSlug);
    if (recoveredStoreAdminSession) {
      syncAdminSession(latestAdminSession);
    }
    const checkoutIsStoreAdmin = Boolean(isStoreAdmin || recoveredStoreAdminSession);
    const checkoutCanUseAdminPrintFlow = Boolean(canUseAdminPrintFlow || recoveredStoreAdminSession);
    const checkoutIsProfessionalCheckoutUser = Boolean(isProfessionalCheckoutUser || recoveredStoreAdminSession);
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
    const isStaffTableOrder = customer.type === 'table' && checkoutCanUseAdminPrintFlow;
    const normalizedTable = String(customer.table || '').trim();
    const effectiveCustomerName =
      String(customer.name || '').trim() ||
      String(customerSession?.user?.fullName || '').trim() ||
      (isStaffTableOrder && normalizedTable ? `Cliente Mesa ${normalizedTable}` : '');

    if (!validCartItems.length) {
      showToast('Adicione pelo menos 1 item para finalizar o pedido.', 'warning');
      return;
    }

    if (customer.type === 'reservation' && !isCondominiumOrder) {
      const raw = customer.scheduledFor;
      const ts = raw ? new Date(raw).getTime() : NaN;
      if (!Number.isFinite(ts) || ts <= Date.now()) {
        showToast('Escolha um horário futuro para a reserva.', 'warning');
        return;
      }
    }

    if (!checkoutIsStoreAdmin && !isDemo && !customerSession?.token) {
      const rememberedEmail = (() => {
        try {
          return String(localStorage.getItem(CUSTOMER_REMEMBER_EMAIL_KEY) || '').trim();
        } catch {
          return '';
        }
      })();
      setCustomerAuthCheckoutPrompt(true);
      setCustomerVerifyPrompt(null);
      setCustomerVerifyCode('');
      setCustomerAccountError('');
      setCustomerAccountNotice('');
      setCustomerAuthMode(rememberedEmail ? 'login' : 'register');
      setCustomerAuthForm((prev) => ({
        ...prev,
        fullName: prev.fullName || String(effectiveCustomerName || customer.name || '').trim(),
        phone: prev.phone || String(customer.phone || '').trim(),
        email: prev.email || rememberedEmail,
      }));
      setShowCustomerAccount(true);
      showToast('Entre ou crie sua conta para finalizar o pedido com segurança.', 'warning');
      return;
    }

    const requiresPhone = !customerSession?.token && !checkoutIsStoreAdmin;
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

    if (!(await validateCartStockBeforeCheckout())) {
      return;
    }

    const payment = resolveOrderPaymentMethodForCheckout(paymentMethod, checkoutIsProfessionalCheckoutUser && !isPostalDelivery);
    if (!isCondominiumOrder && customer.type === 'delivery' && isPostalDelivery && !isPostalPrepaidPaymentMethod(payment)) {
      showErrorNotice('Envio postal exige pagamento online. Escolha Pix ou cartão online.');
      return;
    }
    const cashTendered =
      payment === 'dinheiro' && extra?.cashTendered !== undefined && extra?.cashTendered !== null
        ? Number(extra.cashTendered)
        : null;

    const sanitizedPhone = customer.phone.replace(/\D/g, '');
    const sanitizedPhoneKey = sanitizedPhone.length >= 10 ? `+55${sanitizedPhone}` : '';
    const pixKey = payment === 'pix_loja' ? storePixKey : '';
    const customerNote = normalizeCustomerOrderNote(customer.customerNote);
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
      customerNote: customerNote || undefined,
      guestPushId: getOrCreateGuestPushId(),
      phone: customer.phone,
      address: isCondominiumOrder ? condominiumAddress : (deliveryAddress || customer.address),
      table: isCondominiumOrder ? undefined : customer.table,
      type: isCondominiumOrder ? 'pickup' : customer.type,
      scheduledFor:
        customer.type === 'reservation' && !isCondominiumOrder && customer.scheduledFor
          ? new Date(customer.scheduledFor).toISOString()
          : undefined,
      partySize:
        customer.type === 'reservation' && !isCondominiumOrder && customer.partySize
          ? Number(customer.partySize)
          : undefined,
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
      condominiumId: !isCondominiumOrder && customer.type === 'pickup' && myCondoPickup?.condominiumId
        ? myCondoPickup.condominiumId
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
        isPrinted: Boolean(checkoutCanUseAdminPrintFlow),
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
      clearCheckoutDraft();
      setCart({});
      setCustomer({ ...initialCustomer, name: String(customerSession?.user?.fullName || '').trim(), phone: String(customerSession?.user?.phone || '').trim() });
      setDeliveryMode('distance');
      setPostalQuote(null);
      setSelectedPostalServiceCode('');
      setPaymentMethod(resolveCheckoutPaymentSelection(defaultPaymentMethod, availablePaymentMethods, checkoutIsProfessionalCheckoutUser));
      setLastOrder({
        id: demoId,
        type: customer.type,
        payment,
        phone: sanitizedPhoneKey || customer.phone,
        pixKey,
        table: customer.table,
        customerName: effectiveCustomerName,
        customerNote,
        address: deliveryAddress || customer.address,
        total: orderTotal,
        items: printableItems,
        queueRank: null,
        createdAt: Date.now(),
      });
      if (checkoutCanUseAdminPrintFlow) {
        setShowPrintPrompt(true);
      }
      if (!customerSession?.token && !checkoutIsStoreAdmin) {
        localStorage.setItem(
          checkoutCustomerStorageKey,
          JSON.stringify({ name: effectiveCustomerName, phone: customer.phone })
        );
      } else {
        localStorage.removeItem(checkoutCustomerStorageKey);
      }
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
          customerNote,
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
      setView(checkoutIsStoreAdmin ? 'menu' : 'success');
      if (checkoutIsStoreAdmin) {
        showOrderNotice(demoId);
      }
      return;
    }

      const createOrderAuthMode =
        checkoutIsStoreAdmin
          ? 'admin'
          : customerSession?.token
            ? 'customer'
            : 'none';

      let createdOrder;
      try {
      createdOrder = await orderService.createBySlug(order, storeSlug, {
        authMode: createOrderAuthMode,
        timeoutMs: CHECKOUT_CREATE_ORDER_TIMEOUT_MS,
      });
      } catch (error) {
        const backendMessage =
          error?.details?.message ||
        error?.error?.details?.message ||
        error?.error?.message ||
        error?.message;
      const backendCode = String(error?.code || error?.error?.code || '').trim().toUpperCase();
      if (backendCode === 'REQUEST_TIMEOUT') {
        showErrorNotice(
          checkoutIsStoreAdmin
            ? 'A conexão demorou demais. Confira a fila antes de tentar novamente para evitar pedido duplicado.'
            : 'A conexão demorou demais. Confira seus pedidos antes de tentar novamente para evitar pedido duplicado.'
        );
        return;
      }
      if (backendCode === 'NETWORK_ERROR') {
        showErrorNotice(
          checkoutIsStoreAdmin
            ? 'Sua internet caiu durante o envio. Confira a fila antes de tentar novamente.'
            : 'Sua internet caiu durante o envio. Confira seus pedidos antes de tentar novamente.'
        );
        return;
      }
      if (backendCode === 'ORDER-005' || String(backendMessage || '').toLowerCase().includes('estoque')) {
        showErrorNotice(backendMessage || 'Produto sem estoque suficiente. Revise o carrinho e tente novamente.');
        if (storeSlug) {
          productService
            .listPublicBySlug(storeSlug, { forceRefresh: true })
            .then((freshProducts) => {
              if (!Array.isArray(freshProducts)) return;
              setProducts(freshProducts);
              const result = reconcileCartStock(cart, freshProducts);
              if (!result.ok) setCart(result.nextCart);
            })
            .catch(() => {});
        }
        return;
      }
      if (backendCode === 'ORDER-003') {
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
    if (!customerSession?.token && !checkoutIsStoreAdmin) {
      localStorage.setItem(
        checkoutCustomerStorageKey,
        JSON.stringify({ name: effectiveCustomerName, phone: customer.phone })
      );
    } else {
      localStorage.removeItem(checkoutCustomerStorageKey);
    }
    customerService.fetchAll().then(setCustomers).catch(() => {});

    const trackingLink =
      typeof window !== 'undefined' && createdOrder?.id
        ? createdOrder?.accessToken
          ? `${window.location.origin}/pedido/${createdOrder.id}?ot=${encodeURIComponent(String(createdOrder.accessToken))}`
          : `${window.location.origin}/pedido/${createdOrder.id}`
        : '';
    const shouldNotifyOwner = !checkoutIsStoreAdmin && !customerSession?.token && (customer.type === 'pickup' || customer.type === 'table');
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
        customerNote ? `📝 Observação: ${customerNote}` : '',
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
      const waPhone = String(targetNumber || '').replace(/\D/g, '');
      const waMessage = messageLines.join('\n');
      setPendingWhatsApp(() => () => openWhatsAppUrl(waPhone, waMessage));
    } else {
      setPendingWhatsApp(null);
    }

    reconcileLocalStockAfterCheckout(validCartItems);

    if (storeSlug) {
      productService
        .listPublicBySlug(storeSlug, { forceRefresh: true })
        .then((freshProducts) => {
          if (Array.isArray(freshProducts)) setProducts(freshProducts);
        })
        .catch(() => {});
    }

    clearCheckoutDraft();
    setCart({});
    setCustomer({ ...initialCustomer, name: String(customerSession?.user?.fullName || '').trim(), phone: String(customerSession?.user?.phone || '').trim() });
    setDeliveryMode('distance');
    setPostalQuote(null);
    setSelectedPostalServiceCode('');
    setPaymentMethod(resolveCheckoutPaymentSelection(defaultPaymentMethod, availablePaymentMethods, checkoutIsProfessionalCheckoutUser));
      setLastOrder({
        id: createdOrder?.id,
        type: customer.type,
        payment,
        phone: sanitizedPhoneKey || customer.phone,
        pixKey,
        onlinePayment: createdOrder?.payment || null,
        paymentStatus: String(createdOrder?.paymentStatus || 'PENDING').toUpperCase(),
        table: customer.table,
        customerName: effectiveCustomerName,
        customerNote,
        address: deliveryAddress || customer.address,
      total: orderTotal,
      items: printableItems,
      queueRank: createdOrder?.queueRank ?? createdOrder?.queuePosition ?? null,
      createdAt: Date.now(),
    });
    if (checkoutCanUseAdminPrintFlow) {
      setShowPrintPrompt(true);
    }
    if (customer.type === 'table' && customer.table) {
      setOccupiedTables((prev) => {
        const normalized = String(customer.table || '').trim();
        if (!normalized || prev.includes(normalized)) return prev;
        return [ ...prev, normalized ];
      });
    }
    if (createdOrder?.id && !checkoutIsStoreAdmin) {
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
    const isAwaitingMpPayment = Boolean(
      createdOrder?.payment?.paymentLink && createdOrder?.status === 'awaiting_payment'
    );
    const isMpCardPayment = isAwaitingMpPayment && (payment === 'credito' || payment === 'debito');
    if (checkoutIsStoreAdmin) {
      setView('menu');
    } else if (isMpCardPayment) {
      const mpUrl = createdOrder.payment.paymentLink;
      if (Capacitor.isNativePlatform()) {
        Browser.open({ url: mpUrl });
      } else {
        window.open(mpUrl, '_blank');
      }
      if (customerSession?.token) {
        navigate('/cliente/pedidos');
      }
    } else {
      setView('success');
    }
    showToast(
      isAwaitingMpPayment
        ? 'Pedido registrado! Finalize o pagamento para confirmar.'
        : 'Pedido enviado com sucesso.',
      'success',
      { durationMs: 3000 }
    );
    if (checkoutIsStoreAdmin) {
      showOrderNotice(createdOrder?.id);
    }
    } finally {
      clearCheckoutSlowTimer();
      checkoutLockRef.current = false;
      setCheckoutLoading(false);
      setCheckoutSlow(false);
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
    logoutAdminContext();
    setAdminAccountDrawerOpen(false);
    setUser(null);
    navigate('/hub', { replace: true });
  };

  const adminAccountActions = [
    ...(!isOperatorStoreUser
      ? [{
          section: 'Painel',
          id: 'summary',
          label: 'Resumo da operação',
          description: 'Volte ao painel com visão geral da loja.',
          icon: <House size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'resumo' } }),
        }]
      : []),
    {
      section: 'Pedidos',
      id: 'queue',
      label: 'Pedidos em operação',
      description: 'Acompanhe fila, preparo e pedidos aguardando ação.',
      icon: <ClipboardText size={22} weight="duotone" />,
      onClick: () => navigate('/admin/queue'),
    },
    ...(!isOperatorStoreUser
      ? [{
          section: 'Pedidos',
          id: 'orders',
          label: 'Histórico de pedidos',
          description: 'Pedidos finalizados, filtros e buscas da operação.',
          icon: <Receipt size={22} weight="duotone" />,
          onClick: () => navigate('/admin/orders'),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Pedidos',
          id: 'sales',
          label: 'Vendas concluídas',
          description: 'Atalho para a fila com pedidos já finalizados.',
          icon: <Receipt size={22} weight="duotone" />,
          onClick: () => navigate('/admin/queue', { state: { activeTab: 'completed' } }),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Pedidos',
          id: 'reviews',
          label: 'Avaliações',
          description: 'Acompanhe notas e comentários dos clientes.',
          icon: <Star size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'avaliacoes' } }),
        }]
      : []),
    {
      section: 'Loja',
      id: 'products',
      label: 'Produtos',
      description: 'Abra o catálogo e ajustes da vitrine.',
      icon: <Package size={22} weight="duotone" />,
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'produtos' } }),
    },
    {
      section: 'Loja',
      id: 'storefront',
      label: 'Minha vitrine',
      description: 'Abra a loja pública sem sair da operação.',
      icon: <ShoppingCart size={22} weight="duotone" />,
      onClick: () => navigate(`/${storeSlug}`),
    },
    {
      section: 'Loja',
      id: 'printer',
      label: 'Impressora',
      description: 'Configure a impressora Bluetooth deste aparelho.',
      icon: <Printer size={22} weight="duotone" />,
      onClick: () => navigate('/admin/dashboard?tab=config&section=printer'),
    },
    ...(!isOperatorStoreUser
      ? [{
          section: 'Loja',
          id: 'stock',
          label: 'Estoque',
          description: 'Controle níveis, alertas e movimentações dos produtos.',
          icon: <Package size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'estoque' } }),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Loja',
          id: 'highlights',
          label: 'Destaques',
          description: 'Solicite e acompanhe a visibilidade da loja no app.',
          icon: <Star size={22} weight="duotone" />,
          onClick: () => navigate('/admin/highlights'),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Financeiro',
          id: 'subscription',
          label: 'Minha assinatura',
          description: 'Consulte ciclo, renovação e plano atual da loja.',
          icon: <CreditCard size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'pagamentos' } }),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Financeiro',
          id: 'gateway',
          label: 'Pagamentos online',
          description: 'Conecte e acompanhe os pagamentos digitais da operação.',
          icon: <CreditCard size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'gateway' } }),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Operação',
          id: 'condominiums',
          label: 'Condomínios',
          description: 'Gerencie feiras, vínculos e aprovações da operação.',
          icon: <Buildings size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'condominios' } }),
        }]
      : []),
    ...(canUseStoreMotoboys && ['ADMIN', 'LOJISTA'].includes(adminUserRole)
      ? [{
          section: 'Operação',
          id: 'motoboys',
          label: 'Entregadores',
          description: 'Gestão de equipe, repasses e vínculo das entregas.',
          icon: <Scooter size={22} weight="duotone" />,
          onClick: () => navigate('/admin/motoboys'),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Operação',
          id: 'users',
          label: 'Usuários',
          description: 'Gerencie administradores e operadores da loja.',
          icon: <UsersThree size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'usuarios' } }),
        }]
      : []),
    ...(!isOperatorStoreUser
      ? [{
          section: 'Operação',
          id: 'settings',
          label: 'Configurações da loja',
          description: 'Marca, atendimento e ajustes da operação.',
          icon: <Gear size={22} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'config' } }),
        }]
      : []),
    {
      section: 'Conta',
      id: 'password',
      label: 'Trocar senha',
      description: 'Atualize a senha deste acesso sem sair da operação.',
      icon: <LockKey size={22} weight="duotone" />,
      onClick: () => window.dispatchEvent(new CustomEvent('admin:open-change-password')),
    },
    {
      section: 'Conta',
      id: 'logout',
      label: 'Sair da operação',
      description: 'Encerra somente este acesso neste aparelho.',
      icon: <SignOut size={22} weight="duotone" />,
      onClick: handleStoreSessionLogout,
      tone: 'danger' as const,
    },
  ];

  const handleCustomerLogout = () => {
    persistCustomerSession(null);
    setCustomerAddresses([]);
    setCustomerOrders([]);
    setShowCustomerAccount(false);
    setCustomerAuthCheckoutPrompt(false);
    setCustomerVerifyPrompt(null);
    setCustomerVerifyCode('');
    setCustomerAccountError('');
    setCustomerAccountNotice('');
    showToast('Sessão de cliente encerrada.', 'success');
  };

  const openCustomerAccountPanel = (mode: 'login' | 'register' = 'login') => {
    setCustomerAuthCheckoutPrompt(false);
    setCustomerVerifyPrompt(null);
    setCustomerVerifyCode('');
    setCustomerAccountError('');
    setCustomerAccountNotice('');
    setCustomerAuthMode(mode);
    setShowCustomerAccount(true);
  };

  const customerDisplayName =
    String(customerSession?.user?.fullName || customerSession?.user?.name || '').trim() ||
    String(customerSession?.user?.email || '').trim() ||
    '';
  const customerDisplayEmail = String(customerSession?.user?.email || '').trim();
  const customerInitials = (() => {
    const source = customerDisplayName || customerDisplayEmail || 'Cliente';
    const parts = String(source).replace(/@.*/, '').split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
  })();
  const storefrontWebContextLogo =
    resolveAssetUrl(String(branding?.logoUrl || '')) || getStoreAvatarUrl(storeSlug, storeName || branding?.brandName || 'Loja');
  const storefrontWebContextStoreName = storeName || branding?.brandName || 'Loja parceira';

  const finishCustomerAuthentication = async (response: any, message: string) => {
    persistCustomerSession(response);
    setCustomerAuthForm((prev) => ({ ...prev, password: '' }));
    setShowCustomerPassword(false);
    setCustomerVerifyPrompt(null);
    setCustomerVerifyCode('');
    setCustomerResendCooldown(0);
    const customerData = await refreshCustomerData(response);

    if (customerAuthCheckoutPrompt) {
      const addressCount = Array.isArray(customerData?.addresses) ? customerData.addresses.length : 0;
      const shouldCollectAddress = customer.type === 'delivery' && addressCount === 0;
      setShowCustomerAccount(false);
      setCustomerAuthCheckoutPrompt(false);
      setCustomerCheckoutResume({ token: Date.now(), step: shouldCollectAddress ? 2 : 4 });
      setView('cart');
      showToast(
        shouldCollectAddress
          ? 'Conta conectada. Cadastre um endereço para finalizar a entrega.'
          : 'Conta conectada. Confira o pedido e toque em finalizar.',
        'success'
      );
      return;
    }

    showToast(message, 'success');
  };

  const handleCustomerAuthSubmit = async () => {
    if (customerAccountLoading) return;
    setCustomerAccountLoading(true);
    setCustomerAccountError('');
    setCustomerAccountNotice('');
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
        if (response?.next === 'VERIFY_EMAIL_CODE') {
          const targetEmail = String(response?.email || customerAuthForm.email || '').trim().toLowerCase();
          setCustomerVerifyPrompt({
            email: targetEmail,
            emailMasked: response?.emailMasked,
            flow: 'register',
          });
          setCustomerVerifyCode('');
          {
            const cooldown = Number(response?.cooldownSec);
            setCustomerResendCooldown(Number.isFinite(cooldown) ? Math.max(0, cooldown) : 60);
          }
          setCustomerAccountNotice(
            response?.emailDeliveryStatus === 'failed' && response?.reason === 'ACCOUNT_PENDING_EMAIL_VERIFICATION'
              ? 'Encontramos sua conta aguardando confirmação, mas não conseguimos enviar um novo código agora. Se você já recebeu um código, pode tentar usá-lo; se não, toque em Reenviar código em instantes.'
              : response?.emailDeliveryStatus === 'failed'
              ? 'Sua conta foi criada, mas não conseguimos enviar o código agora. Toque em Reenviar código para tentar novamente.'
              : response?.reason === 'ACCOUNT_PENDING_EMAIL_VERIFICATION'
              ? 'Encontramos sua conta. Falta só confirmar o e-mail; enviamos um novo código para você continuar.'
              : 'Enviamos um código de 4 dígitos para concluir seu cadastro.'
          );
          return;
        }
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
      await finishCustomerAuthentication(
        response,
        customerAuthMode === 'register' ? 'Cadastro concluído.' : 'Login realizado.'
      );
    } catch (error: any) {
      if (error?.code === 'AUTH-005') {
        const targetEmail = String(error?.details?.email || customerAuthForm.email || '').trim().toLowerCase();
        setCustomerVerifyPrompt({
          email: targetEmail,
          emailMasked: error?.details?.emailMasked,
          flow: 'login',
        });
        setCustomerVerifyCode('');
        setCustomerResendCooldown(Number(error?.details?.resendCooldownSec || 60));
        setCustomerAccountNotice('Sua conta ainda precisa ser confirmada. Digite o código enviado ao e-mail.');
        return;
      }
      setCustomerAccountError(error?.message || 'Não foi possível autenticar.');
    } finally {
      setCustomerAccountLoading(false);
    }
  };

  const handleCustomerVerifyCode = async () => {
    const email = String(customerVerifyPrompt?.email || customerAuthForm.email || '').trim().toLowerCase();
    const code = String(customerVerifyCode || '').replace(/\D/g, '').slice(0, 4);
    if (!email || code.length !== 4 || customerVerifyLoading) return;
    setCustomerVerifyLoading(true);
    setCustomerAccountError('');
    setCustomerAccountNotice('');
    try {
      const response = await customerAccountService.verifyEmailCode({ email, code });
      await finishCustomerAuthentication(response, 'Conta confirmada com sucesso.');
    } catch (error: any) {
      setCustomerAccountError(error?.message || 'Código inválido ou expirado.');
    } finally {
      setCustomerVerifyLoading(false);
    }
  };

  const handleCustomerResendVerification = async () => {
    const email = String(customerVerifyPrompt?.email || customerAuthForm.email || '').trim().toLowerCase();
    if (!email || customerResendLoading || customerResendCooldown > 0) return;
    setCustomerResendLoading(true);
    setCustomerAccountError('');
    setCustomerAccountNotice('');
    try {
      const response = await customerAccountService.resendEmailCode(email);
      setCustomerVerifyPrompt((prev) => ({
        ...(prev || {}),
        email,
        emailMasked: response?.emailMasked || prev?.emailMasked || email,
      }));
      setCustomerVerifyCode('');
      {
        const cooldown = Number(response?.cooldownSec);
        setCustomerResendCooldown(Number.isFinite(cooldown) ? Math.max(0, cooldown) : 60);
      }
      if (response?.emailDeliveryStatus === 'failed') {
        setCustomerAccountNotice('');
        setCustomerAccountError('Não conseguimos enviar o código agora. Tente reenviar novamente em instantes.');
      } else {
        setCustomerAccountNotice(response?.message || 'Novo código enviado para seu e-mail.');
      }
    } catch (error: any) {
      setCustomerAccountError(error?.message || 'Não foi possível reenviar o código agora.');
    } finally {
      setCustomerResendLoading(false);
    }
  };

  const openCustomerOrdersFromBottomNav = async () => {
    if (customerSession?.token) {
      navigate('/cliente/pedidos');
      return;
    }

    if (nativeBiometricService.hasValidStoredCustomerEnrollment()) {
      setCustomerAccountLoading(true);
      setCustomerAccountError('');
      try {
        const session = await nativeBiometricService.loginCustomerWithBiometrics(
          'Confirme sua identidade para ver seus pedidos'
        );
        persistCustomerSession(session);
        await refreshCustomerData(session);
        showToast('Login por biometria realizado.', 'success');
        navigate('/cliente/pedidos');
        return;
      } catch (error: any) {
        setCustomerAccountError(error?.message || 'Não foi possível entrar com biometria.');
        showToast(error?.message || 'Não foi possível entrar com biometria.', 'error');
      } finally {
        setCustomerAccountLoading(false);
      }
    }

    setCustomerAuthCheckoutPrompt(false);
    setCustomerVerifyPrompt(null);
    setCustomerVerifyCode('');
    setCustomerAccountError('');
    setCustomerAccountNotice('');
    setCustomerAuthMode('login');
    setShowCustomerAccount(true);
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
    const cepDigits = String(newAddressForm.cep || '').replace(/\D/g, '');
    if (
      cepDigits.length !== 8 ||
      !String(newAddressForm.street || '').trim() ||
      !String(newAddressForm.number || '').trim() ||
      !String(newAddressForm.city || '').trim() ||
      !String(newAddressForm.state || '').trim()
    ) {
      setCustomerAccountError('Preencha CEP, rua, número, cidade e UF antes de salvar o endereço.');
      return;
    }
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
        lat: null,
        lng: null,
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
      const data = await addressLookupService.lookupZipCode(rawCep);
      setNewAddressForm((prev) => ({
        ...prev,
        street: String(data?.street || ''),
        neighborhood: String(data?.district || ''),
        city: String(data?.city || ''),
        state: String(data?.state || '').toUpperCase().slice(0, 2),
        lat: data?.latitude ?? prev?.lat ?? null,
        lng: data?.longitude ?? prev?.lng ?? null,
      }));
    } catch (error: any) {
      setCustomerAccountError(error?.message || 'Não foi possível consultar o CEP agora.');
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
      customerNote: lastOrder?.customerNote || '',
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
        customerNote: payload.customerNote,
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
      showToast(printError?.message || 'Falha ao imprimir. Verifique impressora, Bluetooth ou RawBT.', 'error');
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
      <AppRobotLoader
        fullScreen
        title="Carregando loja"
        subtitle="Preparando vitrine, fotos e dados da loja."
      />
    );
  }

  // Fallback UI if no products and no error
  const hasContent = products.length > 0 || !loadError;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#E2EBF2] to-[#D9E4EF] font-sans overflow-x-clip no-x-scroll ${publicStoreHeaderPadding} ${isNativeRuntime ? 'ds-native-nav-content' : 'pb-28 sm:pb-24'}`}>
      {showPublicStoreAppHeader ? (
        <AppGlassHeader
          title={publicStoreHeaderTitle}
          eyebrow={publicStoreHeaderEyebrow}
          subtitle={publicStoreHeaderSubtitle}
          backTo="/hub"
          onBack={handlePublicStoreHeaderBack}
          hideBack={view === 'cart'}
          right={publicStoreHeaderRight}
          className={publicStoreHeaderIsSolid ? 'jnc-app-glass-header--solid' : 'jnc-app-glass-header--ambient'}
          maxWidthClassName="max-w-6xl"
        />
      ) : null}
      {showClientWebCheckoutContext && (
        <section className="mx-auto w-full max-w-6xl px-4 pt-2 sm:pt-3">
          <div className="relative overflow-hidden rounded-[1.55rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(247,250,252,0.88)_100%)] px-3.5 py-3 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/55 backdrop-blur-2xl sm:px-4">
            <div className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full bg-[#336886]/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-emerald-300/12 blur-3xl" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[1.1rem] border border-white bg-white shadow-[0_14px_28px_-22px_rgba(15,23,42,0.45)] ring-1 ring-slate-100">
                  <Image
                    src={storefrontWebContextLogo}
                    alt={storefrontWebContextStoreName}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, storefrontWebContextStoreName);
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#336886]/75">
                    {view === 'success' ? 'Pedido enviado' : 'Pedido online'}
                  </p>
                  <h2 className="mt-0.5 truncate text-sm font-black tracking-tight text-slate-950 sm:text-[15px]">
                    {view === 'success' ? 'Acompanhe seu pedido no Já no Caminho' : `Comprando em ${storefrontWebContextStoreName}`}
                  </h2>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                    {customerSession?.token
                      ? `Logado como ${customerDisplayName || 'cliente'}`
                      : 'Entre para salvar endereço, ver pedidos e continuar em outro aparelho.'}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/hub')}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.32)] transition-all hover:bg-white active:scale-[0.98]"
                >
                  <House size={15} weight="duotone" />
                  Início
                </button>
                <button
                  type="button"
                  onClick={() => (customerSession?.token ? navigate('/cliente/pedidos') : openCustomerAccountPanel('login'))}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d7e7ef] bg-white/88 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#336886] shadow-[0_12px_24px_-22px_rgba(51,104,134,0.42)] transition-all hover:bg-white active:scale-[0.98]"
                >
                  <Receipt size={15} weight="duotone" />
                  Pedidos
                </button>
                <button
                  type="button"
                  onClick={() => openCustomerAccountPanel('login')}
                  className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-full px-2.5 pr-3 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_14px_28px_-20px_rgba(15,23,42,0.35)] transition-all active:scale-[0.98] ${
                    customerSession?.token
                      ? 'border border-slate-200/80 bg-slate-950 text-white'
                      : 'border border-emerald-200/80 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                    customerSession?.token ? 'bg-white/14 text-white ring-1 ring-white/15' : 'bg-white text-emerald-700 ring-1 ring-emerald-100'
                  }`}>
                    {customerSession?.token ? customerInitials : <UserCircle size={15} weight="fill" />}
                  </span>
                  <span className="max-w-[8.5rem] truncate">
                    {customerSession?.token ? 'Minha conta' : 'Entrar'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
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
      {view !== 'menu' && view !== 'cart' && view !== 'success' && (
        <div className="bg-white shadow-md px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-gray-100">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border shadow-sm bg-white flex-shrink-0 flex items-center justify-center"
            style={{ borderColor: branding?.primaryColor, color: branding?.primaryColor }}
          >
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={branding.brandName}
                className="w-full h-full object-cover"
                eager
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
          <div className="fixed left-1/2 top-[max(calc(env(safe-area-inset-top)+0.9rem),1rem)] z-[85] w-full max-w-md -translate-x-1/2 px-4">
            <div
              className={`flex items-start gap-3 rounded-[1.4rem] border px-4 py-3 text-white shadow-[0_26px_54px_-28px_rgba(15,23,42,0.58)] backdrop-blur-xl ${
                tableNotice.tone === 'error'
                  ? 'border-rose-400/35 bg-[linear-gradient(135deg,rgba(225,29,72,0.96)_0%,rgba(190,24,93,0.94)_100%)]'
                  : 'border-amber-300/40 bg-[linear-gradient(135deg,rgba(217,119,6,0.96)_0%,rgba(245,158,11,0.94)_100%)]'
              }`}
            >
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/15">
                <WarningCircle size={16} weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
                  {tableNotice.tone === 'error' ? 'Atenção no pedido' : 'Confirmação necessária'}
                </p>
                <div className="mt-1 text-sm font-semibold leading-relaxed">
                  {tableNotice.message}
                </div>
              </div>
            </div>
          </div>
        )}
        {!showInactiveState && !showClosedState && hubCoverageNotice && (view === 'menu' || view === 'cart') && (
          <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-amber-200/70 bg-[linear-gradient(140deg,rgba(255,251,235,0.96)_0%,rgba(255,247,237,0.98)_56%,rgba(255,255,255,0.95)_100%)] px-4 py-4 shadow-[0_20px_42px_-28px_rgba(245,158,11,0.42)] ring-1 ring-amber-100/70 sm:px-5">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,#f59e0b_0%,#f97316_100%)]" />
              <div className="flex items-start gap-3 pl-2 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-amber-200/70 bg-white/90 text-amber-600 shadow-[0_14px_28px_-22px_rgba(245,158,11,0.6)]">
                  <WarningCircle size={22} weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Atendimento da loja</p>
                      <h2 className="mt-1 text-sm font-black text-slate-900 sm:text-[15px]">
                        Esta loja pode não entregar no seu endereço principal
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHubCoverageNotice(null)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200/70 bg-white/80 text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
                      aria-label="Fechar aviso"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {hubCoverageNotice.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customerSession?.token && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerAuthCheckoutPrompt(false);
                          setCustomerVerifyPrompt(null);
                          setCustomerVerifyCode('');
                          setCustomerAccountError('');
                          setCustomerAccountNotice('');
                          setShowCustomerAccount(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700 shadow-[0_12px_22px_-18px_rgba(245,158,11,0.5)] transition-all hover:bg-amber-50"
                      >
                        <MapPinLine size={14} weight="bold" />
                        Revisar endereços
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setHubCoverageNotice(null)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 transition-all hover:bg-white"
                    >
                      <ClipboardText size={14} weight="bold" />
                      Entendi
                    </button>
                  </div>
                </div>
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
                      openWhatsAppUrl(phone, destinationStoreWhatsAppMessage);
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
          <div className="min-h-[72vh] bg-[radial-gradient(ellipse_at_top_right,rgba(51,104,134,0.16),transparent_36%),radial-gradient(ellipse_at_bottom_left,rgba(21,58,76,0.08),transparent_42%),linear-gradient(180deg,#E2EBF2_0%,#E7F0F6_54%,#E2EBF2_100%)]">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:py-7">
              {!showPublicStoreAppHeader ? (
                <button
                  type="button"
                  onClick={() => navigateBackOrFallback(navigate, '/hub')}
                  className="mb-4 inline-flex items-center gap-2 text-left text-slate-700 transition-colors hover:text-[#336886]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#c9dbe7]/80 bg-white/90 text-slate-700 shadow-[0_12px_24px_-22px_rgba(51,104,134,0.25)] transition-all active:scale-95">
                    <ArrowLeft size={16} weight="bold" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Navegação</span>
                    <span className="block text-sm font-black leading-tight text-slate-800">Voltar para o app</span>
                  </span>
                </button>
              ) : null}

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] md:items-start">
                <div className="space-y-4">
                  <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(241,247,246,0.9)_54%,rgba(255,255,255,0.94)_100%)] shadow-[0_26px_60px_-38px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
                    <div className="relative h-40 overflow-hidden sm:h-48">
                      <div className="absolute inset-0 bg-[#153A4C]">
                        <Image
                          src={branding?.bannerUrl || branding?.logoUrl || '/janocaminho.jpg'}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-[-22px] h-[calc(100%+44px)] w-[calc(100%+44px)] scale-110 object-cover opacity-95 blur-md saturate-125"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        <Image
                          src={branding?.bannerUrl || branding?.logoUrl || '/janocaminho.jpg'}
                          alt={closedStateStoreName}
                          className="relative h-full w-full object-contain p-2 drop-shadow-[0_20px_34px_rgba(15,23,42,0.32)] sm:p-3"
                          eager
                          onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, branding?.brandName); }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,13,25,0.72)_0%,rgba(9,16,32,0.54)_40%,rgba(15,23,42,0.24)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <div className="flex items-end gap-4">
                          <div className="h-18 w-18 shrink-0 overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/90 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.45)] sm:h-20 sm:w-20">
                            <Image
                              src={branding?.logoUrl || '/janocaminho.jpg'}
                              alt={closedStateStoreName}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, branding?.brandName); }}
                            />
                          </div>
                          <div className="min-w-0 text-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Loja temporariamente fechada</p>
                            <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">{closedStateStoreName}</h1>
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200/30 bg-rose-500/18 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-rose-50 backdrop-blur-md">
                              <Clock size={14} weight="bold" />
                              Fechado agora
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                      <div className="rounded-[1.55rem] border border-slate-200/85 bg-white/88 p-4 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.22)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Próximo atendimento</p>
                        <p className="mt-1 text-base font-black text-slate-900">
                          {todayHoursLabel || 'Sem horário configurado para hoje'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          A vitrine continua visível, mas os pedidos voltam a abrir no próximo período da operação.
                        </p>
                      </div>

                      {storeDescription && (
                        <div className="rounded-[1.55rem] border border-slate-200/85 bg-white/88 p-4 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.16)]">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sobre a loja</p>
                          <p className="mt-2 break-words text-sm leading-relaxed text-slate-600">{storeDescription}</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94)_0%,rgba(247,250,252,0.92)_100%)] p-5 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Contato e endereço</p>
                    <div className="mt-4 space-y-3">
                      {instagramHandle && (
                        <a
                          href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200/85 bg-white px-4 py-3 text-sm font-semibold text-[#0a66c2] shadow-[0_10px_22px_-20px_rgba(15,23,42,0.35)] hover:underline break-all"
                        >
                          <InstagramLogo size={18} weight="fill" className="mt-0.5 shrink-0" />
                          <span>{instagramHandle}</span>
                        </a>
                      )}
                      {storeAddress && (
                        <div className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200/85 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.35)] break-words">
                          <MapPinLine size={18} weight="bold" className="mt-0.5 shrink-0 text-slate-500" />
                          <span>{storeAddress}</span>
                        </div>
                      )}
                      {!instagramHandle && !storeAddress && (
                        <p className="text-sm text-slate-500">Nenhum contato cadastrado.</p>
                      )}
                    </div>
                  </section>

                  {weeklyHoursRows.length > 0 && (
                    <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94)_0%,rgba(247,250,252,0.92)_100%)] p-5 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Horários da semana</p>
                      <div className="mt-4 space-y-2">
                        {weeklyHoursRows.map((row) => (
                          <div
                            key={`${row.day}-${row.label}`}
                            className={`flex items-center justify-between gap-3 rounded-[1rem] px-3 py-2.5 text-sm ${
                              row.isToday
                                ? 'bg-amber-50 text-slate-900 shadow-[0_10px_20px_-18px_rgba(245,158,11,0.5)]'
                                : 'bg-white text-slate-600'
                            }`}
                          >
                            <span className={`min-w-0 ${row.isToday ? 'font-black' : 'font-semibold'}`}>{row.label}</span>
                            <span className={`text-right break-words ${row.isToday ? 'font-black' : 'font-medium'}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <PlatformTrustFooter className="pt-1" compact />
                </div>
              </div>
            </div>
          </div>
        )}
        {!showInactiveState && !showClosedState && view === 'menu' && products.length === 0 && productsLoading ? (
          <div className="mx-auto min-h-[68vh] w-full max-w-5xl px-4 py-8">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_28px_72px_-46px_rgba(15,23,42,0.35)] ring-1 ring-white/70 backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[#336886]/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-amber-300/12 blur-3xl" />
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#edf6fb,#ffffff)] ring-1 ring-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-44 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-3 w-32 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white/92 p-3 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.32)]">
                    <div className="h-20 w-20 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#eef5f7,#ffffff)] ring-1 ring-slate-100" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-3 w-11/12 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="relative mt-5 text-center text-sm font-bold text-slate-600">
                {productsSlow ? 'Internet lenta. Ainda estamos carregando a vitrine...' : 'Carregando vitrine...'}
              </p>
            </div>
          </div>
        ) : !showInactiveState && !showClosedState && view === 'menu' && products.length === 0 && productsLoadError ? (
          <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-6 text-center shadow-[0_24px_54px_-36px_rgba(15,23,42,0.3)] ring-1 ring-white/70 backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 shadow-[0_16px_34px_-28px_rgba(245,158,11,0.5)]">
                <WarningCircle size={28} weight="duotone" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Não carregou a vitrine</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{productsLoadError}</p>
              <button
                type="button"
                onClick={() => setProductsRetryKey((value) => value + 1)}
                className="mt-5 w-full rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-24px_rgba(21,58,76,0.65)] transition active:scale-[0.98]"
              >
                Tentar carregar novamente
              </button>
            </div>
          </div>
        ) : !showInactiveState && !showClosedState && view === 'menu' && products.length === 0 ? (
          <div className="flex min-h-[80vh] items-center justify-center px-4">
            <div className="relative w-full max-w-lg overflow-hidden rounded-[2.1rem] border border-white/80 bg-white/90 p-5 text-center shadow-[0_30px_84px_-54px_rgba(15,23,42,0.48)] ring-1 ring-white/70 backdrop-blur-xl sm:p-7">
              <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-[#336886]/12 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-emerald-300/14 blur-3xl" />
              <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[1.65rem] border border-white/80 bg-[linear-gradient(135deg,#153A4C_0%,#336886_65%,#5FD35A_140%)] text-white shadow-[0_20px_44px_-28px_rgba(21,58,76,0.72)]">
                <Package size={38} weight="duotone" />
              </div>
              <p className="relative text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]/75">Vitrine em preparação</p>
              <h2 className="relative mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Loja ainda não configurada</h2>
              <p className="relative mx-auto mt-2 mb-6 max-w-md text-sm font-semibold leading-6 text-slate-600">
                Falta cadastrar os produtos para a vitrine aparecer. Se você é o responsável pela loja, clique abaixo para configurar.
              </p>
              <div className="relative flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={openProductsSetup}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#153A4C] px-6 py-3 text-sm font-black text-white shadow-[0_18px_36px_-24px_rgba(21,58,76,0.68)] transition active:scale-[0.98]"
                >
                  Cadastrar produtos
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/88 px-6 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  Voltar para início
                </button>
              </div>
            </div>
          </div>
        ) : !showInactiveState && !showClosedState && view === 'menu' && products.length > 0 && (
          <div className="space-y-4">
              {!isStoreAdmin && !customerSession?.token && recentPublicOrders.length > 0 && (
              <div className="fixed bottom-20 left-4 right-4 z-[110] sm:relative sm:bottom-0 sm:left-0 sm:right-0 sm:mx-6 rounded-[1.75rem] border border-emerald-200/60 bg-white/92 backdrop-blur-xl px-4 py-3 shadow-[0_18px_42px_-22px_rgba(16,185,129,0.35)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                  type="button"
                  onClick={() => openOrderTracking(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  onMouseEnter={() => primeOrderTrackingNavigation(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  onFocus={() => primeOrderTrackingNavigation(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  onTouchStart={() => primeOrderTrackingNavigation(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
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
                  onClick={() => openOrderTracking(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  onMouseEnter={() => primeOrderTrackingNavigation(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  onFocus={() => primeOrderTrackingNavigation(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  onTouchStart={() => primeOrderTrackingNavigation(recentPublicOrders[0]?.id, recentPublicOrders[0]?.accessToken)}
                  className="btn-press shrink-0 rounded-2xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white shadow-[0_12px_24px_-12px_rgba(5,150,105,0.5)] transition-all hover:bg-emerald-700 active:scale-95"
                >
                  Acompanhar
                </button>
              </div>
            )}
            <MenuView
              key={storefrontContextKey}
              products={products}
              topProducts={topProducts}
              cart={cart}
              branding={branding}
              segment={storeSegment}
              instagramHandle={instagramHandle}
              onUpdateCart={updateCart}
              onClearCart={clearCart}
              onProceed={() => setView('cart')}
              onOpenQueue={undefined}
              onOpenAdmin={undefined}
              onLogout={undefined}
              onOpenCustomerAccount={!isStoreAdmin ? () => {
                setCustomerAuthCheckoutPrompt(false);
                setCustomerVerifyPrompt(null);
                setCustomerVerifyCode('');
                setCustomerAccountError('');
                setCustomerAccountNotice('');
                setShowCustomerAccount(true);
              } : undefined}
              isCustomerAuthenticated={Boolean(customerSession?.token)}
              userRole={isStoreAdmin ? normalizedRole : undefined}
              isAuthenticated={isStoreAdmin}
              isOpenNow={storeOpenNow}
              whatsappNumber={storePhone}
              whatsappMessage={destinationStoreWhatsAppMessage}
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
              todayClosingLabel={todayClosingLabel}
              minOrderValue={branding?.minOrderValue ?? 20}
              activeTab={activeTab}
              setActiveTab={changeTab}
              onBack={handlePublicStoreHeaderBack}
              distanceKm={pickupDistanceKm ?? undefined}
              compactHeader={isMobile}
              systemHeaderOffset={showPublicStoreAppHeader}
              staffView={Boolean(canUseAdminPrintFlow)}
              isOrderingEnabled={storeOrderingEnabled || isStoreAdmin}
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
            allowCustomerAutocomplete={canUseAdminPrintFlow}
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
            checkoutResume={customerCheckoutResume}
            onCheckoutResumeConsumed={() => setCustomerCheckoutResume(null)}
            checkoutLoading={checkoutLoading}
            checkoutSlow={checkoutSlow}
            onBack={() => setView('menu')}
            systemHeaderOffset={showPublicStoreAppHeader}
          />
        ) : view === 'cart' && (
          <CartView
            cart={cart}
            customer={customer}
            customers={customers}
            paymentMethod={paymentMethod}
            allowedOrderTypes={orderTypes}
            reservationLeadTimeHours={reservationLeadTimeHours}
            allowCustomerAutocomplete={canUseAdminPrintFlow}
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
            onValidateDeliveryAddress={validateDeliveryAddress}
            onChangeDeliveryMode={setDeliveryMode}
            onCalculatePostalQuote={handleCalculatePostalQuote}
            onSelectPostalService={setSelectedPostalServiceCode}
            storeAddress={storeAddress}
            pickupLocationLabel={myCondoPickup?.label || ''}
            storeCoords={storeCoords}
            deliveryCoords={deliveryCoords}
            pickupDistanceKm={pickupDistanceKm}
            minOrderValue={Number(branding?.minOrderValue ?? 20)}
            pickupDistanceWarningKm={PICKUP_DISTANCE_WARNING_KM}
            pickupDistanceConfirmationKm={PICKUP_DISTANCE_CONFIRMATION_KM}
            isCustomerLogged={Boolean(customerSession?.token)}
            savedAddresses={customerAddresses}
            onApplySavedAddress={(address: any) => {
              hydrateCustomerFromAddress(address);
              showToast('Endereço aplicado no checkout.', 'success');
            }}
            onOpenAddressManager={() => {
              setCustomerAuthCheckoutPrompt(false);
              setCustomerVerifyPrompt(null);
              setCustomerVerifyCode('');
              setCustomerAccountError('');
              setCustomerAccountNotice('');
              setShowCustomerAccount(true);
            }}
            checkoutDisabled={!cartItemsCount || deliveryValidation.blocked || reservationValidation.blocked || postalPaymentValidation.blocked || loggedDeliveryNeedsSavedAddress}
            checkoutDisabledReason={
              !cartItemsCount
                ? 'Adicione pelo menos 1 item para continuar.'
                : loggedDeliveryNeedsSavedAddress
                ? 'Cadastre um endereço na sua conta para finalizar entrega.'
                : reservationValidation.blocked
                ? reservationValidation.reason
                : postalPaymentValidation.blocked
                ? postalPaymentValidation.reason
                : deliveryValidation.reason
            }
            pricingSummary={{
              subtotal: cartPricing.subtotal,
              discountTotal: cartDiscountTotal,
              total: cartItemsTotal,
            }}
            onChangeCustomer={handleCustomerChange}
            onChangePayment={setPaymentMethod}
            paymentSummary={paymentSummary}
            onUpdateCart={updateCart}
            onCheckout={checkout}
            checkoutLoading={checkoutLoading}
            checkoutSlow={checkoutSlow}
            onBack={() => setView('menu')}
            storeLabel={storeName || branding?.brandName || ''}
            storeLogoUrl={branding?.logoUrl || ''}
            storeSlug={storeSlug || ''}
            suggestedProducts={suggestedProducts}
            userRole={normalizedRole}
            systemHeaderOffset={showPublicStoreAppHeader}
          />
        )}
        {view === 'success' && (
          <SuccessView
            orderType={lastOrder?.type}
            paymentMethod={lastOrder?.payment}
            pixKey={lastOrder?.pixKey}
            phone={lastOrder?.phone}
            table={lastOrder?.table}
            orderId={lastOrder?.id}
            onlinePayment={!isStoreAdmin && !isCondominiumCheckout ? lastOrder?.onlinePayment : null}
            paymentStatus={!isStoreAdmin && !isCondominiumCheckout ? lastOrder?.paymentStatus : undefined}
            onPrintReceipt={canUseAdminPrintFlow ? printLastOrderReceipt : undefined}
            onTrackOrder={
              canUseAdminPrintFlow
                ? undefined
                : () => {
                    if (lastOrder?.id) {
                      openOrderTracking(lastOrder.id, lastOrder?.accessToken);
                    }
                  }
            }
            onNewOrder={() => setView('menu')}
            onMyOrders={customerSession?.token ? () => navigate('/cliente/pedidos') : undefined}
            onWhatsApp={pendingWhatsApp ?? undefined}
            storeLabel={storeName || branding?.brandName || ''}
            storeLogoUrl={branding?.logoUrl || ''}
            storeSlug={storeSlug || ''}
            systemHeaderOffset={showPublicStoreAppHeader}
          />
        )}
      </main>

      {isStoreAdmin && view === 'menu' && <AdminMobileBottomNav onOpenAccount={openAdminAccountDrawer} />}
      {isStoreAdmin && view === 'menu' && adminAccountDrawerOpen && (
        <ContextSideDrawer
          isOpen={adminAccountDrawerOpen}
          onClose={() => setAdminAccountDrawerOpen(false)}
          side="left"
          theme="store"
          eyebrow="Menu da operação"
          title={adminStoreName}
          subtitle={[adminRoleLabel, adminOperatorName || null, adminOperatorEmail || null].filter(Boolean).join(' · ') || 'Acesso da operação neste aparelho'}
          leading={
            adminStoreLogo ? (
              <Image
                src={adminStoreLogo}
                alt={adminStoreName}
                className="h-10 w-10 rounded-[0.95rem] bg-white object-contain p-1"
              />
            ) : (
              <UserCircle size={26} weight="duotone" className="text-[#336886]" />
            )
          }
            badges={[
              { label: [ 'ADMIN', 'LOJISTA' ].includes(String(user?.user?.role || '').toUpperCase()) ? 'Admin' : 'Operador', tone: 'brand' },
              { label: 'Loja online', tone: 'neutral' },
            ]}
          actions={adminAccountActions}
          footer={<PlatformTrustFooter compact mode="default" align="left" />}
        />
      )}

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
                onClick={() => {
                  setShowCustomerAccount(false);
                  setCustomerAuthCheckoutPrompt(false);
                  setCustomerVerifyPrompt(null);
                  setCustomerVerifyCode('');
                  setCustomerAccountError('');
                  setCustomerAccountNotice('');
                }}
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 hover:bg-white"
              >
                Fechar
              </button>
            </div>

            {!customerSession?.token ? (
              <div className="mt-4 space-y-3">
                {customerAuthCheckoutPrompt && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm font-semibold leading-relaxed text-sky-800">
                    Para finalizar o pedido, entre ou crie sua conta. Seu carrinho fica salvo enquanto você faz isso.
                  </div>
                )}
                {customerVerifyPrompt ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Validar e-mail</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {(() => {
                          const target = String(customerVerifyPrompt?.emailMasked || customerVerifyPrompt?.email || '').trim();
                          return target ? (
                            <>
                              Digite o código enviado para{' '}
                              <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 font-black text-slate-900">
                                {target}
                              </span>
                              .
                            </>
                          ) : (
                            'Digite o código enviado para seu e-mail.'
                          );
                        })()}
                      </p>
                    </div>
                    <input
                      value={customerVerifyCode}
                      onChange={(e) => setCustomerVerifyCode(String(e.target.value || '').replace(/\D/g, '').slice(0, 4))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCustomerVerifyCode();
                        }
                      }}
                      placeholder="0000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/15"
                    />
                    {customerAccountError ? (
                      <p className="text-sm text-rose-600">{customerAccountError}</p>
                    ) : null}
                    {customerAccountNotice ? (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{customerAccountNotice}</p>
                    ) : null}
                    <button
                      type="button"
                      disabled={customerVerifyCode.length !== 4 || customerVerifyLoading}
                      onClick={handleCustomerVerifyCode}
                      className="w-full rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_18px_30px_-20px_rgba(15,23,42,0.85)] active:scale-[0.99] disabled:opacity-60"
                    >
                      {customerVerifyLoading ? 'Validando...' : 'Confirmar código'}
                    </button>
                    <button
                      type="button"
                      disabled={customerResendLoading || customerResendCooldown > 0}
                      onClick={handleCustomerResendVerification}
                      className="w-full text-center text-xs font-semibold text-sky-700 disabled:text-slate-400"
                    >
                      {customerResendCooldown > 0
                        ? `Reenviar código em ${customerResendCooldown}s`
                        : customerResendLoading
                        ? 'Reenviando...'
                        : 'Reenviar código'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerVerifyPrompt(null);
                        setCustomerVerifyCode('');
                        setCustomerAccountError('');
                        setCustomerAccountNotice('');
                      }}
                      className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Voltar para login
                    </button>
                  </div>
                ) : (
                  <>
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
                    {...inputAssistProps.name}
                    name="fullName"
                    value={customerAuthForm.fullName}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nome completo"
                    enterKeyHint="next"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                )}
                {customerAuthMode === 'register' && (
                  <input
                    {...inputAssistProps.phoneNational}
                    name="phone"
                    value={customerAuthForm.phone}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, phone: formatPhoneBr(e.target.value) }))}
                    placeholder="Telefone (opcional)"
                    enterKeyHint="next"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                )}
                <input
                  {...inputAssistProps.email}
                  name="email"
                  value={customerAuthForm.email}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="E-mail"
                  enterKeyHint="next"
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                />
                <div className="relative">
                  <input
                    {...(customerAuthMode === 'register' ? inputAssistProps.newPassword : inputAssistProps.currentPassword)}
                    name="password"
                    type={showCustomerPassword ? 'text' : 'password'}
                    value={customerAuthForm.password}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Senha"
                    enterKeyHint="done"
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
                {customerAccountNotice ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{customerAccountNotice}</p>
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
                  </>
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
                      {customerAddresses.map((address: any) => {
                        const isActive = address.isDefault;
                        return (
                        <div key={address.id} className={`rounded-2xl border p-3 transition ${isActive ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              <MapPinLine size={15} weight="duotone" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-800 truncate">{address.label || 'Endereço'}</p>
                                {isActive && (
                                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">Principal</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[12px] text-slate-500 leading-relaxed">
                                {address.street}, {address.number || 's/n'} — {address.neighborhood} · {address.city}/{address.state}
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUseAddressForCheckout(address)}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-slate-800 transition active:scale-[0.97]"
                                >
                                  Usar este
                                </button>
                                {!isActive && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await customerAccountService.setDefaultAddress(address.id);
                                      await refreshCustomerData();
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition active:scale-[0.97]"
                                  >
                                    Definir como principal
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
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
                        <input {...inputAssistProps.addressLine2} name="addressLabel" value={newAddressForm.label} onChange={(e) => setNewAddressForm((p) => ({ ...p, label: e.target.value }))} placeholder="Apelido" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.name} name="recipientName" value={newAddressForm.recipientName} onChange={(e) => setNewAddressForm((p) => ({ ...p, recipientName: e.target.value }))} placeholder="Nome do recebedor" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.phoneNational} name="recipientPhone" value={newAddressForm.phone} onChange={(e) => setNewAddressForm((p) => ({ ...p, phone: formatPhoneBr(e.target.value) }))} placeholder="Telefone" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <div className="flex gap-2">
                          <input {...inputAssistProps.postalCode} name="postalCode" value={newAddressForm.cep} onBlur={handleNewAddressCepLookup} onChange={(e) => setNewAddressForm((p) => ({ ...p, cep: formatCepBr(e.target.value) }))} placeholder="CEP" enterKeyHint="next" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                          <button type="button" onClick={handleNewAddressCepLookup} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                            Buscar CEP
                          </button>
                        </div>
                        <input {...inputAssistProps.addressLine1} name="addressLine1" value={newAddressForm.street} onChange={(e) => setNewAddressForm((p) => ({ ...p, street: e.target.value }))} placeholder="Rua" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.addressLine2} name="addressNumber" value={newAddressForm.number} onChange={(e) => setNewAddressForm((p) => ({ ...p, number: e.target.value }))} placeholder="Número" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.addressLine3} name="addressComplement" value={newAddressForm.complement} onChange={(e) => setNewAddressForm((p) => ({ ...p, complement: e.target.value }))} placeholder="Complemento" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.neighborhood} name="addressNeighborhood" value={newAddressForm.neighborhood} onChange={(e) => setNewAddressForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bairro" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.city} name="addressCity" value={newAddressForm.city} onChange={(e) => setNewAddressForm((p) => ({ ...p, city: e.target.value }))} placeholder="Cidade" enterKeyHint="next" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
                        <input {...inputAssistProps.state} name="addressState" value={newAddressForm.state} onChange={(e) => setNewAddressForm((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF" enterKeyHint="done" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15" />
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
                          onClick={() => openOrderTracking(order.id)}
                          onMouseEnter={() => primeOrderTrackingNavigation(order.id)}
                          onFocus={() => primeOrderTrackingNavigation(order.id)}
                          onTouchStart={() => primeOrderTrackingNavigation(order.id)}
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
                onClick={() => {
                  setShowPrintPrompt(false);
                  setView('menu');
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Novo pedido
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

      {/* banner do app some enquanto a sacola está ativa — cobria a barra da sacola pós-add (auditoria 16/08) */}
      {showClientWebBottomNav && Object.values(cart).every((item: any) => Number(item?.qty || 0) === 0) && (
        <StoreAppPromoBanner withBottomNav />
      )}

      {showClientWebBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] px-0 pb-0 lg:hidden">
          <div className="mx-auto max-w-none rounded-none border border-b-0 border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-2 pt-2 shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
            <div className="grid min-h-[4.65rem] grid-cols-5 items-center gap-0.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">

              <button
                type="button"
                onClick={() => navigate('/hub')}
                className="group flex flex-col items-center justify-center gap-1 rounded-[1.15rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                  <House size={16} weight="duotone" />
                </span>
                Início
              </button>

              <button
                type="button"
                onClick={openCustomerOrdersFromBottomNav}
                className="group flex flex-col items-center justify-center gap-1 rounded-[1.15rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                  <Receipt size={16} weight="duotone" />
                </span>
                Pedidos
              </button>

              <button
                type="button"
                onClick={() => navigate('/hub?panel=condominios')}
                className={`group flex flex-col items-center justify-center gap-1 rounded-[1.15rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03] ${
                  condominiumSlugFromQuery
                    ? 'bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                  condominiumSlugFromQuery
                    ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                }`}>
                  <Tent size={16} weight={condominiumSlugFromQuery ? 'fill' : 'duotone'} />
                </span>
                Feiras
              </button>

              <button
                type="button"
                onClick={() => navigate('/destinos')}
                className="group flex flex-col items-center justify-center gap-1 rounded-[1.15rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                  <MapTrifold size={16} weight="duotone" />
                </span>
                Visite
              </button>

              <button
                type="button"
                onClick={() => navigate('/hub?profile=1')}
                className="group flex flex-col items-center justify-center gap-1 rounded-[1.15rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                  <UserCircle size={16} weight="duotone" />
                </span>
                Perfil
              </button>

            </div>
          </div>
        </nav>
      )}

    </div>
  );
}

