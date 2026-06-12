import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../config/apiClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  MagnifyingGlass,
  Star,
  Storefront,
  Tent,
  House,
  Receipt,
  List,
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
  MapTrifold,
  Mountains,
  ListPlus,
  Warning,
} from '@phosphor-icons/react';
import { condominiumService } from '../services/condominiumService';
import { destinationService } from '../services/destinationService';
import { productService } from '../services/productService';
import { customerAccountService } from '../services/customerAccountService';
import { inputAssistProps } from '../utils/inputAssist';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { formatNextOpeningLabel, isStoreOpenNow, normalizeOpeningHours } from '../utils/storeHours';
import { useCachedCustomerProfileImage } from '../hooks/useCachedCustomerProfileImage';
import { useHubAnonymousOrders } from '../hooks/hub/useHubAnonymousOrders';
import { useHubCustomerActiveOrders } from '../hooks/hub/useHubCustomerActiveOrders';
import { useHubFavorites } from '../hooks/hub/useHubFavorites';
import { useHubFeaturedProducts, type HubFeaturedProduct as FeaturedProduct } from '../hooks/hub/useHubFeaturedProducts';
import { useHubImagePreload } from '../hooks/hub/useHubImagePreload';
import { useHubLocation } from '../hooks/hub/useHubLocation';
import { useHubSearchPlaceholder } from '../hooks/hub/useHubSearchPlaceholder';
import { useHubStoreDistances } from '../hooks/hub/useHubStoreDistances';
import { useHubStores } from '../hooks/hub/useHubStores';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { ProfileDrawer } from '../components/Marketplace/ProfileDrawer';
import { HubFilterSheet, type HubQuickFilterKey } from '../components/Marketplace/Hub/HubFilters';
import { HubHeader, getTimeOfDay } from '../components/Marketplace/Hub/HubHeader';
import { HubAnonymousActiveOrders } from '../components/Marketplace/Hub/HubAnonymousActiveOrders';
import { HubStoreCard } from '../components/Marketplace/Hub/HubStoreCard';
import { HubFeaturedCarousel } from '../components/Marketplace/Hub/HubFeaturedCarousel';
import { HubFavoriteStores } from '../components/Marketplace/Hub/HubFavoriteStores';
import { HubSearchProductResults } from '../components/Marketplace/Hub/HubSearchProductResults';
import {
  HubStoreDiscoveryNotice,
  HubStoreEmptyState,
  HubStoreLoadingSkeleton,
} from '../components/Marketplace/Hub/HubStoreStates';
import { HubMarketingPopup } from '../components/Marketplace/Hub/HubMarketingPopup';
import { CondominiumStatusModal } from '../components/Marketplace/CondominiumStatusModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { SegmentPromoCarousel } from '../components/common/SegmentPromoCarousel';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clearAllCustomerSessions } from '../utils/customerSessionStorage';
import { buildOrderTrackingPath, primeOrderTrackingNavigation } from '../utils/orderTrackingPrefetch';
import { DEFAULT_HOME_CONFIG, homeConfigService } from '../services/homeConfigService';
import { openActionTarget, resolveActionLabel, resolveActionTarget } from '../utils/actionLink';

const HUB_DEBUG_QUERY_PARAM = 'hubDebug';
const HUB_DEBUG_STORAGE_KEY = 'jnc:hub-debug-enabled';
const HUB_DEBUG_TRACE_KEY = 'jnc:hub-debug-trace';
const HUB_DEBUG_TRACE_LIMIT = 80;
const HOME_STORE_PREVIEW_LIMIT = 6;

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

const resolveDestinationAssetUrl = (
  destination: { slug?: string | null; name?: string | null; logoUrl?: string | null; bannerUrl?: string | null } | null | undefined
) => {
  const slug = String(destination?.slug || 'destino').trim() || 'destino';
  const name = String(destination?.name || 'Destino').trim() || 'Destino';
  const resolved = resolveAssetUrl(destination?.bannerUrl || destination?.logoUrl || '') || getStoreAvatarUrl(slug, name);
  return appendAssetCacheKey(resolved, `${slug}-destination`);
};

const formatDestinationRegionLine = (destination: HubDestination) =>
  [destination.city, destination.state].filter(Boolean).join(' - ');

const formatDestinationDisplayName = (destination: HubDestination) => {
  const name = String(destination?.name || destination?.city || 'Destino').trim();
  const state = String(destination?.state || '').trim().toUpperCase();
  if (!state) return name;
  const hasState = new RegExp(`(^|[\\s,\\-/()])${state}($|[\\s,\\-/()])`, 'i').test(name);
  return hasState ? name : `${name} - ${state}`;
};

const formatDestinationMatchLabel = (destination: HubDestination) => {
  const match = destination.destinationMatch;
  const distance = Number(match?.distanceKm);
  if (Number.isFinite(distance)) return `${distance < 10 ? distance.toFixed(1) : distance.toFixed(0)} km de você`;
  if (match?.reason === 'same_city') return 'Na sua cidade';
  if (match?.reason === 'same_state') return 'Mesma UF';
  return formatDestinationRegionLine(destination);
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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
    isOutOfRegion?: boolean | null;
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
  if (store?.isOpen && availability === 'same_city_pickup') return 1;
  if (store?.isOpen && (availability === 'pickup_available' || !availability && (store?.acceptsPickup || store?.supportsTable))) return 2;
  if (store?.isOpen && store?.isOutOfRegion) return 3;
  if (store?.isOpen) return 4;
  return 5;
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
    isOutOfRegion?: boolean | null;
    acceptsPickup?: boolean;
    supportsTable?: boolean;
  },
  options?: { condominiumScope?: boolean }
): StoreCardBadge | null => {
  const availability = String(store?.geoAvailability || '').trim().toLowerCase();
  const pickupEnabled = Boolean(store?.acceptsPickup || store?.supportsTable);

  if (!options?.condominiumScope && store?.isOutOfRegion && !pickupEnabled) {
    return {
      key: 'outside_region',
      label: 'Entrega fora da área',
      icon: Warning,
      className:
        'border-slate-200 bg-slate-50 text-slate-600 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)]',
    };
  }

  if (!options?.condominiumScope && store?.supportsDelivery && !store?.supportsPostal && store?.deliversToUserLocation) {
    return {
      key: 'delivery',
      label: 'Entrega disponível',
      icon: PaperPlaneTilt,
      className:
        'border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_8px_18px_-14px_rgba(16,185,129,0.38)]',
    };
  }

  if (pickupEnabled && [ 'pickup_available', 'same_city_pickup' ].includes(availability)) {
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

type HubDestination = {
  id?: string;
  name?: string;
  slug?: string;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  heroSubtitle?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  placesCount?: number;
  listingsCount?: number;
  destinationMatch?: {
    recommended?: boolean;
    reason?: string;
    distanceKm?: number | null;
    sameCity?: boolean;
    sameState?: boolean;
  } | null;
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

const CONDOMINIUM_DISPLAY_LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'del', 'della']);

const formatCondominiumDisplayName = (value?: string | null) => {
  const raw = String(value || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';

  const letters = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (letters.length < 3) return raw;

  const uppercaseLetters = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, '');
  const shouldNormalize = uppercaseLetters.length / letters.length > 0.7;
  if (!shouldNormalize) return raw;

  return raw
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && CONDOMINIUM_DISPLAY_LOWERCASE_WORDS.has(word)) return word;
      return `${word.charAt(0).toLocaleUpperCase('pt-BR')}${word.slice(1)}`;
    })
    .join(' ');
};

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
  Restaurante: { active: 'bg-amber-500 shadow-[0_18px_34px_-24px_rgba(245,158,11,0.58)]', inactive: 'border border-amber-100/75 bg-white/78', icon: 'text-amber-500' },
  Hamburguer: { active: 'bg-orange-500 shadow-[0_18px_34px_-24px_rgba(249,115,22,0.56)]', inactive: 'border border-orange-100/75 bg-white/78', icon: 'text-orange-500' },
  Lanche:     { active: 'bg-orange-400 shadow-[0_18px_34px_-24px_rgba(249,115,22,0.50)]', inactive: 'border border-orange-100/75 bg-white/78', icon: 'text-orange-400' },
  Pizza:      { active: 'bg-rose-500 shadow-[0_18px_34px_-24px_rgba(244,63,94,0.56)]',    inactive: 'border border-rose-100/75 bg-white/78',   icon: 'text-rose-500' },
  Bebidas:    { active: 'bg-violet-500 shadow-[0_18px_34px_-24px_rgba(139,92,246,0.56)]', inactive: 'border border-violet-100/75 bg-white/78', icon: 'text-violet-500' },
  Mercado:    { active: 'bg-emerald-600 shadow-[0_18px_34px_-24px_rgba(5,150,105,0.54)]', inactive: 'border border-emerald-100/75 bg-white/78', icon: 'text-emerald-600' },
  Farmacia:   { active: 'bg-teal-500 shadow-[0_18px_34px_-24px_rgba(20,184,166,0.54)]',  inactive: 'border border-teal-100/75 bg-white/78',   icon: 'text-teal-500' },
  Doces:      { active: 'bg-pink-500 shadow-[0_18px_34px_-24px_rgba(236,72,153,0.54)]',  inactive: 'border border-pink-100/75 bg-white/78',   icon: 'text-pink-500' },
  Empório:    { active: 'bg-lime-600 shadow-[0_18px_34px_-24px_rgba(101,163,13,0.52)]',  inactive: 'border border-lime-100/75 bg-white/78',   icon: 'text-lime-600' },
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

const SELECTED_CONDOMINIUM_STORAGE_KEY = 'hub:selected-condominium';
const STORE_PROMO_POPUP_DISMISSED_UNTIL_KEY = 'hub:store-promo-popup-dismissed-until';
const STORE_PROMO_POPUP_PRIMED_KEY = 'hub:store-promo-popup-primed';
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
    const parsed = JSON.parse(raw || "null");
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

export function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNativePlatform = Capacitor.isNativePlatform();
  const { setAuth } = useAuth();
  const { setBranding } = useTheme();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [productSearchBySlug, setProductSearchBySlug] = useState<Record<string, string>>({});
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [searchedProducts, setSearchedProducts] = useState<FeaturedProduct[]>([]);
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<HubQuickFilterKey>('all');
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [condominiums, setCondominiums] = useState<HubCondominium[]>([]);
  const [destinations, setDestinations] = useState<HubDestination[]>([]);
  const [selectedCondominiumSlug, setSelectedCondominiumSlug] = useState(() => readSelectedCondominiumSlug());
  const [condominiumStoreSlugs, setCondominiumStoreSlugs] = useState<string[]>([]);
  const [selectedCondominiumEvent, setSelectedCondominiumEvent] = useState<CondominiumEventSummary | null>(null);
  const [condominiumStoresLoading, setCondominiumStoresLoading] = useState(false);
  const [condominiumPickerOpen, setCondominiumPickerOpen] = useState(false);
  const [condominiumSearch, setCondominiumSearch] = useState('');
  const [condominiumAvailabilityModal, setCondominiumAvailabilityModal] = useState<CondominiumAvailabilityModalState | null>(null);
  const [condominiumPromoModal, setCondominiumPromoModal] = useState<CondominiumPromoModalState | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isHeaderElevated, setIsHeaderElevated] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isSearchEditing, setIsSearchEditing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const condominiumSearchInputRef = useRef<HTMLInputElement | null>(null);
  const storesSectionRef = useRef<HTMLElement | null>(null);
  const publicCondominiumLoadInFlightRef = useRef(false);
  const openOrderTracking = useCallback((orderId?: string | null, accessToken?: string | null) => {
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) return;
    primeOrderTrackingNavigation(normalizedOrderId, accessToken);
    navigate(buildOrderTrackingPath(normalizedOrderId, accessToken));
  }, [navigate]);

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

  const { searchPlaceholder, searchPlaceholderVisible } = useHubSearchPlaceholder(isSearchEditing);
  const [condoPickerFilter, setCondoPickerFilter] = useState<'all' | 'live' | 'upcoming' | 'none'>('all');

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
  const [homeConfig, setHomeConfig] = useState(() => DEFAULT_HOME_CONFIG);
  const [homeConfigLoaded, setHomeConfigLoaded] = useState(false);
  const [isHomeStoreListExpanded, setIsHomeStoreListExpanded] = useState(false);
  const homePromoSlides = useMemo(
    () =>
      homeConfig.homeBanners
        .filter((banner) => banner.active && String(banner.imageUrl || '').trim())
        .sort((a, b) => a.order - b.order)
        .slice(0, 4)
        .map((banner) => ({
          id: banner.id,
          image: resolveAssetUrl(banner.imageUrl) || '',
          imageAlt: banner.title || 'Banner da home',
          actionUrl: banner.actionUrl || '/create?plan=trial',
          actionLabel: banner.actionLabel || '',
          fit: banner.fit || 'cover',
        })),
    [homeConfig.homeBanners]
  );
  const marketingPopupImageUrl = resolveAssetUrl(homeConfig.marketingPopup.imageUrl) || '';
  const marketingPopupHasAction = Boolean(String(homeConfig.marketingPopup.actionUrl || '').trim());
  const marketingPopupActionTarget = useMemo(
    () => (marketingPopupHasAction ? resolveActionTarget(homeConfig.marketingPopup.actionUrl) : null),
    [homeConfig.marketingPopup.actionUrl, marketingPopupHasAction]
  );
  const marketingPopupActionLabel = useMemo(
    () =>
      marketingPopupHasAction
        ? resolveActionLabel(homeConfig.marketingPopup.actionLabel, homeConfig.marketingPopup.actionUrl)
        : '',
    [homeConfig.marketingPopup.actionLabel, homeConfig.marketingPopup.actionUrl, marketingPopupHasAction]
  );
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => readCustomerSession());
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const touchPullActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);
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
  const {
    userLocation,
    preferredDiscoveryAddress,
    savedAddressLocation,
    activeLocation,
    activeRegion,
    activeLocationLabel,
    destinationListHref,
  } = useHubLocation({
    customerToken: customerSession?.token,
    customerEmail: customerSession?.user?.email,
    hubDebug,
  });
  const {
    stores,
    loading,
    error,
    geoDiscovery,
    setHubScopeOverride,
    isShowingAllStores,
    isRefreshing,
    refreshHub,
  } = useHubStores({
    selectedCondominiumSlug,
    activeLocation,
    activeRegion,
    savedAddressLocation,
    userLocation,
    preferredDiscoveryAddress,
    hubDebug,
  });

  useEffect(() => {
    document.title = 'Já no Caminho | App local';
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
    let active = true;
    destinationService
      .listPublic({
        lat: activeLocation?.lat ?? null,
        lng: activeLocation?.lng ?? null,
        city: activeRegion?.city || null,
        state: activeRegion?.state || null,
      })
      .then((payload) => {
        if (!active) return;
        setDestinations(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        if (active) setDestinations([]);
      });
    return () => {
      active = false;
    };
  }, [activeLocation?.lat, activeLocation?.lng, activeRegion?.city, activeRegion?.state]);

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
    const raf = window.requestAnimationFrame(() => setHasEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const restoreHubHeader = () => {
      setHasEntered(true);
      setIsHeaderElevated(!isNativePlatform || (window.scrollY || 0) > 6);
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
      return;
    }
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        setIsHeaderElevated(currentY > 8);
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
        const deliveryFee = supportsDelivery && Number.isFinite(deliveryFeeValue)
          ? Math.max(0, deliveryFeeValue)
          : null;
        const reviewCount = Math.max(0, Math.floor(Number(store?.reviewSummary?.totalReviews || 0)));
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
          deliveryFee,
          reviewCount,
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
          isOutOfRegion: Boolean((store as any)?.isOutOfRegion),
          isNearest: Boolean((store as any)?.isNearest),
          distanceSource: apiDistanceKm !== null ? 'server' : 'local',
          nextOpeningLabel: formatNextOpeningLabel(String(store?.nextOpeningLabel || '').trim()),
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
      deliveryFee: number | null;
      reviewCount: number;
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
      isOutOfRegion: boolean;
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
  const { favoriteStoreSlugs, favoriteStores, toggleFavoriteStore } = useHubFavorites(scopedEnrichedStores);
  const {
    featuredLoading,
    displayedFeaturedProducts,
    genericHighlightLabel,
    hasSponsoredFeaturedProducts,
    hasFeaturedCarouselOverflow,
  } = useHubFeaturedProducts(scopedEnrichedStores);

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
  const homeDestinationHighlights = useMemo(() => {
    return destinations
      .filter((destination) => String(destination?.slug || '').trim())
      .slice(0, 6);
  }, [destinations]);
  const homeCondominiumHighlights = useMemo(() => {
    const stateRank = (condominium: HubCondominium) => {
      const state = String(condominium.eventSummary?.state || '').trim().toLowerCase();
      if (state === 'live') return 0;
      if (state === 'upcoming') return 1;
      return 2;
    };

    return [...condominiums]
      .filter((condominium) => String(condominium?.slug || '').trim())
      .sort((a, b) => {
        const rankDelta = stateRank(a) - stateRank(b);
        if (rankDelta !== 0) return rankDelta;
        return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
      })
      .slice(0, 2);
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

  const { distanceByStore, distanceLoading } = useHubStoreDistances({
    stores: scopedEnrichedStores,
    activeLocation,
    activeRegion,
    preferredDiscoveryAddress,
    savedAddressLocation,
    isCondominiumScope,
    hubDebug,
    hubDebugEnabled,
  });

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
  const isHomeStorePreview =
    debouncedQuery.length < 2 &&
    !selectedCondominium &&
    !isShowingAllStores &&
    quickFilter === 'all' &&
    segmentFilter === 'all';
  const isHomeStoreListCollapsed = isHomeStorePreview && !isHomeStoreListExpanded;
  const visibleStoreCards = isHomeStorePreview
    ? (isHomeStoreListCollapsed ? filteredStores.slice(0, HOME_STORE_PREVIEW_LIMIT) : filteredStores)
    : filteredStores;
  const hiddenHomeStoreCount = Math.max(0, filteredStores.length - visibleStoreCards.length);
  const preloadHomeBannerImages = useMemo(
    () => homePromoSlides.map((slide) => slide.image).filter(Boolean),
    [homePromoSlides]
  );
  const preloadDestinationImages = useMemo(
    () =>
      homeDestinationHighlights.map((destination) => ({
        ...destination,
        resolvedImageUrl: resolveDestinationAssetUrl(destination),
      })),
    [homeDestinationHighlights]
  );

  useHubImagePreload({
    enabled: debouncedQuery.length < 2,
    homeBanners: preloadHomeBannerImages,
    featuredProducts: displayedFeaturedProducts,
    stores: visibleStoreCards,
    destinations: preloadDestinationImages,
  });

  useEffect(() => {
    if (!isHomeStorePreview) setIsHomeStoreListExpanded(false);
  }, [isHomeStorePreview]);

  const categoryTiles = useMemo(() => {
    return segmentOptions.map((segment) => categoryVisuals[segment] || { icon: Storefront, label: segment });
  }, [segmentOptions]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    []
  );

  const formatDistance = (km: number | null | undefined) => {
    const normalizedKm = typeof km === 'number' && Number.isFinite(km) ? km : null;
    if (normalizedKm === null) return '-- km';
    const displayKm = Math.max(0.1, normalizedKm);
    return `${displayKm.toFixed(1).replace('.', ',')} km`;
  };

  const isCustomerLogged = Boolean(customerSession?.token);
  const { visibleActiveAnonymousOrders, dismissVisibleAnonymousOrders } = useHubAnonymousOrders(isCustomerLogged);
  useHubCustomerActiveOrders(isCustomerLogged);
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
  const currentDayGreeting = (() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  })();
  const customerFirstName = customerDisplayName.split(/\s+/).filter(Boolean)[0] || 'Cliente';
  const hubHeaderEyebrow = selectedCondominium
    ? `Condomínio · ${String(selectedCondominium.name || 'Agenda local').trim() || 'Agenda local'}`
    : isCustomerLogged
      ? `${currentDayGreeting}, ${customerFirstName}`
      : `${currentDayGreeting} — descubra o que pedir hoje`;
  const canOpenMarketingPopup =
    homeConfig.marketingPopup.active &&
    Boolean(marketingPopupImageUrl) &&
    !selectedCondominium &&
    debouncedQuery.length < 2;

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
    setIsHomeStoreListExpanded(false);
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

  const openCondominiumPicker = useCallback((filter: 'all' | 'live' | 'upcoming' | 'none' = 'all') => {
    setCondoPickerFilter(filter);
    setCondominiumPickerOpen(true);
  }, []);

  const scrollStoresIntoView = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      const el = storesSectionRef.current;
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 168;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }, 90);
  }, []);

  const handleCondominiumSelection = useCallback((slugValue: string, nameValue: string, event?: CondominiumEventSummary | null) => {
    const slug = String(slugValue || '').trim();
    if (!slug) return;

    const name = String(nameValue || 'Condomínio').trim() || 'Condomínio';
    const eventState = String(event?.state || '').trim().toLowerCase();
    const hasActiveAgenda = eventState === 'live' || eventState === 'upcoming';
    if (!hasActiveAgenda) {
      setCondominiumAvailabilityModal({
        name,
        nextLabel: formatCondominiumPickerEventTime(event) || 'A confirmar',
      });
      return;
    }

    const agendaBannerUrl = resolveAssetUrl(event?.bannerUrl || '') || '';
    if (agendaBannerUrl) {
      setCondominiumPromoModal({
        slug,
        name,
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
        name,
        nextLabel: formatCondominiumPickerEventTime(event) || 'A confirmar',
      });
      return;
    }

    setCondominiumPickerOpen(false);
    setCondominiumSearch('');
    setSelectedCondominiumSlug(slug);
  }, []);

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
    let active = true;
    void homeConfigService
      .getPublicConfig()
      .then((payload) => {
        if (!active) return;
        setHomeConfig(payload);
      })
      .finally(() => {
        if (active) {
          setHomeConfigLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!homeConfigLoaded) return;
    if (!canOpenMarketingPopup) return;
    const timeout = window.setTimeout(() => {
      try {
        const dismissedUntil = Number(localStorage.getItem(STORE_PROMO_POPUP_DISMISSED_UNTIL_KEY) || 0);
        if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) return;
        const popupPrimed = localStorage.getItem(STORE_PROMO_POPUP_PRIMED_KEY) === '1';
        if (!popupPrimed) {
          localStorage.setItem(STORE_PROMO_POPUP_PRIMED_KEY, '1');
          return;
        }
      } catch {
        // ignore
      }
      setShowStorePromoPopup(true);
    }, 6200);
    return () => window.clearTimeout(timeout);
  }, [canOpenMarketingPopup, homeConfigLoaded, loading]);

  const dismissStorePromoPopup = useCallback(() => {
    setShowStorePromoPopup(false);
    try {
      localStorage.setItem(STORE_PROMO_POPUP_DISMISSED_UNTIL_KEY, String(Date.now() + STORE_PROMO_POPUP_COOLDOWN_MS));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden overscroll-x-none bg-[linear-gradient(180deg,#DAE8F0_0%,#E6EEF3_8%,#EEF4F7_16%,#F5F9FB_28%,#FAFBFC_42%,#FFFFFF_60%,#F8FAFB_100%)] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] text-slate-900 sm:pb-24">
      {/* Aurora Background — atmospheric depth with brand colors */}
      <div className="jnc-safe-area-glass pointer-events-none fixed inset-x-0 top-0 z-[70] h-[env(safe-area-inset-top)]" />
      {/* Smooth transition band — header → body bridge */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[480px]" style={{ background: 'linear-gradient(180deg, #2A6078 0%, #3A7E96 4%, #4E96AE 8%, #72AEC2 13%, #96C4D4 18%, #B4D6E2 24%, #CEE4EC 30%, #E2EEF3 38%, transparent 50%)' }} />
      {/* Aurora blob 1 — azul, canto superior esquerdo, animado */}
      <div className="jnc-hub-aurora-1 fixed left-[-8%] top-[-4%] h-[36%] w-[42%] rounded-full bg-[#2A6078]/[0.10] blur-[160px] pointer-events-none -z-10" />
      {/* Aurora blob 2 — verde, canto superior direito, animado */}
      <div className="jnc-hub-aurora-2 fixed top-[-6%] right-[-6%] h-[38%] w-[45%] bg-[#5FD35A]/[0.04] blur-[140px] rounded-full pointer-events-none -z-10" />
      {/* Aurora blob 3 — azul claro, inferior esquerdo, animado */}
      <div className="jnc-hub-aurora-3 fixed bottom-[5%] left-[8%] h-[18%] w-[24%] bg-[#336886]/[0.04] blur-[120px] rounded-full pointer-events-none -z-10" />
      {/* Soft light bloom — center top */}
      <div className="fixed left-[25%] top-[3%] h-[16%] w-[32%] bg-white/12 blur-[100px] pointer-events-none -z-10" />

      <div
        className={`pointer-events-none fixed left-1/2 z-[120] -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 ${
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ top: `${Math.max(8, 8 + pullDistance * 0.35)}px` }}
      >
        {isRefreshing ? 'Atualizando...' : pullDistance >= 68 ? 'Solte para atualizar' : 'Puxe para atualizar'}
      </div>

      <HubMarketingPopup
        visible={showStorePromoPopup && !profileDrawerOpen}
        imageUrl={marketingPopupImageUrl}
        title={homeConfig.marketingPopup.title}
        description={homeConfig.marketingPopup.description}
        actionUrl={homeConfig.marketingPopup.actionUrl}
        actionLabel={marketingPopupActionLabel}
        actionHref={marketingPopupActionTarget?.href}
        actionExternal={marketingPopupActionTarget?.external}
        fit={homeConfig.marketingPopup.fit}
        onDismiss={dismissStorePromoPopup}
        onOpenAction={() => {
          dismissStorePromoPopup();
          if (marketingPopupActionTarget) {
            void openActionTarget(marketingPopupActionTarget, navigate);
          }
        }}
      />
      
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

      <HubFilterSheet
        open={filtersSheetOpen}
        quickFilter={quickFilter}
        segmentFilter={segmentFilter}
        debouncedQuery={debouncedQuery}
        filteredStoresCount={filteredStores.length}
        categoryTiles={categoryTiles}
        onOpenChange={setFiltersSheetOpen}
        onQuickFilterChange={setQuickFilter}
        onSegmentFilterChange={setSegmentFilter}
        onResetFilters={resetMarketplaceFilters}
        onScrollStoresIntoView={scrollStoresIntoView}
      />

      <div
        className={`relative transition-all duration-700 ${
          hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        {/* Floating Ambient Mesh Gradients */}
        <div className="pointer-events-none absolute -left-[10%] top-[8%] -z-10 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.06)_0%,rgba(20,184,166,0.02)_60%,transparent_100%)] blur-[60px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="pointer-events-none absolute -right-[10%] top-[35%] -z-10 h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle,rgba(51,104,134,0.05)_0%,rgba(99,102,241,0.02)_60%,transparent_100%)] blur-[80px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="pointer-events-none absolute left-[15%] top-[65%] -z-10 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.04)_0%,rgba(236,72,153,0.01)_60%,transparent_100%)] blur-[50px] animate-pulse" style={{ animationDuration: '10s' }} />

        <HubHeader
          isNativePlatform={isNativePlatform}
          isHeaderElevated={isHeaderElevated}
          customerDisplayName={customerDisplayName}
          customerProfileImage={customerProfileImage}
          isCustomerLogged={isCustomerLogged}
          hubHeaderEyebrow={hubHeaderEyebrow}
          displayLocationLabel={displayLocationLabel}
          hubNotificationCount={hubNotificationCount}
          searchInputRef={searchInputRef}
          query={query}
          isSearchEditing={isSearchEditing}
          searchPlaceholder={searchPlaceholder}
          searchPlaceholderVisible={searchPlaceholderVisible}
          quickFilter={quickFilter}
          segmentFilter={segmentFilter}
          onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
          onToggleNearbyFilter={() => setQuickFilter((prev) => (prev === 'nearby' ? 'all' : 'nearby'))}
          onHubNotificationClick={handleHubNotificationClick}
          onQueryChange={setQuery}
          onDebouncedQueryChange={setDebouncedQuery}
          onSearchEditingChange={setIsSearchEditing}
          onQuickFilterChange={setQuickFilter}
          onOpenFilters={() => setFiltersSheetOpen(true)}
          onScrollStoresIntoView={scrollStoresIntoView}
          onHomeClick={handleHomeHubNavigation}
          onAgendaClick={() => setCondominiumPickerOpen(true)}
          onPedidosClick={handleOpenPedidos}
          onDestinosClick={() => navigate('/destinos')}
          isCondominiumScope={isCondominiumScope}
          timeOfDay={getTimeOfDay()}
        />

        <main className={`mx-auto flex max-w-[1200px] flex-col gap-4 px-4 sm:gap-5 ${isNativePlatform ? 'pt-2' : 'pt-3'}`}>
          {/* Acompanhamento anonimo salvo neste navegador */}
          {!isCustomerLogged ? (
            <HubAnonymousActiveOrders
              orders={visibleActiveAnonymousOrders}
              onDismissAll={dismissVisibleAnonymousOrders}
              onOpenOrder={openOrderTracking}
              onPrimeOrder={primeOrderTrackingNavigation}
            />
          ) : null}

          {debouncedQuery.length < 2 && !selectedCondominium && (homeDestinationHighlights.length > 0 || condominiums.length > 0) && (
            <section className="jnc-hub-surface order-2 overflow-hidden rounded-[1.55rem] p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Atalhos rápidos</span>
                <span className="text-[10px] font-bold text-slate-400">explore</span>
              </div>
              <div className={`grid gap-2.5 sm:gap-3 ${homeDestinationHighlights.length > 0 && condominiums.length > 0 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {condominiums.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openCondominiumPicker('all')}
                    className="jnc-hub-touch jnc-hub-lift group relative flex min-h-[5rem] items-center gap-2.5 overflow-hidden rounded-[1.35rem] border border-emerald-500/15 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-500/5 px-3 py-2.5 text-left shadow-[0_16px_36px_-30px_rgba(16,185,129,0.34)] transition-all duration-300 ease-out hover:border-emerald-500/25 hover:shadow-[0_22px_46px_-34px_rgba(16,185,129,0.44)] active:scale-[0.985] sm:min-h-[4.35rem] sm:gap-3 sm:px-4"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                    
                    <div className="flex items-center gap-2.5 min-w-0 z-10">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-[0_8px_16px_-8px_rgba(16,185,129,0.6)] ring-2 ring-white sm:h-10 sm:w-10 sm:rounded-[1.1rem]">
                        <span className="grid h-full w-full place-items-center rounded-[0.95rem] bg-emerald-50 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105">
                          <Tent size={22} weight="duotone" className="text-emerald-600" />
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black text-slate-900 sm:text-sm">Feiras</span>
                        <span className="block truncate text-[10px] font-semibold text-slate-500 sm:text-xs">Agenda do condomínio</span>
                      </span>
                    </div>

                    <div className="ml-auto flex items-center gap-1.5 shrink-0 z-10">
                      <span className="hidden text-[10px] font-bold text-emerald-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:inline-block">Ver mais</span>
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:bg-emerald-500 group-hover:text-white sm:h-7 sm:w-7">
                        <svg className="h-3.5 w-3.5 stroke-[2.5] sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ) : null}

                {homeDestinationHighlights.length > 0 ? (
                  <Link
                    to={destinationListHref}
                    className="jnc-hub-touch jnc-hub-lift group relative flex min-h-[5rem] items-center gap-2.5 overflow-hidden rounded-[1.35rem] border border-[#336886]/15 bg-gradient-to-br from-[#edf5fa]/50 via-white to-[#336886]/5 px-3 py-2.5 text-left shadow-[0_16px_36px_-30px_rgba(51,104,134,0.34)] transition-all duration-300 ease-out hover:border-[#336886]/25 hover:shadow-[0_22px_46px_-34px_rgba(51,104,134,0.44)] active:scale-[0.985] sm:min-h-[4.35rem] sm:gap-3 sm:px-4"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(51,104,134,0.06),transparent_50%)] pointer-events-none" />
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

                    <div className="flex items-center gap-2.5 min-w-0 z-10">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-gradient-to-tr from-[#336886] to-[#5a9cbf] p-0.5 shadow-[0_8px_16px_-8px_rgba(51,104,134,0.6)] ring-2 ring-white sm:h-10 sm:w-10 sm:rounded-[1.1rem]">
                        <span className="grid h-full w-full place-items-center rounded-[0.95rem] bg-[#edf5fa] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105">
                          <MapTrifold size={22} weight="duotone" className="text-[#336886]" />
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black text-slate-900 sm:text-sm">Visite</span>
                        <span className="block truncate text-[10px] font-semibold text-slate-500 sm:text-xs">Chalés e pousadas</span>
                      </span>
                    </div>

                    <div className="ml-auto flex items-center shrink-0 z-10">
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-[#edf5fa] border border-[#d7e7ef] text-[#336886] shadow-sm transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:bg-[#336886] group-hover:text-white sm:h-7 sm:w-7">
                        <svg className="h-3.5 w-3.5 stroke-[2.5] sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ) : null}
              </div>
            </section>
          )}

          {/* Carrossel de Banners - Esconde na busca para focar no resultado */}
          {debouncedQuery.length < 2 && !selectedCondominium && homePromoSlides.length > 0 && (
            <div className="order-3 animate-in fade-in slide-in-from-top-4 duration-500" style={{ animationDelay: '80ms' }}>
              <SegmentPromoCarousel mode="hub" slides={homePromoSlides} className="mx-0 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.44)]" />
            </div>
          )}

          {debouncedQuery.length < 2 && !selectedCondominium && homeDestinationHighlights.length > 0 && (
            <section className="order-8 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">
                    <Mountains size={12} weight="duotone" />
                    Guia da região
                  </p>
                  <h2 className="mt-1 text-base font-black leading-tight tracking-[-0.03em] sm:text-lg bg-gradient-to-r from-[#153A4C] via-[#336886] to-[#5FD35A] bg-clip-text text-transparent">
                    Descubra a região sem sair do app
                  </h2>
                  <p className="mt-1 max-w-[18rem] text-xs font-semibold leading-relaxed text-slate-500">
                    Chalés, delivery, passeios e serviços organizados por cidade.
                  </p>
                </div>
                <Link
                  to={destinationListHref}
                  className="jnc-hub-touch jnc-hub-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#336886]"
                >
                  Ver mais
                  <CaretRight size={10} weight="bold" />
                </Link>
              </div>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {homeDestinationHighlights.map((destination, index) => {
                  const placesCount = Number(destination.placesCount || 0);
                  const listingsCount = Number(destination.listingsCount || 0);
                  const displayName = formatDestinationDisplayName(destination);
                  const totalOptions = placesCount + listingsCount;
                  const countLabel = totalOptions > 0
                    ? `${totalOptions} opç${totalOptions === 1 ? 'ão' : 'ões'}`
                    : 'Destaque local';
                  const warmupDestination = () => {
                    if (destination.slug) void destinationService.prefetchPublic(destination.slug);
                  };
                  return (
                    <Link
                      key={destination.id || destination.slug}
                      to={`/destinos/${destination.slug}`}
                      onPointerEnter={warmupDestination}
                      onFocus={warmupDestination}
                      onTouchStart={warmupDestination}
                      className={`jnc-hub-touch jnc-hub-lift group relative flex shrink-0 overflow-hidden rounded-[1.55rem] bg-slate-900 text-left shadow-[0_26px_62px_-48px_rgba(15,23,42,0.42)] ring-1 ring-white/70 transition-transform duration-300 active:scale-[0.98] ${index === 0 ? 'h-[11.4rem] w-[18.75rem]' : 'h-[10.75rem] w-[15.75rem]'}`}
                    >
                      <img
                        src={resolveDestinationAssetUrl(destination)}
                        alt={displayName}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0)_34%,rgba(15,23,42,0.30)_66%,rgba(15,23,42,0.78)_100%)]" />
                      {/* Glass shimmer on hover */}
                      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent z-[1]" />
                      <div className="jnc-hub-glass-badge absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-[0.13em] text-[#153A4C] ring-1 ring-[#d7e7ef]/70">
                        <MapPinLine size={10} weight="fill" className="shrink-0 text-[#336886]" />
                        <span className="truncate">{formatDestinationMatchLabel(destination)}</span>
                      </div>
                      <div className="relative mt-auto flex min-w-0 flex-1 flex-col justify-end p-3.5">
                        <p className="line-clamp-2 text-[18px] font-black leading-tight tracking-[-0.05em] text-white drop-shadow-sm">
                          {displayName}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/18 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_28px_-22px_rgba(15,23,42,0.58)] backdrop-blur-xl">
                            <Sparkle size={10} weight="fill" className="shrink-0 text-lime-200" />
                            <span className="truncate">{countLabel}</span>
                          </span>
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/18 bg-white/20 text-white backdrop-blur-xl transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-[#5FD35A]/30 group-hover:border-[#5FD35A]/40">
                            <CaretRight size={12} weight="bold" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {debouncedQuery.length < 2 && condominiums.length > 0 && (
            <>
            <section
              className={selectedCondominium ? 'order-2 sticky top-[max(env(safe-area-inset-top),0.65rem)] z-30 mb-4' : 'order-9'}
              style={{ transition: 'all .45s ease', transitionDelay: '95ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}
            >
              {selectedCondominium ? (
                <div className="relative overflow-hidden rounded-[1.8rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(250,252,253,0.88)_100%)] shadow-[0_24px_56px_-46px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/45 backdrop-blur-2xl">
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
                      <button
                        type="button"
                        onClick={() => { clearCondominiumSelection(); }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-white/88 text-rose-500 shadow-[0_12px_24px_-20px_rgba(225,29,72,0.18)] transition hover:bg-rose-50 hover:border-rose-300 active:scale-95"
                        aria-label="Sair do condomínio"
                        title="Voltar para o início"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        isCondominiumEventLive
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : hasUpcomingCondominiumEvent
                            ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                            : 'bg-slate-100/80 text-slate-600 ring-1 ring-slate-200/70'
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
                <section className="overflow-hidden rounded-[1.7rem] bg-white/92 p-3.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] ring-1 ring-white/80 backdrop-blur-xl">
                  {(() => {
                    const liveCount = condominiums.filter(c => c.eventSummary?.state === 'live').length;
                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                                <CalendarBlank size={12} weight="duotone" />
                                Feiras e eventos
                              </p>
                              {liveCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_18px_-12px_rgba(16,185,129,0.6)]">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                                  </span>
                                  {liveCount} ao vivo
                                </span>
                              ) : null}
                            </div>
                            <h2 className="mt-1 line-clamp-1 text-base font-black tracking-[-0.03em] text-[#0F172A]">Agenda em condomínios</h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCondominiumPicker('all')}
                            className="jnc-hub-touch jnc-hub-pill inline-flex shrink-0 items-center justify-center rounded-full px-3 py-2 text-[10.5px] font-black uppercase tracking-[0.14em] text-[#336886]"
                          >
                            Ver mais
                          </button>
                        </div>

                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {homeCondominiumHighlights.map((condominium) => {
                            const slug = String(condominium.slug || '').trim();
                            const name = String(condominium.name || 'Condomínio').trim() || 'Condomínio';
                            const event = condominium.eventSummary || null;
                            const eventState = String(event?.state || '').trim().toLowerCase();
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            const cardBackgroundImage = bannerUrl
                              ? `linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.24)_45%,rgba(15,23,42,0.82)_100%),url("${String(bannerUrl).replace(/"/g, '%22')}")`
                              : 'radial-gradient(circle_at_12%_0%,rgba(95,211,90,0.18),transparent_34%),linear-gradient(135deg,#153A4C,#285f76)';
                            const region = [condominium.city, condominium.state].map((item) => String(item || '').trim()).filter(Boolean).join(' - ');
                            const timeLabel = formatCondominiumPickerEventTime(event) || formatCondominiumEventTime(event);
                            const statusLabel = eventState === 'live' ? 'Ao vivo' : eventState === 'upcoming' ? 'Em breve' : 'Agenda';
                            const agendaLine = eventState === 'live'
                              ? 'Feira aberta agora'
                              : timeLabel || (eventState === 'upcoming' ? 'Agenda confirmada' : 'Agenda em confirmação');

                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleCondominiumSelection(slug, name, event)}
                                className="group relative min-w-[16.25rem] overflow-hidden rounded-[1.35rem] bg-slate-900 bg-cover bg-center p-3.5 text-left text-white shadow-[0_18px_44px_-32px_rgba(15,23,42,0.55)] ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-34px_rgba(15,23,42,0.66)] active:scale-[0.99]"
                                style={{ backgroundImage: cardBackgroundImage }}
                              >
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(95,211,90,0.18),transparent_36%)] opacity-90" />
                                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                                <div className="relative flex items-start gap-2.5">
                                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[1rem] bg-white shadow-[0_14px_28px_-18px_rgba(0,0,0,0.5)] ring-2 ring-white/85">
                                    <img
                                      src={logoUrl || bannerUrl}
                                      alt={name}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-contain p-1.5 transition duration-500 group-hover:scale-105"
                                      onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }}
                                    />
                                    {eventState === 'live' ? (
                                      <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-[0_6px_12px_-6px_rgba(16,185,129,0.8)]" />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${
                                        eventState === 'live'
                                          ? 'bg-[#5FD35A] text-[#153A4C] shadow-[0_10px_20px_-12px_rgba(95,211,90,0.65)]'
                                          : eventState === 'upcoming'
                                            ? 'bg-white/88 text-[#153A4C]'
                                            : 'bg-white/18 text-white ring-1 ring-white/18'
                                      }`}>
                                        {statusLabel}
                                      </span>
                                      <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-white/72">{region || 'Operação local'}</span>
                                    </div>
                                    <p className="mt-1 line-clamp-1 text-sm font-black text-white drop-shadow-sm">{name}</p>
                                    <p className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-white/14 px-2 py-1 text-[10px] font-bold text-white/86 ring-1 ring-white/12 backdrop-blur-md">
                                      {eventState === 'live' ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /> : <Clock size={10} weight="bold" className="shrink-0" />}
                                      <span className="truncate">{agendaLine}</span>
                                      <CaretRight size={10} weight="bold" className="shrink-0" />
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </section>
              )}
            </section>
            </>
          )}

          {/* Seção Categorias Premium Squircle */}
          <section className="order-4 relative" style={{ transition: 'all .45s ease', transitionDelay: '100ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <p className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-[0.24em] text-slate-500/90">Categorias</p>
            <div className="-mx-4 grid grid-flow-col auto-cols-[minmax(54px,1fr)] snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                className="group flex min-w-0 snap-start cursor-pointer flex-col items-center gap-1.5 active:scale-[0.97] transition-transform duration-150 ease-out"
                onClick={() => setSegmentFilter('all')}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-[15px] transition-all duration-200 ease-out ${
                  segmentFilter === 'all' ? 'scale-[1.04] bg-[#336886] shadow-[0_18px_34px_-26px_rgba(51,104,134,0.66)]' : 'jnc-hub-pill group-hover:bg-slate-50'
                }`}>
                  <List size={17} weight="duotone" className={segmentFilter === 'all' ? 'scale-[0.95] text-white' : 'text-slate-600'} />
                </div>
                <span className={`text-center text-[9px] font-black uppercase tracking-[0.08em] transition-colors ${
                  segmentFilter === 'all' ? 'text-[#336886]' : 'text-slate-600'
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
                    className="group flex min-w-0 snap-start cursor-pointer flex-col items-center gap-1.5 active:scale-[0.97] transition-transform duration-150 ease-out"
                    onClick={() => setSegmentFilter(prev => prev === item.label ? 'all' : item.label)}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-[15px] transition-all duration-200 ease-out ${
                      active
                        ? `${colors?.active ?? 'bg-[#336886] shadow-[0_16px_28px_-18px_rgba(51,104,134,0.74)]'} scale-[1.04]`
                        : `${colors?.inactive ?? 'jnc-hub-pill'} shadow-[0_14px_30px_-26px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-xl group-hover:scale-[1.03]`
                    }`}>
                      <CategoryIcon
                        size={19}
                        weight={active ? 'fill' : 'duotone'}
                        className={`transition-all duration-150 ease-out ${
                          active ? 'scale-[0.94] text-white' : `${colors?.icon ?? 'text-slate-500'} group-hover:scale-105`
                        }`}
                      />
                    </div>
                    <span className={`text-center text-[9px] font-black uppercase tracking-[0.08em] transition-colors ${
                      active ? (colors ? colors.icon : 'text-[#336886]') : 'text-slate-600'
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Banner de Destaques Premium - Esconde na busca para focar no resultado */}
          {debouncedQuery.length < 2 && (
            <HubFeaturedCarousel
              hasEntered={hasEntered}
              title={genericHighlightLabel}
              loading={featuredLoading}
              items={displayedFeaturedProducts}
              hasOverflow={hasFeaturedCarouselOverflow}
              hasSponsoredItems={hasSponsoredFeaturedProducts}
              selectedCondominiumSlug={selectedCondominiumSlug}
              currency={currency}
              onStageProduct={(item) => stageFeaturedProductCheckout(item as FeaturedProduct)}
            />
          )}

          {debouncedQuery.length < 2 && (
            <HubFavoriteStores
              hasEntered={hasEntered}
              stores={favoriteStores}
              distanceLoading={distanceLoading}
              activeLocation={activeLocation}
              distanceByStore={distanceByStore}
              formatDistance={formatDistance}
              onShowAll={() => setQuickFilter('favorites')}
            />
          )}

          <section ref={storesSectionRef} className="order-6 space-y-3.5" style={{ transition: 'all .45s ease', transitionDelay: '400ms', opacity: hasEntered ? 1 : 0, transform: hasEntered ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[1.05rem] font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-lg">
                  {isHomeStorePreview ? 'Lojas para pedir agora' : 'Escolha a loja para pedir'}
                </h2>
                {isHomeStorePreview ? (
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Restaurantes, mercados e serviços prontos para pedir.
                  </p>
                ) : !loading && !error && filteredStores.length > 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {productSearchLoading && debouncedQuery
                      ? 'Buscando também nos cardápios...'
                      : isShowingAllStores
                        ? `${filteredStores.length} resultado${filteredStores.length === 1 ? '' : 's'} no app`
                        : `${filteredStores.length} resultado${filteredStores.length === 1 ? '' : 's'} ${selectedCondominium ? 'no condomínio' : 'disponíveis'}`}
                  </p>
                ) : null}
              </div>
            </div>

            <HubStoreDiscoveryNotice
              isShowingAllStores={isShowingAllStores}
              geoDiscovery={geoDiscovery}
              displayLocationLabel={displayLocationLabel}
              onRestoreRegionalView={restoreRegionalView}
            />

            {loading && <HubStoreLoadingSkeleton selectedCondominium={isCondominiumScope} />}

            {!loading && error && <div className="rounded-2xl border border-rose-900/60 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</div>}

            {!loading && !error && filteredStores.length === 0 && (
              <HubStoreEmptyState
                productSearchLoading={productSearchLoading}
                debouncedQuery={debouncedQuery}
                geoDiscovery={geoDiscovery}
                displayLocationLabel={displayLocationLabel}
                onCreateStore={() => navigate('/create')}
                onEnableAllStoresView={enableAllStoresView}
                onClearFilters={clearHubFilters}
              />
            )}

            {!loading && !error && filteredStores.length > 0 && (
              <>
              <div className={selectedCondominium ? 'grid grid-cols-2 gap-2.5 min-[390px]:gap-3 md:grid-cols-3 lg:grid-cols-4' : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4'}>
                {visibleStoreCards.map((store, index) => {
                  const storePath = selectedCondominiumSlug
                    ? `/${store.slug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}`
                    : `/${store.slug}`;
                  const isOutOfRegion = !selectedCondominium && Boolean(store.isOutOfRegion);
                  const pickupEnabled = Boolean(store.supportsPickup || store.supportsTable);
                  const shouldWarnCoverage =
                    (isOutOfRegion && !pickupEnabled) ||
                    (!selectedCondominium &&
                      store.supportsDelivery &&
                      !store.supportsPostal &&
                      [ 'outside_radius', 'same_city' ].includes(String(store.geoAvailability || '').toLowerCase()));
                  const navigationDistanceKm = distanceByStore[store.id] ?? store.distanceKm ?? null;
                  const storeNavigationState = {
                    storefrontMode: 'customer',
                    ...(shouldWarnCoverage
                      ? {
                          hubCoverageWarning: {
                            message: isOutOfRegion
                              ? 'Essa loja está fora da área de entrega para o seu endereço atual. Você ainda pode ver a vitrine e conferir as opções disponíveis.'
                              : 'Essa loja ainda não atende o seu endereço principal com entrega. Você pode ver o cardápio e conferir outras opções como retirada.',
                          },
                        }
                      : {}),
                    ...(navigationDistanceKm !== null ? { hubDistanceKm: navigationDistanceKm } : {}),
                  };
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
                  const visiblePrimaryBadge = primaryBadge?.key === 'delivery' ? null : primaryBadge;
                  const visibleSecondaryBadge =
                    secondaryBadge?.key === 'favorite_hint' ||
                    (primaryBadge?.key === 'delivery' && secondaryBadge?.key === 'free_shipping')
                      ? null
                      : secondaryBadge;
                  const visibleServiceBadges = [visiblePrimaryBadge, visibleSecondaryBadge].filter(Boolean) as StoreCardBadge[];
                  const deliveryFeeLabel = isOutOfRegion && !pickupEnabled
                    ? 'Fora da entrega'
                    : store.supportsDelivery
                    ? store.freeShipping
                      ? 'Grátis'
                      : store.deliveryFee !== null
                        ? currency.format(store.deliveryFee)
                        : 'Entrega'
                    : store.supportsPickup || store.supportsTable
                      ? 'Retirada'
                      : 'Consulte';
                  const resolvedDistanceLabel = distanceLoading && activeLocation && distanceByStore[store.id] == null
                    ? '...'
                    : formatDistance(distanceByStore[store.id] ?? store.distanceKm);
                  const ratingLabel = store.reviewCount > 0
                    ? `${store.rating.toFixed(1)} (${store.reviewCount})`
                    : store.rating.toFixed(1);
                  return (
                    <HubStoreCard
                      key={store.id}
                      store={store}
                      to={storePath}
                      state={storeNavigationState}
                      index={index}
                      selectedCondominium={Boolean(selectedCondominium)}
                      isFavorite={favoriteStoreSlugs.includes(store.slug)}
                      isCondominiumEventLive={isCondominiumEventLive}
                      hasUpcomingCondominiumEvent={hasUpcomingCondominiumEvent}
                      condominiumEventTimeLabel={condominiumEventTimeLabel}
                      serviceBadges={visibleServiceBadges}
                      deliveryFeeLabel={deliveryFeeLabel}
                      resolvedDistanceLabel={resolvedDistanceLabel}
                      ratingLabel={ratingLabel}
                      onToggleFavorite={toggleFavoriteStore}
                    />
                  );
                })}
              </div>
              {isHomeStorePreview && hiddenHomeStoreCount > 0 ? (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsHomeStoreListExpanded(true)}
                    className="jnc-hub-touch inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10.5px] font-black uppercase tracking-[0.14em] text-[#153A4C] shadow-[0_8px_22px_-10px_rgba(21,58,76,0.22)] hover:shadow-[0_12px_28px_-10px_rgba(21,58,76,0.32)]"
                  >
                    Ver todas as lojas
                    <span className="rounded-full bg-[#5FD35A]/12 px-2 py-0.5 text-[10px] font-black text-[#336886]">+{hiddenHomeStoreCount}</span>
                  </button>
                </div>
              ) : null}
              </>
            )}
          </section>

          {/* Nova Seção: Itens encontrados na busca */}
          {debouncedQuery.length >= 2 && (
            <HubSearchProductResults
              items={searchedProducts}
              selectedCondominiumSlug={selectedCondominiumSlug}
              currency={currency}
              onStageProduct={(item) => stageFeaturedProductCheckout(item as FeaturedProduct)}
            />
          )}

          {/* CTA compacto para lojistas — premium style */}
          <section className="order-11 px-3 pb-2 pt-0">
            <button
              type="button"
              onClick={() => navigate('/create?plan=trial')}
              className="jnc-hub-touch group relative w-full overflow-hidden rounded-[1.5rem] px-3.5 py-3.5 text-left shadow-[0_22px_52px_-38px_rgba(21,58,76,0.32)]"
              style={{ background: 'linear-gradient(135deg, #153A4C 0%, #1A5068 40%, #245F78 70%, #2A6E88 100%)' }}
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#5FD35A]/[0.1] blur-3xl" />
              <div className="pointer-events-none absolute -left-6 bottom-[-8px] h-24 w-24 rounded-full bg-[#5FD35A]/[0.08] blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] bg-white/[0.12] text-white shadow-[0_12px_24px_-18px_rgba(0,0,0,0.3)] border border-white/[0.08]">
                  <Storefront size={22} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[0.92rem] font-black leading-tight tracking-[-0.03em] text-white">
                      Tem um negócio local?
                    </p>
                    <span className="rounded-full bg-[#5FD35A] px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.1em] text-[#153A4C] shadow-[0_6px_16px_-8px_rgba(95,211,90,0.5)]">
                      3 meses VIP
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white/78">
                    Crie sua loja e venda online pelo app.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#5FD35A] px-3.5 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#153A4C] shadow-[0_12px_28px_-16px_rgba(95,211,90,0.55)] transition-all group-hover:translate-x-0.5 group-hover:shadow-[0_16px_32px_-14px_rgba(95,211,90,0.65)]">
                  Começar
                  <CaretRight size={11} weight="bold" />
                </span>
              </div>
            </button>
          </section>
          <section className="order-12 space-y-2 pb-2 sm:pb-4">
            <div className="flex items-center justify-center gap-2">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-3.5 w-3.5 rounded-[0.3rem] object-cover" />
              <p className="text-[11px] font-bold text-slate-400">Conectando você aos melhores lojistas do app.</p>
            </div>
            <PlatformTrustFooter mode="minimal" align="center" compact />
          </section>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] px-0 pb-0 lg:hidden"
      >
        <div className="mx-auto max-w-none rounded-none border-t border-slate-200/75 bg-white/96 px-2 pt-2 shadow-[0_-14px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
          <div className="grid min-h-[4.65rem] grid-cols-5 items-center gap-0.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
          <button
            type="button"
            onClick={handleHomeHubNavigation}
            className={`group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.02] ${
              quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium
                ? 'bg-[#f0fdf4] text-[#166534] shadow-[0_12px_26px_-24px_rgba(95,211,90,0.35)] ring-1 ring-[#5FD35A]/12'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
              quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium
                ? 'bg-[#5FD35A] text-white shadow-[0_16px_32px_-24px_rgba(95,211,90,0.55)]'
                : 'bg-slate-100/80 text-slate-600 group-hover:bg-slate-200/80'
            }`}>
              <House size={16} weight={quickFilter === 'all' && !condominiumPickerOpen && !selectedCondominium ? 'fill' : 'duotone'} />
            </span>
            <span>Início</span>
                  <span className="h-[3px] w-4 rounded-full bg-[#5FD35A]" />
          </button>
          <button
            type="button"
            onClick={handleOpenPedidos}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.02]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition-all duration-200 group-hover:bg-slate-200/80">
              <Receipt size={16} weight="duotone" />
            </span>
            <span>Pedidos</span>
          </button>
          <button
            type="button"
            onClick={() => setCondominiumPickerOpen(true)}
            className={`group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.02] ${
              selectedCondominium || condominiumPickerOpen
                ? 'bg-[#f0fdf4] text-[#166534] shadow-[0_12px_26px_-24px_rgba(95,211,90,0.35)] ring-1 ring-[#5FD35A]/12'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
              selectedCondominium || condominiumPickerOpen
                ? 'bg-[#5FD35A] text-white shadow-[0_16px_32px_-24px_rgba(95,211,90,0.55)]'
                : 'bg-slate-100/80 text-slate-600 group-hover:bg-slate-200/80'
            }`}>
              <Tent size={16} weight={selectedCondominium || condominiumPickerOpen ? 'fill' : 'duotone'} />
            </span>
            <span>Feiras</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/destinos')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.02]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition-all duration-200 group-hover:bg-slate-200/80">
              <MapTrifold size={16} weight="duotone" />
            </span>
            <span>Visite</span>
          </button>
          <button
            type="button"
            onClick={() => setProfileDrawerOpen(true)}
            className={`group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.02] ${
              profileDrawerOpen
                ? 'bg-[#f0fdf4] text-[#166534] shadow-[0_12px_26px_-24px_rgba(95,211,90,0.35)] ring-1 ring-[#5FD35A]/12'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
              profileDrawerOpen
                ? 'bg-[#5FD35A] text-white shadow-[0_16px_32px_-24px_rgba(95,211,90,0.55)]'
                : 'bg-slate-100/80 text-slate-600 group-hover:bg-slate-200/80'
            }`}>
              <ListPlus size={17} weight={profileDrawerOpen ? 'bold' : 'duotone'} />
            </span>
            <span>Mais</span>
          </button>
          </div>
        </div>
      </nav>

      {condominiumPickerOpen && (
        <div className="fixed inset-0 z-[220] overflow-x-hidden overflow-y-auto overscroll-x-none bg-[radial-gradient(circle_at_top,rgba(51,104,134,0.10),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-950">
          <AppGlassHeader
            title="Agenda"
            eyebrow="Condomínios"
            subtitle="Feiras e eventos disponíveis"
            onBack={() => { setCondominiumPickerOpen(false); setCondominiumSearch(''); setCondoPickerFilter('all'); }}
            className="!z-[240]"
            maxWidthClassName="max-w-[640px]"
            right={(
              <div className="rounded-full border border-[#bfd6e4]/80 bg-white/78 px-3 py-1.5 text-center shadow-[0_14px_26px_-22px_rgba(51,104,134,0.32)] backdrop-blur-xl">
                <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#336886]">Ao vivo</p>
                <p className="text-sm font-black leading-none text-slate-950">{condominiumPickerCounts.live}</p>
              </div>
            )}
          />
          <div className="mx-auto min-h-screen w-full max-w-[640px] overflow-x-hidden pb-28 pt-[calc(env(safe-area-inset-top)+4.65rem)]">
            <div className="relative overflow-x-hidden px-4 pb-4 pt-3">
              <div className="pointer-events-none absolute -right-12 -top-10 h-56 w-56 rounded-full bg-[#336886]/12 blur-3xl" />

              <div className="relative rounded-[2rem] bg-white/92 px-4 py-5 shadow-[0_24px_52px_-38px_rgba(15,23,42,0.24)] ring-1 ring-white/85 backdrop-blur">
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

                <div className="relative flex items-center gap-3 rounded-[1.35rem] bg-slate-100/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ring-1 ring-slate-200/75">
                    <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-slate-400" />
                    <input
                      {...inputAssistProps.search}
                      ref={condominiumSearchInputRef}
                      value={condominiumSearch}
                      onChange={(ev) => setCondominiumSearch(ev.target.value)}
                      placeholder="Buscar por nome do condomínio ou cidade..."
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

                <div className="mt-4">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
                  {([
                    { key: 'all' as const, label: 'Todos', count: condominiumPickerCounts.all, tone: 'slate' as const },
                    { key: 'live' as const, label: 'Ao vivo', count: condominiumPickerCounts.live, tone: 'live' as const },
                    { key: 'upcoming' as const, label: 'Em breve', count: condominiumPickerCounts.upcoming, tone: 'brand' as const },
                    { key: 'none' as const, label: 'Sem agenda', count: condominiumPickerCounts.none, tone: 'muted' as const },
                  ]).map(({ key, label, count, tone }) => {
                    const isActive = condoPickerFilter === key;
                    const activeClasses =
                      tone === 'live'
                        ? 'border-[#336886]/28 bg-[#336886] text-white shadow-[0_14px_24px_-18px_rgba(51,104,134,0.5)]'
                        : tone === 'brand'
                        ? 'border-[#336886]/28 bg-[#336886] text-white shadow-[0_14px_24px_-18px_rgba(51,104,134,0.5)]'
                        : tone === 'muted'
                        ? 'border-slate-400/24 bg-slate-700 text-white shadow-[0_14px_24px_-18px_rgba(51,65,85,0.44)]'
                        : 'border-slate-300/24 bg-slate-900 text-white shadow-[0_14px_24px_-18px_rgba(15,23,42,0.48)]';
                    const idleClasses =
                      tone === 'live'
                        ? 'border-slate-200/85 bg-white/86 text-[#336886] hover:border-[#bfd6e4] hover:bg-white'
                        : tone === 'brand'
                        ? 'border-slate-200/85 bg-white/86 text-[#336886] hover:border-[#336886]/16 hover:bg-white'
                        : tone === 'muted'
                        ? 'border-slate-200/85 bg-white/86 text-slate-500 hover:border-slate-300 hover:bg-white'
                        : 'border-slate-200/85 bg-white/86 text-slate-700 hover:border-slate-300 hover:bg-white';

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCondoPickerFilter(key)}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.25 py-1.75 text-[10px] font-black tracking-[0.01em] transition-all duration-200 active:scale-95 ${isActive ? activeClasses : idleClasses}`}
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
                  handleCondominiumSelection(slug, name, event);
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
                      <section className="rounded-[1.8rem] bg-white/76 p-3.5 shadow-[0_24px_46px_-36px_rgba(51,104,134,0.22)] ring-1 ring-white/80 backdrop-blur-sm">
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
                            const displayName = formatCondominiumDisplayName(name);
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            const timeLabel = formatCondominiumPickerEventTime(event) || formatCondominiumEventTime(event);
                            const warmupCondominium = () => {
                              void condominiumService.prefetchStores(slug);
                            };
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleClick(slug, name, event)}
                                onPointerEnter={warmupCondominium}
                                onFocus={warmupCondominium}
                                onTouchStart={warmupCondominium}
                                className={`group relative w-full overflow-hidden rounded-[1.65rem] p-3 text-left transition-all duration-300 active:scale-[0.985] ${
                                  active
                                    ? 'bg-white shadow-[0_22px_42px_-27px_rgba(51,104,134,0.34)] ring-1 ring-[#336886]/16'
                                    : 'bg-white shadow-[0_18px_34px_-29px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 hover:shadow-[0_24px_40px_-29px_rgba(51,104,134,0.26)] hover:ring-[#336886]/16'
                                }`}
                              >
                                <div className="relative flex items-center gap-3">
                                  <div className="relative h-[5.45rem] w-[6.8rem] shrink-0 overflow-hidden rounded-[1.35rem] bg-slate-100 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.34)] ring-1 ring-white/80">
                                    <img src={bannerUrl} alt="" aria-hidden loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.06)_45%,rgba(15,23,42,0.24)_100%)]" />
                                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-[#336886] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)]">
                                      <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#009ee3] opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#009ee3]" />
                                      </span>
                                      Ao vivo
                                    </div>
                                    <div className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-[0.95rem] border-2 border-white bg-white/96 p-1.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.52)]">
                                      <img src={logoUrl} alt={displayName} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }} />
                                    </div>
                                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-[0_10px_20px_-12px_rgba(16,185,129,0.88)]">
                                      <Sparkle size={10} weight="fill" />
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className="block truncate text-[16px] font-semibold leading-tight text-slate-900">{displayName}</span>
                                        {region ? (
                                          <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-medium text-slate-500">
                                            <MapPinLine size={11} weight="duotone" className="shrink-0 text-slate-400" />
                                            <span className="truncate">{region}</span>
                                          </span>
                                        ) : null}
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
                      <section className="rounded-[1.7rem] bg-white/74 p-3.5 shadow-[0_20px_38px_-34px_rgba(15,23,42,0.18)] ring-1 ring-white/78 backdrop-blur-sm">
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
                            const displayName = formatCondominiumDisplayName(name);
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            const timeLabel = formatCondominiumPickerEventTime(event) || formatCondominiumEventTime(event);
                            const warmupCondominium = () => {
                              void condominiumService.prefetchStores(slug);
                            };
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleClick(slug, name, event)}
                                onPointerEnter={warmupCondominium}
                                onFocus={warmupCondominium}
                                onTouchStart={warmupCondominium}
                                className={`group relative w-full overflow-hidden rounded-[1.65rem] p-3 text-left transition-all duration-300 active:scale-[0.985] ${
                                  active
                                    ? 'bg-white shadow-[0_20px_38px_-27px_rgba(51,104,134,0.32)] ring-1 ring-[#336886]/16'
                                    : 'bg-white/94 shadow-[0_18px_34px_-29px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/68 hover:shadow-[0_24px_40px_-29px_rgba(51,104,134,0.23)] hover:ring-[#336886]/16'
                                }`}
                              >
                                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_center,rgba(51,104,134,0.09),transparent_72%)]" />
                                <div className="relative flex items-center gap-3">
                                  <div className="relative h-[5.15rem] w-[6.35rem] shrink-0 overflow-hidden rounded-[1.3rem] bg-slate-100 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.42)] ring-1 ring-white/80">
                                    <img src={bannerUrl} alt="" aria-hidden loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.06)_45%,rgba(15,23,42,0.26)_100%)]" />
                                    <div className="absolute bottom-2 left-2 h-9 w-9 overflow-hidden rounded-[0.9rem] border-2 border-white bg-white/96 p-1.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.52)]">
                                      <img src={logoUrl} alt={displayName} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }} />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className="block truncate text-[16px] font-semibold leading-tight text-slate-900">{displayName}</span>
                                        {region ? (
                                          <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-medium text-slate-500">
                                            <MapPinLine size={11} weight="duotone" className="shrink-0 text-slate-400" />
                                            <span className="truncate">{region}</span>
                                          </span>
                                        ) : null}
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
                      <section className="rounded-[1.65rem] bg-slate-50/76 p-3.5 shadow-[0_18px_34px_-34px_rgba(15,23,42,0.14)] ring-1 ring-white/70">
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
                            const displayName = formatCondominiumDisplayName(name);
                            const logoUrl = resolveCondominiumAssetUrl(condominium, 'logo');
                            const bannerUrl = resolveCondominiumAssetUrl(condominium, 'banner') || logoUrl;
                            const warmupCondominium = () => {
                              void condominiumService.prefetchStores(slug);
                            };
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleClick(slug, name, null)}
                                onPointerEnter={warmupCondominium}
                                onFocus={warmupCondominium}
                                onTouchStart={warmupCondominium}
                                className={`group relative w-full overflow-hidden rounded-[1.45rem] p-3 text-left transition-all duration-200 active:scale-[0.99] ${
                                  active
                                    ? 'bg-white shadow-[0_16px_32px_-27px_rgba(51,104,134,0.24)] ring-1 ring-[#336886]/14'
                                    : 'bg-white/90 shadow-[0_14px_28px_-27px_rgba(15,23,42,0.23)] ring-1 ring-slate-200/62 hover:bg-white hover:ring-slate-200'
                                }`}
                              >
                                <div className="relative flex items-center gap-3">
                                  <div className="relative h-[4.85rem] w-[5.8rem] shrink-0 overflow-hidden rounded-[1.2rem] bg-slate-100 ring-1 ring-white/75">
                                    <img src={bannerUrl} alt="" aria-hidden loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90" />
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.12)_0%,rgba(255,255,255,0.02)_45%,rgba(15,23,42,0.18)_100%)]" />
                                    <div className="absolute bottom-2 left-2 h-8 w-8 overflow-hidden rounded-[0.8rem] border-2 border-white bg-white/96 p-1 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)]">
                                      <img src={logoUrl} alt={displayName} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(slug, name); }} />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className={`block truncate text-[15px] font-semibold ${active ? 'text-[#336886]' : 'text-slate-800'}`}>{displayName}</span>
                                    {region ? (
                                      <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-medium text-slate-500">
                                        <MapPinLine size={11} weight="duotone" className="shrink-0 text-slate-400" />
                                        <span className="truncate">{region}</span>
                                      </span>
                                    ) : null}
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                                        Sem agenda
                                      </span>
                                      <span className="text-[11px] font-medium text-slate-500">Receba novidades quando abrir.</span>
                                    </div>
                                  </div>
                                  <span className={`relative shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] ${
                                    active ? 'bg-[#336886]/10 text-[#336886]' : 'bg-slate-100/80 text-slate-600'
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
              <div className="mx-auto max-w-none rounded-none border-t border-slate-200/75 bg-white/96 px-2 pt-2 shadow-[0_-14px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
                <div className="grid min-h-[4.65rem] max-w-[760px] grid-cols-5 items-center gap-0.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    handleHomeHubNavigation();
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.02]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition-all duration-200 group-hover:bg-slate-200/80">
                    <House size={16} weight="duotone" />
                  </span>
                  <span>Início</span>
                  <span className="h-[3px] w-4 rounded-full bg-[#5FD35A]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    handleOpenPedidos();
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.02]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition-all duration-200 group-hover:bg-slate-200/80">
                    <Receipt size={16} weight="duotone" />
                  </span>
                  <span>Pedidos</span>
                </button>
                <button
                  type="button"
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] bg-[#f0fdf4] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#166534] shadow-[0_12px_26px_-24px_rgba(95,211,90,0.35)] ring-1 ring-[#5FD35A]/12 transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.02]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5FD35A] text-white shadow-[0_16px_32px_-24px_rgba(95,211,90,0.55)]">
                    <Tent size={16} weight="fill" />
                  </span>
                  <span>Feiras</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    navigate('/destinos');
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.02]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition-all duration-200 group-hover:bg-slate-200/80">
                    <MapTrifold size={16} weight="duotone" />
                  </span>
                  <span>Visite</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondominiumPickerOpen(false);
                    setProfileDrawerOpen(true);
                  }}
                  className="group flex flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.02]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition-all duration-200 group-hover:bg-slate-200/80">
                    <ListPlus size={17} weight="duotone" />
                  </span>
                  <span>Mais</span>
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
