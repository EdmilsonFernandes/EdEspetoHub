import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../config/apiClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
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
  PaperPlaneTilt,
  Pill,
  Cookie,
  Buildings,
  CalendarBlank,
  Clock,
  MapPinLine,
  UserCircle,
  Warning,
} from '@phosphor-icons/react';
import { storeService } from '../services/storeService';
import { condominiumService } from '../services/condominiumService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { customerAccountService } from '../services/customerAccountService';
import { featuredService } from '../services/featuredService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
import { useCachedCustomerProfileImage } from '../hooks/useCachedCustomerProfileImage';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { HeaderAvatarTrigger } from '../components/Marketplace/HeaderAvatarTrigger';
import { ProfileDrawer } from '../components/Marketplace/ProfileDrawer';
import { CondominiumStatusModal } from '../components/Marketplace/CondominiumStatusModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { SegmentPromoCarousel } from '../components/common/SegmentPromoCarousel';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clearAllCustomerSessions } from '../utils/customerSessionStorage';

type MarketplaceStore = {
  id?: string;
  name?: string;
  slug?: string;
  distanceKm?: number | null;
  deliveryRadiusKm?: number | null;
  deliversToUserLocation?: boolean | null;
  deliveryStatusLabel?: string | null;
  acceptsDelivery?: boolean | null;
  acceptsPickup?: boolean | null;
  geoAvailability?: string | null;
  isNearest?: boolean | null;
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
    lat?: number | null;
    lng?: number | null;
    openingHours?: Array<{
      day: number;
      enabled?: boolean;
      intervals?: Array<{ start: string; end: string }>;
    }> | null;
  } | null;
  openNow?: boolean;
  nextOpeningLabel?: string | null;
};

type StoreDiscoveryResponse = {
  mode?: 'deliverable' | 'same_city_fallback' | 'nearby_fallback' | 'no_coverage' | string;
  stores?: MarketplaceStore[];
  summary?: {
    deliverableCount?: number;
    sameCityCount?: number;
    nearbyCount?: number;
  } | null;
};

type PreferredDiscoveryAddress = {
  label: string;
  city: string;
  state: string;
  addressLine?: string;
  lat?: number | null;
  lng?: number | null;
};

const CUSTOMER_ADDRESS_UPDATED_EVENT = 'jnc:customer-addresses-updated';
const HUB_DEBUG_QUERY_PARAM = 'hubDebug';
const HUB_DEBUG_STORAGE_KEY = 'jnc:hub-debug-enabled';
const HUB_DEBUG_TRACE_KEY = 'jnc:hub-debug-trace';
const HUB_DEBUG_TRACE_LIMIT = 80;

const HUB_DISTANCE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const appendAssetCacheKey = (value?: string | null, cacheKey?: string) => {
  const normalized = String(value || '').trim();
  if (!normalized || !cacheKey || /^data:|^blob:/i.test(normalized)) return normalized;
  try {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://janocaminho.com.br';
    const parsed = new URL(normalized, baseOrigin);
    parsed.searchParams.set('assetKey', cacheKey);
    if (/^https?:\/\//i.test(normalized)) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return normalized;
  }
};

const resolveCondominiumAssetUrl = (
  condominium: { slug?: string | null; name?: string | null; logoUrl?: string | null; bannerUrl?: string | null } | null | undefined,
  variant: 'logo' | 'banner'
) => {
  const slug = String(condominium?.slug || 'condominio').trim() || 'condominio';
  const name = String(condominium?.name || 'Condomínio').trim() || 'Condomínio';
  const preferredSource =
    variant === 'banner'
      ? condominium?.bannerUrl || condominium?.logoUrl || undefined
      : condominium?.logoUrl || condominium?.bannerUrl || undefined;
  const fallback = getStoreAvatarUrl(slug, name);
  const resolved = resolveAssetUrl(preferredSource) || fallback;
  return appendAssetCacheKey(resolved, `${slug}-${variant}`);
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildCustomerAddressLookup = (address: any) => {
  const city = String(address?.city || '').trim();
  const state = String(address?.state || '').trim().toUpperCase();
  const street = String(address?.street || '').trim();
  const number = String(address?.number || '').trim();
  const streetLine = [street, number].filter(Boolean).join(', ');
  const addressLine = [
    street,
    number,
    String(address?.neighborhood || '').trim(),
    city,
    state,
    String(address?.cep || '').trim(),
  ]
    .filter(Boolean)
    .join(', ');
  const label = streetLine || (city && state ? `${city} - ${state}` : city || 'Endereço principal');

  return {
    city,
    state,
    addressLine,
    label: label || 'Endereço principal',
    lat: parseOptionalNumber(address?.lat),
    lng: parseOptionalNumber(address?.lng),
  };
};

const readHubCache = <T,>(key: string, ttlMs: number): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || Date.now() - ts > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return (parsed?.data ?? null) as T | null;
  } catch {
    return null;
  }
};

const writeHubCache = (key: string, data: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
};

const appendHubDebugTrace = (entry: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(HUB_DEBUG_TRACE_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(current) ? current.slice(-(HUB_DEBUG_TRACE_LIMIT - 1)) : [];
    next.push(entry);
    sessionStorage.setItem(HUB_DEBUG_TRACE_KEY, JSON.stringify(next));
    (window as any).__jncHubDebugTrace = next;
    (window as any).__jncHubDebugLast = entry;
  } catch {
    // ignore debug persistence failure
  }
};

const storeRegionalPriority = (
  store: {
    geoAvailability?: string | null;
    supportsPostal?: boolean;
    deliversToUserLocation?: boolean | null;
    isOpen?: boolean;
    acceptsPickup?: boolean | null;
    supportsTable?: boolean;
  },
  options?: { condominiumScope?: boolean }
) => {
  if (options?.condominiumScope) {
    return store?.isOpen ? 0 : 1;
  }
  const availability = String(store?.geoAvailability || '').trim().toLowerCase();
  if (store?.isOpen && (store?.deliversToUserLocation || availability === 'deliver_now' || availability === 'postal_everywhere' || store?.supportsPostal)) return 0;
  if (store?.isOpen && (availability === 'pickup_available' || availability === 'same_city_pickup' || store?.acceptsPickup || store?.supportsTable)) return 1;
  if (store?.isOpen) return 2;
  return 3;
};

type StoreCardBadge = {
  key: string;
  label: string;
  icon: typeof PaperPlaneTilt;
  className: string;
  iconClassName?: string;
};

const getPrimaryStoreCardBadge = (
  store: {
    supportsPostal?: boolean;
    supportsDelivery?: boolean;
    deliversToUserLocation?: boolean;
    geoAvailability?: string;
    acceptsPickup?: boolean;
    supportsTable?: boolean;
  },
  options?: { condominiumScope?: boolean }
): StoreCardBadge | null => {
  const availability = String(store?.geoAvailability || '').trim().toLowerCase();
  const pickupEnabled = Boolean(store?.acceptsPickup || store?.supportsTable);

  if (!options?.condominiumScope && store?.supportsDelivery && !store?.supportsPostal && store?.deliversToUserLocation) {
    return {
      key: 'delivery',
      label: 'Entrega disponível',
      icon: PaperPlaneTilt,
      className:
        'border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_8px_18px_-14px_rgba(16,185,129,0.38)]',
    };
  }

  if (pickupEnabled) {
    return {
      key: 'pickup',
      label: 'Retirada no local',
      icon: House,
      className:
        'border-slate-800/85 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.78)] ring-1 ring-white/10',
      iconClassName: 'text-amber-300',
    };
  }

  if (store?.supportsPostal) {
    return {
      key: 'postal',
      label: 'Correios',
      icon: PaperPlaneTilt,
      className:
        'border-violet-100 bg-violet-50 text-violet-700 shadow-[0_8px_18px_-14px_rgba(124,58,237,0.3)]',
    };
  }

  if (!options?.condominiumScope && store?.supportsDelivery && [ 'outside_radius', 'same_city' ].includes(availability)) {
    return {
      key: 'outside',
      label: 'Fora da área',
      icon: Warning,
      className:
        'border-amber-100 bg-amber-50 text-amber-700 shadow-[0_8px_18px_-14px_rgba(245,158,11,0.34)]',
    };
  }

  return null;
};

const getSecondaryStoreCardBadge = (
  store: {
    freeShipping?: boolean;
    isNearest?: boolean;
    rating?: number;
    slug?: string;
    sponsored?: boolean;
  },
  primaryBadgeKey: string | null,
  favoriteStoreSlugs: string[],
  options?: { condominiumScope?: boolean; geoMode?: string | null }
): StoreCardBadge | null => {
  if (store?.freeShipping && primaryBadgeKey !== 'outside') {
    return {
      key: 'free_shipping',
      label: 'Frete grátis',
      icon: Bicycle,
      className:
        'border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_8px_18px_-14px_rgba(16,185,129,0.32)]',
    };
  }

  if (!options?.condominiumScope && store?.isNearest && String(options?.geoMode || '').toLowerCase() === 'deliverable') {
    return {
      key: 'nearest',
      label: 'Mais perto',
      icon: MapPinLine,
      className:
        'border-sky-100 bg-sky-50 text-sky-700 shadow-[0_8px_18px_-14px_rgba(2,132,199,0.28)]',
    };
  }

  if (Number(store?.rating || 0) >= 4.9) {
    return {
      key: 'highlight',
      label: 'Destaque',
      icon: Sparkle,
      className:
        'border-rose-100 bg-rose-50 text-rose-600 shadow-[0_8px_18px_-14px_rgba(225,29,72,0.32)]',
    };
  }

  if (!favoriteStoreSlugs.includes(String(store?.slug || '')) && Number(store?.rating || 0) >= 4.7) {
    return {
      key: 'favorite_hint',
      label: 'Favorita',
      icon: Star,
      className:
        'border-amber-100 bg-amber-50 text-amber-700 shadow-[0_8px_18px_-14px_rgba(245,158,11,0.28)]',
    };
  }

  if (store?.sponsored) {
    return {
      key: 'sponsored',
      label: 'Patrocinada',
      icon: Sparkle,
      className:
        'border-slate-100 bg-slate-50 text-slate-500 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)]',
    };
  }

  return null;
};

const buildDistanceContextKey = (
  savedAddress: PreferredDiscoveryAddress | null,
  location: { lat: number; lng: number } | null,
  region: { city: string; state: string } | null
) => {
  if (savedAddress?.lat != null && savedAddress?.lng != null) {
    return `saved:${Number(savedAddress.lat).toFixed(5)}:${Number(savedAddress.lng).toFixed(5)}`;
  }
  const savedAddressKey = normalizeSearchText(savedAddress?.addressLine || '');
  if (savedAddressKey) return `saved:${savedAddressKey}`;
  if (location) return `gps:${location.lat.toFixed(4)}:${location.lng.toFixed(4)}`;
  const city = normalizeSearchText(region?.city || '');
  const state = normalizeSearchText(region?.state || '');
  return `region:${city}:${state}`;
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
  bannerUrl?: string | null;
  bannerTitle?: string | null;
  bannerDescription?: string | null;
  notes?: string | null;
  canOrderInCondominium?: boolean;
};

type CondominiumAvailabilityModalState = {
  name: string;
  nextLabel: string;
};

type CondominiumPromoModalState = {
  slug: string;
  name: string;
  timeLabel: string;
  eventTitle?: string;
  bannerTitle?: string | null;
  bannerDescription?: string | null;
  bannerUrl: string;
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

const CATEGORY_COLORS: Record<string, { active: string; inactive: string; icon: string }> = {
  Restaurante: { active: 'bg-amber-500 shadow-[0_12px_26px_-14px_rgba(245,158,11,0.62)]', inactive: 'border border-amber-100 bg-amber-50/80', icon: 'text-amber-500' },
  Hamburguer: { active: 'bg-orange-500 shadow-[0_12px_26px_-14px_rgba(249,115,22,0.62)]', inactive: 'border border-orange-100 bg-orange-50/80', icon: 'text-orange-500' },
  Lanche:     { active: 'bg-orange-400 shadow-[0_12px_26px_-14px_rgba(249,115,22,0.55)]', inactive: 'border border-orange-100 bg-orange-50/80', icon: 'text-orange-400' },
  Pizza:      { active: 'bg-rose-500 shadow-[0_12px_26px_-14px_rgba(244,63,94,0.62)]',    inactive: 'border border-rose-100 bg-rose-50/80',   icon: 'text-rose-500' },
  Bebidas:    { active: 'bg-violet-500 shadow-[0_12px_26px_-14px_rgba(139,92,246,0.62)]', inactive: 'border border-violet-100 bg-violet-50/80', icon: 'text-violet-500' },
  Mercado:    { active: 'bg-emerald-600 shadow-[0_12px_26px_-14px_rgba(5,150,105,0.62)]', inactive: 'border border-emerald-100 bg-emerald-50/80', icon: 'text-emerald-600' },
  Farmacia:   { active: 'bg-teal-500 shadow-[0_12px_26px_-14px_rgba(20,184,166,0.62)]',  inactive: 'border border-teal-100 bg-teal-50/80',   icon: 'text-teal-500' },
  Doces:      { active: 'bg-pink-500 shadow-[0_12px_26px_-14px_rgba(236,72,153,0.62)]',  inactive: 'border border-pink-100 bg-pink-50/80',   icon: 'text-pink-500' },
  Empório:    { active: 'bg-lime-600 shadow-[0_12px_26px_-14px_rgba(101,163,13,0.62)]',  inactive: 'border border-lime-100 bg-lime-50/80',   icon: 'text-lime-600' },
};

type FeaturedProduct = {
  id: string;
  productId?: string;
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

const readAdminSession = () => {
  try {
    const raw = localStorage.getItem('adminSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const role = String(parsed?.user?.role || '').toUpperCase();
    const isOperationalRole = role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA';
    if (!parsed?.token || !parsed?.user || !isOperationalRole || !(parsed?.store?.id || parsed?.store?.slug)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const readMotoboySession = () => {
  try {
    const raw = localStorage.getItem('motoboySession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const role = String(parsed?.user?.role || '').toUpperCase();
    if (!parsed?.token || role !== 'MOTOBOY') return null;
    return parsed;
  } catch {
    return null;
  }
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
  const isNativePlatform = Capacitor.isNativePlatform();
  const { setAuth } = useAuth();
  const { setBranding } = useTheme();
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
  const [condominiumAvailabilityModal, setCondominiumAvailabilityModal] = useState<CondominiumAvailabilityModalState | null>(null);
  const [condominiumPromoModal, setCondominiumPromoModal] = useState<CondominiumPromoModalState | null>(null);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isHeaderElevated, setIsHeaderElevated] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isSearchEditing, setIsSearchEditing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const condominiumSearchInputRef = useRef<HTMLInputElement | null>(null);
  const storesSectionRef = useRef<HTMLElement | null>(null);
  const portfolioLoadInFlightRef = useRef(false);
  const publicCondominiumLoadInFlightRef = useRef(false);
  const activeOrdersLoadInFlightRef = useRef(false);
  const anonymousOrdersHydrationInFlightRef = useRef(false);

  const stageFeaturedProductCheckout = (item: FeaturedProduct) => {
    const storeSlug = String(item?.storeSlug || '').trim();
    const productId = String(item?.productId || item?.id || '').trim();
    if (!storeSlug || !productId) return;
    try {
      localStorage.setItem(
        `reorder:${storeSlug}`,
        JSON.stringify({
          items: [
            {
              productId,
              name: String(item?.name || 'Produto').trim(),
              quantity: 1,
            },
          ],
        })
      );
    } catch (error) {
      console.error('Falha ao preparar item em destaque para a sacola', error);
    }
  };

  const SEARCH_PLACEHOLDERS = [
    'Buscar espetinho...',
    'Buscar hambúrguer...',
    'Buscar loja ou produto...',
    'Buscar churrasco...',
    'Buscar bebida...',
    'Buscar sobremesa...',
  ];
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const [searchPlaceholderVisible, setSearchPlaceholderVisible] = useState(true);
  const [condoPickerFilter, setCondoPickerFilter] = useState<'all' | 'live' | 'upcoming' | 'none'>('all');
  useEffect(() => {
    if (isSearchEditing) return;
    const cycle = window.setInterval(() => {
      setSearchPlaceholderVisible(false);
      window.setTimeout(() => {
        setSearchPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
        setSearchPlaceholderVisible(true);
      }, 350);
    }, 2800);
    return () => window.clearInterval(cycle);
  }, [isSearchEditing]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('panel') === 'condominios') {
      setCondominiumPickerOpen(true);
    }
    if (params.get('profile') === '1') {
      setCondominiumPickerOpen(false);
      setProfileDrawerOpen(true);
      params.delete('profile');
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : '',
        },
        { replace: true }
      );
      return;
    }
    if (params.get('favorites') === '1') {
      setQuickFilter('favorites');
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!condominiumPickerOpen) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    const timer = window.setTimeout(() => {
      condominiumSearchInputRef.current?.blur();
    }, 40);

    return () => window.clearTimeout(timer);
  }, [condominiumPickerOpen]);

  const [showStorePromoPopup, setShowStorePromoPopup] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userRegion, setUserRegion] = useState<{ city: string; state: string } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Sua região');
  const [geoDiscovery, setGeoDiscovery] = useState<StoreDiscoveryResponse | null>(null);
  const [preferredDiscoveryAddress, setPreferredDiscoveryAddress] = useState<PreferredDiscoveryAddress | null>(null);
  const [preferredAddressLoading, setPreferredAddressLoading] = useState(false);
  const [hubScopeOverride, setHubScopeOverride] = useState<'default' | 'all_stores'>('default');
  const savedAddressLocation = useMemo(() => {
    if (preferredDiscoveryAddress?.lat == null || preferredDiscoveryAddress?.lng == null) return null;
    return {
      lat: Number(preferredDiscoveryAddress.lat),
      lng: Number(preferredDiscoveryAddress.lng),
    };
  }, [preferredDiscoveryAddress?.lat, preferredDiscoveryAddress?.lng]);
  const activeLocation = savedAddressLocation || userLocation;
  const activeRegion =
    (preferredDiscoveryAddress?.city || preferredDiscoveryAddress?.state
      ? { city: preferredDiscoveryAddress?.city || '', state: preferredDiscoveryAddress?.state || '' }
      : null) ||
    userRegion;
  const activeLocationLabel = preferredDiscoveryAddress?.label || locationLabel;
  const isShowingAllStores = hubScopeOverride === 'all_stores';

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => readCustomerSession());
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [distanceByStore, setDistanceByStore] = useState<Record<string, number>>({});
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [activeAnonymousOrders, setActiveAnonymousOrders] = useState<ActiveAnonymousOrder[]>([]);
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
  const pendingPortfolioReloadRef = useRef(false);
  const distanceCacheKeyRef = useRef<string>('');
  const hubDebugEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(location.search || '');
      const queryFlag = params.get(HUB_DEBUG_QUERY_PARAM);
      if (queryFlag === '1') {
        localStorage.setItem(HUB_DEBUG_STORAGE_KEY, '1');
        return true;
      }
      if (queryFlag === '0') {
        localStorage.removeItem(HUB_DEBUG_STORAGE_KEY);
        sessionStorage.removeItem(HUB_DEBUG_TRACE_KEY);
        return false;
      }
      return localStorage.getItem(HUB_DEBUG_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }, [location.search]);
  const hubDebug = useCallback((event: string, payload?: Record<string, any>) => {
    if (!hubDebugEnabled || typeof window === 'undefined') return;
    const entry = {
      ts: new Date().toISOString(),
      event,
      payload: payload || {},
    };
    appendHubDebugTrace(entry);
    console.info('[HubDebug]', entry);
  }, [hubDebugEnabled]);

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

  useEffect(() => {
    let cancelled = false;

    const resolvePreferredDiscoveryAddress = async () => {
      if (!customerSession?.token) {
        setPreferredDiscoveryAddress(null);
        setPreferredAddressLoading(false);
        hubDebug('preferred-address-cleared', { reason: 'no-customer-session' });
        return;
      }

      try {
        setPreferredAddressLoading(true);
        const rows = await customerAccountService.listAddresses();
        if (cancelled) return;
        const preferred = (Array.isArray(rows) ? rows : []).find((item: any) => item?.isDefault) || rows?.[0];
        if (!preferred) {
          setPreferredDiscoveryAddress(null);
          hubDebug('preferred-address-missing', { totalAddresses: Array.isArray(rows) ? rows.length : 0 });
          return;
        }

        const normalized = buildCustomerAddressLookup(preferred);
        if (!normalized.city && !normalized.state) {
          setPreferredDiscoveryAddress(null);
          hubDebug('preferred-address-invalid', {
            addressId: preferred?.id || null,
            hasLatLng: normalized.lat != null && normalized.lng != null,
          });
          return;
        }

        const nextAddress: PreferredDiscoveryAddress = {
          label: normalized.label,
          city: normalized.city,
          state: normalized.state,
          addressLine: normalized.addressLine,
          lat: normalized.lat,
          lng: normalized.lng,
        };

        setPreferredDiscoveryAddress(nextAddress);
        hubDebug('preferred-address-loaded', {
          addressId: preferred?.id || null,
          label: nextAddress.label,
          city: nextAddress.city,
          state: nextAddress.state,
          hasLatLng: nextAddress.lat != null && nextAddress.lng != null,
        });
      } catch {
        if (!cancelled) {
          setPreferredDiscoveryAddress(null);
          hubDebug('preferred-address-error');
        }
      } finally {
        if (!cancelled) {
          setPreferredAddressLoading(false);
        }
      }
    };

    void resolvePreferredDiscoveryAddress();
    const refreshAddressContext = () => {
      void resolvePreferredDiscoveryAddress();
    };
    window.addEventListener('focus', refreshAddressContext);
    window.addEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, refreshAddressContext as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshAddressContext);
      window.removeEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, refreshAddressContext as EventListener);
    };
  }, [customerSession?.token, customerSession?.user?.email, hubDebug]);

  useEffect(() => {
    const handleOpenProfileDrawer = () => setProfileDrawerOpen(true);
    window.addEventListener('jnk:open-profile-drawer', handleOpenProfileDrawer);
    return () => window.removeEventListener('jnk:open-profile-drawer', handleOpenProfileDrawer);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const existing = readCustomerSession();
    if (existing?.token) return;
    if (!nativeBiometricService.hasValidStoredCustomerEnrollment()) return;
    const timer = window.setTimeout(async () => {
      try {
        const session = await nativeBiometricService.loginCustomerWithBiometrics('Confirme sua identidade para entrar');
        setCustomerSession(session);
      } catch {
        // usuário cancelou — segue no fluxo normal
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  // Carregar pedidos anônimos do localStorage e reconciliar status real
  useEffect(() => {
    let cancelled = false;
    const hydrateOrders = async () => {
      if (anonymousOrdersHydrationInFlightRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      anonymousOrdersHydrationInFlightRef.current = true;
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
      } finally {
        anonymousOrdersHydrationInFlightRef.current = false;
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
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          '';
        const locality =
          city ||
          addr.city_district ||
          addr.suburb ||
          addr.neighbourhood ||
          '';
        const state = (addr.state_code || addr.state || '').toString();
        const nextLabel = [locality, state].filter(Boolean).join(' - ').trim();
        if (!cancelled) {
          setUserRegion((city || locality) ? { city: String(city || locality), state } : null);
          if (nextLabel) setLocationLabel(nextLabel);
          hubDebug('gps-region-resolved', {
            lat: Number(userLocation.lat).toFixed(5),
            lng: Number(userLocation.lng).toFixed(5),
            city: String(city || locality || ''),
            state,
            label: nextLabel || 'Sua região',
          });
        }
      } catch (_error) {
        if (!cancelled) {
          setLocationLabel('Sua região');
          setUserRegion(null);
          hubDebug('gps-region-error', {
            lat: Number(userLocation.lat).toFixed(5),
            lng: Number(userLocation.lng).toFixed(5),
          });
        }
      }
    };
    resolveUserLabel();
    return () => {
      cancelled = true;
    };
  }, [hubDebug, userLocation]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (customerSession?.token && preferredAddressLoading) return;
    if (savedAddressLocation) {
      setUserLocation(null);
      hubDebug('gps-skip-saved-address', {
        lat: Number(savedAddressLocation.lat).toFixed(5),
        lng: Number(savedAddressLocation.lng).toFixed(5),
      });
      return;
    }
    const timer = window.setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
          };
          setUserLocation({
            lat: nextLocation.lat,
            lng: nextLocation.lng,
          });
          hubDebug('gps-position-loaded', {
            lat: nextLocation.lat.toFixed(5),
            lng: nextLocation.lng.toFixed(5),
            accuracyM: Number(position.coords.accuracy || 0).toFixed(0),
          });
        },
        () => {
          setUserLocation(null);
          hubDebug('gps-position-error');
        },
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 10 * 60 * 1000 }
      );
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [customerSession?.token, hubDebug, preferredAddressLoading, savedAddressLocation]);

  const loadPortfolio = useCallback(async () => {
    if (portfolioLoadInFlightRef.current) {
      pendingPortfolioReloadRef.current = true;
      hubDebug('portfolio-load-skipped', { reason: 'in-flight' });
      return;
    }
    portfolioLoadInFlightRef.current = true;
    try {
      const locationQuery = selectedCondominiumSlug
        ? { lat: null, lng: null, city: null, state: null }
        : {
            lat: savedAddressLocation?.lat ?? userLocation?.lat ?? null,
            lng: savedAddressLocation?.lng ?? userLocation?.lng ?? null,
            city: preferredDiscoveryAddress?.city || activeRegion?.city || null,
            state: preferredDiscoveryAddress?.state || activeRegion?.state || null,
          };
      const basePortfolio = await storeService.listPortfolio({
        lat: locationQuery.lat,
        lng: locationQuery.lng,
        city: locationQuery.city,
        state: locationQuery.state,
      });
      const baseStores = Array.isArray(basePortfolio) ? basePortfolio : [];
      setGeoDiscovery(null);
      setStores(baseStores);
      setError('');
      hubDebug('portfolio-loaded', {
        count: baseStores.length,
        sample: baseStores.slice(0, 5).map((store: any) => ({
          slug: String(store?.slug || ''),
          hasStoreLatLng: Number.isFinite(Number(store?.settings?.lat)) && Number.isFinite(Number(store?.settings?.lng)),
          city: String(store?.settings?.city || ''),
          state: String(store?.settings?.state || ''),
        })),
      });
    } finally {
      portfolioLoadInFlightRef.current = false;
      if (pendingPortfolioReloadRef.current) {
        pendingPortfolioReloadRef.current = false;
        window.setTimeout(() => {
          void loadPortfolio();
        }, 0);
      }
    }
  }, [activeRegion?.city, activeRegion?.state, hubDebug, preferredDiscoveryAddress?.city, preferredDiscoveryAddress?.state, savedAddressLocation?.lat, savedAddressLocation?.lng, selectedCondominiumSlug, userLocation?.lat, userLocation?.lng]);

  const refreshHub = useCallback(async () => {
    if (portfolioLoadInFlightRef.current) return;
    setIsRefreshing(true);
    try {
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o Hub agora.');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPortfolio]);

  useEffect(() => {
    let active = true;
    if (!stores.length) setLoading(true);
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
  }, [hubScopeOverride, loadPortfolio]);

  const refreshPublicCondominiums = useCallback(async (options?: { skipIfHidden?: boolean }) => {
    if (options?.skipIfHidden && typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (publicCondominiumLoadInFlightRef.current) return;
    publicCondominiumLoadInFlightRef.current = true;
    try {
      const data = await condominiumService.listPublic();
      const items = Array.isArray(data) ? data : [];
      setCondominiums(items);
    } finally {
      publicCondominiumLoadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    refreshPublicCondominiums().catch(() => {
      if (!active) return;
      setCondominiums([]);
    });

    const handleVisibilityRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      refreshPublicCondominiums({ skipIfHidden: true }).catch(() => undefined);
    };
    const intervalId = window.setInterval(() => {
      refreshPublicCondominiums({ skipIfHidden: true }).catch(() => undefined);
    }, 45000);

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleVisibilityRefresh);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleVisibilityRefresh);
    };
  }, [refreshPublicCondominiums]);

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
        const freshEvent = data?.event || data?.condominium?.eventSummary || null;
        setSelectedCondominiumEvent(freshEvent);
        if (freshEvent || data?.condominium) {
          setCondominiums((prev) =>
            prev.map((item) =>
              String(item?.slug || '').trim() === slug
                ? {
                    ...item,
                    ...(data?.condominium || {}),
                    eventSummary: freshEvent,
                  }
                : item
            )
          );
        }
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
    if (!isSearchEditing) return;
    const raf = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [isSearchEditing]);

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
      setIsHeaderElevated(!isNativePlatform || (window.scrollY || 0) > 6);
      setIsBottomNavVisible(true);
      setIsSearchEditing(false);
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
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
  }, [isNativePlatform]);

  useEffect(() => {
    if (!isNativePlatform) {
      setIsHeaderElevated(true);
      setIsBottomNavVisible(true);
      return;
    }
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
  }, [isNativePlatform]);

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
        const apiDistanceKm = parseOptionalNumber((store as any)?.distanceKm);
        const distanceKm = apiDistanceKm;
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
                : false);
        const rawLogo = (store?.settings as any)?.logoUrl || (store?.settings as any)?.logo_url || (store as any)?.logoUrl || (store as any)?.logo_url;
        const logo = resolveAssetUrl(rawLogo || undefined) || getStoreAvatarUrl(store?.slug, store?.name);
        
        const rawBanner = (store?.settings as any)?.bannerUrl || (store?.settings as any)?.banner_url || (store as any)?.bannerUrl || (store as any)?.banner_url;
        const banner = resolveAssetUrl(rawBanner || undefined) || logo;
        const storeLat = parseOptionalNumber((store as any)?.settings?.lat);
        const storeLng = parseOptionalNumber((store as any)?.settings?.lng);

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
          deliversToUserLocation: Boolean((store as any)?.deliversToUserLocation),
          deliveryStatusLabel: String((store as any)?.deliveryStatusLabel || '').trim(),
          acceptsDelivery: Boolean((store as any)?.acceptsDelivery ?? supportsDelivery),
          acceptsPickup: Boolean((store as any)?.acceptsPickup ?? supportsPickup),
          geoAvailability: String((store as any)?.geoAvailability || '').trim(),
          isNearest: Boolean((store as any)?.isNearest),
          distanceSource: apiDistanceKm !== null ? 'server' : 'local',
          nextOpeningLabel: String(store?.nextOpeningLabel || '').trim(),
          primaryColor: String(store?.settings?.primaryColor || '').trim(),
          secondaryColor: String(store?.settings?.secondaryColor || '').trim(),
          storeLat,
          storeLng,
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
      distanceKm: number | null;
      etaMin: number;
      etaMax: number;
      freeShipping: boolean;
      isOpen: boolean;
      supportsDelivery: boolean;
      supportsPickup: boolean;
      supportsTable: boolean;
      supportsPostal: boolean;
      deliversToUserLocation: boolean;
      deliveryStatusLabel: string;
      acceptsDelivery: boolean;
      acceptsPickup: boolean;
      geoAvailability: string;
      isNearest: boolean;
      distanceSource: 'server' | 'local';
      nextOpeningLabel: string;
      primaryColor: string;
      secondaryColor: string;
      storeLat: number | null;
      storeLng: number | null;
      addressText: string;
      logo: string;
      banner: string;
      searchIndex: string;
      productSearchIndex: string;
    }>;
  }, [geoDiscovery, productSearchBySlug, stores]);

  const scopedEnrichedStores = useMemo(() => {
    if (!selectedCondominiumSlug) return enrichedStores;
    const condominiumSlugSet = new Set(condominiumStoreSlugs);
    return enrichedStores.filter((store) => condominiumSlugSet.has(store.slug));
  }, [enrichedStores, condominiumStoreSlugs, selectedCondominiumSlug]);
  const isCondominiumScope = Boolean(selectedCondominiumSlug);

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
                   productId: String(p.id || '').trim() || undefined,
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
                    productId: String(p.id || '').trim() || undefined,
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
    ? resolveCondominiumAssetUrl(selectedCondominium, 'logo')
    : '';
  const selectedCondominiumBannerUrl = selectedCondominium
    ? resolveCondominiumAssetUrl(selectedCondominium, 'banner')
    : '';
  const condominiumPreviewLogos = useMemo(() => {
    return condominiums.slice(0, 3).map((condominium) => resolveCondominiumAssetUrl(condominium, 'logo'));
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
  const condominiumPickerCounts = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let none = 0;

    filteredCondominiums.forEach(({ event }) => {
      if (event?.state === 'live') {
        live += 1;
        return;
      }
      if (event?.state === 'upcoming') {
        upcoming += 1;
        return;
      }
      none += 1;
    });

    return {
      all: filteredCondominiums.length,
      live,
      upcoming,
      none,
    };
  }, [filteredCondominiums]);

  const filteredStores = useMemo(() => {
    return scopedEnrichedStores
      .filter((store) => {
        if (debouncedQuery && !store.searchIndex.includes(debouncedQuery) && !store.productSearchIndex.includes(debouncedQuery)) return false;
        if (segmentFilter !== 'all' && store.segment !== segmentFilter) return false;
        if (quickFilter === 'free_shipping' && !store.freeShipping) return false;
        const resolvedDistance = distanceByStore[store.id] ?? store.distanceKm;
        if (!isCondominiumScope && quickFilter === 'nearby' && (resolvedDistance == null || resolvedDistance > 2.5)) return false;
        if (quickFilter === 'open_now' && !store.isOpen) return false;
        if (quickFilter === 'favorites' && !favoriteStoreSlugs.includes(store.slug)) return false;
        return true;
      })
      .sort((a, b) => {
        const condominiumScope = Boolean(selectedCondominiumSlug);
        const regionalDelta =
          storeRegionalPriority(a, { condominiumScope }) -
          storeRegionalPriority(b, { condominiumScope });
        if (regionalDelta !== 0) return regionalDelta;
        if (!condominiumScope) {
          const distanceA = distanceByStore[a.id] ?? a.distanceKm ?? Number.MAX_SAFE_INTEGER;
          const distanceB = distanceByStore[b.id] ?? b.distanceKm ?? Number.MAX_SAFE_INTEGER;
          if (distanceA !== distanceB) return distanceA - distanceB;
        }
        const favoritesDelta = Number(favoriteStoreSlugs.includes(b.slug)) - Number(favoriteStoreSlugs.includes(a.slug));
        if (favoritesDelta !== 0) return favoritesDelta;
        return b.rating - a.rating;
      });
  }, [scopedEnrichedStores, debouncedQuery, segmentFilter, quickFilter, favoriteStoreSlugs, distanceByStore, isCondominiumScope, selectedCondominiumSlug]);

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
      if (isCondominiumScope || !activeLocation || scopedEnrichedStores.length === 0) {
        setDistanceByStore({});
        return;
      }
      const contextKey = buildDistanceContextKey(preferredDiscoveryAddress, activeLocation, activeRegion);
      if (distanceCacheKeyRef.current !== contextKey) {
        distanceCacheKeyRef.current = contextKey;
        try {
          const cached = readHubCache<Record<string, number>>(`hub:store-distance:${contextKey}`, HUB_DISTANCE_CACHE_TTL_MS);
          setDistanceByStore(cached && typeof cached === 'object' ? cached : {});
        } catch {
          setDistanceByStore({});
        }
      }
      if (scopedEnrichedStores.every((store) => store.distanceSource === 'server')) {
        setDistanceByStore({});
        return;
      }

      try {
        const targets = scopedEnrichedStores
          .filter((store) => store.distanceSource !== 'server')
          .slice(0, 8)
          .filter((store) => store.storeLat != null && store.storeLng != null);
        const cachedDistances =
          readHubCache<Record<string, number>>(`hub:store-distance:${contextKey}`, HUB_DISTANCE_CACHE_TTL_MS) || {};

        const missingTargets = targets.filter((store) => {
          const cachedKm = Number(cachedDistances?.[store.id]);
          return !Number.isFinite(cachedKm);
        });

        if (Object.keys(cachedDistances).length > 0 && !cancelled) {
          setDistanceByStore(cachedDistances);
        }
        if (missingTargets.length === 0) {
          hubDebug('distance-cache-hit', {
            contextKey,
            cachedCount: Object.keys(cachedDistances).length,
          });
          setDistanceLoading(false);
          return;
        }

        setDistanceLoading(true);
        const settled = await Promise.allSettled(
          missingTargets.map(async (store) => {
            const km = haversineKm(activeLocation, { lat: Number(store.storeLat), lng: Number(store.storeLng) });
            return [store.id, km] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, number> = { ...cachedDistances };
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            next[result.value[0]] = result.value[1];
          }
        });
        setDistanceByStore(next);
        writeHubCache(`hub:store-distance:${contextKey}`, next);
        hubDebug('distance-calculated', {
          contextKey,
          activeSource: savedAddressLocation ? 'saved_address' : activeLocation ? 'gps' : 'none',
          targetCount: missingTargets.length,
          sample: missingTargets.slice(0, 5).map((store) => ({
            slug: store.slug,
            km: next[store.id] ?? null,
            storeLat: store.storeLat,
            storeLng: store.storeLng,
          })),
        });
      } catch (_err) {
        // preserve the last valid cache instead of clearing the distance badge
      } finally {
        if (!cancelled) setDistanceLoading(false);
      }
    };
    const timer = window.setTimeout(loadApproxDistances, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeLocation, activeRegion?.city, activeRegion?.state, hubDebug, isCondominiumScope, preferredDiscoveryAddress?.addressLine, savedAddressLocation, scopedEnrichedStores]);

  useEffect(() => {
    hubDebug('location-source', {
      source: savedAddressLocation ? 'saved_address' : activeLocation ? 'gps' : 'none',
      isLoggedIn: Boolean(customerSession?.token),
      label: activeLocationLabel,
      lat: activeLocation ? Number(activeLocation.lat).toFixed(5) : null,
      lng: activeLocation ? Number(activeLocation.lng).toFixed(5) : null,
      regionCity: activeRegion?.city || null,
      regionState: activeRegion?.state || null,
    });
  }, [
    activeLocation,
    activeLocationLabel,
    activeRegion?.city,
    activeRegion?.state,
    customerSession?.token,
    hubDebug,
    savedAddressLocation,
  ]);

  useEffect(() => {
    if (!hubDebugEnabled) return;
    hubDebug('distance-snapshot', {
      totalStores: scopedEnrichedStores.length,
      computedLocalDistances: Object.keys(distanceByStore).length,
      distanceLoading,
      sample: scopedEnrichedStores.slice(0, 5).map((store) => ({
        slug: store.slug,
        source: distanceByStore[store.id] != null ? 'local_haversine' : store.distanceKm != null ? 'server' : 'none',
        km: distanceByStore[store.id] ?? store.distanceKm ?? null,
        hasStoreLatLng: store.storeLat != null && store.storeLng != null,
      })),
    });
  }, [distanceByStore, distanceLoading, hubDebug, hubDebugEnabled, scopedEnrichedStores]);

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
            productId: String(item?.productId || '').trim() || undefined,
            storeSlug: String(item?.storeSlug || ''),
            storeName: String(item?.storeName || 'Loja'),
            name: String(item?.productName || 'Produto em destaque'),
            storeLogo: resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho.jpg',
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
                productId: String(product?.id || '').trim() || undefined,
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

  const formatDistance = (km: number | null | undefined) => {
    const normalizedKm = typeof km === 'number' && Number.isFinite(km) ? km : null;
    if (normalizedKm === null) return '-- km';
    const displayKm = Math.max(0.1, normalizedKm);
    return `${displayKm.toFixed(1).replace('.', ',')} km`;
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
  const customerProfileImage = useCachedCustomerProfileImage(
    customerSession?.user?.profileImageUrl,
    customerSession?.user?.profileImageVersion
  );
  const displayLocationLabel =
    activeLocationLabel === 'Sua região' && fallbackRegionLabel ? fallbackRegionLabel : activeLocationLabel;

  const openCustomerAccount = useCallback(() => {
    navigate('/cliente/conta');
  }, [navigate]);

  const openCustomerSettings = useCallback(() => {
    navigate('/cliente/conta?section=settings');
  }, [navigate]);

  const openCustomerOrders = useCallback(() => {
    navigate('/cliente/pedidos');
  }, [navigate]);

  const openCustomerLogin = useCallback(async () => {
    const savedSession = readCustomerSession();
    if (savedSession?.token) {
      setCustomerSession(savedSession);
      navigate('/hub', { replace: true });
      return;
    }
    if (nativeBiometricService.hasValidStoredCustomerEnrollment()) {
      try {
        const session = await nativeBiometricService.loginCustomerWithBiometrics('Confirme sua identidade para entrar na sua conta');
        setCustomerSession(session);
        navigate('/hub', { replace: true });
        return;
      } catch {
        // fallback to login screen
      }
    }
    navigate('/cliente?mode=login&next=/hub&hub=1&bio=1');
  }, [navigate]);

  const openAdminLogin = useCallback(async () => {
    const savedSession = readAdminSession();
    if (savedSession?.token) {
      const storeSettings = (savedSession as any)?.store?.settings || {};
      setAuth(savedSession as any);
      setBranding({
        primaryColor: storeSettings?.primaryColor,
        secondaryColor: storeSettings?.secondaryColor,
        logoUrl: storeSettings?.logoUrl,
        brandName: savedSession?.store?.name,
      });
      const savedRole = String(savedSession?.user?.role || '').toUpperCase();
      if ((savedRole === 'ADMIN' || savedRole === 'OPERATOR' || savedRole === 'LOJISTA') && window.matchMedia('(max-width: 767px)').matches && savedSession?.store?.slug) {
        navigate(`/${savedSession.store.slug}`, { replace: true });
        return;
      }
      navigate(savedRole === 'ADMIN' ? '/admin/dashboard' : '/admin/queue', { replace: true });
      return;
    }
    if (nativeBiometricService.hasValidStoredAdminEnrollment()) {
      try {
        const session = await nativeBiometricService.loginAdminWithBiometrics('Confirme sua identidade para acessar sua operação');
        const storeSettings = (session as any)?.store?.settings || {};
        setAuth(session as any);
        setBranding({
          primaryColor: storeSettings?.primaryColor,
          secondaryColor: storeSettings?.secondaryColor,
          logoUrl: storeSettings?.logoUrl,
          brandName: session?.store?.name,
        });
        const role = String(session?.user?.role || '').toUpperCase();
        if ((role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA') && window.matchMedia('(max-width: 767px)').matches && session?.store?.slug) {
          navigate(`/${session.store.slug}`, { replace: true });
          return;
        }
        navigate(role === 'ADMIN' ? '/admin/dashboard' : '/admin/queue', { replace: true });
        return;
      } catch {
        // fallback to login screen
      }
    }
    navigate('/admin?bio=1&hub=1&next=/hub');
  }, [navigate, setAuth, setBranding]);

  const openMotoboyLogin = useCallback(async () => {
    const savedSession = readMotoboySession();
    if (savedSession?.token) {
      nativeBiometricService.syncMotoboySession(savedSession as any);
      navigate('/motoboy/home', { replace: true });
      return;
    }
    if (nativeBiometricService.hasValidStoredMotoboyEnrollment()) {
      try {
        await nativeBiometricService.loginMotoboyWithBiometrics('Confirme sua identidade para acessar suas entregas');
        navigate('/motoboy/home', { replace: true });
        return;
      } catch {
        // fallback to login screen
      }
    }
    navigate('/motoboy/login?bio=1&hub=1&next=/hub');
  }, [navigate]);

  const openTerms = useCallback(() => {
    navigate('/terms?from=hub');
  }, [navigate]);

  const clearHubFilters = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setQuickFilter('all');
    setSegmentFilter('all');
    setSelectedCondominiumSlug('');
  }, []);

  const enableAllStoresView = useCallback(() => {
    clearHubFilters();
    setHubScopeOverride('all_stores');
  }, [clearHubFilters]);

  const restoreRegionalView = useCallback(() => {
    setHubScopeOverride('default');
  }, []);

  const openPrivacy = useCallback(() => {
    navigate('/terms?from=hub#lgpd');
  }, [navigate]);

  const openHelp = useCallback(() => {
    window.location.href = 'mailto:contato@janocaminho.com.br?subject=Ajuda%20-%20Ja%20no%20Caminho';
  }, []);

  const handleCustomerLogout = useCallback(() => {
    clearAllCustomerSessions();
    setCustomerSession(null);
    navigate('/hub');
  }, [navigate]);

  const handleAdminLogout = useCallback(() => {
    try {
      nativeBiometricService.syncAdminSession(null);
    } catch {
      // ignore
    }
    setAuth(null);
    setBranding({
      primaryColor: '#b91c1c',
      secondaryColor: '#111827',
      logoUrl: '',
      bannerUrl: '',
      brandName: '',
    });
    navigate('/hub', { replace: true });
  }, [navigate, setAuth, setBranding]);

  const handleMotoboyLogout = useCallback(() => {
    try {
      nativeBiometricService.syncMotoboySession(null);
    } catch {
      // ignore
    }
    navigate('/hub', { replace: true });
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

  const clearCondominiumSelection = useCallback(() => {
    setSelectedCondominiumSlug('');
    setCondominiumSearch('');
    resetMarketplaceFilters();
  }, [resetMarketplaceFilters]);

  const handleHomeHubNavigation = useCallback(() => {
    clearCondominiumSelection();
    setCondominiumPickerOpen(false);
    navigate('/hub');
  }, [clearCondominiumSelection, navigate]);

  const handleOpenPedidos = useCallback(async () => {
    if (isCustomerLogged) {
      navigate('/cliente/pedidos');
      return;
    }
    if (nativeBiometricService.hasValidStoredCustomerEnrollment()) {
      try {
        const session = await nativeBiometricService.loginCustomerWithBiometrics('Confirme sua identidade para ver seus pedidos');
        setCustomerSession(session);
        navigate('/cliente/pedidos');
        return;
      } catch {
        // Fallback
      }
    }
    navigate('/cliente?mode=login&next=/cliente/pedidos&hub=1&bio=1');
  }, [navigate, isCustomerLogged, setCustomerSession]);

  const [activeOrders, setActiveOrders] = useState<any[]>([]); void activeOrders;

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


  const visibleActiveAnonymousOrders = useMemo(
    () => activeAnonymousOrders.filter((order) => !dismissedAnonymousOrderIds.includes(String(order?.id || '').trim())),
    [activeAnonymousOrders, dismissedAnonymousOrderIds]
  );

  const [storageUnread, setStorageUnread] = useState(0);
  useEffect(() => {
    apiClient.get("/customer/notifications").then((r: any) => setStorageUnread(r?.unreadCount || 0)).catch(() => {});
    const interval = setInterval(() => { apiClient.get("/customer/notifications").then((r: any) => setStorageUnread(r?.unreadCount || 0)).catch(() => {}); }, 5000);
    const onFocus = () => { apiClient.get("/customer/notifications").then((r: any) => setStorageUnread(r?.unreadCount || 0)).catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);
  const hubNotificationCount = storageUnread;

  const handleHubNotificationClick = useCallback(() => {
    navigate('/notificacoes');
  }, [navigate]);

  useEffect(() => {
    if (isCustomerLogged) setActiveAnonymousOrders([]);
  }, [isCustomerLogged]);

  const loadActiveOrders = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (activeOrdersLoadInFlightRef.current) return;
    const session = readCustomerSession();
    if (!session?.token) {
      setActiveOrders([]);
      return;
    }
    activeOrdersLoadInFlightRef.current = true;
    try {
      const result = await customerAccountService.listOrders({ limit: 20 });
      const active = ((result?.data) || []).filter((o: any) => {
        const status = String(o.status || '').toLowerCase();
        const createdAt = new Date(o?.createdAt || 0).getTime();
        const isRecentEnough = Number.isFinite(createdAt) ? (Date.now() - createdAt) < ACTIVE_ORDER_ALERT_MAX_AGE_MS : true;
        return isRecentEnough && !['done', 'delivered', 'finished', 'cancelled', 'rejected'].includes(status);
      });
      setActiveOrders(active.slice(0, 3));
      setActiveOrders(active.slice(0, 3));
    } catch {
      // ignore
    } finally {
      activeOrdersLoadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isCustomerLogged) {
      setActiveOrders([]);
      return;
    }
    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadActiveOrders();
    };
    const timer = window.setTimeout(refreshIfVisible, 1200);
    const interval = window.setInterval(refreshIfVisible, 10000);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('jnc:app-foreground', refreshIfVisible as EventListener);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('jnc:app-foreground', refreshIfVisible as EventListener);
    };
  }, [isCustomerLogged, loadActiveOrders]);

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
    <div className="min-h-screen w-full overflow-x-hidden overscroll-x-none bg-[radial-gradient(ellipse_at_top_right,rgba(51,104,134,0.16),transparent_38%),radial-gradient(ellipse_at_bottom_left,rgba(21,58,76,0.08),transparent_40%),linear-gradient(180deg,#EEF2F7_0%,#F4F8FB_50%,#EEF2F7_100%)] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] text-slate-900 sm:pb-24">
      {/* Elemento Decorativo de Fundo (Premium Look) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[max(env(safe-area-inset-top),0.75rem)] bg-[#EEF2F7]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-[#336886]/8 via-white/30 to-transparent" />
      <div className="fixed left-[-8%] top-[10%] h-[28%] w-[38%] rounded-full bg-[#336886]/6 blur-[130px] pointer-events-none -z-10" />
      <div className="fixed top-[-10%] right-[-10%] h-[44%] w-[52%] bg-[#153A4C]/18 blur-[110px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[5%] right-[5%] h-[22%] w-[28%] bg-[#336886]/8 blur-[100px] rounded-full pointer-events-none -z-10" />

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
              <div className="relative aspect-[16/6] bg-slate-950">
                <img
                  src="/marketing/mpv2.png"
                  alt="Banner de integração com Mercado Pago no Já no Caminho"
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
        onLogoutAdmin={handleAdminLogout}
        onLogoutMotoboy={handleMotoboyLogout}
        onRegisterClient={() => navigate('/cliente?mode=register&hub=1&next=/hub')}
        onRegisterStore={() => navigate('/create?plan=trial')}
        onRegisterMotoboy={() => navigate('/motoboy/register')}
        versionLabel={APP_BUILD_INFO.versionLabel}
      />

      <div
        className={`relative transition-all duration-700 ${
          hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <header className={`sticky top-0 z-[60] transition-all duration-300 ${isNativePlatform ? 'bg-[#EEF2F7]/96 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl' : isHeaderElevated ? 'bg-[#EEF2F7]/92 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] backdrop-blur-2xl' : 'bg-transparent'}`}>
          <div className={`mx-auto max-w-[1200px] px-4 ${isNativePlatform ? 'pb-2 pt-[max(0.55rem,calc(env(safe-area-inset-top)+0.1rem))]' : 'pb-3 pt-[max(0.85rem,calc(env(safe-area-inset-top)+0.2rem))]'}`}>
            <div className={`${isNativePlatform ? 'space-y-2.5 rounded-[1.65rem] px-2.5 py-2.5' : 'space-y-3 rounded-[1.9rem] px-3 py-3'} relative overflow-hidden border border-white/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.95)_0%,rgba(241,247,246,0.9)_54%,rgba(255,255,255,0.92)_100%)] shadow-[0_22px_54px_-38px_rgba(15,23,42,0.46)] ring-1 ring-slate-200/55 backdrop-blur-2xl`}>
            <div className="pointer-events-none absolute -left-12 -top-16 h-36 w-36 rounded-full bg-[#336886]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-6 h-28 w-28 rounded-full bg-emerald-200/35 blur-3xl" />
            {/* Linha 1: Perfil e Logo */}
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <HeaderAvatarTrigger
                  displayName={customerDisplayName}
                  profileImageUrl={customerProfileImage}
                  hasNotification={!isCustomerLogged}
                  onClick={() => setProfileDrawerOpen(true)}
                />
                <div className="min-w-0 flex-1 rounded-[1.35rem] border border-white/75 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_30px_-26px_rgba(15,23,42,0.34)] ring-1 ring-slate-950/5 backdrop-blur-sm">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-4 w-4 shrink-0 rounded-[0.4rem] object-cover shadow-[0_2px_6px_-2px_rgba(21,58,76,0.3)]" />
                    <p className="truncate text-[9.5px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {isCustomerLogged
                        ? `${(() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })()}, ${customerDisplayName.split(' ')[0]} 👋`
                        : `${(() => { const h = new Date().getHours(); return h < 12 ? '☀️ Bom dia' : h < 18 ? '🌤️ Boa tarde' : '🌙 Boa noite'; })()} — o que vai pedir hoje?`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex w-full min-w-0 items-center justify-between gap-2 text-left text-[14px] font-black text-slate-950 transition-colors duration-150 ease-out hover:text-[#336886] active:scale-[0.99]"
                    onClick={() => setQuickFilter((prev) => (prev === 'nearby' ? 'all' : 'nearby'))}
                  >
                    <span className="truncate">{displayLocationLabel}</span>
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#336886]">
                      <CaretDown size={13} weight="bold" />
                    </span>
                  </button>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleHubNotificationClick}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-[#336886]/18 bg-[#153A4C] text-white shadow-[0_14px_26px_-18px_rgba(21,58,76,0.55)] ring-1 ring-[#336886]/10 backdrop-blur-sm transition-all duration-150 ease-out hover:bg-[#1e4d62] active:scale-95"
                aria-label={hubNotificationCount > 0 ? `${hubNotificationCount} notificação de pedido` : 'Abrir notificações'}
                title={hubNotificationCount > 0 ? 'Pedidos em andamento' : 'Notificações'}
              >
                <BellRinging size={18} weight={hubNotificationCount > 0 ? 'fill' : 'duotone'} />
                {hubNotificationCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white shadow-[0_8px_18px_-10px_rgba(225,29,72,0.9)]">
                    {hubNotificationCount > 9 ? '9+' : hubNotificationCount}
                  </span>
                ) : null}
                {hubNotificationCount > 0 ? (
                  <span className="absolute inset-0 rounded-[1.15rem] border border-rose-600/35 animate-ping" />
                ) : null}
              </button>
            </div>

            {/* Linha 2: Busca Premium */}
            <div className="relative z-20">
              <div
                className={`group relative isolate flex items-center gap-3 overflow-hidden border border-slate-200/80 bg-white px-3.5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-slate-300 focus-within:border-[#336886]/25 focus-within:shadow-[0_18px_40px_-24px_rgba(51,104,134,0.28)] focus-within:ring-2 focus-within:ring-[#336886]/10 ${isNativePlatform ? 'min-h-[50px] rounded-[1.35rem] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.25)]' : 'min-h-[54px] rounded-[1.55rem] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.28)]'}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  searchInputRef.current?.focus();
                }}
              >
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border border-[#336886]/10 bg-[#336886]/8 text-[#336886] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <MagnifyingGlass size={18} weight="bold" />
                </div>
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setIsSearchEditing(true)}
                    onBlur={() => setIsSearchEditing(false)}
                    placeholder={isSearchEditing ? 'Buscar loja, categoria ou produto' : SEARCH_PLACEHOLDERS[searchPlaceholderIndex]}
                    autoComplete="off"
                    inputMode="search"
                    enterKeyHint="search"
                    className={`block w-full min-w-0 appearance-none bg-transparent pr-1 font-semibold text-slate-950 outline-none transition-opacity duration-300 ${searchPlaceholderVisible || isSearchEditing ? 'placeholder:opacity-100' : 'placeholder:opacity-0'} placeholder:text-slate-400 placeholder:transition-opacity placeholder:duration-300 ${isNativePlatform ? 'min-h-[48px] text-[15px]' : 'min-h-[52px] text-[14px]'}`}
                    style={{
                      WebkitAppearance: 'none',
                      caretColor: '#336886',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      WebkitTextFillColor: 'inherit',
                      color: '#0f172a',
                      transform: 'translateZ(0)',
                    }}
                  />
                </div>
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setDebouncedQuery('');
                      setIsSearchEditing(false);
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
            <div className={`relative -mx-0.5 ${isNativePlatform ? 'py-0.5' : 'py-1'}`}>
              <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-hide px-0.5">
              {(['free_shipping', 'nearby', 'open_now', 'favorites'] as const).map((filter) => {
                const label =
                  filter === 'free_shipping' ? 'Frete grátis' :
                  filter === 'nearby' ? 'Perto de você' :
                  filter === 'favorites' ? 'Favoritos' : 'Abertos';
                const Icon =
                  filter === 'free_shipping' ? Bicycle :
                  filter === 'nearby' ? MapPinLine :
                  filter === 'favorites' ? Heart : Clock;
                const active = quickFilter === filter;
                const activeStyle =
                  filter === 'free_shipping'? 'border-emerald-500 bg-emerald-600 text-white  shadow-[0_10px_22px_-12px_rgba(5,150,105,0.55)]' :
                  filter === 'nearby'       ? 'border-sky-500     bg-sky-600     text-white  shadow-[0_10px_22px_-12px_rgba(2,132,199,0.55)]' :
                  filter === 'open_now'     ? 'border-amber-500   bg-amber-500   text-white  shadow-[0_10px_22px_-12px_rgba(245,158,11,0.55)]' :
                                              'border-rose-400    bg-rose-500    text-white  shadow-[0_10px_22px_-12px_rgba(244,63,94,0.55)]';
                const inactiveStyle =
                  filter === 'free_shipping'? 'border-emerald-100/80 bg-emerald-50/60 text-emerald-700' :
                  filter === 'nearby'       ? 'border-sky-100/80 bg-sky-50/60 text-sky-700' :
                  filter === 'open_now'     ? 'border-amber-100/80 bg-amber-50/60 text-amber-700' :
                                              'border-rose-100/80 bg-rose-50/60 text-rose-600';
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      const next = quickFilter === filter ? 'all' : filter;
                      setQuickFilter(next);
                      if (next !== 'all') {
                        window.setTimeout(() => {
                          const el = storesSectionRef.current;
                          if (!el) return;
                          const y = el.getBoundingClientRect().top + window.scrollY - 168;
                          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                        }, 120);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border ${isNativePlatform ? 'px-3 py-1.5' : 'px-3.5 py-1.5'} text-[12px] transition-all duration-200 ease-out active:scale-[0.97] shadow-[0_6px_16px_-10px_rgba(15,23,42,0.18)] ${active ? `font-black ${activeStyle}` : `font-bold ${inactiveStyle}`}`}
                  >
                    <Icon size={13} weight={active ? 'fill' : 'duotone'} />
                    {label}
                  </button>
                );
              })}
              {(quickFilter !== 'all' || segmentFilter !== 'all' || debouncedQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDebouncedQuery('');
                    setSegmentFilter('all');
                    setQuickFilter('all');
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200/80 bg-rose-50/70 ${isNativePlatform ? 'px-3 py-1.5' : 'px-3.5 py-1.5'} text-[12px] font-bold text-rose-600 shadow-[0_6px_16px_-10px_rgba(244,63,94,0.18)] transition-all duration-200 ease-out active:scale-[0.97]`}
                >
                  <X size={12} weight="bold" />
                  Limpar
                </button>
              )}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#EEF2F7]/90 to-transparent" />
            </div>

          </div>
          </div>
        </header>

        <main className={`mx-auto max-w-[1200px] space-y-6 px-4 ${isNativePlatform ? 'pt-2' : 'pt-3'}`}>
          {/* Acompanhamento anonimo salvo neste navegador */}
          {!isCustomerLogged && visibleActiveAnonymousOrders.length > 0 && (
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
              <section className="relative overflow-hidden rounded-[2.15rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.86)_100%)] p-2.5 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.38)] ring-1 ring-slate-200/60 backdrop-blur-xl">
                <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-[#336886]/10 blur-3xl" />
                <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-emerald-200/35 blur-3xl" />
                <div className="relative mb-2 flex items-center justify-between px-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]">Destaques</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">Novidades e oportunidades para começar melhor.</p>
                  </div>
                  <span className="hidden rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm sm:inline-flex">
                    Hub
                  </span>
                </div>
                <SegmentPromoCarousel mode="hub" className="mx-0 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.45)]" />
              </section>
            </div>
          )}

          {debouncedQuery.length < 2 && condominiums.length > 0 && (
            <>
            <section
              className={selectedCondominium ? 'sticky top-[max(env(safe-area-inset-top),0.65rem)] z-30 mb-4' : 'mb-6'}
              style={{ transition: 'all .45s ease', transitionDelay: '95ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}
            >
              {selectedCondominium ? (
                <div className="relative overflow-hidden rounded-[1.8rem] border border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
                  <div className="absolute inset-0">
                    {selectedCondominiumBannerUrl ? (
                      <img
                        src={selectedCondominiumBannerUrl}
                        alt={String(selectedCondominium.name || 'Condomínio')}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-[0.12] saturate-[0.92]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_54%,rgba(239,246,255,0.76)_100%)]" />
                    <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(51,104,134,0.08),transparent_68%)]" />
                  </div>
                  <div className="pointer-events-none absolute -right-8 top-4 h-20 w-20 rounded-full bg-[#336886]/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-sky-100/70 blur-3xl" />
                  <div className="relative px-4 py-5 sm:px-5 sm:py-5">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCondominiumPickerOpen(true)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left active:scale-[0.99]"
                        aria-label="Escolher outro condomínio"
                        title="Escolher outro condomínio"
                      >
                        <span className="inline-flex h-[3.15rem] w-[3.15rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-white/94 p-2 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/80 backdrop-blur-md">
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
                        <span className="min-w-0 flex-1">
                          <span className="block max-w-[15rem] text-[1.12rem] font-black leading-tight tracking-[-0.03em] text-slate-950 sm:max-w-[20rem] sm:text-[1.22rem]">
                            {String(selectedCondominium.name || 'Condomínio')}
                          </span>
                          <span className="mt-1 block truncate text-[11px] font-semibold text-slate-500 sm:text-[11.5px]">
                            {selectedCondominium.city && selectedCondominium.state
                              ? `${selectedCondominium.city} - ${selectedCondominium.state}`
                              : selectedCondominium.city || selectedCondominium.state || 'Operação local'}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCondominiumPickerOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/88 px-3 text-[11px] font-bold text-slate-600 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.22)] transition hover:border-[#336886]/18 hover:text-[#336886] active:scale-95"
                        aria-label="Trocar condomínio"
                        title="Trocar condomínio"
                      >
                        <Buildings size={13} weight="duotone" />
                        Trocar
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        isCondominiumEventLive
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : hasUpcomingCondominiumEvent
                            ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
                      }`}>
                        <CalendarBlank size={11} weight="fill" />
                        {isCondominiumEventLive ? 'Ao vivo' : hasUpcomingCondominiumEvent ? 'Agendado' : 'Sem agenda'}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200/80">
                        <Clock size={11} weight="fill" />
                        <span className="max-w-[11.5rem] truncate sm:max-w-[18rem]">
                          {condominiumStoresLoading ? 'Carregando agenda' : condominiumEventTimeLabel || 'Agenda em confirmação'}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#336886]/8 px-2.5 py-1 text-[10px] font-bold text-[#336886] ring-1 ring-[#336886]/12">
                        <Buildings size={11} weight="fill" />
                        {filteredStores.length} loja{filteredStores.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const liveCount = condominiums.filter(c => c.eventSummary?.state === 'live').length;
                    return (
                      <button
                        type="button"
                        onClick={() => setCondominiumPickerOpen(true)}
                        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.6rem] border border-[#336886]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(239,247,255,0.92)_100%)] p-4 text-left shadow-[0_4px_24px_-8px_rgba(51,104,134,0.14)] transition-all duration-200 hover:border-[#336886]/22 hover:shadow-[0_8px_28px_-8px_rgba(51,104,134,0.2)] active:scale-[0.99]"
                      >
                        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#336886]/6 blur-2xl" />

                        {/* Logo cluster */}
                        <div className="relative shrink-0 flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-[#336886]/10 text-[#336886] ring-1 ring-[#336886]/10">
                          {condominiumPreviewLogos.length > 0 ? (
                            <div className="flex -space-x-3">
                              {condominiumPreviewLogos.map((logo, index) => (
                                <img
                                  key={`${logo}-${index}`}
                                  src={logo}
                                  alt="Condomínio"
                                  className="h-8 w-8 rounded-full border-2 border-white bg-white object-contain p-0.5 shadow-sm"
                                />
                              ))}
                            </div>
                          ) : (
                            <Buildings size={22} weight="duotone" />
                          )}
                        </div>

                        {/* Texto */}
                        <div className="min-w-0 flex-1">
                          {liveCount > 0 ? (
                            <div className="mb-1 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                                </span>
                                {liveCount} ao vivo
                              </span>
                            </div>
                          ) : null}
                          <p className="truncate text-[15px] font-black text-slate-900 leading-snug">Veja lojas no condomínio</p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                            {condominiums.length} condomínio{condominiums.length === 1 ? '' : 's'} disponível{condominiums.length === 1 ? '' : 'is'}
                          </p>
                        </div>

                        {/* Seta */}
                        <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#336886]/10 text-[#336886] transition-all duration-200 group-hover:bg-[#336886] group-hover:text-white">
                          <CaretRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    );
                  })()}
                </>
              )}
            </section>
            </>
          )}

          {/* Seção Categorias Premium Squircle */}
          <section className="relative mb-6" style={{ transition: 'all .45s ease', transitionDelay: '100ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Categorias</p>
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
                const colors = CATEGORY_COLORS[item.label];
                return (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    className="group flex min-w-[58px] shrink-0 snap-start cursor-pointer flex-col items-center gap-1.5 active:scale-[0.97] transition-transform duration-150 ease-out"
                    onClick={() => setSegmentFilter(prev => prev === item.label ? 'all' : item.label)}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] transition-all duration-200 ease-out ${
                      active
                        ? `${colors?.active ?? 'bg-[#336886] shadow-[0_12px_26px_-14px_rgba(51,104,134,0.68)]'} scale-[1.04]`
                        : `${colors?.inactive ?? 'border border-slate-100 bg-white'} shadow-[0_8px_22px_rgba(15,23,42,0.04)] group-hover:scale-[1.03]`
                    }`}>
                      <CategoryIcon
                        size={20}
                        weight={active ? 'fill' : 'duotone'}
                        className={`transition-all duration-150 ease-out ${
                          active ? 'scale-[0.94] text-white' : `${colors?.icon ?? 'text-slate-500'} group-hover:scale-105`
                        }`}
                      />
                    </div>
                    <span className={`text-center text-[9.5px] font-bold uppercase tracking-[0.08em] transition-colors ${
                      active ? (colors ? colors.icon : 'text-[#336886]') : 'text-slate-500'
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Banner de Destaques Premium - Esconde na busca para focar no resultado */}
          {debouncedQuery.length < 2 && (
            <section
              className="mb-6 overflow-hidden rounded-[1.8rem] border border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-3 py-2.5 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl"
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
                      onClick={() => stageFeaturedProductCheckout(item)}
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
                      {distanceLoading && activeLocation && distanceByStore[store.id] == null ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)} • {store.etaMin}-{store.etaMax} min
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section ref={storesSectionRef} className="mb-8 space-y-4" style={{ transition: 'all .45s ease', transitionDelay: '400ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
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
                      : isShowingAllStores
                        ? `${filteredStores.length} resultado${filteredStores.length === 1 ? '' : 's'} em outras regiões`
                        : `${filteredStores.length} resultado${filteredStores.length === 1 ? '' : 's'} ${selectedCondominium ? 'no condomínio' : geoDiscovery ? 'priorizados para sua região' : 'disponíveis no app'}`}
                  </p>
                ) : null}
              </div>
            </div>

            {isShowingAllStores && (
              <div className="rounded-[1.55rem] border border-[#336886]/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(239,247,255,0.96)_100%)] px-4 py-3 shadow-[0_16px_34px_-24px_rgba(51,104,134,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#336886]/10 text-[#336886]">
                      <Sparkle size={18} weight="duotone" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]">Exploração ampliada</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">Você está vendo uma vitrine ampliada do app.</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Isso ajuda a explorar mais lojas sem depender do contexto local da home.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={restoreRegionalView}
                    className="shrink-0 rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {geoDiscovery?.mode === 'deliverable' && (
              <div className="rounded-[1.55rem] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.98)_0%,rgba(240,253,250,0.94)_100%)] px-4 py-3 shadow-[0_14px_34px_-26px_rgba(16,185,129,0.38)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <MapPinLine size={18} weight="duotone" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Sua região</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Mostrando lojas que entregam perto de você.</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {geoDiscovery?.summary?.deliverableCount || 0} loja{geoDiscovery?.summary?.deliverableCount === 1 ? '' : 's'} com cobertura ativa{displayLocationLabel ? ` em ${displayLocationLabel}` : ''}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {geoDiscovery?.mode === 'nearby_fallback' && (
              <div className="rounded-[1.55rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.98)_0%,rgba(248,250,252,0.94)_100%)] px-4 py-3 shadow-[0_14px_34px_-26px_rgba(2,132,199,0.24)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <MapPinLine size={18} weight="duotone" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Mais próximas</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Não encontramos cobertura direta agora.</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Estas são as lojas mais próximas da sua localização.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
              geoDiscovery?.mode === 'no_coverage' ? (
                <div className="relative overflow-hidden rounded-[2rem] border border-[#336886]/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(239,247,255,0.96)_52%,rgba(248,250,252,0.98)_100%)] p-5 shadow-[0_24px_54px_-34px_rgba(51,104,134,0.28)]">
                  <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-[#336886]/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-300/12 blur-3xl" />
                  <div className="relative flex flex-col gap-5">
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/70 bg-white/88 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.24)]">
                        <img
                          src="/janocaminho.jpg"
                          alt="Já no Caminho"
                          className="h-9 w-9 rounded-full object-contain"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Expansão da região</p>
                        <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">
                          Ainda não atendemos {displayLocationLabel || 'essa região'} com entrega.
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                          Indique um lojista, restaurante ou operação perto de você para acelerar a chegada do Já no Caminho.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
                        <Storefront size={16} weight="duotone" className="text-[#336886]" />
                        <p className="mt-2 text-[11px] font-black text-slate-900">Lojista local</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">Mercado, adega, conveniência.</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
                        <ForkKnife size={16} weight="duotone" className="text-emerald-600" />
                        <p className="mt-2 text-[11px] font-black text-slate-900">Restaurante</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">Delivery, retirada ou balcão.</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
                        <Buildings size={16} weight="duotone" className="text-violet-600" />
                        <p className="mt-2 text-[11px] font-black text-slate-900">Condomínio</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">Feira, evento ou operação local.</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
                        <PaperPlaneTilt size={16} weight="duotone" className="text-sky-600" />
                        <p className="mt-2 text-[11px] font-black text-slate-900">Seja o primeiro</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">Ajude a puxar a cobertura local.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => navigate('/create')}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1.15rem] bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.58)]"
                      >
                        <Storefront size={14} weight="fill" />
                        Indicar um lojista da região
                      </button>
                      <button
                        type="button"
                        onClick={enableAllStoresView}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1.15rem] border border-[#336886]/14 bg-white/88 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_14px_28px_-24px_rgba(51,104,134,0.35)]"
                      >
                        <Sparkle size={14} weight="fill" />
                        Explorar outras lojas
                      </button>
                    </div>

                    <p className="text-[11px] font-medium text-slate-500">
                      Quando a cobertura local abrir, sua região entra na frente da operação.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-slate-700 font-semibold">Nenhuma loja encontrada com esses filtros.</p>
                  <button
                    type="button"
                    onClick={clearHubFilters}
                    className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Limpar filtros
                  </button>
                </div>
              )
            )}

            {!loading && !error && filteredStores.length > 0 && (
              <div className={selectedCondominium ? 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4' : 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'}>
                {filteredStores.map((store) => {
                  const storePath = selectedCondominiumSlug
                    ? `/${store.slug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}`
                    : `/${store.slug}`;
                  const shouldWarnCoverage =
                    !selectedCondominium &&
                    store.supportsDelivery &&
                    !store.supportsPostal &&
                    [ 'outside_radius', 'same_city' ].includes(String(store.geoAvailability || '').toLowerCase());
                  const navigationDistanceKm = distanceByStore[store.id] ?? store.distanceKm ?? null;
                  const storeNavigationState =
                    shouldWarnCoverage || navigationDistanceKm !== null
                      ? {
                          ...(shouldWarnCoverage
                            ? {
                                hubCoverageWarning: {
                                  message: 'Essa loja ainda não atende o seu endereço principal com entrega. Você pode ver o cardápio e conferir outras opções como retirada.',
                                },
                              }
                            : {}),
                          hubDistanceKm: navigationDistanceKm,
                        }
                      : undefined;
                  const primaryBadge = store.isOpen
                    ? getPrimaryStoreCardBadge(store, { condominiumScope: isCondominiumScope })
                    : null;
                  const secondaryBadge = store.isOpen
                    ? getSecondaryStoreCardBadge(
                        store as any,
                        primaryBadge?.key || null,
                        favoriteStoreSlugs,
                        {
                          condominiumScope: isCondominiumScope,
                          geoMode: geoDiscovery?.mode || null,
                        }
                      )
                    : null;

                  if (selectedCondominium) {
                    return (
                      <Link
                        key={store.id}
                        to={storePath}
                        state={storeNavigationState}
                        className={`group overflow-hidden rounded-[1.45rem] border bg-white transition-all duration-200 ease-out active:scale-[0.985] ${
                          store.isOpen
                            ? 'border-white shadow-[0_12px_30px_rgba(15,23,42,0.075)] md:hover:-translate-y-0.5 md:hover:shadow-[0_18px_38px_rgba(15,23,42,0.11)]'
                            : 'border-slate-200/80 bg-slate-50/90 shadow-[0_8px_20px_rgba(15,23,42,0.04)]'
                        }`}
                      >
                        {/* Banner + logo wrapper — sem overflow-hidden para o logo não ser cortado */}
                        <div className="relative">
                          <div className="relative h-[78px] overflow-hidden rounded-t-[1.45rem] bg-slate-100">
                            <img
                              src={store.banner || store.logo}
                              alt={store.name}
                              loading="lazy"
                              decoding="async"
                              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${store.isOpen ? '' : 'grayscale opacity-70'}`}
                              onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                            />
                            <div className={`absolute inset-0 ${store.isOpen ? 'bg-gradient-to-t from-black/38 via-black/5 to-transparent' : 'bg-gradient-to-t from-black/20 via-transparent to-transparent'}`} />
                            <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] shadow-sm backdrop-blur-sm ${
                              isCondominiumEventLive ? 'bg-white/92 text-emerald-700' : 'bg-white/92 text-[#336886]'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isCondominiumEventLive ? 'bg-emerald-500 animate-pulse' : 'bg-[#336886]'}`} />
                              {isCondominiumEventLive ? 'Ao vivo' : hasUpcomingCondominiumEvent ? 'Agendado' : 'Prévia'}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleFavoriteStore(store.slug);
                              }}
                              className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-[0.86] ${
                                favoriteStoreSlugs.includes(store.slug)
                                  ? 'scale-[1.06] bg-rose-500 text-white shadow-[0_4px_18px_-4px_rgba(244,63,94,0.72)]'
                                  : 'border border-white/20 bg-black/28 text-white backdrop-blur-md hover:bg-black/42'
                              }`}
                              aria-label={`Favoritar ${store.name}`}
                            >
                              <Heart size={12} weight={favoriteStoreSlugs.includes(store.slug) ? 'fill' : 'regular'} />
                            </button>
                          </div>
                          {/* Logo fora do overflow-hidden — não é cortado */}
                          <img
                            src={store.logo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className={`absolute -bottom-4 left-2.5 z-10 h-10 w-10 rounded-[0.75rem] border-2 border-white bg-white object-cover shadow-[0_8px_18px_-8px_rgba(15,23,42,0.45)] ${store.isOpen ? '' : 'grayscale opacity-60'}`}
                            onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                          />
                        </div>
                        <div className="px-3 pb-3 pt-6">
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
                      state={storeNavigationState}
                      className={`group relative overflow-hidden rounded-[1.45rem] border bg-white transition-all duration-300 ease-out active:scale-[0.985] ${
                        store.isOpen
                          ? 'border-white shadow-[0_10px_28px_rgba(15,23,42,0.07),0_1px_6px_rgba(15,23,42,0.04)] md:hover:-translate-y-0.5 md:hover:shadow-[0_18px_36px_rgba(15,23,42,0.1)]'
                          : 'border-slate-100 bg-slate-50/80 shadow-[0_6px_18px_rgba(15,23,42,0.04)]'
                      }`}
                    >
                      {/* Banner + overlapping logo wrapper */}
                      <div className="relative">
                        <div className="relative h-[72px] overflow-hidden rounded-t-[1.45rem] bg-slate-100">
                          <img
                            src={store.banner || store.logo}
                            alt=""
                            aria-hidden
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06] ${store.isOpen ? '' : 'grayscale opacity-45'}`}
                            onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                          />
                          <div className={`absolute inset-0 ${store.isOpen ? 'bg-gradient-to-t from-black/35 via-black/5 to-black/10' : 'bg-gradient-to-t from-black/20 via-transparent to-transparent'}`} />

                          {/* Open/closed status badge */}
                          {store.isOpen ? (
                            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[0.14em] text-white shadow-[0_4px_10px_-4px_rgba(16,185,129,0.7)] backdrop-blur-sm">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                              Aberto
                            </span>
                          ) : (
                            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-slate-800/65 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
                              Fechado
                            </span>
                          )}

                          {/* Favorite */}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleFavoriteStore(store.slug);
                            }}
                            className={`absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-[0.86] ${
                              favoriteStoreSlugs.includes(store.slug)
                                ? 'scale-[1.06] bg-rose-500 text-white shadow-[0_4px_18px_-4px_rgba(244,63,94,0.72)]'
                                : 'border border-white/20 bg-black/28 text-white backdrop-blur-md hover:bg-black/42'
                            }`}
                            aria-label={`Favoritar ${store.name}`}
                          >
                            <Heart size={12} weight={favoriteStoreSlugs.includes(store.slug) ? 'fill' : 'regular'} />
                          </button>
                        </div>

                        {/* Store logo — outside overflow-hidden so it's never clipped */}
                        <img
                          src={store.logo}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className={`absolute -bottom-4 left-3.5 z-10 h-10 w-10 rounded-[0.8rem] border-[2px] border-white bg-white object-cover shadow-[0_10px_22px_-10px_rgba(15,23,42,0.42)] ${store.isOpen ? '' : 'grayscale opacity-55'}`}
                          onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name); }}
                        />
                      </div>

                      {/* Content */}
                      <div className="px-3.5 pb-3.5 pt-[1.65rem]">
                        <h3 className={`truncate text-[14.5px] font-black leading-tight ${store.isOpen ? 'text-slate-950' : 'text-slate-500'}`}>
                          {store.name}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] font-medium text-slate-500">
                          {store.rating > 0 ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Star size={10} weight="fill" className="text-amber-400" />
                              <span className="font-bold text-slate-700">{store.rating.toFixed(1)}</span>
                            </span>
                          ) : null}
                          {store.rating > 0 ? <span className="text-slate-200">·</span> : null}
                          <span>{store.etaMin}–{store.etaMax} min</span>
                          {!isCondominiumScope && (
                            <>
                              <span className="text-slate-200">·</span>
                              <span>{distanceLoading && activeLocation && distanceByStore[store.id] == null ? '...' : formatDistance(distanceByStore[store.id] ?? store.distanceKm)}</span>
                            </>
                          )}
                        </div>
                        {!store.isOpen && (
                          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[9.5px] font-bold text-slate-500">
                            {store.nextOpeningLabel || 'Sem horário cadastrado'}
                          </p>
                        )}
                        {store.isOpen && (primaryBadge || secondaryBadge) && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {[primaryBadge, secondaryBadge].filter(Boolean).map((badge) => {
                              if (!badge) return null;
                              const BadgeIcon = badge.icon;
                              return (
                                <span
                                  key={`${store.id}-${badge.key}`}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${badge.className}`}
                                >
                                  <BadgeIcon size={9} weight="fill" className={badge.iconClassName || ''} />
                                  {badge.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
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
                    onClick={() => stageFeaturedProductCheckout(item)}
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

          {/* Banner: convite para lojistas */}
          <section className="px-3 pb-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/create?plan=trial')}
              className="group w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0d1e2e_0%,#1a3347_100%)] p-4 text-left shadow-[0_8px_24px_-12px_rgba(15,23,42,0.4)] transition-all active:scale-[0.99] hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.55)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#336886]/25">
                  <Storefront size={22} weight="duotone" className="text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black leading-tight text-white">Tem um negócio? Abra sua loja aqui.</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">Pedidos, produção e entrega em um só lugar.</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black text-sky-200 transition-colors group-hover:bg-white/15">
                  Começar
                  <CaretRight size={11} weight="bold" />
                </div>
              </div>
            </button>
          </section>

          <section className="pb-2 space-y-2 sm:pb-4">
            <p className="text-center text-xs font-semibold text-slate-500">Conectando você aos melhores lojistas do app.</p>
            <PlatformTrustFooter mode="minimal" align="center" compact />
          </section>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] px-0 pb-0 transition-transform duration-300 lg:hidden"
        style={{ transform: isBottomNavVisible && !condominiumPickerOpen ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="mx-auto max-w-none rounded-none border border-b-0 border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-2 pt-2 shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
          <div className="grid min-h-[4.75rem] grid-cols-4 items-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
          <button
            type="button"
            onClick={handleHomeHubNavigation}
            className={`group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03] ${
              quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium
                ? 'bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
              quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium
                ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
            }`}>
              <House size={18} weight={quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium ? 'fill' : 'duotone'} />
            </span>
            <span>Início</span>
                  <span className="h-[3px] w-4 rounded-full bg-[#336886]" />
          </button>
          <button
            type="button"
            onClick={handleOpenPedidos}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <Receipt size={18} weight="duotone" />
            </span>
            <span>Pedidos</span>
          </button>
          <button
            type="button"
            onClick={() => setCondominiumPickerOpen(true)}
            className={`group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03] ${
              selectedCondominium || condominiumPickerOpen
                ? 'bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
              selectedCondominium || condominiumPickerOpen
                ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
            }`}>
              <Buildings size={18} weight={selectedCondominium || condominiumPickerOpen ? 'fill' : 'duotone'} />
            </span>
            <span>Condo</span>
          </button>
          <button
            type="button"
            onClick={() => setProfileDrawerOpen(true)}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <UserCircle size={18} weight="duotone" />
            </span>
            <span>Perfil</span>
          </button>
          </div>
        </div>
      </nav>

      {condominiumPickerOpen && (
        <div className="fixed inset-0 z-[220] overflow-x-hidden overflow-y-auto overscroll-x-none bg-[radial-gradient(circle_at_top,rgba(51,104,134,0.10),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-950">
            <div className="mx-auto min-h-screen w-full max-w-[640px] overflow-x-hidden pb-28">
            <div className="relative overflow-x-hidden px-4 pb-4 pt-[max(env(safe-area-inset-top),0.6rem)]">
              <div className="pointer-events-none absolute -right-12 -top-10 h-56 w-56 rounded-full bg-[#336886]/12 blur-3xl" />

              <div className="relative mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setCondominiumPickerOpen(false); setCondominiumSearch(''); setCondoPickerFilter('all'); }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-colors hover:bg-white active:scale-95"
                  aria-label="Voltar"
                >
                  <CaretRight size={16} weight="bold" className="rotate-180" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Condomínios</p>
                  <h1 className="mt-1 truncate text-[1.08rem] font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[1.18rem]">
                    Escolha a feira do seu condomínio
                  </h1>
                </div>
                <div className="shrink-0 min-w-[5.25rem] rounded-[1.25rem] border border-[#bfd6e4]/80 bg-white/82 px-3 py-2 text-center shadow-[0_16px_30px_-22px_rgba(51,104,134,0.28)] backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#336886]">Ao vivo</p>
                  <p className="mt-1 text-lg font-black leading-none text-slate-950">
                    {condominiumPickerCounts.live}
                  </p>
                </div>
              </div>

              <div className="relative rounded-[2rem] border border-slate-200/80 bg-white px-4 py-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/55">
                <div className="relative mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80">
                        <img
                          src="/janocaminho.jpg"
                          alt="Já no Caminho"
                          className="h-5 w-5 rounded-full object-contain"
                        />
                      </span>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">Já no Caminho</p>
                    </div>
                    <p className="max-w-[19rem] text-[13px] font-medium leading-snug text-slate-600">
                      Veja o que está ao vivo, o que vem em seguida e entre com um toque no condomínio certo.
                    </p>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/68 p-1.5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] ring-1 ring-white/55 backdrop-blur-xl">
                  <div className="flex items-center gap-3 rounded-[1.25rem] bg-white/90 px-4 py-3">
                    <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-slate-400" />
                    <input
                      ref={condominiumSearchInputRef}
                      type="text"
                      value={condominiumSearch}
                      onChange={(ev) => setCondominiumSearch(ev.target.value)}
                      placeholder="Buscar por nome do condomínio ou cidade..."
                      autoComplete="off"
                      className="min-h-0 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    {condominiumSearch ? (
                      <button
                        type="button"
                        onClick={() => setCondominiumSearch('')}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 active:scale-95"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-[1.4rem] border border-slate-200/75 bg-slate-50/85 p-1.5 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.16)]">
                <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 no-scrollbar">
                  {([
                    { key: 'all' as const, label: 'Todos', count: condominiumPickerCounts.all, tone: 'slate' as const },
                    { key: 'live' as const, label: 'Ao vivo', count: condominiumPickerCounts.live, tone: 'live' as const },
                    { key: 'upcoming' as const, label: 'Em breve', count: condominiumPickerCounts.upcoming, tone: 'brand' as const },
                    { key: 'none' as const, label: 'Sem agenda', count: condominiumPickerCounts.none, tone: 'muted' as const },
                  ]).map(({ key, label, count, tone }) => {
                    const isActive = condoPickerFilter === key;
                    const activeClasses =
                      tone === 'live'
                        ? 'border-[#336886]/28 bg-[#336886] text-white shadow-[0_12px_22px_-18px_rgba(51,104,134,0.46)]'
                        : tone === 'brand'
                        ? 'border-[#336886]/28 bg-[#336886] text-white shadow-[0_12px_22px_-18px_rgba(51,104,134,0.46)]'
                        : tone === 'muted'
                        ? 'border-slate-400/24 bg-slate-700 text-white shadow-[0_12px_22px_-18px_rgba(51,65,85,0.42)]'
                        : 'border-slate-300/24 bg-slate-900 text-white shadow-[0_12px_22px_-18px_rgba(15,23,42,0.46)]';
                    const idleClasses =
                      tone === 'live'
                        ? 'border-slate-200 bg-white text-[#336886] hover:border-[#bfd6e4] hover:bg-white'
                        : tone === 'brand'
                        ? 'border-slate-200 bg-white text-[#336886] hover:border-[#336886]/16 hover:bg-white'
                        : tone === 'muted'
                        ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-white';

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCondoPickerFilter(key)}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.25 py-1.75 text-[10px] font-black transition-all duration-200 active:scale-95 ${isActive ? activeClasses : idleClasses}`}
                      >
                        {tone === 'live' && (
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-white' : 'bg-[#009ee3]'}`} />
                        )}
                        <span>{label}</span>
                        <span className={`inline-flex min-w-[1.3rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[8px] font-black ${isActive ? 'bg-white/16 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                </div>
              </div>
            </div>

            {/* ── Conteúdo ── */}
            <div className="px-4 pt-3 pb-4">
              {(() => {
                const live = (condoPickerFilter === 'all' || condoPickerFilter === 'live')
                  ? filteredCondominiums.filter(c => c.event?.state === 'live')
                  : [];
                const upcoming = (condoPickerFilter === 'all' || condoPickerFilter === 'upcoming')
                  ? filteredCondominiums.filter(c => c.event?.state === 'upcoming')
                  : [];
                const none = (condoPickerFilter === 'all' || condoPickerFilter === 'none')
                  ? filteredCondominiums.filter(c => !c.event?.state || (c.event.state !== 'live' && c.event.state !== 'upcoming'))
                  : [];

                const handleClick = (slug: string, name: string, event: typeof filteredCondominiums[0]['event']) => {
                  const eventState = String(event?.state || '').trim().toLowerCase();
                  const hasActiveAgenda = eventState === 'live' || eventState === 'upcoming';
                  if (!hasActiveAgenda) {
                    setCondominiumAvailabilityModal({
                      name: name || 'Condomínio',
                      nextLabel: formatCondominiumPickerEventTime(event) || 'A confirmar',
                    });
                    return;
                  }
                  const agendaBannerUrl = resolveAssetUrl(event?.bannerUrl || '') || '';
                  if (agendaBannerUrl) {
                    setCondominiumPromoModal({
                      slug,
                      name: name || 'Condomínio',
                      timeLabel:
                        formatCondominiumPickerEventTime(event) ||
                        formatCondominiumEventTime(event) ||
                        (eventState === 'live' ? 'Feira aberta agora' : 'Agenda confirmada'),
                      eventTitle: event?.title || 'Feira do condomínio',
                      bannerTitle: event?.bannerTitle || null,
                      bannerDescription: event?.bannerDescription || null,
                      bannerUrl: agendaBannerUrl,
                    });
                    return;
                  }
                  if (eventState !== 'live') {
                    setCondominiumAvailabilityModal({
                      name: name || 'Condomínio',
                      nextLabel: formatCondominiumPickerEventTime(event) || 'A confirmar',
                    });
                    return;
                  }
                  setCondominiumPickerOpen(false);
                  setCondominiumSearch('');
                  setSelectedCondominiumSlug(slug);
                };

                const hasResults = live.length > 0 || upcoming.length > 0 || none.length > 0;
                if (!hasResults) {
                  return (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Buildings size={24} weight="duotone" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        {condoPickerFilter !== 'all' ? 'Nenhum resultado neste filtro' : 'Nenhum condomínio encontrado'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {condoPickerFilter !== 'all' ? 'Tente selecionar "Todos" para ver tudo.' : 'Tente buscar pelo nome ou pela cidade.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-6">

                    {/* ── AO VIVO ── */}
                    {live.length > 0 && (
                      <section className="rounded-[1.8rem] border border-[#336886]/10 bg-white/78 p-3.5 shadow-[0_24px_46px_-34px_rgba(51,104,134,0.2)] ring-1 ring-white/70 backdrop-blur-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#009ee3]" />
                          </span>
                          <div>
                            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Acontecendo agora</span>
                            <span className="text-[11px] font-medium text-slate-500">Entre direto na feira que já está rodando.</span>
                          </div>
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-[#336886] px-2.5 py-1 text-[9px] font-black text-white shadow-[0_6px_18px_-10px_rgba(51,104,134,0.62)]">{live.length}</span>
                        </div>
                        <div className={`${isNativePlatform ? 'flex flex-col gap-2.5' : 'flex flex-col gap-3'}`}>
                          {live.map(({ condominium, slug, name, region, event }) => {
                            const active = selectedCondominiumSlug === slug;
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            const timeLabel = formatCondominiumPickerEventTime(event) || formatCondominiumEventTime(event);
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleClick(slug, name, event)}
                                className={`group relative w-full overflow-hidden rounded-[1.65rem] border p-3 text-left transition-all duration-300 active:scale-[0.985] ${
                                  active
                                    ? 'border-[#336886]/24 bg-white shadow-[0_22px_42px_-26px_rgba(51,104,134,0.3)] ring-1 ring-[#336886]/10'
                                    : 'border-slate-200/85 bg-white shadow-[0_18px_34px_-28px_rgba(15,23,42,0.22)] hover:border-[#336886]/18 hover:shadow-[0_24px_40px_-28px_rgba(51,104,134,0.24)]'
                                }`}
                              >
                                <div className="relative flex items-center gap-3">
                                  <div className="relative h-[5.25rem] w-[6.8rem] shrink-0 overflow-hidden rounded-[1.3rem] border border-slate-200/80 bg-slate-100 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.34)]">
                                    <img src={bannerUrl} alt="" aria-hidden loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.06)_45%,rgba(15,23,42,0.24)_100%)]" />
                                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-[#336886] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)]">
                                      <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#009ee3] opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#009ee3]" />
                                      </span>
                                      Ao vivo
                                    </div>
                                    <div className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-[0.95rem] border border-white/90 bg-white/95 p-1.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.52)]">
                                      <img src={logoUrl} alt={name} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }} />
                                    </div>
                                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-[0_10px_20px_-12px_rgba(16,185,129,0.88)]">
                                      <Sparkle size={10} weight="fill" />
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className="block truncate text-[15px] font-black leading-tight text-slate-900">{name}</span>
                                        {region ? <span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{region}</span> : null}
                                      </div>
                                      {active ? (
                                        <span className="shrink-0 rounded-full bg-[#336886] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">
                                          Atual
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[#336886]/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#336886]">
                                        <Clock size={10} weight="fill" />
                                        {timeLabel || 'Feira aberta'}
                                      </span>
                                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-700">
                                        Pedidos liberados
                                      </span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                      <span className="text-[11px] font-medium text-slate-500">
                                      Pagamento, lojas abertas e pedido em fluxo.
                                      </span>
                                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] ${
                                        active ? 'bg-[#336886] text-white' : 'bg-slate-900 text-white'
                                      }`}>
                                        Entrar
                                        <CaretRight size={10} weight="bold" />
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* ── EM BREVE ── */}
                    {upcoming.length > 0 && (
                      <section className="rounded-[1.7rem] border border-slate-200/80 bg-white/72 p-3.5 shadow-[0_20px_38px_-32px_rgba(15,23,42,0.16)] ring-1 ring-white/65 backdrop-blur-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <Clock size={13} weight="fill" className="text-[#336886]" />
                          <div>
                            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Em breve</span>
                            <span className="text-[11px] font-medium text-slate-500">Condomínios com agenda próxima.</span>
                          </div>
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-[#336886]/10 px-2 py-0.5 text-[9px] font-black text-[#336886]">{upcoming.length}</span>
                        </div>
                        <div className="flex flex-col gap-3">
                          {upcoming.map(({ condominium, slug, name, region, event }) => {
                            const active = selectedCondominiumSlug === slug;
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            const timeLabel = formatCondominiumPickerEventTime(event) || formatCondominiumEventTime(event);
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleClick(slug, name, event)}
                                className={`group relative w-full overflow-hidden rounded-[1.65rem] border p-3 text-left transition-all duration-300 active:scale-[0.985] ${
                                  active
                                    ? 'border-[#336886]/26 bg-white shadow-[0_20px_38px_-26px_rgba(51,104,134,0.32)] ring-1 ring-[#336886]/10'
                                    : 'border-white/80 bg-white/92 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.25)] hover:border-[#336886]/18 hover:shadow-[0_24px_40px_-28px_rgba(51,104,134,0.22)]'
                                }`}
                              >
                                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_center,rgba(51,104,134,0.09),transparent_72%)]" />
                                <div className="relative flex items-center gap-3">
                                  <div className="relative h-[4.95rem] w-[6.2rem] shrink-0 overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-slate-100 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.42)]">
                                    <img src={bannerUrl} alt="" aria-hidden loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.06)_45%,rgba(15,23,42,0.26)_100%)]" />
                                    <div className="absolute bottom-2 left-2 h-9 w-9 overflow-hidden rounded-[0.9rem] border border-white/90 bg-white/95 p-1.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.52)]">
                                      <img src={logoUrl} alt={name} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }} />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className="block truncate text-[15px] font-black leading-tight text-slate-900">{name}</span>
                                        {region ? <span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{region}</span> : null}
                                      </div>
                                      {active ? <span className="shrink-0 rounded-full bg-[#336886] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">Atual</span> : null}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[#336886]/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#336886]">
                                        <Clock size={10} weight="fill" />
                                        Agendado
                                      </span>
                                      {timeLabel ? <span className="truncate text-[11px] font-semibold text-slate-500">{timeLabel}</span> : null}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                      <span className="text-[11px] font-medium text-slate-500">Acompanhe o início e entre na hora certa.</span>
                                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.75 text-[10px] font-black uppercase tracking-[0.1em] ${
                                        active ? 'bg-[#336886] text-white' : 'bg-slate-900 text-white'
                                      }`}>
                                        Agenda
                                        <CaretRight size={10} weight="bold" />
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* ── SEM AGENDA ── */}
                    {none.length > 0 && (
                      <section className="rounded-[1.65rem] border border-slate-200/75 bg-slate-50/76 p-3.5 shadow-[0_18px_34px_-32px_rgba(15,23,42,0.12)] ring-1 ring-white/55">
                        <div className="mb-3 flex items-center gap-2">
                          <CalendarBlank size={12} weight="duotone" className="text-slate-400" />
                          <div>
                            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Outros condomínios</span>
                            <span className="text-[11px] font-medium text-slate-500">Descubra locais próximos e acompanhe quando abrirem agenda.</span>
                          </div>
                          <span className="ml-auto rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold text-slate-500">{none.length}</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {none.map(({ condominium, slug, name, region }) => {
                            const active = selectedCondominiumSlug === slug;
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleClick(slug, name, null)}
                                className={`group relative w-full overflow-hidden rounded-[1.45rem] border p-3 text-left transition-all duration-200 active:scale-[0.99] ${
                                  active
                                    ? 'border-[#336886]/16 bg-white shadow-[0_16px_32px_-26px_rgba(51,104,134,0.22)]'
                                    : 'border-white/80 bg-white/88 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.22)] hover:border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="relative flex items-center gap-3">
                                  <div className="relative h-[4.65rem] w-[5.5rem] shrink-0 overflow-hidden rounded-[1.1rem] border border-slate-200/80 bg-slate-100">
                                    <img src={bannerUrl} alt="" aria-hidden loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90" />
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.12)_0%,rgba(255,255,255,0.02)_45%,rgba(15,23,42,0.18)_100%)]" />
                                    <div className="absolute bottom-2 left-2 h-8 w-8 overflow-hidden rounded-[0.8rem] border border-white/90 bg-white/95 p-1 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)]">
                                      <img src={logoUrl} alt={name} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }} />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className={`block truncate text-[14px] font-black ${active ? 'text-[#336886]' : 'text-slate-800'}`}>{name}</span>
                                    {region ? <span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{region}</span> : null}
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                                        Sem agenda
                                      </span>
                                      <span className="text-[11px] font-medium text-slate-500">Receba novidades quando abrir.</span>
                                    </div>
                                  </div>
                                  <span className={`relative shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] ${
                                    active ? 'bg-[#336886]/10 text-[#336886]' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {active ? 'Aqui' : 'Ver mais'}
                                    {!active && <CaretRight size={9} weight="bold" />}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                  </div>
                );
              })()}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 z-[230] px-0 pb-0 lg:hidden">
              <div className="mx-auto max-w-none rounded-none border border-b-0 border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-2 pt-2 shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
                <div className="grid min-h-[4.75rem] max-w-[760px] grid-cols-4 items-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    handleHomeHubNavigation();
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                    <House size={18} weight="duotone" />
                  </span>
                  <span>Início</span>
                  <span className="h-[3px] w-4 rounded-full bg-[#336886]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    handleOpenPedidos();
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                    <Receipt size={18} weight="duotone" />
                  </span>
                  <span>Pedidos</span>
                </button>
                <button
                  type="button"
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12 transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]">
                    <Buildings size={18} weight="fill" />
                  </span>
                  <span>Condo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    setProfileDrawerOpen(true);
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
                    <UserCircle size={18} weight="duotone" />
                  </span>
                  <span>Perfil</span>
                </button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {condominiumAvailabilityModal && (() => {
        const condo = condominiums.find(c => c.slug === selectedCondominiumSlug) || condominiums.find(c => c.name === condominiumAvailabilityModal.name);
        return (
          <CondominiumStatusModal
            isOpen={!!condominiumAvailabilityModal}
            onClose={() => setCondominiumAvailabilityModal(null)}
            name={condominiumAvailabilityModal.name}
            nextLabel={condominiumAvailabilityModal.nextLabel}
            logoUrl={condo ? resolveCondominiumAssetUrl(condo, 'logo') : undefined}
            bannerUrl={condo ? resolveCondominiumAssetUrl(condo, 'banner') : undefined}
          />
        );
      })()}

      {condominiumPromoModal && (() => {
        const condo = condominiums.find((item) => String(item?.slug || '').trim() === condominiumPromoModal.slug) || null;
        const logoUrl = condo ? resolveCondominiumAssetUrl(condo, 'logo') : '';
        const condominiumBannerUrl = condo ? resolveCondominiumAssetUrl(condo, 'banner') : '';
        const promoImageUrl = condominiumPromoModal.bannerUrl || condominiumBannerUrl || logoUrl;
        const promoTitle = condominiumPromoModal.bannerTitle || condominiumPromoModal.eventTitle || 'Feira do condomínio';
        const promoDescription =
          condominiumPromoModal.bannerDescription ||
          'Entre para ver as lojas participantes, horários da agenda e as opções de retirada na barraca ou entrega no apartamento quando disponíveis.';
        return (
          <div
            className="fixed inset-0 z-[255] flex items-center justify-center bg-slate-950/58 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={`Feira do condomínio ${condominiumPromoModal.name}`}
          >
            <div className="relative w-full max-w-[430px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] border border-white/80 bg-white shadow-[0_32px_74px_-34px_rgba(15,23,42,0.74)] animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setCondominiumPromoModal(null)}
                className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/85 bg-white/94 text-slate-700 shadow-[0_12px_28px_-16px_rgba(15,23,42,0.48)] transition-all duration-150 hover:bg-white active:scale-95"
                aria-label="Fechar banner da feira"
                title="Fechar"
              >
                <X size={18} weight="bold" />
              </button>

              <div className="relative overflow-hidden bg-slate-950">
                <img
                  src={promoImageUrl}
                  alt={`Banner da agenda do condomínio ${condominiumPromoModal.name}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="block max-h-[46vh] w-full object-contain animate-in fade-in duration-300"
                  style={{ contentVisibility: 'auto' }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900 -z-10">
                  <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
                {condominiumBannerUrl ? (
                  <img
                    src={condominiumBannerUrl}
                    alt=""
                    aria-hidden
                    className="absolute right-4 top-4 h-14 w-20 rounded-[1rem] border border-white/70 object-cover shadow-[0_18px_30px_-20px_rgba(15,23,42,0.52)] sm:h-16 sm:w-24"
                  />
                ) : null}
              </div>

              <div className="relative px-5 pb-5 pt-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-[0_16px_28px_-22px_rgba(15,23,42,0.24)]">
                    {logoUrl ? (
                      <img src={logoUrl} alt={condominiumPromoModal.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-sm font-black text-white">
                        {String(condominiumPromoModal.name || 'C').trim().slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Agenda do condomínio</p>
                    <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">{condominiumPromoModal.name}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">{condominiumPromoModal.timeLabel}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.35rem] border border-[#d8e4ec] bg-[linear-gradient(135deg,#f8fbfd,#ffffff)] px-4 py-3 shadow-[0_18px_30px_-24px_rgba(51,104,134,0.16)]">
                  <p className="text-sm font-black text-slate-900">{promoTitle}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{promoDescription}</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCondominiumPromoModal(null);
                      setCondominiumPickerOpen(false);
                      setCondominiumSearch('');
                      setSelectedCondominiumSlug(condominiumPromoModal.slug);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(21,58,76,0.52)] transition-all hover:brightness-105 active:scale-[0.98]"
                  >
                    Entrar na feira
                    <CaretRight size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondominiumPromoModal(null)}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.28)] transition-all hover:text-slate-700 active:scale-[0.98]"
                    aria-label="Fechar"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
