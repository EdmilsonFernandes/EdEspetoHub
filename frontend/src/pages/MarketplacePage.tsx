import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  Star,
  Storefront,
  House,
  Receipt,
  BellRinging,
  List,
  CaretDown,
  Heart,
  CaretRight,
  X,
  Bicycle,
  Sparkle,
  ForkKnife,
  Hamburger,
  Pizza,
  Wine,
  ShoppingCart,
  Pill,
  Cookie,
  Buildings,
  CalendarBlank,
} from '@phosphor-icons/react';
import { storeService } from '../services/storeService';
import { condominiumService } from '../services/condominiumService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerAccountService } from '../services/customerAccountService';
import { featuredService } from '../services/featuredService';
import { mapsService } from '../services/mapsService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
import { formatOrderStatus } from '../utils/format';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { HeaderAvatarTrigger } from '../components/Marketplace/HeaderAvatarTrigger';
import { ProfileDrawer } from '../components/Marketplace/ProfileDrawer';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { SegmentPromoCarousel } from '../components/common/SegmentPromoCarousel';
import { APP_BUILD_INFO } from '../generated/buildInfo';

type MarketplaceStore = {
  id?: string;
  name?: string;
  slug?: string;
  reviewSummary?: {
    totalReviews?: number;
    avgStoreRating?: number;
  } | null;
  settings?: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
    segment?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    isOrderingEnabled?: boolean;
    orderTypes?: string[] | null;
    postalEnabled?: boolean | null;
    openingHours?: Array<{
      day: number;
      enabled?: boolean;
      intervals?: Array<{ start: string; end: string }>;
    }> | null;
  } | null;
  openNow?: boolean;
  nextOpeningLabel?: string | null;
};

type HubCondominium = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  active?: boolean;
  eventSummary?: CondominiumEventSummary | null;
};

type CondominiumEventSummary = {
  id?: string;
  title?: string;
  status?: string;
  state?: 'live' | 'upcoming' | 'finished' | 'none' | string;
  startsAt?: string;
  endsAt?: string;
  pickupLocation?: string | null;
  notes?: string | null;
  canOrderInCondominium?: boolean;
};

const normalizeSegment = (segment?: string | null) =>
  String(segment || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const segmentLabel = (segment?: string | null) => {
  const value = normalizeSegment(segment);
  const map: Record<string, string> = {
    restaurante: 'Restaurante',
    restaurantes: 'Restaurante',
    hamburgueria: 'Hamburguer',
    hamburguerias: 'Hamburguer',
    lanchonete: 'Lanche',
    pizzaria: 'Pizza',
    adega: 'Bebidas',
    mercado: 'Mercado',
    farmacia: 'Farmacia',
    confeitaria: 'Doces',
    outros: 'Empório',
  };
  return map[value] || 'Empório';
};

const parseCityStateFromAddress = (address?: string | null) => {
  const raw = String(address || '').trim();
  if (!raw) return { city: '', state: '' };
  const byPipe = raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const candidates = byPipe.length ? [...byPipe].reverse() : [raw];
  candidates.push(raw);
  const matched = candidates
    .map((target) => target.match(/(.+?)\s*[-/]\s*([A-Za-z]{2})\b/))
    .find(Boolean);
  if (!matched) return { city: '', state: '' };
  return {
    city: String(matched?.[1] || '').trim(),
    state: String(matched?.[2] || '').trim().toUpperCase(),
  };
};

const hashFrom = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeSearchText = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const formatCondominiumEventTime = (event?: CondominiumEventSummary | null) => {
  if (!event?.startsAt) return '';
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) return '';
  const date = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(startsAt).replace('.', '');
  const start = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(startsAt);
  const end = endsAt && !Number.isNaN(endsAt.getTime())
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(endsAt)
    : '';
  return end ? `${date}, ${start}-${end}` : `${date}, ${start}`;
};

const formatCondominiumPickerEventTime = (event?: CondominiumEventSummary | null) => {
  if (!event?.startsAt) return '';
  const startsAt = new Date(event.startsAt);
  const endsAt = event?.endsAt ? new Date(event.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) return '';

  const date = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(startsAt);
  const start = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(startsAt);
  const end = endsAt && !Number.isNaN(endsAt.getTime())
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(endsAt)
    : '';

  return end ? `${date} • ${start}-${end}` : `${date} • ${start}`;
};

const categoryVisuals: Record<string, { icon: typeof Storefront; label: string }> = {
  Restaurante: { icon: ForkKnife, label: 'Restaurante' },
  Hamburguer: { icon: Hamburger, label: 'Hamburguer' },
  Lanche: { icon: Hamburger, label: 'Lanche' },
  Pizza: { icon: Pizza, label: 'Pizza' },
  Bebidas: { icon: Wine, label: 'Bebidas' },
  Mercado: { icon: ShoppingCart, label: 'Mercado' },
  Farmacia: { icon: Pill, label: 'Farmacia' },
  Doces: { icon: Cookie, label: 'Doces' },
  Empório: { icon: ShoppingCart, label: 'Empório' },
};

type FeaturedProduct = {
  id: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string;
  name: string;
  imageUrl: string;
  price: number;
  sponsored?: boolean;
};

const readCustomerSession = () => {
  try {
    const raw = localStorage.getItem('customerSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    
    if (parsed.token && parsed.user) {
      return parsed as {
        token?: string;
        user?: {
          fullName?: string;
          name?: string;
          email?: string;
          profileImageUrl?: string | null;
          profileImageVersion?: number;
        };
      };
    }
    return null;
  } catch {
    return null;
  }
};

const FAVORITES_STORAGE_KEY = 'hub:favorites:stores';
const SELECTED_CONDOMINIUM_STORAGE_KEY = 'hub:selected-condominium';
const DISMISSED_CUSTOMER_ORDERS_KEY = 'hub:dismissed-customer-orders';
const DISMISSED_ANONYMOUS_ORDERS_KEY = 'hub:dismissed-anonymous-orders';
const STORE_PROMO_POPUP_DISMISSED_UNTIL_KEY = 'hub:store-promo-popup-dismissed-until';
const ORDER_EXPIRATION_MS = 3 * 60 * 60 * 1000; // 3 horas
const ACTIVE_ORDER_ALERT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 horas
const STORE_PROMO_POPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas

const readSelectedCondominiumSlug = () => {
  try {
    return String(localStorage.getItem(SELECTED_CONDOMINIUM_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
};

const getOrderStatusTone = (status?: string) => {
  const normalized = String(status || '').trim().toLowerCase();
  const tones: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    preparing: 'bg-[#336886]/10 text-[#336886] ring-1 ring-[#336886]/20',
    ready: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    ready_for_delivery: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    waiting_for_motoboy: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
    in_delivery: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
    dispatched: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    finished: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    cancelled: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  };
  return tones[normalized] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
};

// Interface para pedidos em andamento (cache anônimo)
type ActiveAnonymousOrder = {
  id: string;
  storeSlug: string;
  createdAt: number;
  status?: string;
  storeName?: string;
  accessToken?: string;
  type?: string;
  paymentStatus?: string;
};

const isTerminalRecentOrder = (entry?: {
  status?: string;
  paymentStatus?: string;
}) => {
  const status = String(entry?.status || '').trim().toLowerCase();
  const paymentStatus = String(entry?.paymentStatus || '').trim().toUpperCase();
  if ([ 'done', 'delivered', 'finished', 'cancelled', 'rejected' ].includes(status)) return true;
  if (!status && paymentStatus === 'PAID') return true;
  if (paymentStatus === 'PAID' && [ 'ready', 'dispatched' ].includes(status)) return true;
  return false;
};

export function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [productSearchBySlug, setProductSearchBySlug] = useState<Record<string, string>>({});
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [searchedProducts, setSearchedProducts] = useState<FeaturedProduct[]>([]);
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'free_shipping' | 'nearby' | 'open_now' | 'favorites'>('all');
  const [condominiums, setCondominiums] = useState<HubCondominium[]>([]);
  const [selectedCondominiumSlug, setSelectedCondominiumSlug] = useState(() => readSelectedCondominiumSlug());
  const [condominiumStoreSlugs, setCondominiumStoreSlugs] = useState<string[]>([]);
  const [selectedCondominiumEvent, setSelectedCondominiumEvent] = useState<CondominiumEventSummary | null>(null);
  const [condominiumStoresLoading, setCondominiumStoresLoading] = useState(false);
  const [condominiumPickerOpen, setCondominiumPickerOpen] = useState(false);
  const [condominiumSearch, setCondominiumSearch] = useState('');
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isHeaderElevated, setIsHeaderElevated] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [searchBarRenderKey, setSearchBarRenderKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('panel') === 'condominios') {
      setCondominiumPickerOpen(true);
    }
    if (params.get('favorites') === '1') {
      setQuickFilter('favorites');
    }
  }, [location.search]);
  const [showStorePromoPopup, setShowStorePromoPopup] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Sua região');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => readCustomerSession());
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [distanceByStore, setDistanceByStore] = useState<Record<string, number>>({});
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [activeAnonymousOrders, setActiveAnonymousOrders] = useState<ActiveAnonymousOrder[]>([]);
  const [dismissedCustomerOrderIds, setDismissedCustomerOrderIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_CUSTOMER_ORDERS_KEY) || sessionStorage.getItem(DISMISSED_CUSTOMER_ORDERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  });
  const [dismissedAnonymousOrderIds, setDismissedAnonymousOrderIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_ANONYMOUS_ORDERS_KEY) || sessionStorage.getItem(DISMISSED_ANONYMOUS_ORDERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  });
  const [favoriteStoreSlugs, setFavoriteStoreSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  });
  const touchStartYRef = useRef<number | null>(null);
  const touchPullActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    document.title = 'Hub Já no Caminho';
  }, []);

  useEffect(() => {
    const syncSession = () => setCustomerSession(readCustomerSession());
    const syncCustomSession = (event: Event) => {
      const nextSession = (event as CustomEvent<any>)?.detail;
      if (nextSession?.token && nextSession?.user) {
        setCustomerSession(nextSession);
        return;
      }
      syncSession();
    };
    window.addEventListener('storage', syncSession);
    window.addEventListener('focus', syncSession);
    window.addEventListener('jnc:customer-session-updated', syncCustomSession as EventListener);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('focus', syncSession);
      window.removeEventListener('jnc:customer-session-updated', syncCustomSession as EventListener);
    };
  }, []);

  // Carregar pedidos anônimos do localStorage e reconciliar status real
  useEffect(() => {
    let cancelled = false;
    const hydrateOrders = async () => {
      const now = Date.now();
      const found: ActiveAnonymousOrder[] = [];
      
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('lastOrders:')) {
            const slug = key.replace('lastOrders:', '');
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach(order => {
                const createdAt = Number(order.createdAt || 0);
                if (createdAt && now - createdAt < ORDER_EXPIRATION_MS) {
                  const orderId = String(order?.id || '').trim();
                  if (!orderId) return;
                  const persistedAccessToken = String(
                    order?.accessToken || localStorage.getItem(`orderAccess:${orderId}`) || ''
                  ).trim();
                  found.push({
                    id: orderId,
                    storeSlug: slug,
                    createdAt,
                    status: order?.status ? String(order.status) : undefined,
                    accessToken: persistedAccessToken || undefined,
                    type: order?.type ? String(order.type) : undefined,
                    paymentStatus: order?.paymentStatus ? String(order.paymentStatus) : undefined,
                  });
                }
              });
            }
          }
        });

        const checked = await Promise.all(
          found
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
            .map(async (entry) => {
              try {
                const data = await orderService.getPublicById(entry.id);
                return {
                  ...entry,
                  status: String(data?.status || entry.status || '').trim() || undefined,
                  type: String(data?.type || entry.type || '').trim() || undefined,
                  paymentStatus: String(data?.paymentStatus || entry.paymentStatus || '').trim() || undefined,
                };
              } catch {
                return entry;
              }
            })
        );

        const active = checked.filter((entry) => !isTerminalRecentOrder(entry));
        if (!cancelled) {
          setActiveAnonymousOrders(active);
        }
      } catch (e) {
        console.error('Erro ao carregar pedidos anônimos', e);
      }
    };

    void hydrateOrders();
    const interval = window.setInterval(() => {
      void hydrateOrders();
    }, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStoreSlugs));
    } catch {
      // ignore
    }
  }, [favoriteStoreSlugs]);

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_CUSTOMER_ORDERS_KEY, JSON.stringify(dismissedCustomerOrderIds));
      sessionStorage.setItem(DISMISSED_CUSTOMER_ORDERS_KEY, JSON.stringify(dismissedCustomerOrderIds));
    } catch {
      // ignore
    }
  }, [dismissedCustomerOrderIds]);

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(dismissedAnonymousOrderIds));
      sessionStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(dismissedAnonymousOrderIds));
    } catch {
      // ignore
    }
  }, [dismissedAnonymousOrderIds]);

  useEffect(() => {
    let cancelled = false;
    const resolveUserLabel = async () => {
      if (!userLocation) return;
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.lat}&lon=${userLocation.lng}`,
          { signal: controller.signal }
        );
        window.clearTimeout(timeout);
        const data = await response.json().catch(() => null);
        const addr = data?.address || {};
        const locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.city ||
          addr.town ||
          addr.village ||
          '';
        const state = (addr.state_code || addr.state || '').toString();
        const nextLabel = [locality, state].filter(Boolean).join(' - ').trim();
        if (!cancelled && nextLabel) setLocationLabel(nextLabel);
      } catch (_error) {
        if (!cancelled) setLocationLabel('Sua região');
      }
    };
    resolveUserLabel();
    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const timer = window.setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
          });
        },
        () => {
          setUserLocation(null);
        },
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 10 * 60 * 1000 }
      );
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  const loadPortfolio = useCallback(async () => {
    const data = await storeService.listPortfolio();
    setStores(Array.isArray(data) ? data : []);
    setError('');
  }, []);

  const refreshHub = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o Hub agora.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadPortfolio]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadPortfolio()
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Não foi possível carregar o Hub de lojas agora.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadPortfolio]);

  useEffect(() => {
    let active = true;
    condominiumService
      .listPublic()
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? data : [];
        setCondominiums(items);
      })
      .catch(() => {
        if (!active) return;
        setCondominiums([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const slug = String(selectedCondominiumSlug || '').trim();
    try {
      if (slug) {
        localStorage.setItem(SELECTED_CONDOMINIUM_STORAGE_KEY, slug);
      } else {
        localStorage.removeItem(SELECTED_CONDOMINIUM_STORAGE_KEY);
      }
    } catch {
      // ignore
    }

    if (!slug) {
      setCondominiumStoreSlugs([]);
      setSelectedCondominiumEvent(null);
      setCondominiumStoresLoading(false);
      return;
    }

    let active = true;
    setCondominiumStoresLoading(true);
    condominiumService
      .listStores(slug)
      .then((data) => {
        if (!active) return;
        const storesFromCondo = Array.isArray(data?.stores) ? data.stores : [];
        setSelectedCondominiumEvent(data?.event || data?.condominium?.eventSummary || null);
        setCondominiumStoreSlugs(
          storesFromCondo
            .map((store: any) => String(store?.slug || '').trim())
            .filter(Boolean)
        );
      })
      .catch(() => {
        if (!active) return;
        setCondominiumStoreSlugs([]);
        setSelectedCondominiumEvent(null);
      })
      .finally(() => {
        if (!active) return;
        setCondominiumStoresLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCondominiumSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(normalizeSearchText(query)), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (selectedCondominiumSlug) return;
    setSearchBarRenderKey((current) => current + 1);
  }, [selectedCondominiumSlug]);

  useEffect(() => {
    if (featuredProducts.length <= 8) {
      setFeaturedOffset(0);
      return;
    }
    const timer = window.setInterval(() => {
      setFeaturedOffset((prev) => (prev + 1) % featuredProducts.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [featuredProducts]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setHasEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const restoreHubHeader = () => {
      setHasEntered(true);
      setIsHeaderElevated((window.scrollY || 0) > 6);
      setSearchBarRenderKey((current) => current + 1);
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        restoreHubHeader();
      }
    };

    restoreHubHeader();
    window.addEventListener('pageshow', restoreHubHeader);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pageshow', restoreHubHeader);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const delta = currentY - lastY;
        if (delta > 8 && currentY > 120) setIsBottomNavVisible(false);
        if (delta < -8) setIsBottomNavVisible(true);
        setIsHeaderElevated(currentY > 8);
        lastY = currentY;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 2 || isRefreshing) return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      touchPullActiveRef.current = touchStartYRef.current != null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchPullActiveRef.current || touchStartYRef.current == null) return;
      const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
      const delta = currentY - touchStartYRef.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const withResistance = Math.min(120, delta * 0.45);
      pullDistanceRef.current = withResistance;
      setPullDistance(withResistance);
    };

    const onTouchEnd = () => {
      if (!touchPullActiveRef.current) {
        setPullDistance(0);
        return;
      }
      touchPullActiveRef.current = false;
      touchStartYRef.current = null;
      const shouldRefresh = pullDistanceRef.current >= 68;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      if (shouldRefresh) {
        refreshHub();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isRefreshing, refreshHub]);

  const enrichedStores = useMemo(() => {
    return (stores || [])
      .map((store, index) => {
        const slug = String(store?.slug || '').trim();
        if (!slug) return null;
        const seed = hashFrom(`${slug}-${store?.name || ''}`);
        const rawCity = String((store as any)?.settings?.city || '').trim();
        const rawState = String((store as any)?.settings?.state || '').trim().toUpperCase();
        const fallbackLocation = parseCityStateFromAddress((store as any)?.settings?.address || '');
        const city = rawCity || fallbackLocation.city || 'Perto de você';
        const state = rawState || fallbackLocation.state;
        const segment = segmentLabel(store?.settings?.segment);
        const rating = Number(store?.reviewSummary?.avgStoreRating || 0) > 0
          ? Number(store?.reviewSummary?.avgStoreRating)
          : 4.6 + ((seed % 5) * 0.1);
        const distanceKm = 0.8 + (seed % 52) / 10;
        const etaMin = 18 + (seed % 18);
        const etaMax = etaMin + 10;
        const rawOrderTypes = Array.isArray(store?.settings?.orderTypes)
          ? (store?.settings?.orderTypes as unknown[])
              .map((value) => String(value || '').trim().toLowerCase())
              .filter(Boolean)
          : [];
        const supportsDelivery = rawOrderTypes.includes('delivery');
        const supportsPickup = rawOrderTypes.includes('pickup');
        const supportsTable = rawOrderTypes.includes('table');
        const supportsPostal = supportsDelivery && Boolean(store?.settings?.postalEnabled);
        const deliveryFeeValue = Number((store?.settings as any)?.deliveryFee ?? (store?.settings as any)?.delivery_fee);
        const freeShipping = supportsDelivery && Number.isFinite(deliveryFeeValue) && deliveryFeeValue <= 0;
        const rawHours = Array.isArray(store?.settings?.openingHours) ? (store?.settings?.openingHours as any[]) : [];
        const isOpen =
          typeof store?.openNow === 'boolean'
            ? store.openNow
            : (rawHours.length > 0
                ? isStoreOpenNow(normalizeOpeningHours(rawHours as any) as any)
                : true);
        const rawLogo = (store?.settings as any)?.logoUrl || (store?.settings as any)?.logo_url || (store as any)?.logoUrl || (store as any)?.logo_url;
        const logo = resolveAssetUrl(rawLogo || undefined) || getStoreAvatarUrl(store?.slug, store?.name);
        
        const rawBanner = (store?.settings as any)?.bannerUrl || (store?.settings as any)?.banner_url || (store as any)?.bannerUrl || (store as any)?.banner_url;
        const banner = resolveAssetUrl(rawBanner || undefined) || logo;

        // DEBUG LOG PARA HUB NO APK
        const isMobileDebug = typeof window !== 'undefined' && 
          (window.location.origin.includes('localhost') || window.location.origin.startsWith('capacitor://'));
        if (isMobileDebug && index < 5) {
          console.log(`[HubStore] ${store?.name || slug}: RawLogo=${rawLogo}, Resolved=${logo}`);
        }

        const searchIndex = normalizeSearchText([store?.name, slug, segment, city, state].filter(Boolean).join(' '));
        const productSearchIndex = productSearchBySlug[slug] || '';
        return {
          id: String(store?.id || slug || index),
          name: String(store?.name || 'Loja'),
          slug,
          segment,
          city,
          state,
          rating,
          distanceKm,
          etaMin,
          etaMax,
          freeShipping,
          isOpen,
          supportsDelivery,
          supportsPickup,
          supportsTable,
          supportsPostal,
          nextOpeningLabel: String(store?.nextOpeningLabel || '').trim(),
          primaryColor: String(store?.settings?.primaryColor || '').trim(),
          secondaryColor: String(store?.settings?.secondaryColor || '').trim(),
          addressText: [
            String((store as any)?.settings?.address || '').trim(),
            String((store as any)?.settings?.city || '').trim(),
            String((store as any)?.settings?.state || '').trim(),
          ]
            .filter(Boolean)
            .join(', '),
          logo,
          banner,
          searchIndex,
          productSearchIndex,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      slug: string;
      segment: string;
      city: string;
      state: string;
      rating: number;
      distanceKm: number;
      etaMin: number;
      etaMax: number;
      freeShipping: boolean;
      isOpen: boolean;
      supportsDelivery: boolean;
      supportsPickup: boolean;
      supportsTable: boolean;
      supportsPostal: boolean;
      nextOpeningLabel: string;
      primaryColor: string;
      secondaryColor: string;
      addressText: string;
      logo: string;
      banner: string;
      searchIndex: string;
      productSearchIndex: string;
    }>;
  }, [productSearchBySlug, stores]);

  const scopedEnrichedStores = useMemo(() => {
    if (!selectedCondominiumSlug) return enrichedStores;
    const condominiumSlugSet = new Set(condominiumStoreSlugs);
    return enrichedStores.filter((store) => condominiumSlugSet.has(store.slug));
  }, [enrichedStores, condominiumStoreSlugs, selectedCondominiumSlug]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchedProducts([]);
      return;
    }
    if (scopedEnrichedStores.length === 0) return;
    
    const missingStores = scopedEnrichedStores.filter((store) => !Object.prototype.hasOwnProperty.call(productSearchBySlug, store.slug));
    
    let cancelled = false;
    const loadProductIndexes = async () => {
      setProductSearchLoading(true);
      const batchSize = 4;
      try {
        const allMatchedProducts: FeaturedProduct[] = [];
        
        // Se já temos índices carregados para algumas lojas, vamos filtrar nelas primeiro
        const existingSlugs = Object.keys(productSearchBySlug);
        for (const slug of existingSlugs) {
          const store = scopedEnrichedStores.find(s => s.slug === slug);
          if (!store) continue;
          
          // Como não temos os objetos de produto no índice (apenas texto), 
          // precisamos buscar novamente ou teríamos que mudar a estrutura do índice.
          // Para ser fiel ao pedido, vamos buscar os produtos das lojas que deram match no índice.
          if (productSearchBySlug[slug].includes(debouncedQuery)) {
             try {
               const products = await productService.listPublicBySlug(slug);
               const matches = (Array.isArray(products) ? products : [])
                 .filter((p: any) => 
                   normalizeSearchText(p.name).includes(debouncedQuery) || 
                   normalizeSearchText(p.description || p.desc).includes(debouncedQuery)
                 )
                 .map((p: any) => ({
                   id: String(p.id || `${slug}-${p.name}`),
                   storeSlug: slug,
                   storeName: store.name,
                   name: String(p.name || 'Produto'),
                   storeLogo: store.logo,
                   imageUrl: resolveAssetUrl(p.imageUrl || undefined) || store.logo,
                   price: Number((p.promoActive && p.promoPrice != null ? p.promoPrice : p.price) || 0),
                   sponsored: false,
                 }));
               allMatchedProducts.push(...matches);
             } catch (e) {
               console.error(`Erro ao buscar produtos da loja ${slug}`, e);
             }
          }
        }

        if (!cancelled) setSearchedProducts(allMatchedProducts.slice(0, 20));

        // Agora carrega para as lojas que ainda não têm índice
        for (let start = 0; start < missingStores.length && !cancelled; start += batchSize) {
          const batch = missingStores.slice(start, start + batchSize);
          const results = await Promise.all(
            batch.map(async (store) => {
              try {
                const products = await productService.listPublicBySlug(store.slug);
                const productList = Array.isArray(products) ? products : [];
                
                // Captura produtos que dão match
                const matches = productList
                  .filter((p: any) => 
                    normalizeSearchText(p.name).includes(debouncedQuery) || 
                    normalizeSearchText(p.description || p.desc).includes(debouncedQuery)
                  )
                  .map((p: any) => ({
                    id: String(p.id || `${store.slug}-${p.name}`),
                    storeSlug: store.slug,
                    storeName: store.name,
                    name: String(p.name || 'Produto'),
                    storeLogo: store.logo,
                    imageUrl: resolveAssetUrl(p.imageUrl || undefined) || store.logo,
                    price: Number((p.promoActive && p.promoPrice != null ? p.promoPrice : p.price) || 0),
                    sponsored: false,
                  }));
                
                if (matches.length > 0 && !cancelled) {
                  setSearchedProducts(prev => [...prev, ...matches].slice(0, 24));
                }

                const index = normalizeSearchText(
                  productList
                    .map((product: any) =>
                      [
                        product?.name,
                        product?.description,
                        product?.desc,
                        product?.category,
                      ]
                        .filter(Boolean)
                        .join(' ')
                    )
                    .join(' ')
                );
                return [store.slug, index] as const;
              } catch {
                return [store.slug, ''] as const;
              }
            })
          );
          if (!cancelled) {
            setProductSearchBySlug((prev) => ({
              ...prev,
              ...Object.fromEntries(results),
            }));
          }
        }
      } finally {
        if (!cancelled) setProductSearchLoading(false);
      }
    };

    void loadProductIndexes();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, scopedEnrichedStores]);

  const segmentOptions = useMemo(() => {
    return Array.from(new Set(scopedEnrichedStores.map((item) => item.segment))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [scopedEnrichedStores]);

  const fallbackRegionLabel = useMemo(() => {
    const firstWithLocation = scopedEnrichedStores.find((store) => String(store.city || '').trim() && String(store.state || '').trim());
    if (!firstWithLocation) return '';
    return `${firstWithLocation.city} - ${firstWithLocation.state}`;
  }, [scopedEnrichedStores]);

  const selectedCondominium = useMemo(() => {
    const slug = String(selectedCondominiumSlug || '').trim();
    if (!slug) return null;
    return condominiums.find((item) => String(item?.slug || '').trim() === slug) || null;
  }, [condominiums, selectedCondominiumSlug]);

  const activeCondominiumEvent = selectedCondominiumEvent || selectedCondominium?.eventSummary || null;
  const isCondominiumEventLive = activeCondominiumEvent?.state === 'live';
  const hasUpcomingCondominiumEvent = activeCondominiumEvent?.state === 'upcoming';
  const condominiumEventTimeLabel = formatCondominiumEventTime(activeCondominiumEvent);
  const selectedCondominiumLogoUrl = selectedCondominium
    ? resolveAssetUrl(selectedCondominium.logoUrl || selectedCondominium.bannerUrl || undefined) || getStoreAvatarUrl(selectedCondominium.slug || 'condominio', selectedCondominium.name || 'Condomínio')
    : '';
  const selectedCondominiumBannerUrl = selectedCondominium
    ? resolveAssetUrl(selectedCondominium.bannerUrl || selectedCondominium.logoUrl || undefined) || ''
    : '';
  const condominiumPreviewLogos = useMemo(() => {
    return condominiums.slice(0, 3).map((condominium) => {
      const slug = String(condominium?.slug || 'condominio');
      const name = String(condominium?.name || 'Condomínio');
      return resolveAssetUrl(condominium.logoUrl || condominium.bannerUrl || undefined) || getStoreAvatarUrl(slug, name);
    });
  }, [condominiums]);

  const filteredCondominiums = useMemo(() => {
    const search = normalizeSearchText(condominiumSearch);
    const items = condominiums
      .map((condominium) => {
        const slug = String(condominium?.slug || '').trim();
        const name = String(condominium?.name || 'Condomínio').trim();
        const region = [condominium.city, condominium.state].map((item) => String(item || '').trim()).filter(Boolean).join(' - ');
        const index = normalizeSearchText([name, slug, region, condominium.address, condominium.description].filter(Boolean).join(' '));
        return { condominium, slug, name, region, index, event: condominium.eventSummary || null };
      })
      .filter((item) => item.slug);

    if (!search) return items;
    return items.filter((item) => item.index.includes(search));
  }, [condominiums, condominiumSearch]);

  const filteredStores = useMemo(() => {
    return scopedEnrichedStores
      .filter((store) => {
        if (debouncedQuery && !store.searchIndex.includes(debouncedQuery) && !store.productSearchIndex.includes(debouncedQuery)) return false;
        if (segmentFilter !== 'all' && store.segment !== segmentFilter) return false;
        if (quickFilter === 'free_shipping' && !store.freeShipping) return false;
        if (quickFilter === 'nearby' && store.distanceKm > 2.5) return false;
        if (quickFilter === 'open_now' && !store.isOpen) return false;
        if (quickFilter === 'favorites' && !favoriteStoreSlugs.includes(store.slug)) return false;
        return true;
      })
      .sort((a, b) => {
        const favoritesDelta = Number(favoriteStoreSlugs.includes(b.slug)) - Number(favoriteStoreSlugs.includes(a.slug));
        if (favoritesDelta !== 0) return favoritesDelta;
        return Number(b.isOpen) - Number(a.isOpen);
      });
  }, [scopedEnrichedStores, debouncedQuery, segmentFilter, quickFilter, favoriteStoreSlugs]);

  const categoryTiles = useMemo(() => {
    return segmentOptions.map((segment) => categoryVisuals[segment] || { icon: Storefront, label: segment });
  }, [segmentOptions]);

  const favoriteStores = useMemo(() => {
    if (!favoriteStoreSlugs.length) return [];
    return scopedEnrichedStores
      .filter((store) => favoriteStoreSlugs.includes(store.slug))
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || b.rating - a.rating);
  }, [scopedEnrichedStores, favoriteStoreSlugs]);

  useEffect(() => {
    let cancelled = false;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      return R * c;
    };

    const loadApproxDistances = async () => {
      if (!userLocation || scopedEnrichedStores.length === 0) return;
      setDistanceLoading(true);
      try {
        const targets = scopedEnrichedStores.slice(0, 8).filter((store) => store.addressText.length >= 8);
        const settled = await Promise.allSettled(
          targets.map(async (store) => {
            const geo = await mapsService.geocode(store.addressText);
            const km = haversineKm(userLocation, { lat: geo.lat, lng: geo.lng });
            return [store.id, km] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, number> = {};
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            next[result.value[0]] = result.value[1];
          }
        });
        setDistanceByStore(next);
      } catch (_err) {
        if (!cancelled) setDistanceByStore({});
      } finally {
        if (!cancelled) setDistanceLoading(false);
      }
    };
    const timer = window.setTimeout(loadApproxDistances, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [userLocation, scopedEnrichedStores]);

  useEffect(() => {
    let cancelled = false;
    const loadFeaturedProducts = async () => {
      if (scopedEnrichedStores.length === 0) {
        setFeaturedProducts([]);
        return;
      }
      setFeaturedLoading(true);
      try {
        const sponsored = await featuredService.listPublicFeatured(10).catch(() => []);
        const sponsoredEntries = (Array.isArray(sponsored) ? sponsored : [])
          .filter((item: any) => String(item?.storeSlug || '').trim())
          .map((item: any) => ({
            id: String(item?.id || `${item?.storeSlug}-${item?.productId || item?.productName || 'sponsored'}`),
            storeSlug: String(item?.storeSlug || ''),
            storeName: String(item?.storeName || 'Loja'),
            name: String(item?.productName || 'Produto em destaque'),
            storeLogo: resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho-logo.png',
            imageUrl:
              resolveAssetUrl(item?.imageUrl || undefined) ||
              resolveAssetUrl(item?.storeLogoUrl || undefined) ||
              getStoreAvatarUrl(item?.storeSlug, item?.storeName),
            price: Number(item?.price || 0),
            sponsored: true,
          }))
          .filter((item: any) => item.storeSlug && item.price > 0);

        const candidates = scopedEnrichedStores.slice(0, 4);
        const responses = await Promise.allSettled(
          candidates.map(async (store) => {
            const products = await productService.listPublicBySlug(store.slug);
            const valid = (Array.isArray(products) ? products : [])
              .filter((product: any) => Boolean(product?.name) && Number(product?.price || product?.promoPrice || 0) > 0)
              .map((product: any) => ({
                id: String(product?.id || `${store.slug}-${product?.name}`),
                storeSlug: store.slug,
                storeName: store.name,
                name: String(product?.name || 'Produto'),
                storeLogo: store.logo,
                imageUrl: resolveAssetUrl(product?.imageUrl || undefined) || store.logo,
                price: Number(
                  (product?.promoActive && product?.promoPrice != null ? product?.promoPrice : product?.price) || 0
                ),
                featured: Boolean(product?.isFeatured),
                sponsored: false,
              }))
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 5);
            return valid;
          })
        );
        if (cancelled) return;
        const organicPool = responses
          .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
          .filter((entry) => entry.price > 0)
          .map(({ featured: _featured, ...entry }) => entry);
        const sponsoredKeys = new Set(
          sponsoredEntries.map((entry: any) => `${entry.storeSlug}::${entry.id}::${entry.name}`)
        );
        const uniqueOrganic = organicPool.filter(
          (entry: any) => !sponsoredKeys.has(`${entry.storeSlug}::${entry.id}::${entry.name}`)
        );
        const shuffledOrganic = [...uniqueOrganic].sort(() => Math.random() - 0.5);
        const merged = [...sponsoredEntries, ...shuffledOrganic].slice(0, 18);
        setFeaturedProducts(merged);
      } catch (_error) {
        if (!cancelled) setFeaturedProducts([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    };
    const timer = window.setTimeout(loadFeaturedProducts, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scopedEnrichedStores]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    []
  );

  const genericHighlightLabel = useMemo(() => {
    const hasFoodHeavy = scopedEnrichedStores.some((store) =>
      [ 'Restaurante', 'Hamburguer', 'Lanche', 'Pizza', 'Doces' ].includes(store.segment)
    );
    return hasFoodHeavy ? 'Itens em destaque' : 'Produtos em destaque';
  }, [scopedEnrichedStores]);

  const formatDistance = (km: number) => {
    if (!Number.isFinite(km) || km <= 0) return 'Região';
    if (km > 50) return 'Região';
    if (km < 1) return `${Math.max(100, Math.round(km * 1000 / 100) * 100)} m`;
    return `${km.toFixed(1)} km`;
  };

  const displayedFeaturedProducts = useMemo(() => {
    const items = Array.isArray(featuredProducts) ? featuredProducts : [];
    const sponsored = items.filter((item) => item.sponsored);
    const organic = items.filter((item) => !item.sponsored);
    const windowSize = 8;
    if (items.length <= windowSize) return items;
    if (organic.length === 0) return sponsored.slice(0, windowSize);

    const fixedSponsored = sponsored.slice(0, Math.min(windowSize, sponsored.length));
    const remainingSlots = Math.max(0, windowSize - fixedSponsored.length);
    if (remainingSlots === 0) return fixedSponsored;

    const rotatedOrganic: FeaturedProduct[] = [];
    for (let i = 0; i < remainingSlots; i += 1) {
      rotatedOrganic.push(organic[(featuredOffset + i) % organic.length]);
    }
    return [...fixedSponsored, ...rotatedOrganic];
  }, [featuredProducts, featuredOffset]);

  const isCustomerLogged = Boolean(customerSession?.token);
  const customerDisplayName = String(
    customerSession?.user?.fullName || customerSession?.user?.name || (isCustomerLogged ? 'Cliente' : 'Anônimo')
  ).trim();
  const customerEmail = String(customerSession?.user?.email || '').trim();
  const customerProfileImage = useMemo(() => {
    const baseUrl = resolveAssetUrl(customerSession?.user?.profileImageUrl || undefined);
    const version = Number(customerSession?.user?.profileImageVersion || 0);
    if (!baseUrl) return undefined;
    if (!version) return baseUrl;
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${version}`;
  }, [customerSession?.user?.profileImageUrl, customerSession?.user?.profileImageVersion]);
  const displayLocationLabel = locationLabel === 'Sua região' && fallbackRegionLabel ? fallbackRegionLabel : locationLabel;

  const openCustomerAccount = useCallback(() => {
    navigate('/cliente/conta');
  }, [navigate]);

  const openCustomerSettings = useCallback(() => {
    navigate('/cliente/conta?section=settings');
  }, [navigate]);

  const openCustomerOrders = useCallback(() => {
    navigate('/cliente/pedidos');
  }, [navigate]);

  const openCustomerLogin = useCallback(() => {
    navigate('/cliente?mode=login&next=/hub&hub=1');
  }, [navigate]);

  const openAdminLogin = useCallback(() => {
    navigate('/admin');
  }, [navigate]);

  const openMotoboyLogin = useCallback(() => {
    navigate('/motoboy/login');
  }, [navigate]);

  const openTerms = useCallback(() => {
    navigate('/terms?from=hub');
  }, [navigate]);

  const openPrivacy = useCallback(() => {
    navigate('/terms?from=hub#lgpd');
  }, [navigate]);

  const openHelp = useCallback(() => {
    window.location.href = 'mailto:contato@janocaminho.com.br?subject=Ajuda%20-%20Ja%20no%20Caminho';
  }, []);

  const handleCustomerLogout = useCallback(() => {
    localStorage.removeItem('customerSession');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('customerSession_')) localStorage.removeItem(key);
    });
    setCustomerSession(null);
    navigate('/hub');
  }, [navigate]);

  const handleDeactivateAccount = useCallback(async () => {
    setDeactivating(true);
    try {
      await customerAccountService.deactivate();
      setShowDeactivateModal(false);
      handleCustomerLogout();
    } catch (e: any) {
      alert(e?.message || 'Erro ao desativar conta.');
    } finally {
      setDeactivating(false);
    }
  }, [handleCustomerLogout]);

  const toggleFavoriteStore = useCallback((slug: string) => {
    const normalized = String(slug || '').trim();
    if (!normalized) return;
    setFavoriteStoreSlugs((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized);
      return [normalized, ...prev].slice(0, 200);
    });
  }, []);

  const resetMarketplaceFilters = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setQuickFilter('all');
    setSegmentFilter('all');
  }, []);

  const selectCondominium = useCallback((slug: string) => {
    const normalized = String(slug || '').trim();
    setSelectedCondominiumSlug((current) => (current === normalized ? '' : normalized));
    setCondominiumPickerOpen(false);
    setCondominiumSearch('');
    resetMarketplaceFilters();
  }, [resetMarketplaceFilters]);

  const clearCondominiumSelection = useCallback(() => {
    setSelectedCondominiumSlug('');
    setCondominiumSearch('');
    resetMarketplaceFilters();
  }, [resetMarketplaceFilters]);

  const handleHomeHubNavigation = useCallback(() => {
    clearCondominiumSelection();
    setCondominiumPickerOpen(false);
    setSearchBarRenderKey((current) => current + 1);
    navigate('/hub');
  }, [clearCondominiumSelection, navigate]);

  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  const clearAnonymousOrderCache = useCallback((orderIds: string[]) => {
    const ids = orderIds.map((item) => String(item || '').trim()).filter(Boolean);
    if (!ids.length) return;
    try {
      Object.keys(localStorage).forEach((key) => {
        if (!key.startsWith('lastOrders:')) return;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const next = parsed.filter((entry) => !ids.includes(String(entry?.id || '').trim()));
        if (next.length > 0) {
          localStorage.setItem(key, JSON.stringify(next));
        } else {
          localStorage.removeItem(key);
        }
      });
      ids.forEach((id) => localStorage.removeItem(`orderAccess:${id}`));
      ids.forEach((id) => sessionStorage.removeItem(`orderAccess:${id}`));
    } catch {
      // ignore
    }
  }, []);

  const visibleActiveOrders = useMemo(
    () => activeOrders.filter((order) => !dismissedCustomerOrderIds.includes(String(order?.id || '').trim())),
    [activeOrders, dismissedCustomerOrderIds]
  );

  const visibleActiveAnonymousOrders = useMemo(
    () => activeAnonymousOrders.filter((order) => !dismissedAnonymousOrderIds.includes(String(order?.id || '').trim())),
    [activeAnonymousOrders, dismissedAnonymousOrderIds]
  );

  const hubNotificationCount = visibleActiveOrders.length + visibleActiveAnonymousOrders.length;

  const handleHubNotificationClick = useCallback(() => {
    if (visibleActiveOrders.length > 0) {
      openCustomerOrders();
      return;
    }
    const anonymousOrderId = String(visibleActiveAnonymousOrders[0]?.id || '').trim();
    if (anonymousOrderId) {
      navigate(`/pedido/${anonymousOrderId}`);
      return;
    }
    if (isCustomerLogged) {
      openCustomerOrders();
      return;
    }
    openCustomerLogin();
  }, [isCustomerLogged, navigate, openCustomerLogin, openCustomerOrders, visibleActiveAnonymousOrders, visibleActiveOrders]);

  const loadActiveOrders = useCallback(async () => {
    const session = readCustomerSession();
    if (!session?.token) {
      setActiveOrders([]);
      return;
    }
    try {
      const orders = await customerAccountService.listOrders();
      const active = (orders || []).filter((o: any) => {
        const status = String(o.status || '').toLowerCase();
        const createdAt = new Date(o?.createdAt || 0).getTime();
        const isRecentEnough = Number.isFinite(createdAt) ? (Date.now() - createdAt) < ACTIVE_ORDER_ALERT_MAX_AGE_MS : true;
        return isRecentEnough && !['done', 'delivered', 'finished', 'cancelled', 'rejected'].includes(status);
      });
      setActiveOrders(active.slice(0, 3));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadActiveOrders, 1200);
    const interval = window.setInterval(loadActiveOrders, 30000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [loadActiveOrders]);

  useEffect(() => {
    if (loading) return;
    const timeout = window.setTimeout(() => {
      try {
        const dismissedUntil = Number(localStorage.getItem(STORE_PROMO_POPUP_DISMISSED_UNTIL_KEY) || 0);
        if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) return;
      } catch {
        // ignore
      }
      setShowStorePromoPopup(true);
    }, 5200);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  const dismissStorePromoPopup = useCallback(() => {
    setShowStorePromoPopup(false);
    try {
      localStorage.setItem(STORE_PROMO_POPUP_DISMISSED_UNTIL_KEY, String(Date.now() + STORE_PROMO_POPUP_COOLDOWN_MS));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden overscroll-x-none bg-[radial-gradient(circle_at_top_right,rgba(51,104,134,0.10),transparent_30%),linear-gradient(180deg,#F8F9FB_0%,#FFFFFF_46%,#F8F9FB_100%)] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] text-slate-900 sm:pb-24">
      {/* Elemento Decorativo de Fundo (Premium Look) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[max(env(safe-area-inset-top),0.75rem)] bg-[#F8F9FB]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-[#336886]/8 via-white/30 to-transparent" />
      <div className="fixed left-[-8%] top-[10%] h-[28%] w-[38%] rounded-full bg-white/80 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed top-[-10%] right-[-10%] h-[40%] w-[50%] bg-[#336886]/14 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div
        className={`pointer-events-none fixed left-1/2 z-[120] -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 ${
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ top: `${Math.max(8, 8 + pullDistance * 0.35)}px` }}
      >
        {isRefreshing ? 'Atualizando...' : pullDistance >= 68 ? 'Solte para atualizar' : 'Puxe para atualizar'}
      </div>

      {showStorePromoPopup && !profileDrawerOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/48 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Criar loja no Já no Caminho"
        >
          <div className="relative w-full max-w-[430px] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200">
            <button
              type="button"
              onClick={dismissStorePromoPopup}
              className="absolute -right-2 -top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white text-slate-900 shadow-[0_14px_30px_-14px_rgba(15,23,42,0.45)] transition-all duration-150 ease-out hover:bg-slate-50 active:scale-95"
              aria-label="Fechar propaganda"
              title="Fechar"
            >
              <X size={19} weight="bold" />
            </button>
            <Link
              to="/create?plan=trial"
              onClick={dismissStorePromoPopup}
              className="group block overflow-hidden rounded-[1.85rem] border border-white/80 bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.72)] transition-all duration-200 ease-out active:scale-[0.985]"
              aria-label="Criar minha loja no Já no Caminho"
            >
              <div className="relative aspect-[16/9] bg-slate-950">
                <img
                  src="/marketing/promo-marketing-lite.jpg"
                  alt="Planos para criar loja no Já no Caminho"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/35 to-transparent opacity-80 transition-opacity duration-200 group-active:opacity-100" />
              </div>
            </Link>
          </div>
        </div>
      )}
      
      <ProfileDrawer
        isOpen={profileDrawerOpen}
        isLogged={isCustomerLogged}
        userName={customerDisplayName || 'Anônimo'}
        userEmail={customerEmail}
        profileImageUrl={customerProfileImage}
        onClose={() => setProfileDrawerOpen(false)}
        onLogin={openCustomerLogin}
        onOpenAdminLogin={openAdminLogin}
        onOpenMotoboyLogin={openMotoboyLogin}
        onOpenAccount={openCustomerAccount}
        onOpenSettings={openCustomerSettings}
        onOpenOrders={openCustomerOrders}
        onOpenTerms={openTerms}
        onOpenPrivacy={openPrivacy}
        onOpenHelp={openHelp}
        onLogout={handleCustomerLogout}
        versionLabel={APP_BUILD_INFO.versionLabel}
      />

      <div
        className={`relative transition-all duration-700 ${
          hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <header className={`sticky top-0 z-[60] transition-all duration-500 ${isHeaderElevated ? 'bg-[#F8F9FB]/92 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] backdrop-blur-2xl' : 'bg-transparent'}`}>
          <div className="mx-auto max-w-[1200px] px-4 pb-3 pt-[max(0.85rem,calc(env(safe-area-inset-top)+0.2rem))]">
            <div className="space-y-3 rounded-[1.7rem] border border-white/80 bg-white/72 px-2 py-2.5 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.34)] backdrop-blur-xl">
            {/* Linha 1: Perfil e Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeaderAvatarTrigger
                  displayName={customerDisplayName}
                  profileImageUrl={customerProfileImage}
                  hasNotification={!isCustomerLogged}
                  onClick={() => setProfileDrawerOpen(true)}
                />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entregar em</p>
                  <button
                    type="button"
                    className="inline-flex min-w-0 items-center gap-1 text-[14px] font-black text-slate-950 transition-colors duration-150 ease-out hover:text-[#336886] active:scale-[0.99]"
                    onClick={() => setQuickFilter((prev) => (prev === 'nearby' ? 'all' : 'nearby'))}
                  >
                    <span className="truncate">{displayLocationLabel}</span>
                    <CaretDown size={14} weight="bold" className="shrink-0 text-[#336886]" />
                  </button>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleHubNotificationClick}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/92 text-slate-700 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.42)] ring-1 ring-slate-950/5 backdrop-blur-sm transition-all duration-150 ease-out hover:text-[#336886] active:scale-95"
                aria-label={hubNotificationCount > 0 ? `${hubNotificationCount} notificação de pedido` : 'Abrir notificações'}
                title={hubNotificationCount > 0 ? 'Pedidos em andamento' : 'Notificações'}
              >
                <BellRinging size={20} weight={hubNotificationCount > 0 ? 'fill' : 'duotone'} />
                {hubNotificationCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white shadow-[0_8px_18px_-10px_rgba(225,29,72,0.9)]">
                    {hubNotificationCount > 9 ? '9+' : hubNotificationCount}
                  </span>
                ) : null}
                {hubNotificationCount > 0 ? (
                  <span className="absolute inset-0 rounded-full border border-rose-600/35 animate-ping" />
                ) : null}
              </button>
            </div>

            {/* Linha 2: Busca Premium */}
            <div className="relative z-20 px-0.5">
              <div key={searchBarRenderKey} className="group relative isolate flex h-13 min-h-[52px] items-center gap-3 overflow-hidden rounded-[22px] border border-slate-200/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,248,252,0.98)_100%)] px-4 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.2)] ring-1 ring-white/80 transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out hover:border-slate-300/80 hover:bg-white focus-within:border-[#336886]/25 focus-within:bg-white focus-within:shadow-[0_18px_36px_-22px_rgba(51,104,134,0.22)] focus-within:ring-2 focus-within:ring-[#336886]/10 [transform:translateZ(0)]">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#336886]/10 bg-[#336886]/8 text-[#336886] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <MagnifyingGlass size={18} weight="bold" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar loja, categoria ou produto"
                  autoComplete="off"
                  inputMode="search"
                  enterKeyHint="search"
                  className="block h-full min-w-0 flex-1 appearance-none bg-transparent pr-1 text-[14px] font-semibold text-slate-950 opacity-100 outline-none placeholder:text-slate-400"
                  style={{ WebkitAppearance: 'none', WebkitTextFillColor: '#020617', visibility: 'visible' }}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setDebouncedQuery('');
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 active:scale-95"
                    aria-label="Limpar busca"
                    title="Limpar"
                  >
                    <X size={14} weight="bold" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Linha 3: Filtros Minimalistas (Pílulas) */}
            <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar scrollbar-hide px-1 py-1.5">
              {['all', 'free_shipping', 'nearby', 'open_now', 'favorites'].map((filter) => {
                const label =
                  filter === 'all' ? 'Ver Todos' :
                  filter === 'free_shipping' ? 'Frete Grátis' :
                  filter === 'nearby' ? 'Perto de Você' :
                  filter === 'favorites' ? 'Favoritos' : 'Abertos Agora';
                const active = quickFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setQuickFilter(filter as any)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] transition-all duration-150 ease-out active:scale-[0.97] ${
                      active
                        ? 'bg-[#336886] text-white shadow-[0_10px_24px_-14px_rgba(51,104,134,0.68)] font-black'
                        : 'bg-white/90 text-slate-600 border border-slate-100 hover:bg-white font-bold shadow-[0_6px_16px_-14px_rgba(15,23,42,0.28)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                  setSegmentFilter('all');
                  setQuickFilter('all');
                }}
                className="whitespace-nowrap rounded-full border border-slate-100 bg-white/90 px-3.5 py-1.5 text-[12px] font-bold text-slate-500 shadow-[0_6px_16px_-14px_rgba(15,23,42,0.28)] transition-all duration-150 ease-out hover:bg-white active:scale-[0.97]"
              >
                Limpar
              </button>
            </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] space-y-6 px-4 pt-3">
          {/* Acompanhamento de Pedidos (Logados ou Anônimos Cache) */}
          {(isCustomerLogged && visibleActiveOrders.length > 0) ? (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-emerald-200/50 bg-emerald-50/90 backdrop-blur-md p-5 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl" />
                <button
                  type="button"
                  onClick={() => {
                    const ids = visibleActiveOrders.map((order) => String(order?.id || '').trim()).filter(Boolean);
                    const next = Array.from(new Set([ ...dismissedCustomerOrderIds, ...ids ]));
                    try {
                      localStorage.setItem(DISMISSED_CUSTOMER_ORDERS_KEY, JSON.stringify(next));
                      sessionStorage.setItem(DISMISSED_CUSTOMER_ORDERS_KEY, JSON.stringify(next));
                    } catch {
                      // ignore
                    }
                    setDismissedCustomerOrderIds(next);
                  }}
                  className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white/80 text-emerald-700 shadow-sm transition-colors hover:bg-white"
                  aria-label="Fechar aviso de pedidos em andamento"
                  title="Fechar aviso"
                >
                  <X size={14} weight="bold" />
                </button>
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                        {visibleActiveOrders.length === 1 ? 'Pedido em Andamento' : 'Pedidos em Andamento'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleActiveOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => navigate(`/pedido/${order.id}`)}
                          className="min-w-[210px] rounded-[1.4rem] border border-white/70 bg-white/95 px-3.5 py-3 text-left shadow-[0_12px_26px_-18px_rgba(16,185,129,0.35)] transition-all active:scale-95"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {order.store?.name || 'Loja'}
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-900">
                                #{String(order.id).slice(-6).toUpperCase()}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getOrderStatusTone(order.status)}`}>
                              {formatOrderStatus(order.status, order.type)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={openCustomerOrders}
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-xl transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    Ver Meus Pedidos
                    <CaretRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ) : (!isCustomerLogged && visibleActiveAnonymousOrders.length > 0) && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-200/50 bg-amber-50/90 backdrop-blur-md p-5 shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)]">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-amber-200/20 blur-2xl" />
                <button
                  type="button"
                  onClick={() => {
                    const ids = visibleActiveAnonymousOrders.map((order) => String(order?.id || '').trim()).filter(Boolean);
                    const next = Array.from(new Set([ ...dismissedAnonymousOrderIds, ...ids ]));
                    try {
                      localStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(next));
                      sessionStorage.setItem(DISMISSED_ANONYMOUS_ORDERS_KEY, JSON.stringify(next));
                    } catch {
                      // ignore
                    }
                    setDismissedAnonymousOrderIds(next);
                    clearAnonymousOrderCache(ids);
                    setActiveAnonymousOrders([]);
                  }}
                  className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-white/80 text-amber-700 shadow-sm transition-colors hover:bg-white"
                  aria-label="Fechar aviso de pedido em andamento"
                  title="Fechar aviso"
                >
                  <X size={14} weight="bold" />
                </button>
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                        Pedido em andamento
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleActiveAnonymousOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() =>
                            navigate(
                              order.accessToken
                                ? `/pedido/${order.id}?ot=${encodeURIComponent(order.accessToken)}`
                                : `/pedido/${order.id}`
                            )
                          }
                          className="min-w-[180px] rounded-[1.4rem] border border-white/70 bg-white/95 px-3.5 py-3 text-left shadow-[0_12px_26px_-18px_rgba(245,158,11,0.28)] transition-all active:scale-95"
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Pedido salvo
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-900">
                              #{String(order.id).slice(-6).toUpperCase()}
                            </p>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                              Em andamento
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          visibleActiveAnonymousOrders[0]?.accessToken
                            ? `/pedido/${visibleActiveAnonymousOrders[0].id}?ot=${encodeURIComponent(visibleActiveAnonymousOrders[0].accessToken)}`
                            : `/pedido/${visibleActiveAnonymousOrders[0].id}`
                        )
                      }
                      className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(16,185,129,0.45)] transition-all hover:bg-emerald-600 active:scale-95"
                    >
                      Acompanhar agora
                      <CaretRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <p className="text-[10px] font-bold text-emerald-600/70 italic">
                      Disponível por 3 horas neste navegador
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Carrossel de Banners - Esconde na busca para focar no resultado */}
          {debouncedQuery.length < 2 && !selectedCondominium && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ animationDelay: '80ms' }}>
              <SegmentPromoCarousel mode="hub" className="mx-0" />
            </div>
          )}

          {debouncedQuery.length < 2 && condominiums.length > 0 && (
            <section
              className={selectedCondominium ? 'sticky top-[max(env(safe-area-inset-top),0.65rem)] z-30 mb-4' : 'mb-6'}
              style={{ transition: 'all .45s ease', transitionDelay: '95ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}
            >
              {selectedCondominium ? (
                <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 shadow-[0_30px_64px_-32px_rgba(15,23,42,0.48)] ring-1 ring-slate-200/60">
                  <div className="absolute inset-0">
                    {selectedCondominiumBannerUrl ? (
                      <img
                        src={selectedCondominiumBannerUrl}
                        alt={String(selectedCondominium.name || 'Condomínio')}
                        className="h-full w-full object-cover opacity-[0.98] saturate-[1.03]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.42)_0%,rgba(2,6,23,0.46)_20%,rgba(2,6,23,0.58)_52%,rgba(2,6,23,0.84)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_24%)]" />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/28 via-black/8 to-transparent" />
                  <div className="pointer-events-none absolute -right-12 top-3 h-24 w-24 rounded-full bg-white/12 blur-3xl" />
                  <div className="pointer-events-none absolute -left-12 bottom-2 h-28 w-28 rounded-full bg-[#336886]/16 blur-3xl" />
                  <div className="relative flex items-start justify-between gap-4 px-5 py-5 sm:px-6 sm:py-6">
                  <button
                    type="button"
                    onClick={() => setCondominiumPickerOpen(true)}
                    className="flex min-w-0 flex-1 items-end gap-3.5 text-left active:scale-[0.99]"
                    aria-label="Escolher outro condomínio"
                    title="Escolher outro condomínio"
                  >
                    <span className="inline-flex h-[3.8rem] w-[3.8rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] bg-white/95 p-2.5 shadow-[0_22px_38px_-20px_rgba(2,6,23,0.58)] ring-1 ring-white/65 backdrop-blur-md sm:h-[4rem] sm:w-[4rem]">
                      {selectedCondominiumLogoUrl ? (
                        <img
                          src={selectedCondominiumLogoUrl}
                          alt={String(selectedCondominium.name || 'Condomínio')}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Buildings size={21} weight="duotone" className="text-[#336886]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className={`inline-flex min-h-[2rem] w-fit max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] shadow-[0_12px_28px_-20px_rgba(2,6,23,0.65)] backdrop-blur-md ${
                        isCondominiumEventLive
                          ? 'bg-emerald-50/96 text-emerald-700'
                          : hasUpcomingCondominiumEvent
                            ? 'bg-sky-50/96 text-sky-700'
                            : 'bg-white/92 text-slate-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isCondominiumEventLive
                            ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                            : hasUpcomingCondominiumEvent
                              ? 'bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.12)]'
                              : 'bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.12)]'
                        }`} />
                        <span className="block whitespace-nowrap">
                          {isCondominiumEventLive ? 'Agenda ativa' : hasUpcomingCondominiumEvent ? 'Próxima agenda' : 'Agenda do local'}
                        </span>
                      </span>
                      <span className="block max-w-[15rem] text-[1.22rem] font-black leading-[1.03] tracking-[-0.03em] text-white drop-shadow-[0_10px_22px_rgba(2,6,23,0.48)] sm:max-w-[20rem] sm:text-[1.35rem]">
                        {String(selectedCondominium.name || 'Condomínio')}
                      </span>
                      <span className="block truncate text-[11px] font-semibold text-white/88 sm:text-[11.5px]">
                        {selectedCondominium.city && selectedCondominium.state
                          ? `${selectedCondominium.city} - ${selectedCondominium.state}`
                          : selectedCondominium.city || selectedCondominium.state || 'Operação local'}
                      </span>
                      <span className="block max-w-[16rem] truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/72 sm:max-w-[21rem]">
                        {condominiumStoresLoading
                          ? 'Carregando lojas...'
                          : isCondominiumEventLive
                            ? `${filteredStores.length} loja${filteredStores.length === 1 ? '' : 's'} disponíveis`
                            : condominiumEventTimeLabel || `${filteredStores.length} loja${filteredStores.length === 1 ? '' : 's'} vinculada${filteredStores.length === 1 ? '' : 's'}`}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={clearCondominiumSelection}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/38 text-white ring-1 ring-white/18 shadow-[0_16px_28px_-18px_rgba(2,6,23,0.75)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-black/46 hover:text-white active:scale-95"
                    aria-label="Sair da feira e voltar ao Hub"
                    title="Sair da feira"
                  >
                    <X size={16} weight="bold" />
                  </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 px-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Exclusivo para você</p>
                    <h2 className="truncate text-lg font-black tracking-tight text-slate-900">Encontre lojas dentro do seu condomínio</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCondominiumPickerOpen(true)}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[1.8rem] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_52%,rgba(239,246,255,0.96)_100%)] p-4 text-left shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] ring-1 ring-slate-100/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_46px_-30px_rgba(51,104,134,0.24)] active:scale-[0.985]"
                  >
                    <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#336886]/10 to-transparent" />
                    <div className="pointer-events-none absolute -right-10 top-6 h-24 w-24 rounded-full bg-[#336886]/10 blur-3xl" />
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] bg-white text-[#336886] shadow-[0_16px_28px_-18px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80">
                      {condominiumPreviewLogos.length > 0 ? (
                        <div className="flex -space-x-4">
                          {condominiumPreviewLogos.map((logo, index) => (
                            <img
                              key={`${logo}-${index}`}
                              src={logo}
                              alt="Condomínio"
                              className="h-9 w-9 rounded-full border-2 border-white bg-white object-contain p-1 shadow-sm"
                            />
                          ))}
                        </div>
                      ) : (
                        <Buildings size={24} weight="duotone" />
                      )}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#336886]/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#336886]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#336886] shadow-[0_0_0_4px_rgba(51,104,134,0.12)]" />
                          Feiras disponíveis
                        </span>
                      </div>
                      <p className="truncate text-[17px] font-black tracking-tight text-slate-950">Feiras próximas a você</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {condominiums.length} condomínio{condominiums.length === 1 ? '' : 's'} com operação disponível
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                        Explorar
                      </span>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#336886] shadow-sm ring-1 ring-slate-200/80">
                      <CaretRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </button>
                </>
              )}
            </section>
          )}

          {/* Seção Categorias Premium Squircle */}
          <section className="relative mb-6" style={{ transition: 'all .45s ease', transitionDelay: '100ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="-mx-4 mb-6 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar px-4 py-1.5">
              <button
                type="button"
                className="group flex min-w-[58px] shrink-0 snap-start cursor-pointer flex-col items-center gap-1.5 active:scale-[0.97] transition-transform duration-150 ease-out"
                onClick={() => setSegmentFilter('all')}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] transition-all duration-200 ease-out ${
                  segmentFilter === 'all' ? 'bg-[#336886] shadow-[0_12px_26px_-14px_rgba(51,104,134,0.68)] scale-[1.04]' : 'border border-slate-100 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)] group-hover:bg-slate-50'
                }`}>
                  <List size={18} weight="duotone" className={segmentFilter === 'all' ? 'text-white scale-[0.95]' : 'text-slate-500'} />
                </div>
                <span className={`text-center text-[9.5px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  segmentFilter === 'all' ? 'text-[#336886]' : 'text-slate-500'
                }`}>Todos</span>
              </button>
              
              {categoryTiles.map((item, index) => {
                const active = segmentFilter === item.label;
                const CategoryIcon = item.icon;
                return (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    className="group flex min-w-[58px] shrink-0 snap-start cursor-pointer flex-col items-center gap-1.5 active:scale-[0.97] transition-transform duration-150 ease-out"
                    onClick={() => setSegmentFilter(prev => prev === item.label ? 'all' : item.label)}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] transition-all duration-200 ease-out ${
                      active ? 'bg-[#336886] shadow-[0_12px_26px_-14px_rgba(51,104,134,0.68)] scale-[1.04]' : 'border border-slate-100 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)] group-hover:bg-slate-50'
                    }`}>
                      <CategoryIcon
                        size={20}
                        weight={active ? 'fill' : 'duotone'}
                        className={`transition-all duration-150 ease-out ${active ? 'scale-[0.94] text-white' : 'text-slate-500 group-hover:scale-105 group-hover:text-slate-700'}`}
                      />
                    </div>
                    <span className={`text-center text-[9.5px] font-bold uppercase tracking-[0.08em] transition-colors ${
                      active ? 'text-[#336886]' : 'text-slate-500'
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Banner de Destaques Premium - Esconde na busca para focar no resultado */}
          {debouncedQuery.length < 2 && (
            <section
              className="mb-6 overflow-hidden rounded-[1.8rem] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_52%,rgba(239,246,255,0.96)_100%)] px-3 py-2.5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]"
              style={{ transition: 'all .45s ease', transitionDelay: '200ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}
            >
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-[14px] font-black tracking-tight text-slate-950">{genericHighlightLabel}</h2>
                <div className="flex gap-1 pt-2">
                  <div className="h-1 w-4 rounded-full bg-[#336886]" />
                  <div className="h-1 w-1 rounded-full bg-sky-200" />
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                </div>
              </div>
              
              <div className="mt-2.5 flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
                {featuredLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-[142px] min-w-[154px] animate-pulse rounded-[1.3rem] border border-white/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)]" />
                  ))
                ) : (
                  displayedFeaturedProducts.map((item, index) => (
                    (() => {
                      const featuredStorePath = selectedCondominiumSlug
                        ? `/${item.storeSlug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}`
                        : `/${item.storeSlug}`;
                      return (
                    <Link
                      key={`${item.storeSlug}-${item.id}`}
                      to={featuredStorePath}
                      className="group min-w-[154px] snap-start overflow-hidden rounded-[1.3rem] border border-white/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.072)] ring-1 ring-slate-100/70 transition-all duration-200 ease-out hover:scale-[1.012] hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)] active:scale-[0.97]"
                    >
                      <div className="relative h-[76px] overflow-hidden bg-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading={index < 2 ? 'eager' : 'lazy'}
                          fetchPriority={index < 2 ? 'high' : 'auto'}
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute left-2.5 top-2.5">
                          {item.sponsored ? (
                            <span className="flex items-center gap-1 rounded-full border border-white/70 bg-amber-300/95 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-950 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md">
                              <Star size={10} weight="fill" /> Promo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/94 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md ring-1 ring-black/5">
                              <Sparkle size={8} weight="fill" className="text-[#336886]" />
                              Seleção
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-[11px] font-black leading-4 tracking-tight text-slate-950">{item.name}</p>
                          <span className="shrink-0 rounded-full bg-[#336886]/10 px-1.5 py-0.5 text-[9px] font-black text-[#336886]">
                            {currency.format(item.price)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-[0.95rem] bg-slate-50 px-2 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <img 
                              src={item.storeLogo} 
                              alt={item.storeName} 
                              loading={index < 2 ? 'eager' : 'lazy'}
                              fetchPriority={index < 2 ? 'high' : 'auto'}
                              decoding="async"
                              className="h-4 w-4 rounded-full border border-white/70 object-cover shadow-sm" 
                              onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(item.storeSlug, item.storeName); }}
                            />
                            <span className="block max-w-[84px] truncate text-[9px] font-bold text-slate-700">{item.storeName}</span>
                          </div>
                          <CaretRight size={12} weight="bold" className="shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                      );
                    })()
                  ))
                )}
              </div>
            </section>
          )}

          {favoriteStores.length > 0 && debouncedQuery.length < 2 && (
            <section className="space-y-3 mb-8" style={{ transition: 'all .45s ease', transitionDelay: '300ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-slate-900">Minhas favoritas</h2>
                <button
                  type="button"
                  onClick={() => setQuickFilter('favorites')}
                  className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 hover:text-slate-700"
                >
                  Ver todas
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar scrollbar-hide pb-1">
                {favoriteStores.map((store) => (
                  <Link
                    key={`favorite-${store.id}`}
                    to={`/${store.slug}`}
                    className="group min-w-[168px] rounded-[1.45rem] border border-white/90 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition-all duration-200 ease-out active:scale-[0.97] md:hover:-translate-y-0.5 md:hover:shadow-[0_14px_30px_rgba(15,23,42,0.085)] sm:min-w-[186px]"
                  >
                    <img 
                      src={store.banner || store.logo} 
                      alt={store.name} 
                      loading="lazy" 
                      className="h-20 w-full rounded-[1rem] border border-slate-100 object-cover" 
                      onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-black text-slate-900">{store.name}</p>
                      <Heart size={14} weight="fill" className="text-rose-500 shrink-0" />
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {distanceLoading && userLocation ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)} • {store.etaMin}-{store.etaMax} min
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mb-8 space-y-4" style={{ transition: 'all .45s ease', transitionDelay: '400ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <Storefront size={10} weight="fill" />
                  Lojas
                </div>
                <h2 className="mt-2 text-base font-black text-slate-950 sm:text-lg">Escolha a loja para pedir</h2>
                {!loading && !error && filteredStores.length > 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {productSearchLoading && debouncedQuery
                      ? 'Buscando também nos cardápios...'
                      : `${filteredStores.length} resultado${filteredStores.length === 1 ? '' : 's'} ${selectedCondominium ? 'no condomínio' : 'perto de você'}`}
                  </p>
                ) : null}
              </div>
            </div>

            {loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-32 animate-pulse rounded-[1.65rem] border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)]" />
                ))}
              </div>
            )}

            {!loading && error && <div className="rounded-2xl border border-rose-900/60 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</div>}

            {!loading && !error && filteredStores.length === 0 && productSearchLoading && debouncedQuery && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-700 font-semibold">Buscando lojas com esse item no cardápio...</p>
                <p className="mt-1 text-xs font-bold text-slate-400">A busca agora considera produtos, descrições e categorias.</p>
              </div>
            )}

            {!loading && !error && filteredStores.length === 0 && !(productSearchLoading && debouncedQuery) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-700 font-semibold">Nenhuma loja encontrada com esses filtros.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDebouncedQuery('');
                    setQuickFilter('all');
                    setSegmentFilter('all');
                    setSelectedCondominiumSlug('');
                  }}
                  className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {!loading && !error && filteredStores.length > 0 && (
              <div className={selectedCondominium ? 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4' : 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'}>
                {filteredStores.map((store) => {
                  const storePath = selectedCondominiumSlug
                    ? `/${store.slug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}`
                    : `/${store.slug}`;

                  if (selectedCondominium) {
                    return (
                      <Link
                        key={store.id}
                        to={storePath}
                        className={`group overflow-hidden rounded-[1.45rem] border bg-white transition-all duration-200 ease-out active:scale-[0.985] ${
                          store.isOpen
                            ? 'border-white shadow-[0_12px_30px_rgba(15,23,42,0.075)] md:hover:-translate-y-0.5 md:hover:shadow-[0_18px_38px_rgba(15,23,42,0.11)]'
                            : 'border-slate-200/80 bg-slate-50/90 shadow-[0_8px_20px_rgba(15,23,42,0.04)]'
                        }`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={store.banner || store.logo}
                            alt={store.name}
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${store.isOpen ? '' : 'grayscale opacity-70'}`}
                            onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/42 via-transparent to-transparent" />
                          <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] shadow-sm ${
                            isCondominiumEventLive ? 'bg-white text-emerald-700' : 'bg-white/92 text-[#336886]'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isCondominiumEventLive ? 'bg-emerald-500' : 'bg-[#336886]'}`} />
                            {isCondominiumEventLive ? 'Atendendo' : hasUpcomingCondominiumEvent ? 'Confirmada' : 'Prévia'}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleFavoriteStore(store.slug);
                            }}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-slate-300 shadow-sm transition-all duration-150 ease-out hover:text-rose-500 active:scale-90"
                            aria-label={`Favoritar ${store.name}`}
                            title={`Favoritar ${store.name}`}
                          >
                            <Heart
                              size={15}
                              weight={favoriteStoreSlugs.includes(store.slug) ? 'fill' : 'regular'}
                              className={favoriteStoreSlugs.includes(store.slug) ? 'text-rose-500' : ''}
                            />
                          </button>
                          <img
                            src={store.logo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute -bottom-5 left-3 h-11 w-11 rounded-full border-2 border-white bg-white object-cover shadow-[0_10px_20px_-12px_rgba(15,23,42,0.45)]"
                            onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                          />
                        </div>
                        <div className="px-3 pb-3 pt-7">
                          <h3 className={`line-clamp-1 text-sm font-black leading-tight ${store.isOpen ? 'text-slate-950' : 'text-slate-500'}`}>
                            {store.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-bold text-slate-500">
                            {store.rating > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Star size={10} weight="fill" className="text-amber-400" />
                                <span className="text-slate-700">{store.rating.toFixed(1)}</span>
                              </span>
                            ) : null}
                            {store.rating > 0 ? <span className="text-slate-300">•</span> : null}
                            <span>{store.etaMin}-{store.etaMax} min</span>
                          </div>
                          {!isCondominiumEventLive ? (
                            <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#336886]">
                              {hasUpcomingCondominiumEvent ? condominiumEventTimeLabel || 'Próxima feira' : 'Agenda em confirmação'}
                            </p>
                          ) : !store.isOpen ? (
                            <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                              {store.nextOpeningLabel || 'Sem horário cadastrado'}
                            </p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700">
                                <Storefront size={10} weight="fill" />
                                Retirada
                              </span>
                              {store.supportsDelivery && store.freeShipping ? (
                                <span className="inline-flex rounded-full bg-sky-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#336886]">
                                  Grátis
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={store.id}
                      to={storePath}
                      className={`group rounded-[1.65rem] border bg-white px-3.5 py-3.5 transition-all duration-200 ease-out active:scale-[0.985] ${
                        store.isOpen
                          ? 'border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:hover:-translate-y-0.5 md:hover:shadow-[0_14px_30px_rgba(15,23,42,0.09)]'
                          : 'border-slate-200/80 bg-slate-50/80 shadow-[0_8px_20px_rgba(15,23,42,0.035)]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={store.logo}
                          alt={store.name}
                          className={`h-16 w-16 shrink-0 rounded-full border border-slate-100 bg-slate-50 object-cover shadow-[0_10px_22px_-14px_rgba(15,23,42,0.3)] ring-2 ring-white transition-all duration-200 ${
                            store.isOpen ? '' : 'grayscale opacity-70'
                          }`}
                          onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0 pr-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`truncate text-[15px] font-black ${store.isOpen ? 'text-slate-950' : 'text-slate-500'}`}>{store.name}</h3>
                                <span className={`inline-flex h-2 w-2 rounded-full ${store.isOpen ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14),0_0_14px_rgba(16,185,129,0.55)]' : 'bg-slate-400'}`} />
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleFavoriteStore(store.slug);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-all duration-150 ease-out hover:bg-rose-50 hover:text-rose-500 active:scale-90"
                                aria-label={`Favoritar ${store.name}`}
                                title={`Favoritar ${store.name}`}
                              >
                                <Heart
                                  size={15}
                                  weight={favoriteStoreSlugs.includes(store.slug) ? 'fill' : 'regular'}
                                  className={favoriteStoreSlugs.includes(store.slug) ? 'text-rose-500' : ''}
                                />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-medium text-slate-500">
                            {store.rating > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Star size={11} weight="fill" className="text-amber-400" />
                                <span className="font-bold text-slate-700">{store.rating.toFixed(1)}</span>
                              </span>
                            ) : null}
                            {store.rating > 0 ? <span className="text-slate-300">•</span> : null}
                            <span>{store.etaMin}-{store.etaMax} min</span>
                            <span className="text-slate-300">•</span>
                            <span>{distanceLoading && userLocation ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)}</span>
                          </div>
                          {!store.isOpen && (
                            <p className="mt-1 inline-flex max-w-full items-center rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                              {store.nextOpeningLabel || 'Sem horário cadastrado'}
                            </p>
                          )}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {store.isOpen && store.rating >= 4.9 && (
                               <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-600 shadow-[0_8px_18px_-16px_rgba(225,29,72,0.4)]">
                                 <Sparkle size={10} weight="fill" className="text-rose-500" />
                                 Bombando agora
                               </span>
                            )}
                            {store.freeShipping ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 shadow-[0_8px_18px_-16px_rgba(16,185,129,0.5)]">
                                <Bicycle size={10} weight="fill" className="text-emerald-600" />
                                Grátis
                              </span>
                            ) : null}
                            {store.rating >= 4.7 && !favoriteStoreSlugs.includes(store.slug) && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 shadow-[0_8px_18px_-16px_rgba(245,158,11,0.45)]">
                                <Star size={10} weight="fill" className="text-amber-500" />
                                Favorita da região
                              </span>
                            )}
                            {(store as any).sponsored && (
                              <span className="inline-flex rounded-full border border-slate-100 bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                                Patrocinado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Nova Seção: Itens encontrados na busca */}
          {debouncedQuery.length >= 2 && searchedProducts.length > 0 && (
            <section className="mb-8 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[15px] font-black tracking-tight text-slate-950">
                  Itens encontrados que você busca
                </h2>
                <div className="flex gap-1">
                  <span className="text-[10px] font-bold text-[#336886] uppercase tracking-wider">
                    {searchedProducts.length} itens
                  </span>
                </div>
              </div>
              
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar px-1 pb-3">
                {searchedProducts.map((item) => (
                  <Link
                    key={`search-res-${item.storeSlug}-${item.id}`}
                    to={selectedCondominiumSlug ? `/${item.storeSlug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}` : `/${item.storeSlug}`}
                    className="group min-w-[160px] snap-start overflow-hidden rounded-[1.45rem] border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:scale-[1.015] active:scale-[0.97]"
                  >
                    <div className="relative h-[90px] overflow-hidden bg-slate-100">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = item.storeLogo; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    <div className="bg-white p-2.5">
                      <p className="line-clamp-1 text-[11px] font-black tracking-tight text-slate-950">{item.name}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img 
                            src={item.storeLogo} 
                            alt={item.storeName} 
                            className="h-4 w-4 rounded-full border border-slate-100 object-cover" 
                            onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(item.storeSlug, item.storeName); }}
                          />
                          <span className="truncate text-[9px] font-bold text-slate-400">{item.storeName}</span>
                        </div>
                        <span className="shrink-0 text-[10px] font-black text-[#336886]">
                          {currency.format(item.price)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="pb-2 space-y-2 sm:pb-4">
            <p className="text-center text-xs font-semibold text-slate-500">Conectando você aos melhores lojistas da região.</p>
            <PlatformTrustFooter mode="minimal" align="center" compact />
          </section>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] px-0 pb-0 transition-transform duration-300 lg:hidden"
        style={{ transform: isBottomNavVisible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="grid min-h-[4.75rem] grid-cols-4 items-center gap-2 rounded-t-[1.75rem] border border-b-0 border-[#336886]/12 bg-[linear-gradient(180deg,rgba(235,244,250,0.96)_0%,rgba(225,238,247,0.94)_100%)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-14px_34px_-26px_rgba(51,104,134,0.3)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={handleHomeHubNavigation}
            className={`flex flex-col items-center justify-center rounded-2xl py-1 font-bold transition-all duration-150 ease-out active:scale-[0.94] ${
              quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium
                ? 'bg-[#336886]/10 text-[#336886] shadow-[0_8px_18px_-16px_rgba(51,104,134,0.7)] ring-1 ring-[#336886]/15'
                : 'text-slate-400'
            }`}
          >
            <House size={18} weight={quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium ? 'fill' : 'duotone'} />
            <span className="text-[9px] font-black uppercase">Início</span>
          </button>
          <button type="button" onClick={() => navigate('/cliente/pedidos')} className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]">
            <Receipt size={18} weight="duotone" />
            <span className="text-[9px] font-black uppercase">Pedidos</span>
          </button>
          <button
            type="button"
            onClick={() => setCondominiumPickerOpen(true)}
            className={`flex flex-col items-center justify-center rounded-2xl py-1 transition-all duration-150 ease-out active:scale-[0.94] ${
              selectedCondominium || condominiumPickerOpen
                ? 'bg-[#336886]/10 text-[#336886] shadow-[0_8px_18px_-16px_rgba(51,104,134,0.7)] ring-1 ring-[#336886]/15'
                : 'text-slate-400'
            }`}
          >
            <Buildings size={18} weight={selectedCondominium || condominiumPickerOpen ? 'fill' : 'duotone'} />
            <span className="text-[9px] font-black uppercase">Condo</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter((prev) => (prev === 'favorites' ? 'all' : 'favorites'))}
            className={`flex flex-col items-center justify-center rounded-2xl py-1 transition-all duration-150 ease-out active:scale-[0.94] ${
              quickFilter === 'favorites'
                ? 'bg-[#336886]/10 text-[#336886] shadow-[0_8px_18px_-16px_rgba(51,104,134,0.7)] ring-1 ring-[#336886]/15'
                : 'text-slate-400'
            }`}
          >
            <Heart size={18} weight={quickFilter === 'favorites' ? 'fill' : 'regular'} />
            <span className="text-[9px] font-black uppercase">Favoritos</span>
          </button>
        </div>
      </nav>

      {condominiumPickerOpen && (
        <div className="fixed inset-0 z-[220] overflow-y-auto bg-[linear-gradient(180deg,#F8F9FB_0%,#FFFFFF_48%,#F4F8F6_100%)] text-slate-950">
          <div className="mx-auto min-h-screen max-w-[760px] px-5 pb-28 pt-[max(env(safe-area-inset-top),0.45rem)]">
            <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-[#F8F9FB]/92 px-5 py-3 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setCondominiumPickerOpen(false);
                  setCondominiumSearch('');
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-950/5 active:scale-95"
                aria-label="Voltar para o Hub"
                title="Voltar para o Hub"
              >
                <CaretRight size={18} weight="bold" className="rotate-180" />
              </button>
              <span className="h-10 w-10" />
            </div>

            <div className="pt-3 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-lg shadow-emerald-900/10 ring-1 ring-slate-950/5">
                <img src="/janocaminho-logo.png" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-[#336886]">Já no Caminho</p>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Onde você está agora?</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
                Escolha seu condomínio para ver a agenda ativa e as lojas atendendo nesse local.
              </p>
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,248,252,0.98)_100%)] px-4 py-3 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.22)] ring-1 ring-white/80 transition-all duration-200 focus-within:border-[#336886]/25 focus-within:bg-white focus-within:shadow-[0_18px_36px_-24px_rgba(51,104,134,0.24)] focus-within:ring-2 focus-within:ring-[#336886]/10">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#336886]/10 bg-[#336886]/8 text-[#336886] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <MagnifyingGlass size={17} weight="bold" />
                </span>
                <input
                  type="text"
                  value={condominiumSearch}
                  onChange={(event) => setCondominiumSearch(event.target.value)}
                  placeholder="Filtrar por nome do condomínio ou cidade"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
                  autoFocus
                />
                {condominiumSearch ? (
                  <button
                    type="button"
                    onClick={() => setCondominiumSearch('')}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 active:scale-95"
                    aria-label="Limpar busca"
                    title="Limpar busca"
                  >
                    <X size={15} weight="bold" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-9">
              <div className="mb-7 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Condomínios disponíveis</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Veja a próxima agenda de cada local e escolha onde pedir.</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  {filteredCondominiums.length} condomínio{filteredCondominiums.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredCondominiums.map(({ condominium, slug, name, region, event }) => {
                  const active = selectedCondominiumSlug === slug;
                  const imageUrl = resolveAssetUrl(condominium.logoUrl || condominium.bannerUrl || undefined) || getStoreAvatarUrl(slug, name);
                  const bannerUrl = resolveAssetUrl(condominium.bannerUrl || condominium.logoUrl || undefined) || imageUrl;
                  const eventState = event?.state || 'none';
                  const eventBadge = eventState === 'live'
                    ? 'Aberta agora'
                    : eventState === 'upcoming'
                      ? 'Agenda'
                      : 'Sem agenda ativa';
                  const eventTime = formatCondominiumEventTime(event);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => selectCondominium(slug)}
                      className={`group relative min-w-0 overflow-hidden rounded-[1.6rem] border text-left shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)] transition-all duration-300 active:scale-[0.985] ${
                        active
                          ? 'border-[#336886]/18 bg-[linear-gradient(180deg,rgba(248,252,255,0.98)_0%,rgba(240,249,255,0.98)_100%)] ring-2 ring-[#336886]/18'
                          : 'border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)] hover:-translate-y-1 hover:shadow-[0_26px_44px_-30px_rgba(15,23,42,0.24)]'
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-20 overflow-hidden">
                        <img
                          src={bannerUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-cover opacity-90 saturate-[1.08]"
                          onError={(e) => { (e.target as HTMLImageElement).src = imageUrl; }}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.14)_0%,rgba(255,255,255,0.1)_34%,rgba(255,255,255,0.92)_100%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.48),transparent_38%)]" />
                      </div>

                      <div className="pointer-events-none absolute -right-6 top-8 h-16 w-16 rounded-full bg-[#336886]/10 blur-3xl" />

                      <div className="relative px-3 pb-3 pt-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border bg-white/92 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.32)] backdrop-blur-sm ${
                            active ? 'border-[#336886]/18' : 'border-white/90'
                          }`}>
                            <div className="absolute inset-[6px] rounded-[1rem] border border-slate-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.88)_100%)]" />
                            <img
                              src={imageUrl}
                              alt={name}
                              loading="lazy"
                              decoding="async"
                              className="relative h-full w-full object-contain p-2.5"
                              onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }}
                            />
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] shadow-sm ${
                            active
                              ? 'border-[#336886]/28 bg-[#336886]/14 text-[#2d5f7b] shadow-[0_12px_24px_-18px_rgba(51,104,134,0.38)]'
                              : eventState === 'live'
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                : eventState === 'upcoming'
                                  ? 'border-sky-200 bg-sky-50 text-[#336886]'
                                  : 'border-slate-200 bg-white/88 text-slate-500'
                          }`}>
                            {!active && eventState === 'live' ? (
                              <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              </span>
                            ) : null}
                            {!active && eventState === 'upcoming' ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#336886] shadow-[0_0_0_4px_rgba(51,104,134,0.12)]" />
                            ) : null}
                            {active ? 'Selecionado' : eventBadge}
                          </span>
                        </div>

                        <div className="mt-2.5 min-w-0">
                          <p className="line-clamp-2 text-[13px] font-black leading-tight tracking-tight text-slate-950">{name}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500">
                            {region || 'Local com agenda própria'}
                          </p>
                        </div>

                        <div className={`relative mt-2.5 flex min-h-[42px] items-start gap-2 overflow-hidden rounded-[1rem] border px-2.5 py-2 ${
                          eventState === 'live'
                            ? 'border-emerald-100 bg-emerald-50/90 text-emerald-700'
                            : eventState === 'upcoming'
                              ? 'border-sky-100 bg-sky-50/90 text-[#336886]'
                              : 'border-slate-200/80 bg-white/85 text-slate-500'
                        }`}>
                          {eventState === 'upcoming' ? (
                            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white/55 via-white/20 to-transparent" />
                          ) : null}
                          <CalendarBlank size={12} weight="fill" className="mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em]">
                              {eventState === 'live' ? 'Agenda ativa' : eventState === 'upcoming' ? 'Próxima agenda' : 'Disponibilidade'}
                            </p>
                            <p className="mt-0.5 break-words text-[11px] font-bold leading-4">
                              {formatCondominiumPickerEventTime(event) || eventTime || eventBadge}
                            </p>
                          </div>
                          <CaretRight size={12} weight="bold" className="mt-0.5 shrink-0 text-current/55 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredCondominiums.length === 0 && (
                <div className="py-14 text-center">
                  <p className="text-sm font-black text-slate-800">Nenhum condomínio encontrado.</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Tente buscar pelo nome ou pela cidade.</p>
                </div>
              )}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 z-[230] px-0 pb-0 lg:hidden">
              <div className="mx-auto grid min-h-[4.75rem] max-w-[760px] grid-cols-4 items-center gap-2 rounded-t-[1.9rem] border border-b-0 border-[#336886]/12 bg-[linear-gradient(180deg,rgba(235,244,250,0.96)_0%,rgba(225,238,247,0.94)_100%)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-14px_34px_-26px_rgba(51,104,134,0.3)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    handleHomeHubNavigation();
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]"
                >
                  <House size={18} weight="duotone" />
                  <span className="text-[9px] font-black uppercase">Início</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    navigate('/cliente/pedidos');
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]"
                >
                  <Receipt size={18} weight="duotone" />
                  <span className="text-[9px] font-black uppercase">Pedidos</span>
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center justify-center rounded-2xl bg-[#336886]/10 py-1 text-[#336886] shadow-[0_8px_18px_-16px_rgba(51,104,134,0.7)] ring-1 ring-[#336886]/15 transition-all duration-150 ease-out active:scale-[0.94]"
                >
                  <Buildings size={18} weight="fill" />
                  <span className="text-[9px] font-black uppercase">Condo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    navigate('/hub?favorites=1');
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl py-1 text-slate-400 transition-all duration-150 ease-out active:scale-[0.94]"
                >
                  <Heart size={18} weight="regular" />
                  <span className="text-[9px] font-black uppercase">Favoritos</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivateAccount}
        isLoading={deactivating}
        title="Excluir minha conta?"
        description="Esta ação é irreversível. Seus dados de perfil serão desativados e você será desconectado imediatamente."
        confirmLabel="Sim, excluir conta"
        cancelLabel="Não, manter conta"
        variant="danger"
      />
    </div>
  );
}
