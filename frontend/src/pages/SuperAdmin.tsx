// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ArrowClockwise,
  TrendUp,
  Storefront,
  CheckCircle,
  WarningCircle,
  CurrencyDollar,
  CreditCard,
  Clock,
  ChartBar,
  Buildings,
  Funnel,
  DownloadSimple,
  Trash,
  Eye,
  CaretLeft,
  CaretRight,
  Check,
  MagnifyingGlass,
  IdentificationCard,
  Camera,
  Car,
  ShieldCheck,
  Megaphone,
  ImageSquare,
  CaretDown,
  Sparkle,
  GitCommit,
  RocketLaunch,
  Cpu,
  Compass,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';
import { superAdminService } from '../services/superAdminService';
import { formatCurrency, formatPlanName } from '../utils/format';
import { exportToCsv } from '../utils/export';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Lottie from 'lottie-react';
import fireAnimation from '../assets/fire.json';
import { useToast } from '../contexts/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { AdaptiveAvatar } from '../components/common/AdaptiveAvatar';
import { PremiumTabs } from '../components/common/PremiumTabs';
import { FormSection } from '../components/common/FormSection';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { CustomerSecuritySection } from '../components/Admin/CustomerSecuritySection';
import { MfaChallengeModal } from '../components/Auth/MfaChallengeModal';
import { AccountMfaPanel } from '../components/Auth/AccountMfaPanel';
import { persistTrustedMfaDevice } from '../utils/mfaDevice';
import { MFA_CHALLENGE_EXPIRED_MESSAGE, isMfaChallengeExpiredError } from '../utils/mfaErrors';
import { isTransientConnectionError, normalizeUserFacingError } from '../utils/userFriendlyErrors';

const STORAGE_KEY = 'superAdminToken';
const STORAGE_USER_KEY = 'superAdminUser';
const ACTIVE_SECTION_STORAGE_KEY = 'superadmin:activeSection';
const FILTERS_KEY = 'superAdminPaymentFilters';
const EVENTS_FILTERS_KEY = 'superAdminEventFilters';
const EVENTS_PAGE_SIZE = 25;
const PAYMENTS_PER_PAGE = 10;
const OVERVIEW_REFRESH_VISIBLE_MS = 60_000;
const OVERVIEW_REFRESH_HIDDEN_MS = 180_000;
const OVERVIEW_REFRESH_MAX_BACKOFF_MS = 300_000;
const BROADCAST_TITLE_RECOMMENDED_MAX = 48;
const BROADCAST_BODY_RECOMMENDED_MAX = 140;
const BROADCAST_BODY_MAX = 420;

const PUSH_APP_ROUTE_OPTIONS = [
  { value: '/hub', label: 'Início do app' },
  { value: '/hub/destaques', label: 'Itens em destaque' },
  { value: '/notificacoes', label: 'Central de notificações' },
  { value: '/cliente?mode=login', label: 'Login do cliente' },
  { value: '/cliente/conta', label: 'Minha conta' },
  { value: '/cliente/pedidos', label: 'Meus pedidos' },
  { value: '/cliente/enderecos', label: 'Meus endereços' },
  { value: '/destinos', label: 'Destinos e chalés' },
  { value: '/create', label: 'Criar loja' },
  { value: '/instalar', label: 'Instalar app' },
  { value: '/guia', label: 'Sobre o app / Guia' },
];

const readFilters = () => {
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}');
  } catch {
    return {};
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const daysUntil = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const statusStyle = (status?: string) => {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
  if (status === 'EXPIRING') return 'bg-amber-100 text-amber-800';
  if (status === 'EXPIRED') return 'bg-red-100 text-red-700';
  if (status === 'SUSPENDED') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-600';
};

const faceTone = (label?: string) => {
  const normalized = String(label || '').toLowerCase();
  if (normalized === 'alto') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (normalized === 'medio') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (normalized === 'baixo') return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const faceReasonLabel = (reason?: string) => {
  const code = String(reason || '').toLowerCase();
  if (!code || code === 'none') return 'Sem falha registrada';
  if (code === 'rate_limited') return 'Limite de tentativas atingido';
  if (code === 'fetch failed' || code === 'fetch_failed') return 'Falha de conexão com o validador';
  if (code === 'timeout_retry') return 'Instabilidade no validador (reprocessando automaticamente)';
  if (code === 'timeout') return 'Validação expirou por tempo';
  if (code === 'compare_error') return 'Erro ao comparar as imagens';
  if (code === 'no_face_selfie') return 'Não foi detectado rosto na selfie';
  if (code === 'multi_face_selfie') return 'Foram detectados múltiplos rostos na selfie';
  if (code === 'no_face_doc') return 'Não foi detectado rosto no documento';
  if (code === 'low_match') return 'Selfie não confere com o documento';
  if (code === 'medium_match') return 'Conferência parcial (revisão manual)';
  if (code === 'manual_review') return 'Revisão manual necessária';
  return code;
};

const faceStatusLabel = (status?: string) => {
  const code = String(status || '').toLowerCase();
  if (!code) return '-';
  if (code === 'pending') return 'Aguardando validação';
  if (code === 'processing') return 'Validando';
  if (code === 'done') return 'Validação concluída';
  if (code === 'manual_required') return 'Revisão manual necessária';
  if (code === 'failed') return 'Falha técnica na validação';
  return code;
};

const faceScoreLabel = (score: unknown) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return '-';
  const pct = Math.max(0, Math.min(100, n * 100));
  return `${pct.toFixed(1)}%`;
};

const getAttributionLabel = (store: any) => {
  const attribution = store?.settings?.acquisitionAttribution;
  if (!attribution || typeof attribution !== 'object') return 'Direto / não informado';
  const source = String(attribution.utm_source || '').trim();
  const medium = String(attribution.utm_medium || '').trim();
  const campaign = String(attribution.utm_campaign || '').trim();
  const referrer = String(attribution.referrer || '').trim();
  const primary = source || (referrer ? 'referrer' : 'direto');
  const secondary = campaign || medium || referrer || '';
  return secondary ? `${primary} · ${secondary}` : primary;
};

const getSuperAdminRoleLabel = (role?: string) => {
  const normalized = String(role || '').trim().toUpperCase();
  if (normalized === 'SUPER_ADMIN') return 'Gestor da plataforma';
  if (normalized === 'ADMIN') return 'Administrador';
  return 'Equipe Ja no Caminho';
};

const KycAvatar = ({ name, profileImageUrl }: { name?: string; profileImageUrl?: string }) => {
  return (
    <AdaptiveAvatar
      src={profileImageUrl ? resolveAssetUrl(profileImageUrl) : ''}
      alt={name || 'Motoboy'}
      fallbackText={String(name || 'M')}
      sizeClassName="h-14 w-14"
      imageClassName="object-[center_18%]"
      containerClassName="shadow-[0_18px_32px_-22px_rgba(15,23,42,0.45)]"
    />
  );
};

const PlatformRobotLoader = ({ logoSrc = '/janocaminho.jpg' }) => (
  <div className="relative overflow-hidden rounded-[1.7rem] border border-[#336886]/12 bg-white p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)]">
    <div className="absolute -right-10 -top-14 h-32 w-32 rounded-full bg-[#5FD35A]/18 blur-3xl" />
    <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-[#336886]/14 blur-3xl" />
    <div className="relative flex items-center gap-3">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(145deg,#153A4C,#336886)] shadow-[0_20px_42px_-28px_rgba(21,58,76,0.9)]">
        <span className="absolute -top-2 left-1/2 h-4 w-[2px] -translate-x-1/2 rounded-full bg-[#5FD35A]/80" />
        <span className="absolute left-[17px] top-[17px] h-1.5 w-1.5 animate-pulse rounded-full bg-[#5FD35A] shadow-[0_0_12px_rgba(95,211,90,0.9)]" />
        <span className="absolute right-[17px] top-[17px] h-1.5 w-1.5 animate-pulse rounded-full bg-[#5FD35A] shadow-[0_0_12px_rgba(95,211,90,0.9)]" />
        <img src={logoSrc} alt="Já no Caminho" className="mt-3 h-7 w-7 rounded-lg object-cover ring-1 ring-white/50" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">Resumo da plataforma</p>
        <p className="mt-1 text-sm font-black text-slate-900">Carregando indicadores...</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">Buscando vendas, lojas, planos e pagamentos sem travar a tela.</p>
      </div>
      <div className="ml-auto hidden items-center gap-1 sm:flex">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#336886]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#5FD35A] [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8EC5DD] [animation-delay:240ms]" />
      </div>
    </div>
  </div>
);

const SECTION_META: Record<string, { title: string; description: string; tone: string }> = {
  executive: {
    title: 'Resumo executivo',
    description: 'Visão rápida dos principais números da plataforma.',
    tone: 'from-[#0d1f35] to-[#153A4C] text-white border-[#153A4C]',
  },
  rankings: {
    title: 'Rankings',
    description: 'Comparativo de lojas por receita e volume de pedidos.',
    tone: 'from-[#153A4C] to-[#336886] text-white border-[#336886]',
  },
  stores: {
    title: 'Lojas e performance',
    description: 'Filtros, plano, VIP, métricas e saúde operacional das lojas.',
    tone: 'from-[#153A4C] to-[#1e4d6b] text-white border-[#153A4C]',
  },
  payments: {
    title: 'Pagamentos',
    description: 'Acompanhamento financeiro, status e reconciliação.',
    tone: 'from-[#0d3347] to-[#336886] text-white border-[#336886]',
  },
  security: {
    title: 'Segurança de clientes',
    description: 'Bloqueios temporários, sinais de abuso e revisão operacional das contas.',
    tone: 'from-rose-700 to-rose-600 text-white border-rose-700',
  },
  logs: {
    title: 'Logs de acesso',
    description: 'Rastreamento de acesso, segurança e auditoria de uso.',
    tone: 'from-slate-700 to-slate-800 text-white border-slate-700',
  },
  events: {
    title: 'Eventos',
    description: 'Fila de eventos e histórico técnico da plataforma.',
    tone: 'from-slate-700 to-slate-800 text-white border-slate-700',
  },
  kyc: {
    title: 'KYC de entregadores',
    description: 'Validação documental, score facial e decisões da plataforma.',
    tone: 'from-[#153A4C] to-[#336886] text-white border-[#336886]',
  },
  versions: {
    title: 'Versões',
    description: 'Versão atual, build e histórico técnico de mudanças.',
    tone: 'from-slate-800 to-slate-900 text-white border-slate-800',
  },
  push: {
    title: 'Push Promocional',
    description: 'Aprovação e histórico de notificações pagas pelas lojas.',
    tone: 'from-[#153A4C] to-[#336886] text-white border-[#336886]',
  },
  destinations: {
    title: 'Destinos',
    description: 'Cidades turísticas, chalés, pousadas e serviços locais.',
    tone: 'from-[#153A4C] to-[#336886] text-white border-[#336886]',
  },
};

const SUPER_ADMIN_SECTIONS = [
  { id: 'executive', label: 'Resumo',     icon: ChartBar,          group: 'operacional' },
  { id: 'rankings',  label: 'Rankings',   icon: TrendUp,           group: 'operacional' },
  { id: 'stores',    label: 'Lojas',      icon: Storefront,        group: 'operacional' },
  { id: 'payments',  label: 'Pagamentos', icon: CurrencyDollar,    group: 'operacional' },
  { id: 'push',      label: 'Push',       icon: Megaphone,         group: 'plataforma'  },
  { id: 'destinations', label: 'Destinos', icon: Compass,           group: 'plataforma'  },
  { id: 'kyc',       label: 'KYC',        icon: IdentificationCard,group: 'plataforma'  },
  { id: 'security',  label: 'Segurança',  icon: ShieldCheck,       group: 'plataforma'  },
  { id: 'logs',      label: 'Logs',       icon: GitCommit,         group: 'tecnico'     },
  { id: 'events',    label: 'Eventos',    icon: Sparkle,           group: 'tecnico'     },
  { id: 'versions',  label: 'Versões',    icon: RocketLaunch,      group: 'tecnico'     },
];

const readInitialSuperAdminSection = () => {
  if (typeof window === 'undefined') return 'executive';
  const stored = String(sessionStorage.getItem(ACTIVE_SECTION_STORAGE_KEY) || '').trim();
  return SUPER_ADMIN_SECTIONS.some((section) => section.id === stored) ? stored : 'executive';
};

export function SuperAdmin() {
  const isNativePlatform = Capacitor.isNativePlatform();
  const { showToast } = useToast();
  const platformLogo = '/janocaminho.jpg';
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [superAdminUser, setSuperAdminUser] = useState(() => localStorage.getItem(STORAGE_USER_KEY) || '');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overviewRefreshing, setOverviewRefreshing] = useState(false);
  const [overviewConnectionMessage, setOverviewConnectionMessage] = useState('');
  const [overviewLastUpdatedAt, setOverviewLastUpdatedAt] = useState<string | null>(null);
  const overviewRef = useRef<any | null>(null);
  const overviewRefreshTimerRef = useRef<number | null>(null);
  const overviewFailuresRef = useRef(0);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<any | null>(null);
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaPanelOpen, setMfaPanelOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('auth:remember-superadmin') !== 'false';
  });
  const [paymentQuery, setPaymentQuery] = useState(() => readFilters().paymentQuery || '');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(() => readFilters().paymentStatusFilter || 'all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(() => readFilters().paymentMethodFilter || 'all');
  const [paymentProviderFilter, setPaymentProviderFilter] = useState(() => readFilters().paymentProviderFilter || 'all');
  const [reprocessingId, setReprocessingId] = useState('');
  const [eventStoreFilter, setEventStoreFilter] = useState('all');
  const [eventStatusFilter, setEventStatusFilter] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_FILTERS_KEY) || '{}')?.eventStatusFilter || 'all';
    } catch {
      return 'all';
    }
  });
  const [selectedEventPayload, setSelectedEventPayload] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [openPaymentPayloadId, setOpenPaymentPayloadId] = useState('');
  const [dateRange, setDateRange] = useState(() => readFilters().dateRange || '30');
  const [minAmount, setMinAmount] = useState(() => readFilters().minAmount || '');
  const [maxAmount, setMaxAmount] = useState(() => readFilters().maxAmount || '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rememberDevice) return;
    const rememberedUser = localStorage.getItem(STORAGE_USER_KEY) || '';
    if (rememberedUser && !loginForm.email) {
      setLoginForm((prev) => ({ ...prev, email: rememberedUser }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const normalizedUser = String(loginForm.email || '').trim();
    if (rememberDevice && normalizedUser) {
      localStorage.setItem(STORAGE_USER_KEY, normalizedUser);
      return;
    }
    if (!rememberDevice) {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  }, [loginForm.email, rememberDevice]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventResults, setEventResults] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [accessLogsTotal, setAccessLogsTotal] = useState(0);
  const [accessLogsPage, setAccessLogsPage] = useState(1);
  const [accessLogsLoading, setAccessLogsLoading] = useState(false);
  const [accessLogQuery, setAccessLogQuery] = useState('');
  const [accessLogRole, setAccessLogRole] = useState('all');
  const [accessLogMethod, setAccessLogMethod] = useState('all');
  const [accessLogStatus, setAccessLogStatus] = useState('all');
  const [accessLogStore, setAccessLogStore] = useState('all');
  const [vipFilter, setVipFilter] = useState('all');
  const [sectionsOpen, setSectionsOpen] = useState({
    charts: true,
    rankings: true,
    stores: true,
    payments: true,
    logs: false,
    events: false,
    kyc: true,
  });
  const [activeSection, setActiveSection] = useState(readInitialSuperAdminSection);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body: '',
    targetType: 'none',
    route: '/hub',
    storeRoute: '',
    customRoute: '',
    url: '',
    topic: 'janocaminho_global',
    limit: 1500,
  });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [pendingPushes, setPendingPushes] = useState<any[]>([]);
  const [pushActionId, setPushActionId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [pushPanel, setPushPanel] = useState<'broadcast' | 'review' | 'history'>('broadcast');

  useEffect(() => {
    if (activeSection !== 'push' || !token) return;
    superAdminService.listPendingPromoPushes(token).then((data) => setPendingPushes(Array.isArray(data) ? data : [])).catch(() => {});
    superAdminService.listPromoPushHistory(token).then((data) => setPushHistory(Array.isArray(data) ? data : [])).catch(() => {});
  }, [activeSection, token]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, activeSection);
    window.dispatchEvent(new CustomEvent('superadmin:active-section-changed', { detail: { section: activeSection } }));
  }, [activeSection]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onSuperAdminSectionChange = (event: any) => {
      const nextSection = String(event?.detail?.section || '').trim();
      if (!SUPER_ADMIN_SECTIONS.some((section) => section.id === nextSection)) return;
      setActiveSection(nextSection);
    };
    window.addEventListener('superadmin:set-section', onSuperAdminSectionChange as EventListener);
    return () => window.removeEventListener('superadmin:set-section', onSuperAdminSectionChange as EventListener);
  }, []);
  const [broadcastLastResult, setBroadcastLastResult] = useState<any | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycReason, setKycReason] = useState('');
  const [kycAuditDays, setKycAuditDays] = useState(30);
  const [kycAudit, setKycAudit] = useState<any | null>(null);
  const [kycHistoryOpen, setKycHistoryOpen] = useState(false);
  const [kycHistoryLoading, setKycHistoryLoading] = useState(false);
  const [kycHistoryMotoboy, setKycHistoryMotoboy] = useState<any | null>(null);
  const [kycHistoryDocs, setKycHistoryDocs] = useState<any[]>([]);
  const [kycHistoryStatusFilter, setKycHistoryStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [kycHistoryFaceFilter, setKycHistoryFaceFilter] = useState<'all' | 'alto' | 'medio' | 'baixo' | 'indisponivel'>('all');
  const [kycRecentReviews, setKycRecentReviews] = useState<any[]>([]);
  const [kycRecentReviewsLoading, setKycRecentReviewsLoading] = useState(false);
  const buildDate = useMemo(() => {
    const date = new Date(APP_BUILD_INFO.builtAt);
    if (!Number.isFinite(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  }, []);

  useEffect(() => {
    overviewRef.current = overview;
  }, [overview]);

  const loadOverview = async (
    authToken: string,
    options: { silent?: boolean; showToastOnError?: boolean } = {}
  ) => {
    const silent = Boolean(options.silent);
    const hasSnapshot = Boolean(overviewRef.current);
    if (silent && hasSnapshot) {
      setOverviewRefreshing(true);
    } else {
      setLoading(true);
    }
    if (!silent) {
      setError('');
      setOverviewConnectionMessage('');
    }
    try {
      const data = await superAdminService.fetchOverview(authToken);
      setOverview(data);
      overviewFailuresRef.current = 0;
      setOverviewLastUpdatedAt(new Date().toISOString());
      setOverviewConnectionMessage('');
    } catch (err: any) {
      const rawMessage = String(err?.message || '');
      const message =
        silent && hasSnapshot && isTransientConnectionError(err)
          ? 'Conexão instável. Mantivemos os últimos dados e vamos tentar reconectar.'
          : normalizeUserFacingError(err, 'Não foi possível carregar os dados da plataforma agora.');

      if (
        err?.status === 401 ||
        rawMessage.includes('Token inválido') ||
        rawMessage.includes('Token ausente')
      ) {
        setSessionExpired(true);
        handleLogout();
      } else {
        overviewFailuresRef.current += 1;
        if (silent && hasSnapshot) {
          setOverviewConnectionMessage(message);
        } else {
          if (options.showToastOnError !== false) {
            showToast(message, 'error');
          }
          setError(message);
          if (!hasSnapshot) {
            setOverview(null);
          }
        }
      }
    } finally {
      setLoading(false);
      setOverviewRefreshing(false);
    }
  };

  const toggleSection = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (token) {
      loadOverview(token);
    }
  }, [token]);

  const loadKycQueue = async (authToken: string) => {
    setKycLoading(true);
    try {
      const data = await superAdminService.fetchMotoboyKycPending(authToken);
      setKycQueue(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível carregar a fila de KYC.', 'error');
      setKycQueue([]);
    } finally {
      setKycLoading(false);
    }
  };

  const loadKycAudit = async (authToken: string, days = kycAuditDays) => {
    try {
      const data = await superAdminService.fetchMotoboyKycAudit(authToken, days);
      setKycAudit(data || null);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível carregar a auditoria KYC.', 'error');
      setKycAudit(null);
    }
  };

  const loadKycRecentReviews = async (authToken: string) => {
    setKycRecentReviewsLoading(true);
    try {
      const data = await superAdminService.fetchMotoboyKycReviews(authToken, 40);
      setKycRecentReviews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível carregar o histórico de revisões KYC.', 'error');
      setKycRecentReviews([]);
    } finally {
      setKycRecentReviewsLoading(false);
    }
  };

  const reviewKycDocument = async (motoboyId: string, documentId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      if (action === 'approve') {
        await superAdminService.approveMotoboyDocument(token, motoboyId, documentId);
        showToast('Documento aprovado.', 'success');
      } else {
        const reason = String(kycReason || '').trim() || null;
        await superAdminService.rejectMotoboyDocument(token, motoboyId, documentId, reason);
        showToast('Documento rejeitado.', 'success');
      }
      await loadKycQueue(token);
      await loadKycAudit(token, kycAuditDays);
      await loadKycRecentReviews(token);
      if (kycHistoryOpen && kycHistoryMotoboy?.id) {
        const docs = await superAdminService.fetchMotoboyDocuments(token, kycHistoryMotoboy.id);
        setKycHistoryDocs(Array.isArray(docs) ? docs : []);
      }
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível revisar o documento.', 'error');
    }
  };

  const openKycHistory = async (motoboy: any) => {
    if (!token || !motoboy?.id) return;
    setKycHistoryOpen(true);
    setKycHistoryLoading(true);
    setKycHistoryMotoboy(motoboy);
    try {
      const docs = await superAdminService.fetchMotoboyDocuments(token, motoboy.id);
      setKycHistoryDocs(Array.isArray(docs) ? docs : []);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível carregar o histórico de KYC.', 'error');
      setKycHistoryDocs([]);
    } finally {
      setKycHistoryLoading(false);
    }
  };

  const filteredKycHistoryDocs = useMemo(() => {
    return (kycHistoryDocs || []).filter((doc: any) => {
      const statusOk = kycHistoryStatusFilter === 'all' || String(doc?.status || '').toUpperCase() === kycHistoryStatusFilter;
      const label = String(doc?.metadata?.face?.scoreLabel || 'indisponivel').toLowerCase();
      const faceOk = kycHistoryFaceFilter === 'all' || label === kycHistoryFaceFilter;
      return statusOk && faceOk;
    });
  }, [kycHistoryDocs, kycHistoryStatusFilter, kycHistoryFaceFilter]);

  const kycHistoryDocSummary = useMemo(() => {
    const byType = new Map<string, any>();
    for (const doc of filteredKycHistoryDocs || []) {
      const type = String(doc?.docType || 'UNKNOWN').toUpperCase();
      const status = String(doc?.status || 'PENDING').toUpperCase();
      const reviewedAt = doc?.metadata?.review?.reviewedAt || doc?.reviewedAt || doc?.uploadedAt || null;
      const reviewedAtMs = reviewedAt ? new Date(reviewedAt).getTime() : 0;
      const current = byType.get(type) || {
        docType: type,
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        latestStatus: status,
        latestAt: reviewedAt,
        latestAtMs: reviewedAtMs,
      };
      current.total += 1;
      if (status === 'APPROVED') current.approved += 1;
      else if (status === 'REJECTED') current.rejected += 1;
      else current.pending += 1;

      if (reviewedAtMs >= current.latestAtMs) {
        current.latestAtMs = reviewedAtMs;
        current.latestAt = reviewedAt;
        current.latestStatus = status;
      }
      byType.set(type, current);
    }
    return Array.from(byType.values()).sort((a, b) => a.docType.localeCompare(b.docType));
  }, [filteredKycHistoryDocs]);

  const groupedRecentKycReviews = useMemo(() => {
    const pickMomentMs = (doc: any) => {
      const value = doc?.metadata?.review?.reviewedAt || doc?.reviewedAt || doc?.uploadedAt || null;
      if (!value) return 0;
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };

    const byMotoboy = new Map<string, any>();
    for (const doc of kycRecentReviews || []) {
      const motoboyId = String(doc?.motoboyId || doc?.motoboy?.id || '');
      if (!motoboyId) continue;
      const status = String(doc?.status || '').toUpperCase();
      const reviewedAt = doc?.metadata?.review?.reviewedAt || doc?.reviewedAt || doc?.uploadedAt || null;
      const reviewedAtMs = pickMomentMs(doc);
      const current = byMotoboy.get(motoboyId) || {
        motoboy: doc?.motoboy || null,
        docs: [],
        approvedCount: 0,
        rejectedCount: 0,
        latestReviewedAt: reviewedAt,
        latestReviewedAtMs: reviewedAtMs,
      };
      current.docs.push(doc);
      if (status === 'APPROVED') current.approvedCount += 1;
      if (status === 'REJECTED') current.rejectedCount += 1;
      if (reviewedAtMs > current.latestReviewedAtMs) {
        current.latestReviewedAt = reviewedAt;
        current.latestReviewedAtMs = reviewedAtMs;
      }
      byMotoboy.set(motoboyId, current);
    }
    return Array.from(byMotoboy.values())
      .map((entry: any) => {
        const docs = Array.isArray(entry.docs) ? entry.docs : [];
        const byType = new Map<string, any>();
        for (const doc of docs) {
          const type = String(doc?.docType || '').toUpperCase();
          if (!type) continue;
          const ms = pickMomentMs(doc);
          const current = byType.get(type);
          if (!current || ms >= current._momentMs) {
            byType.set(type, { ...doc, _momentMs: ms });
          }
        }
        const requiredTypes = [ 'CNH', 'SELFIE', 'CRLV' ];
        const typeSummary = requiredTypes.map((type) => {
          const latest = byType.get(type);
          if (latest) return latest;
          return {
            id: `${entry.motoboy?.id || 'motoboy'}-${type}-missing`,
            docType: type,
            status: 'PENDING',
            metadata: { face: { scoreLabel: 'indisponivel', faceMatchScore: null } },
            _momentMs: 0,
            _missing: true,
          };
        });
        return {
          ...entry,
          typeSummary,
        };
      })
      .sort((a, b) => b.latestReviewedAtMs - a.latestReviewedAtMs);
  }, [kycRecentReviews]);

  useEffect(() => {
    if (!token) return;
    loadKycQueue(token);
    loadKycAudit(token, kycAuditDays);
    loadKycRecentReviews(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadKycAudit(token, kycAuditDays);
  }, [kycAuditDays]);

  useEffect(() => {
    if (!token || !autoRefresh) return;
    let disposed = false;

    const clearOverviewTimer = () => {
      if (overviewRefreshTimerRef.current) {
        window.clearTimeout(overviewRefreshTimerRef.current);
        overviewRefreshTimerRef.current = null;
      }
    };

    const isPageVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible';
    const isOnline = () =>
      typeof navigator === 'undefined' || navigator.onLine !== false;
    const nextDelay = () => {
      if (!isPageVisible()) return OVERVIEW_REFRESH_HIDDEN_MS;
      const failures = Math.max(0, overviewFailuresRef.current);
      if (!failures) return OVERVIEW_REFRESH_VISIBLE_MS;
      return Math.min(OVERVIEW_REFRESH_MAX_BACKOFF_MS, OVERVIEW_REFRESH_VISIBLE_MS * 2 ** failures);
    };

    const scheduleNextRefresh = () => {
      clearOverviewTimer();
      if (disposed) return;
      overviewRefreshTimerRef.current = window.setTimeout(async () => {
        if (disposed) return;
        if (!isOnline()) {
          overviewFailuresRef.current = Math.max(overviewFailuresRef.current, 1);
          if (overviewRef.current) {
            setOverviewConnectionMessage('Sem conexão. Mantivemos os últimos dados e vamos tentar reconectar.');
          }
        } else if (isPageVisible()) {
          await loadOverview(token, { silent: true, showToastOnError: false });
        }
        scheduleNextRefresh();
      }, nextDelay());
    };

    const refreshWhenActive = () => {
      if (disposed || !isPageVisible() || !isOnline()) return;
      clearOverviewTimer();
      void loadOverview(token, { silent: true, showToastOnError: false }).finally(scheduleNextRefresh);
    };

    scheduleNextRefresh();
    window.addEventListener('focus', refreshWhenActive);
    window.addEventListener('online', refreshWhenActive);
    document.addEventListener('visibilitychange', refreshWhenActive);

    return () => {
      disposed = true;
      clearOverviewTimer();
      window.removeEventListener('focus', refreshWhenActive);
      window.removeEventListener('online', refreshWhenActive);
      document.removeEventListener('visibilitychange', refreshWhenActive);
    };
  }, [token, autoRefresh]);

  useEffect(() => {
    localStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        paymentQuery,
        paymentStatusFilter,
        paymentMethodFilter,
        paymentProviderFilter,
        dateRange,
        minAmount,
        maxAmount,
      })
    );
  }, [paymentQuery, paymentStatusFilter, paymentMethodFilter, paymentProviderFilter, dateRange, minAmount, maxAmount]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSessionExpired(false);
    setLoading(true);
    try {
      const data = await superAdminService.login(loginForm.email, loginForm.password);
      if (data?.mfaRequired) {
        setMfaError('');
        setMfaChallenge(data);
        return;
      }
      const nextToken = data.token;
      localStorage.setItem(STORAGE_KEY, nextToken);
      localStorage.setItem(STORAGE_USER_KEY, loginForm.email);
      setToken(nextToken);
      setSuperAdminUser(loginForm.email);
      showToast('Login realizado com sucesso.', 'success');
    } catch (err: any) {
      const message = err.message || 'Não foi possível autenticar agora.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async ({ code, trustDevice }: { code: string; trustDevice: boolean }) => {
    if (!mfaChallenge?.challengeToken || mfaLoading) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const data = await superAdminService.verifyMfaChallenge({
        challengeToken: mfaChallenge.challengeToken,
        code,
        trustDevice,
      });
      persistTrustedMfaDevice(data?.trustedDevice);
      const nextToken = data.token;
      localStorage.setItem(STORAGE_KEY, nextToken);
      localStorage.setItem(STORAGE_USER_KEY, loginForm.email);
      setToken(nextToken);
      setSuperAdminUser(loginForm.email);
      setMfaChallenge(null);
      showToast('Login realizado com sucesso.', 'success');
    } catch (err: any) {
      if (isMfaChallengeExpiredError(err)) {
        setError('');
        setMfaError(MFA_CHALLENGE_EXPIRED_MESSAGE);
        setMfaChallenge((current: any) => (current ? { ...current, expired: true } : current));
        return;
      }
      const message = err.message || 'Codigo invalido. Tente novamente.';
      setMfaError(message);
      showToast(message, 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setToken('');
    setOverview(null);
    setSuperAdminUser('');
  };

  const summary = overview?.summary;
  const stores = overview?.stores || [];
  const safeStores = Array.isArray(stores) ? stores : [];
  const payments = overview?.payments || [];
  const paymentEvents = overview?.paymentEvents || [];
  const rankings = overview?.rankings || { byRevenue: [], byOrders: [] };
  const paidRevenueValue = summary?.paidRevenue ? Number(summary.paidRevenue) : 0;
  const ordersRevenueTotal = summary?.ordersRevenueTotal ? Number(summary.ordersRevenueTotal) : 0;
  const ordersRevenueLast7Days = summary?.ordersRevenueLast7Days ? Number(summary.ordersRevenueLast7Days) : 0;
  const ordersRevenueLast30Days = summary?.ordersRevenueLast30Days ? Number(summary.ordersRevenueLast30Days) : 0;
  const churnedStores = summary?.churnedStores || 0;
  const reactivatedStores = summary?.reactivatedStores || 0;
  const totalOrders = summary?.totalOrders || 0;
  const ordersLast7Days = summary?.ordersLast7Days || 0;
  const ordersLast30Days = summary?.ordersLast30Days || 0;
  const paymentEventByPayment = useMemo(() => {
    const map = new Map();
    paymentEvents.forEach((event: any) => {
      const paymentId = event.payment?.id;
      if (!paymentId) return;
      if (!map.has(paymentId)) {
        map.set(paymentId, event);
      }
    });
    return map;
  }, [paymentEvents]);

  const storeNameById = useMemo(() => {
    const map = new Map();
    safeStores.forEach((store: any) => {
      map.set(store.id, store.name);
    });
    return map;
  }, [safeStores]);

  const broadcastStoreRouteOptions = useMemo(() => {
    return safeStores
      .map((store: any) => {
        const slug = String(store.slug || store.storeSlug || '').trim();
        if (!slug) return null;
        return {
          value: `/store/${slug}`,
          label: store.name || slug,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label), 'pt-BR'));
  }, [safeStores]);

  const resolveBroadcastTargetUrl = () => {
    const targetType = String(broadcastForm.targetType || 'none');
    if (targetType === 'app') return String(broadcastForm.route || '').trim();
    if (targetType === 'store') return String(broadcastForm.storeRoute || '').trim();
    if (targetType === 'custom') return String(broadcastForm.customRoute || '').trim();
    if (targetType === 'external') return String(broadcastForm.url || '').trim();
    return '';
  };

  const broadcastResolvedUrl = resolveBroadcastTargetUrl();
  const broadcastTitleLength = String(broadcastForm.title || '').length;
  const broadcastBodyLength = String(broadcastForm.body || '').length;

  const storeVipById = useMemo(() => {
    const map = new Map();
    safeStores.forEach((store: any) => {
      map.set(store.id, Boolean(store.settings?.planExempt));
    });
    return map;
  }, [safeStores]);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment: any) => {
      if (payment.status !== 'PAID') return;
      const date = payment.createdAt ? new Date(payment.createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = map.get(key) || 0;
      map.set(key, current + Number(payment.amount || 0));
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, total]) => ({
        month,
        total: Number(total.toFixed(2)),
      }));
  }, [payments]);

  const statusBadge = (status: string) => {
    if (status === 'PAID') return 'bg-emerald-100 text-emerald-700';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
    if (status === 'FAILED') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  const eventBadge = (status: string) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending') return 'bg-amber-100 text-amber-800';
    if (status === 'rejected' || status === 'cancelled') return 'bg-red-100 text-red-700';
    if (status === 'refunded' || status === 'charged_back') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  };

  const filteredPayments = useMemo(() => {
    const normalized = paymentQuery.trim().toLowerCase();
    const now = Date.now();
    const rangeDays = dateRange === 'all' ? null : Number(dateRange);
    const minValue = minAmount ? Number(minAmount) : null;
    const maxValue = maxAmount ? Number(maxAmount) : null;
    return payments.filter((payment: any) => {
      if (paymentStatusFilter !== 'all' && payment.status !== paymentStatusFilter) return false;
      if (paymentMethodFilter !== 'all' && payment.method !== paymentMethodFilter) return false;
      if (paymentProviderFilter !== 'all' && payment.provider !== paymentProviderFilter) return false;
      if (rangeDays !== null) {
        const created = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
        if (!Number.isFinite(created)) return false;
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (diffDays > rangeDays) return false;
      }
      const amountValue = Number(payment.amount || 0);
      if (minValue !== null && amountValue < minValue) return false;
      if (maxValue !== null && amountValue > maxValue) return false;
      if (!normalized) return true;
      const haystack = [
        payment.store?.name,
        payment.store?.slug,
        payment.user?.email,
        payment.id,
        payment.providerId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [payments, paymentQuery, paymentStatusFilter, paymentMethodFilter, paymentProviderFilter, dateRange, minAmount, maxAmount]);

  useEffect(() => {
    setPaymentsPage(1);
  }, [paymentQuery, paymentStatusFilter, paymentMethodFilter, paymentProviderFilter, dateRange, minAmount, maxAmount]);

  useEffect(() => {
    setEventsPage(1);
  }, [eventStoreFilter, eventStatusFilter]);

  useEffect(() => {
    localStorage.setItem(
      EVENTS_FILTERS_KEY,
      JSON.stringify({ eventStatusFilter })
    );
  }, [eventStatusFilter]);

  const paginatedPayments = useMemo(() => {
    const start = (paymentsPage - 1) * PAYMENTS_PER_PAGE;
    return filteredPayments.slice(start, start + PAYMENTS_PER_PAGE);
  }, [filteredPayments, paymentsPage]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE));
  const accessLogsTotalPages = Math.max(1, Math.ceil(accessLogsTotal / 25));

  const filteredEvents = useMemo(() => {
    return eventResults;
  }, [eventResults]);

  const filteredTotal = useMemo(() => {
    return filteredPayments.reduce((acc: number, payment: any) => acc + Number(payment.amount || 0), 0);
  }, [filteredPayments]);

  const periodTotal = useMemo(() => {
    const now = Date.now();
    const rangeDays = dateRange === 'all' ? null : Number(dateRange);
    return payments.reduce((acc: number, payment: any) => {
      if (payment.status !== 'PAID') return acc;
      if (rangeDays === null) return acc + Number(payment.amount || 0);
      const created = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
      if (!Number.isFinite(created)) return acc;
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      if (diffDays > rangeDays) return acc;
      return acc + Number(payment.amount || 0);
    }, 0);
  }, [payments, dateRange]);

  const storeHealth = useMemo(() => {
    const counts = {
      active: 0,
      trial: 0,
      expiring: 0,
      expired: 0,
      suspended: 0,
      pending: 0,
      open: 0,
      closed: 0,
      vip: 0,
    };

    safeStores.forEach((store: any) => {
      if (store.open) counts.open += 1;
      else counts.closed += 1;
      if (store.settings?.planExempt) counts.vip += 1;
      const status = store.subscription?.status || 'PENDING';
      if (status === 'ACTIVE') counts.active += 1;
      else if (status === 'TRIAL') {
        counts.active += 1;
        counts.trial += 1;
      } else if (status === 'EXPIRING') counts.expiring += 1;
      else if (status === 'EXPIRED') counts.expired += 1;
      else if (status === 'SUSPENDED') counts.suspended += 1;
      else counts.pending += 1;
    });

    return counts;
  }, [safeStores]);

  const filteredStores = useMemo(() => {
    if (vipFilter === 'vip') {
      return safeStores.filter((store: any) => Boolean(store.settings?.planExempt));
    }
    if (vipFilter === 'nonvip') {
      return safeStores.filter((store: any) => !store.settings?.planExempt);
    }
    return safeStores;
  }, [safeStores, vipFilter]);

  const expiringSoon = useMemo(() => {
    return safeStores
      .map((store: any) => {
        const endDate = store.subscription?.endDate;
        if (!endDate) return null;
        const daysLeft = daysUntil(endDate);
        if (typeof daysLeft !== 'number' || daysLeft < 0 || daysLeft > 7) return null;
        return {
          id: store.id,
          name: store.name,
          slug: store.slug,
          daysLeft,
          endDate,
          status: store.subscription?.status || 'PENDING',
          logoUrl: store.settings?.logoUrl || null,
          open: Boolean(store.open),
          planExempt: Boolean(store.settings?.planExempt),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
      .slice(0, 6);
  }, [safeStores]);

  const recentStores = useMemo(() => {
    const now = Date.now();
    return safeStores.filter((store: any) => {
      const createdAt = store.createdAt ? new Date(store.createdAt).getTime() : 0;
      if (!Number.isFinite(createdAt)) return false;
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }).length;
  }, [safeStores]);

  const revenuePerActive = useMemo(() => {
    if (!storeHealth.active) return 0;
    return paidRevenueValue / storeHealth.active;
  }, [paidRevenueValue, storeHealth.active]);

  const ordersPerStore = useMemo(() => {
    if (!summary?.totalStores) return 0;
    return totalOrders / summary.totalStores;
  }, [summary?.totalStores, totalOrders]);

  const avgTicketGlobal = useMemo(() => {
    if (!totalOrders) return 0;
    return ordersRevenueTotal / totalOrders;
  }, [ordersRevenueTotal, totalOrders]);

  const activeRate = useMemo(() => {
    if (!summary?.totalStores) return 0;
    return (summary.activeSubscriptions / summary.totalStores) * 100;
  }, [summary?.totalStores, summary?.activeSubscriptions]);

  const overviewUpdatedLabel = useMemo(() => {
    if (overviewRefreshing) return 'Atualizando...';
    if (!overviewLastUpdatedAt) return 'Atualizado agora';
    const date = new Date(overviewLastUpdatedAt);
    if (Number.isNaN(date.getTime())) return 'Atualizado agora';
    return `Atualizado ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }, [overviewLastUpdatedAt, overviewRefreshing]);

  const handleReprocess = async (paymentId: string, providerId?: string) => {
    if (!token) return;
    setReprocessingId(paymentId);
    try {
      await superAdminService.reprocessPayment(token, paymentId, providerId);
      await loadOverview(token);
      showToast('Pagamento reprocessado com sucesso.', 'success');
    } catch (err: any) {
      const message = err.message || 'Não foi possível reprocessar agora.';
      showToast(message, 'error');
    } finally {
      setReprocessingId('');
    }
  };

  const handleBroadcastPush = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || broadcastSending) return;
    if (!String(broadcastForm.title || '').trim() || !String(broadcastForm.body || '').trim()) {
      showToast('Informe título e mensagem para o disparo.', 'warning');
      return;
    }
    const targetType = String(broadcastForm.targetType || 'none');
    const targetUrl = resolveBroadcastTargetUrl();
    if (targetType === 'external' && !/^https?:\/\//i.test(targetUrl)) {
      showToast('Informe uma URL externa começando com http:// ou https://.', 'warning');
      return;
    }
    if ((targetType === 'app' || targetType === 'store' || targetType === 'custom') && !targetUrl) {
      showToast('Escolha uma rota do app ou deixe como sem direcionamento.', 'warning');
      return;
    }
    if (targetType === 'custom' && !/^\/[A-Za-z0-9/_?=&%#.,:+-]*$/.test(targetUrl)) {
      showToast('A rota interna personalizada precisa começar com / e ser uma rota válida do app.', 'warning');
      return;
    }
    setBroadcastSending(true);
    try {
      const result = await superAdminService.broadcastPush(token, {
        title: String(broadcastForm.title || '').trim(),
        body: String(broadcastForm.body || '').trim(),
        url: targetUrl,
        topic: String(broadcastForm.topic || 'janocaminho_global').trim(),
        limit: Number(broadcastForm.limit || 1500),
      });
      setBroadcastLastResult(result || null);
      showToast(`Push disparado: ${result?.sent || 0} envios concluídos.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível disparar o push global.', 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  const loadEvents = async (page = eventsPage, storeId = eventStoreFilter) => {
    if (!token) return;
    setEventsLoading(true);
    try {
      const offset = (page - 1) * EVENTS_PAGE_SIZE;
      const storeParam = storeId === 'all' ? undefined : storeId;
      const data = await superAdminService.fetchPaymentEvents(
        token,
        undefined,
        EVENTS_PAGE_SIZE,
        offset,
        storeParam
      );
      const filtered = (data || []).filter((event: any) => {
        if (eventStatusFilter === 'all') return true;
        return event.status === eventStatusFilter;
      });
      setEventResults(filtered);
    } catch (err: any) {
      showToast(err.message || 'Não foi possível carregar os eventos.', 'error');
    } finally {
      setEventsLoading(false);
    }
  };

  const handleVipToggle = async (store: any, nextValue: boolean) => {
    if (!token) return;
    try {
      const response = await superAdminService.updatePlanExempt(token, store.id, {
        planExempt: nextValue,
        planExemptLabel: 'Isento de plano',
      });
      await loadOverview(token);
      if (!nextValue) {
        showToast(
          response?.shouldOpenRenewal
            ? 'VIP removido. Loja precisa renovar o plano.'
            : 'VIP removido. Loja voltou ao último plano.',
          'success'
        );
      } else {
        showToast('Loja marcada como isenta de plano.', 'success');
      }
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível atualizar o VIP.', 'error');
    }
  };

  useEffect(() => {
    if (!token) return;
    loadEvents(eventsPage, eventStoreFilter);
  }, [token, eventsPage, eventStoreFilter, eventStatusFilter]);

  useEffect(() => {
    if (!token || !autoRefresh) return;
    const interval = window.setInterval(() => loadEvents(eventsPage, eventStoreFilter), 15000);
    return () => window.clearInterval(interval);
  }, [token, autoRefresh, eventsPage, eventStoreFilter]);

  const loadAccessLogs = async (page = accessLogsPage) => {
    if (!token) return;
    setAccessLogsLoading(true);
    try {
      const offset = (page - 1) * 25;
      const filters: Record<string, string> = {
        limit: '25',
        offset: String(offset),
      };
      if (accessLogQuery) filters.search = accessLogQuery;
      if (accessLogRole !== 'all') filters.role = accessLogRole;
      if (accessLogMethod !== 'all') filters.method = accessLogMethod;
      if (accessLogStatus !== 'all') filters.status = accessLogStatus;
      if (accessLogStore !== 'all') filters.storeId = accessLogStore;
      const data = await superAdminService.fetchAccessLogs(token, filters);
      setAccessLogs(data?.data || []);
      setAccessLogsTotal(data?.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Não foi possível carregar os logs.', 'error');
    } finally {
      setAccessLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadAccessLogs(accessLogsPage);
  }, [token, accessLogsPage, accessLogQuery, accessLogRole, accessLogMethod, accessLogStatus, accessLogStore]);

  useEffect(() => {
    if (!token || !autoRefresh) return;
    const interval = window.setInterval(() => loadAccessLogs(accessLogsPage), 20000);
    return () => window.clearInterval(interval);
  }, [token, autoRefresh, accessLogsPage, accessLogQuery, accessLogRole, accessLogMethod, accessLogStatus, accessLogStore]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (profileMenuRef.current && target && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    setAccessLogsPage(1);
  }, [accessLogQuery, accessLogRole, accessLogMethod, accessLogStatus, accessLogStore]);

  const exportPaymentsCsv = () => {
    const headers = [
      { key: 'date', label: 'Data' },
      { key: 'store', label: 'Loja' },
      { key: 'slug', label: 'Slug' },
      { key: 'method', label: 'Metodo' },
      { key: 'status', label: 'Status' },
      { key: 'provider', label: 'Provider' },
      { key: 'providerId', label: 'Provider ID' },
      { key: 'amount', label: 'Valor' },
    ];

    const rows = filteredPayments.map((payment: any) => ({
      date: payment.createdAt ? new Date(payment.createdAt).toLocaleString('pt-BR') : '-',
      store: payment.store?.name || '-',
      slug: payment.store?.slug || '-',
      method: payment.method,
      status: payment.status,
      provider: payment.provider || '-',
      providerId: payment.providerId || '-',
      amount: Number(payment.amount || 0).toFixed(2),
    }));

    exportToCsv('pagamentos', headers, rows);
  };

  const exportEventsCsv = () => {
    const headers = [
      { key: 'date', label: 'Data' },
      { key: 'paymentId', label: 'Pagamento' },
      { key: 'status', label: 'Status' },
      { key: 'provider', label: 'Provider' },
    ];

    const rows = filteredEvents.map((event: any) => ({
      date: event.createdAt ? new Date(event.createdAt).toLocaleString('pt-BR') : '-',
      paymentId: event.payment?.id || '-',
      status: event.status,
      provider: event.provider,
    }));

    exportToCsv('eventos-pagamento', headers, rows);
  };

  const resetFilters = () => {
    setPaymentQuery('');
    setPaymentStatusFilter('all');
    setPaymentMethodFilter('all');
    setPaymentProviderFilter('all');
    setDateRange('30');
    setMinAmount('');
    setMaxAmount('');
  };

  const paidRevenue = useMemo(() => {
    return summary?.paidRevenue ? formatCurrency(summary.paidRevenue) : formatCurrency(0);
  }, [summary?.paidRevenue]);

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-4 login-page-enter">
          <div className="text-center space-y-2.5">
            <div className="mx-auto grid h-[4.75rem] w-[4.75rem] place-items-center overflow-hidden rounded-full border-[4px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)] ring-1 ring-[#336886]/12">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
            </div>
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-slate-500">Acesso da plataforma</p>
            <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.02em]">Login Super Admin</h2>
          </div>

          <div className="auth-segment">
            <button type="button" onClick={() => window.location.assign('/admin')} className="auth-segment-btn">Loja</button>
            <button type="button" onClick={() => window.location.assign('/motoboy/login')} className="auth-segment-btn">Entregador</button>
          </div>
          <p className="text-center text-[11px] font-semibold text-slate-500">Acesso Super Admin restrito</p>

          <form onSubmit={handleLogin} autoComplete="on" className="login-card-premium p-6 sm:p-7 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              <ShieldCheck size={14} weight="duotone" />
              Administração da plataforma
            </div>

            {sessionExpired && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl">
                <WarningCircle size={14} weight="fill" />
                Sessão expirada. Entre novamente.
              </div>
            )}

            <div className="floating-field">
              <input
                id="superadmin-user"
                name="username"
                autoComplete="username"
                type="text"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="floating-input"
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
              <label htmlFor="superadmin-user" className="floating-label">Usuário</label>
            </div>
            <div className="floating-field">
              <input
                id="superadmin-password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="floating-input"
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
              />
              <label htmlFor="superadmin-password" className="floating-label">Senha</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <Eye size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
              </button>
            </div>

            <label className="premium-check-wrap">
              <button
                type="button"
                onClick={() => {
                  setRememberDevice((prev) => {
                    const next = !prev;
                    try {
                      localStorage.setItem('auth:remember-superadmin', String(next));
                    } catch {
                      // no-op
                    }
                    return next;
                  });
                }}
                className={`premium-check-btn ${rememberDevice ? 'checked' : ''}`}
                aria-label={rememberDevice ? 'Desativar lembrar acesso' : 'Ativar lembrar acesso'}
              >
                <Check size={14} weight="bold" />
              </button>
              <span className="text-sm font-semibold text-slate-600">Lembrar acesso neste dispositivo</span>
            </label>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600">
                <WarningCircle size={14} weight="fill" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !loginForm.email || !loginForm.password}
              className="w-full h-12 rounded-xl border-0 bg-[#0d4f66] text-white font-black shadow-[0_16px_28px_-18px_rgba(13,79,102,0.85)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Acessar administração'}
            </button>
          </form>
        </div>
        <MfaChallengeModal
          open={Boolean(mfaChallenge)}
          challenge={mfaChallenge}
          audience="superadmin"
          loading={mfaLoading}
          error={mfaError}
          expired={Boolean(mfaChallenge?.expired)}
          onCancel={() => setMfaChallenge(null)}
          onRestart={() => {
            setMfaChallenge(null);
            setMfaError('');
            setError('');
          }}
          onVerify={handleMfaVerify}
        />
      </AuthLayout>
    );
  }

  return (
    <AdminLayout contextLabel="Plataforma" showHeader={false}>
      <div className="relative z-20 overflow-visible rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-4 py-4 sm:px-6 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute -right-20 -top-16 w-64 h-64 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute right-24 -bottom-20 w-56 h-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
            <img src={platformLogo} alt="Já no Caminho" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Super Admin</h1>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white">
                Master Console
              </span>
            </div>
            <p className="text-sm text-slate-500">Visão executiva da plataforma</p>
          </div>
        </div>
        <div className="relative flex items-center gap-2" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => { window.location.href = '/superadmin/home-config'; }}
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/88 px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-[#336886]/25 hover:text-[#336886] sm:inline-flex"
          >
            <ImageSquare size={15} weight="duotone" />
            Configuração da Home
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/superadmin/email-templates'; }}
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/88 px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-[#336886]/25 hover:text-[#336886] xl:inline-flex"
          >
            <EnvelopeSimple size={15} weight="duotone" />
            E-mails
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/superadmin/condominiums'; }}
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/88 px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-[#336886]/25 hover:text-[#336886] sm:inline-flex"
          >
            <Buildings size={15} weight="duotone" />
            Condomínios
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/superadmin/destinations'; }}
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/88 px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-[#336886]/25 hover:text-[#336886] lg:inline-flex"
          >
            <Compass size={15} weight="duotone" />
            Destinos
          </button>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-2 py-1.5 shadow-sm transition hover:border-slate-300 hover:bg-white"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            title="Abrir menu de perfil"
          >
            <div className="h-8 w-8 rounded-full bg-slate-950 text-white text-xs font-black flex items-center justify-center shadow-sm">
              {superAdminUser ? superAdminUser.slice(0, 2).toUpperCase() : 'SA'}
            </div>
            <div className="hidden sm:block text-left text-xs leading-tight">
              <div className="max-w-[180px] truncate font-black text-slate-900">{superAdminUser || 'Admin Já no Caminho'}</div>
              <div className="font-semibold text-slate-400">{getSuperAdminRoleLabel('SUPER_ADMIN')}</div>
            </div>
            <CaretDown size={14} className={`text-slate-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[260px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_40px_-24px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-600">Auto-refresh</span>
                <button
                  type="button"
                  onClick={() => setAutoRefresh((prev) => !prev)}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-brand-primary' : 'bg-slate-300'
                  }`}
                  title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                >
                  <span
                    className={`h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  window.location.href = '/superadmin/home-config';
                }}
                className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ImageSquare size={16} weight="duotone" />
                Configuração da Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  window.location.href = '/superadmin/email-templates';
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <EnvelopeSimple size={16} weight="duotone" />
                E-mails e templates
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  window.location.href = '/superadmin/condominiums';
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Buildings size={16} weight="duotone" />
                Condomínios e acessos
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  window.location.href = '/superadmin/destinations';
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Compass size={16} weight="duotone" />
                Destinos turísticos
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  loadOverview(token);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ArrowClockwise size={16} weight="duotone" />
                Atualizar dados
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setMfaPanelOpen(true);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ShieldCheck size={16} weight="duotone" />
                MFA e dispositivos
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLogout();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-[#0d1f35]/97 backdrop-blur border-b border-white/8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]">
        {/* Mobile segmented rail */}
        <div className="sm:hidden">
          <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-1.5">
            {SUPER_ADMIN_SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (id === 'destinations') {
                      window.location.href = '/superadmin/destinations';
                      return;
                    }
                    setActiveSection(id);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-[11px] font-black transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-white text-[#153A4C] shadow-[0_12px_28px_-20px_rgba(0,0,0,0.5)]'
                      : 'text-white/58 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon size={14} weight={isActive ? 'fill' : 'duotone'} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop nav com grupos */}
        <div className="hidden sm:flex items-center gap-4 overflow-x-auto no-scrollbar">
          {(['operacional', 'plataforma', 'tecnico'] as const).map((group, gi) => {
            const items = SUPER_ADMIN_SECTIONS.filter(s => s.group === group);
            const groupLabel = group === 'operacional' ? 'Operacional' : group === 'plataforma' ? 'Plataforma' : 'Técnico';
            return (
              <div key={group} className={`flex items-center gap-1 ${gi > 0 ? 'border-l border-white/10 pl-4' : ''}`}>
                <span className="mr-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 hidden lg:block">{groupLabel}</span>
                {items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (id === 'destinations') {
                          window.location.href = '/superadmin/destinations';
                          return;
                        }
                        setActiveSection(id);
                      }}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-all ${
                        isActive
                          ? 'bg-[#336886] text-white shadow-[0_4px_12px_-4px_rgba(51,104,134,0.6)]'
                          : 'text-white/55 hover:text-white hover:bg-white/8'
                      }`}
                    >
                      <Icon size={13} weight={isActive ? 'fill' : 'duotone'} />
                      {label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3.5 bg-gradient-to-r ${(
          SECTION_META[activeSection] || SECTION_META.executive
        ).tone}`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
          {(SECTION_META[activeSection] || SECTION_META.executive).title}
        </p>
        <p className="text-sm font-semibold opacity-95 mt-0.5">{(SECTION_META[activeSection] || SECTION_META.executive).description}</p>
      </div>

      {summary && activeSection === 'executive' && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white">
            <p className="text-xs uppercase text-emerald-600 font-semibold">Ativação da base</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{activeRate.toFixed(1)}%</p>
            <p className="text-xs text-emerald-700/70 mt-1">Lojas ativas vs total</p>
          </div>
          <div className="rounded-2xl p-4 border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white">
            <p className="text-xs uppercase text-slate-500 font-semibold">Ticket medio global</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(avgTicketGlobal)}</p>
            <p className="text-xs text-slate-500 mt-1">Receita por pedido</p>
          </div>
          <div className="rounded-2xl p-4 border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white">
            <p className="text-xs uppercase text-blue-600 font-semibold">Receita por loja ativa</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{formatCurrency(revenuePerActive)}</p>
            <p className="text-xs text-blue-700/70 mt-1">Eficiência da base ativa</p>
          </div>
        </div>
      )}

        {loading && <PlatformRobotLoader logoSrc={platformLogo} />}

        {overviewConnectionMessage && summary && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <WarningCircle size={16} weight="duotone" />
            <span>{overviewConnectionMessage}</span>
          </div>
        )}

        {summary && activeSection === 'executive' && (
          <div id="executive" className="grid lg:grid-cols-[2.1fr,1fr] gap-4">
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 shadow-lg">
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-brand-primary/20 blur-3xl" />
              <div className="absolute right-16 bottom-0 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl" />
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Panorama da plataforma</p>
                    <h2 className="text-2xl font-black">Resumo executivo</h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                    {overviewUpdatedLabel}
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <p className="text-xs text-slate-300 uppercase">Receita confirmada</p>
                    <p className="text-2xl font-black mt-1">{paidRevenue}</p>
                    <p className="text-xs text-slate-300 mt-2">Periodo: {formatCurrency(periodTotal)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <p className="text-xs text-slate-300 uppercase">Receita recorrente estimada (mês)</p>
                    <p className="text-2xl font-black mt-1">{formatCurrency(summary.mrrProjected || 0)}</p>
                    <p className="text-xs text-slate-300 mt-2">
                      {summary.monthlyPlans} mensal · {summary.yearlyPlans} anual
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <p className="text-xs text-slate-300 uppercase">Pedidos totais</p>
                    <p className="text-2xl font-black mt-1">{totalOrders}</p>
                    <p className="text-xs text-slate-300 mt-2">
                      +{ordersLast7Days} nos ultimos 7 dias
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-200">
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    {summary.totalStores} lojas criadas
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-emerald-100">
                    {storeHealth.vip} lojas VIP
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    {storeHealth.open} abertas · {storeHealth.closed} fechadas
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    {formatCurrency(revenuePerActive)} por loja ativa
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    {formatCurrency(ordersRevenueLast30Days)} receita pedidos (30d)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    {recentStores} novas lojas na semana
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Saude da base</p>
                <h3 className="text-lg font-bold text-slate-800">Lojas em operação</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700 uppercase">Ativas</p>
                  <p className="text-xl font-black text-emerald-700">{storeHealth.active}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs text-blue-700 uppercase">Trial</p>
                  <p className="text-xl font-black text-blue-700">{storeHealth.trial}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700 uppercase">Expirando</p>
                  <p className="text-xl font-black text-amber-700">{storeHealth.expiring}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="text-xs text-red-700 uppercase">Expiradas</p>
                  <p className="text-xl font-black text-red-700">{storeHealth.expired}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700 uppercase">VIP</p>
                  <p className="text-xl font-black text-emerald-700">{storeHealth.vip}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs uppercase text-slate-400">Pagamentos</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-600">Pagos</span>
                  <span className="font-bold text-emerald-600">{summary.paidPayments}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-slate-600">Pendentes</span>
                  <span className="font-bold text-amber-600">{summary.pendingPayments}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs uppercase text-slate-400">Churn & retomadas</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-600">Churn (exp/susp)</span>
                  <span className="font-bold text-red-600">{churnedStores}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-slate-600">Reativadas (30d)</span>
                  <span className="font-bold text-emerald-600">{reactivatedStores}</span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Expirando em ate 7 dias</p>
                {expiringSoon.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-2">Nenhuma loja em risco imediato.</p>
                ) : (
                  <div className="mt-2 grid gap-2">
                    {expiringSoon.map((store: any) => (
                      <div
                        key={store.id}
                        className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.35)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AdaptiveAvatar
                              src={store.logoUrl ? resolveAssetUrl(store.logoUrl) : ''}
                              alt={store.name || 'Loja'}
                              fallbackText={String(store.name || 'L').slice(0, 2)}
                              sizeClassName="h-11 w-11"
                              containerClassName="bg-white text-slate-800 border border-slate-200 shadow-sm"
                              imageClassName="object-cover"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{store.name}</p>
                              <p className="text-xs text-slate-400 truncate">{store.slug}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                            {store.daysLeft}d
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle(store.status)}`}>
                            {store.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              store.open ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {store.open ? 'Aberta' : 'Fechada'}
                          </span>
                          {store.planExempt ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              VIP
                            </span>
                          ) : null}
                          <span className="ml-auto text-[11px] text-slate-500">
                            vence em {formatDate(store.endDate)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {summary && activeSection === 'rankings' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Pedidos 7 dias</p>
                <ChartBar size={18} weight="duotone" className="text-brand-primary" />
              </div>
              <p className="text-2xl font-black text-slate-800">{ordersLast7Days}</p>
              <p className="text-xs text-slate-400 mt-1">Ultimos 30 dias: {ordersLast30Days}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Lojas ativas</p>
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{summary.activeSubscriptions}</p>
              <p className="text-xs text-slate-400 mt-1">Ativação: {activeRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-emerald-600 font-semibold">Lojas VIP</p>
                <CheckCircle size={18} weight="duotone" className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700">{storeHealth.vip}</p>
              <p className="text-xs text-emerald-600/70 mt-1">Isentas de plano</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Lojas expirando</p>
                <WarningCircle size={18} weight="duotone" className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-600">{summary.expiringSubscriptions}</p>
              <p className="text-xs text-slate-400 mt-1">Em risco: {expiringSoon.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Receita por ativa</p>
                <CurrencyDollar size={18} weight="duotone" className="text-brand-primary" />
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(revenuePerActive)}</p>
              <p className="text-xs text-slate-400 mt-1">Media por loja ativa</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Receita pedidos</p>
                <CurrencyDollar size={18} weight="duotone" className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(ordersRevenueTotal)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {formatCurrency(ordersRevenueLast7Days)} (7d) · {formatCurrency(ordersRevenueLast30Days)} (30d)
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Pedidos por loja</p>
                <ChartBar size={18} weight="duotone" className="text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-800">{ordersPerStore.toFixed(1)}</p>
              <p className="text-xs text-slate-400 mt-1">Media global por loja</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Ticket medio global</p>
                <CurrencyDollar size={18} weight="duotone" className="text-slate-600" />
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(avgTicketGlobal)}</p>
              <p className="text-xs text-slate-400 mt-1">Receita / pedidos</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Saude da base</p>
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-800">{activeRate.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1">Lojas ativas vs total</p>
            </div>
          </div>
        )}

        {summary && activeSection === 'rankings' && (
          <div id="rankings" className="bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendUp size={18} weight="duotone" className="text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Rankings da plataforma</h3>
              </div>
              <button
                onClick={() => toggleSection('rankings')}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <CaretRight weight="bold"
                  size={14}
                  className={`transition-transform ${sectionsOpen.rankings ? 'rotate-90' : ''}`}
                />
                {sectionsOpen.rankings ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {sectionsOpen.rankings ? (
              <div className="grid lg:grid-cols-2 gap-4 mt-4">
                <div className="bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendUp size={18} weight="duotone" className="text-emerald-600" />
                      <h3 className="text-lg font-bold text-slate-800">Top lojas por receita</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {rankings.byRevenue?.length ? (
                      rankings.byRevenue.map((store: any, index: number) => (
                        <div key={store.id} className="flex items-center justify-between text-sm rounded-xl border border-emerald-100 bg-white px-3 py-2">
                          <div>
                            <p className="font-semibold text-slate-700">
                              {index + 1}. {store.name}
                              {store.isVip && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                                  VIP
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">{store.slug}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600">{formatCurrency(store.totalRevenue || 0)}</p>
                            <p className="text-xs text-slate-400">{store.totalOrders || 0} pedidos</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Sem dados suficientes.</p>
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 via-white to-white border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ChartBar size={18} weight="duotone" className="text-blue-600" />
                      <h3 className="text-lg font-bold text-slate-800">Top lojas por pedidos</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {rankings.byOrders?.length ? (
                      rankings.byOrders.map((store: any, index: number) => (
                        <div key={store.id} className="flex items-center justify-between text-sm rounded-xl border border-blue-100 bg-white px-3 py-2">
                          <div>
                            <p className="font-semibold text-slate-700">
                              {index + 1}. {store.name}
                              {store.isVip && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                                  VIP
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">{store.slug}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-700">{store.totalOrders || 0} pedidos</p>
                            <p className="text-xs text-slate-400">{formatCurrency(store.totalRevenue || 0)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Sem dados suficientes.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 mt-3">Rankings ocultos.</div>
            )}
          </div>
        )}

        {activeSection === 'payments' && (
          <>
            <div className="bg-gradient-to-br from-blue-50 via-white to-white border border-blue-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ChartBar size={20} weight="duotone" className="text-blue-700" />
                  <h2 className="text-lg font-bold text-slate-800">Receita por mês</h2>
                </div>
                <button
                  onClick={() => toggleSection('charts')}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                >
                  <CaretRight weight="bold"
                    size={14}
                    className={`transition-transform ${sectionsOpen.charts ? 'rotate-90' : ''}`}
                  />
                  {sectionsOpen.charts ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {sectionsOpen.charts ? (
                revenueByMonth.length === 0 ? (
                  <div className="text-sm text-slate-500">Nenhuma receita paga registrada.</div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByMonth}>
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : (
                <div className="text-sm text-slate-500">Grafico oculto.</div>
              )}
            </div>

            <div className="bg-gradient-to-r from-amber-50 via-white to-white border border-amber-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-amber-900">
                Receita paga no periodo selecionado: <span className="font-semibold">{formatCurrency(periodTotal)}</span>
              </p>
            </div>
          </>
        )}

        {activeSection === 'push' && (
          <>
          <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] text-white shadow-[0_16px_34px_-24px_rgba(21,58,76,0.65)]">
                <Megaphone size={22} weight="duotone" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Comunicação</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">Push do app</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Crie avisos globais, aprove promoções de lojas e acompanhe o histórico sem misturar os fluxos.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-1.5">
              {[
                { id: 'broadcast', label: 'Criar', count: null },
                { id: 'review', label: 'Aprovar', count: pendingPushes.length },
                { id: 'history', label: 'Histórico', count: pushHistory.length },
              ].map((item) => {
                const selected = pushPanel === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPushPanel(item.id as any)}
                    className={`min-w-0 rounded-xl px-2.5 py-2.5 text-center text-xs font-black transition active:scale-[0.98] ${
                      selected
                        ? 'bg-white text-[#153A4C] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] ring-1 ring-[#336886]/10'
                        : 'text-slate-500 hover:bg-white/65'
                    }`}
                  >
                    <span className="block truncate">{item.label}</span>
                    {item.count !== null ? (
                      <span className={`mt-0.5 block text-[10px] ${selected ? 'text-[#336886]' : 'text-slate-400'}`}>
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {pushPanel === 'broadcast' && (
          <FormSection
            title="Criar push"
            variant="primary"
            className="bg-gradient-to-br from-cyan-50/70 via-white to-white border-cyan-100"
            contentClassName="space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-700">
              <Megaphone size={18} weight="duotone" className="text-cyan-600" />
              <p className="text-sm">
                Envie uma notificação para todos os aplicativos ativos (audiência global).
              </p>
            </div>
            <form onSubmit={handleBroadcastPush} className="grid gap-3">
              <label className="grid gap-1">
                <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span>Título</span>
                  <span className={broadcastTitleLength > BROADCAST_TITLE_RECOMMENDED_MAX ? 'text-amber-600' : 'text-slate-400'}>
                    {broadcastTitleLength}/{BROADCAST_TITLE_RECOMMENDED_MAX}
                  </span>
                </span>
                <input
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  placeholder="Ex: Promoção Já no Caminho"
                  maxLength={70}
                />
              </label>
              <label className="grid gap-1">
                <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span>Mensagem</span>
                  <span className={broadcastBodyLength > BROADCAST_BODY_MAX ? 'text-amber-600' : 'text-slate-400'}>
                    {broadcastBodyLength}/{BROADCAST_BODY_MAX}
                  </span>
                </span>
                <textarea
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm((prev) => ({ ...prev, body: e.target.value }))}
                  className="min-h-[88px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  placeholder="Ex: Hoje frete grátis nas lojas parceiras."
                  maxLength={BROADCAST_BODY_MAX}
                />
                <span className="text-[11px] font-medium text-slate-400">
                  O banner do celular usa um resumo automático de até {BROADCAST_BODY_RECOMMENDED_MAX} caracteres; a Central mostra a mensagem completa.
                </span>
              </label>
              <div className="grid min-w-0 gap-3 overflow-hidden rounded-2xl border border-cyan-100 bg-white/75 p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ação ao tocar</span>
                    <select
                      value={broadcastForm.targetType}
                      onChange={(e) => setBroadcastForm((prev) => ({ ...prev, targetType: e.target.value }))}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option value="none">Sem direcionamento</option>
                      <option value="app">Rota do app</option>
                      <option value="store">Vitrine de uma loja</option>
                      <option value="custom">Rota interna personalizada</option>
                      <option value="external">URL externa</option>
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Limite</span>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={broadcastForm.limit}
                      onChange={(e) => setBroadcastForm((prev) => ({ ...prev, limit: Number(e.target.value || 1500) }))}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                </div>
                {broadcastForm.targetType === 'app' && (
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tela do app</span>
                    <select
                      value={broadcastForm.route}
                      onChange={(e) => setBroadcastForm((prev) => ({ ...prev, route: e.target.value }))}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      {PUSH_APP_ROUTE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {broadcastForm.targetType === 'store' && (
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Loja / vitrine</span>
                    <select
                      value={broadcastForm.storeRoute}
                      onChange={(e) => setBroadcastForm((prev) => ({ ...prev, storeRoute: e.target.value }))}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="">Selecione uma loja</option>
                      {broadcastStoreRouteOptions.map((option: any) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {broadcastForm.targetType === 'custom' && (
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rota interna</span>
                    <input
                      value={broadcastForm.customRoute}
                      onChange={(e) => setBroadcastForm((prev) => ({ ...prev, customRoute: e.target.value }))}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      placeholder="/destinos/sao-francisco-xavier"
                    />
                  </label>
                )}
                {broadcastForm.targetType === 'external' && (
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">URL externa</span>
                    <input
                      value={broadcastForm.url}
                      onChange={(e) => setBroadcastForm((prev) => ({ ...prev, url: e.target.value }))}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      placeholder="https://wa.me/551239334979"
                    />
                  </label>
                )}
                <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Destino</span>
                  <span className="mt-0.5 block break-words font-black text-slate-700">
                    {broadcastResolvedUrl || 'Sem link: abre a Central de Notificações e mostra a mensagem completa.'}
                  </span>
                </div>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Preview no celular</span>
                <div className="grid min-w-0 gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-950 p-3 text-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)]">
                  <div className="min-w-0 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Banner do sistema</p>
                    <p className="mt-1 truncate text-sm font-black">{broadcastForm.title || 'Título do push'}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/78">{broadcastForm.body || 'A mensagem aparece resumida no banner do celular.'}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-white p-3 text-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]">Central de notificações</p>
                    <p className="mt-1 break-words text-sm font-black text-slate-950">{broadcastForm.title || 'Título do push'}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{broadcastForm.body || 'Aqui a mensagem completa fica legível.'}</p>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 -mx-1 flex flex-col items-stretch gap-2 rounded-2xl border border-white/80 bg-white/90 p-2 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
                <span className="text-xs text-slate-500">
                  Tópico: <span className="font-semibold text-slate-700">{broadcastForm.topic}</span>
                </span>
                <button
                  type="submit"
                  disabled={broadcastSending}
                  className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60 sm:w-auto"
                >
                  {broadcastSending ? 'Enviando...' : 'Enviar push'}
                </button>
              </div>
            </form>
            {broadcastLastResult ? (
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                Último disparo: enviados {Number(broadcastLastResult?.sent || 0)} de {Number(broadcastLastResult?.attempted || 0)}
                {broadcastLastResult?.deactivated ? ` · desativados ${Number(broadcastLastResult.deactivated)}` : ''}
              </div>
            ) : null}
          </FormSection>
          )}

          {/* Aprovação de Pushes Promocionais */}
          {pushPanel === 'review' && (
          <FormSection
            title="Aprovar promoções"
            variant="primary"
            className="bg-gradient-to-br from-violet-50/70 via-white to-white border-violet-100"
            contentClassName="space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">Pushes pagos aguardando sua aprovação para envio.</p>
              <button type="button" onClick={async () => {
                try { const data = await superAdminService.listPendingPromoPushes(token); setPendingPushes(Array.isArray(data) ? data : []); }
                catch { showToast('Erro ao carregar pushes.', 'error'); }
              }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Atualizar</button>
            </div>
            {pendingPushes.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum push aguardando aprovação.</p>
            ) : (
              <div className="space-y-3">
                {pendingPushes.map((push: any) => (
                  <div key={push.id} className="overflow-hidden rounded-2xl border border-[#336886]/20 bg-white shadow-[0_4px_20px_-8px_rgba(21,58,76,0.15)]">
                    <div className="h-[3px] bg-gradient-to-r from-[#153A4C] to-[#336886]" />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Logo da loja */}
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-sm">
                          {push.storeLogoUrl ? (
                            <img src={resolveAssetUrl(push.storeLogoUrl)} alt={push.storeName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-xs font-black text-white">
                              {String(push.storeName || 'L').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">{push.storeName}</p>
                              <p className="mt-0.5 text-sm font-black text-slate-900">{push.title}</p>
                              <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">{push.body}</p>
                            </div>
                            <span className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                              R$ {Number(push.priceAmount).toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400">{new Date(push.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        {rejectingId === push.id ? (
                          <div className="space-y-2">
                            <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da rejeição..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#336886]" />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setRejectingId(''); setRejectReason(''); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
                              <button type="button" disabled={!rejectReason.trim() || pushActionId === push.id} onClick={async () => {
                                setPushActionId(push.id);
                                try {
                                  await superAdminService.rejectPromoPush(token, push.id, rejectReason);
                                  setPendingPushes((prev) => prev.filter((p) => p.id !== push.id));
                                  setRejectingId(''); setRejectReason('');
                                  showToast('Push rejeitado.', 'success');
                                } catch { showToast('Erro ao rejeitar.', 'error'); }
                                finally { setPushActionId(''); }
                              }} className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white shadow-[0_4px_12px_-4px_rgba(239,68,68,0.5)] disabled:opacity-50">Confirmar rejeição</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setRejectingId(push.id); setRejectReason(''); }} className="inline-flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-black text-rose-600 transition hover:bg-rose-100">
                              Rejeitar
                            </button>
                            <button type="button" disabled={pushActionId === push.id} onClick={async () => {
                              setPushActionId(push.id);
                              try {
                                const result = await superAdminService.approvePromoPush(token, push.id);
                                setPendingPushes((prev) => prev.filter((p) => p.id !== push.id));
                                showToast(`Push aprovado e enviado para ${result.sentCount ?? '?'} usuários!`, 'success');
                              } catch (err: any) { showToast(err?.message || 'Erro ao aprovar.', 'error'); }
                              finally { setPushActionId(''); }
                            }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#153A4C,#336886)] py-2.5 text-xs font-black text-white shadow-[0_6px_16px_-6px_rgba(21,58,76,0.5)] disabled:opacity-50 transition hover:brightness-110">
                              <CheckCircle size={13} weight="fill" />
                              {pushActionId === push.id ? 'Enviando...' : 'Aprovar e Enviar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
          )}

          {pushPanel === 'history' && (
          <FormSection
            title="Histórico"
            variant="primary"
            className="bg-gradient-to-br from-slate-50/70 via-white to-white border-slate-200"
            contentClassName="space-y-3"
          >
            {pushHistory.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum push aprovado ou rejeitado ainda.</p>
            ) : (
              <div className="space-y-4">
                {/* Agrupar por loja */}
                {Object.values(
                  pushHistory.reduce((acc: Record<string, { storeName: string; storeLogoUrl?: string; pushes: any[] }>, push: any) => {
                    const key = push.storeId || push.storeName || 'unknown';
                    if (!acc[key]) acc[key] = { storeName: push.storeName || 'Loja', storeLogoUrl: push.storeLogoUrl, pushes: [] };
                    acc[key].pushes.push(push);
                    return acc;
                  }, {})
                ).map((group: any) => (
                  <div key={group.storeName} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {/* Header da loja */}
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {group.storeLogoUrl ? (
                          <img src={resolveAssetUrl(group.storeLogoUrl)} alt={group.storeName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-[10px] font-black text-white">
                            {String(group.storeName).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{group.storeName}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{group.pushes.length} push{group.pushes.length !== 1 ? 'es' : ''}</p>
                      </div>
                    </div>

                    {/* Pushes da loja */}
                    <div className="divide-y divide-slate-50">
                      {group.pushes.map((push: any) => {
                        const isSent = push.status === 'SENT';
                        return (
                          <div key={push.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-slate-900">{push.title}</p>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">{push.body}</p>
                                {push.rejectionReason && (
                                  <p className="mt-1 text-[11px] font-semibold text-rose-600">Motivo: {push.rejectionReason}</p>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  {isSent && push.sentCount != null && (
                                    <span className="text-[11px] font-black text-[#336886]">{push.sentCount} usuários</span>
                                  )}
                                  <span className="text-[10px] text-slate-400">{new Date(push.updatedAt).toLocaleString('pt-BR')}</span>
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${
                                isSent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-600'
                              }`}>
                                {isSent ? 'Enviado' : 'Rejeitado'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
          )}
          </>
        )}

        <CustomerSecuritySection
          token={token}
          isActive={activeSection === 'security'}
          showToast={showToast}
        />

        <FormSection
          title="Lojas e performance"
          variant="primary"
          className={`bg-gradient-to-br from-indigo-50/60 via-white to-white border-indigo-100 overflow-x-auto ${
            activeSection !== 'stores' ? 'hidden' : ''
          }`}
          contentClassName="space-y-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Storefront size={18} weight="duotone" className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Lojas e performance</h2>
            </div>
            <button
              onClick={() => toggleSection('stores')}
              className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <CaretRight weight="bold"
                size={14}
                className={`transition-transform ${sectionsOpen.stores ? 'rotate-90' : ''}`}
              />
              {sectionsOpen.stores ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {sectionsOpen.stores ? (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setVipFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    vipFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setVipFilter('vip')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    vipFilter === 'vip'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  VIP
                </button>
                <button
                  type="button"
                  onClick={() => setVipFilter('nonvip')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    vipFilter === 'nonvip'
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Sem VIP
                </button>
              </div>
              <table className="ds-table">
                <thead className="text-xs uppercase text-slate-500 border-b bg-slate-50">
                  <tr>
                    <th className="py-2 pr-4 text-left">Loja</th>
                    <th className="py-2 pr-4 text-left">Aquisição</th>
                    <th className="py-2 pr-4 text-left">Plano</th>
                    <th className="py-2 pr-4 text-left">VIP</th>
                    <th className="py-2 pr-4 text-left">Status</th>
                    <th className="py-2 pr-4 text-left">Criada</th>
                    <th className="py-2 pr-4 text-left">Expira</th>
                    <th className="py-2 pr-4 text-left">Dias</th>
                    <th className="py-2 pr-4 text-left">Pagamento</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.map((store: any) => {
                    const isVip = Boolean(store.settings?.planExempt);
                    const planName =
                      (isVip ? 'Isento de plano' : null) ||
                        store.subscription?.plan?.displayName ||
                      formatPlanName(store.subscription?.plan?.name || '-');
                    const planPrice = store.subscription?.plan?.price || 0;
                    const status = store.subscription?.status || 'PENDING';
                    const endDate = store.subscription?.endDate;
                    const remaining = daysUntil(endDate);
                    const paymentStatus = store.latestPayment?.status || '-';
                    return (
                      <tr key={store.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-slate-700">{store.name}</div>
                            {isVip && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{store.slug}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-sm text-slate-700">{getAttributionLabel(store)}</div>
                          <div className="text-xs text-slate-400">
                            {String(store?.settings?.acquisitionAttribution?.landingPath || '').trim() || '-'}
                          </div>
                        </td>
                        <td className="py-3 pr-4 capitalize">{planName}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            <button
                              type="button"
                              onClick={() => handleVipToggle(store, !isVip)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition shadow-sm flex items-center justify-center gap-2 ${
                                isVip
                                  ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                                  : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                              }`}
                            >
                              <span className="uppercase tracking-[0.2em] text-[10px]">{isVip ? 'VIP Ativo' : 'Ativar VIP'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyle(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{formatDate(store.createdAt)}</td>
                        <td className="py-3 pr-4">{formatDate(endDate)}</td>
                        <td className="py-3 pr-4">{remaining}</td>
                        <td className="py-3 pr-4">{paymentStatus}</td>
                        <td className="py-3 text-right font-semibold text-brand-primary">
                          {formatCurrency(planPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredStores.length === 0 && (
                <div className="text-center text-slate-500 py-8">Nenhuma loja encontrada.</div>
              )}
            </>
          ) : (
            <div className="text-sm text-slate-500">Tabela ocultada.</div>
          )}
        </FormSection>

        <FormSection
          title="Pagamentos recentes"
          variant="success"
          className={`bg-gradient-to-br from-emerald-50/40 via-white to-white border-emerald-100 overflow-x-auto ${
            activeSection !== 'payments' ? 'hidden' : ''
          }`}
          contentClassName="space-y-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Pagamentos recentes</h2>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => toggleSection('payments')}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <CaretRight weight="bold"
                  size={14}
                  className={`transition-transform ${sectionsOpen.payments ? 'rotate-90' : ''}`}
                />
                {sectionsOpen.payments ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <Trash size={14} weight="duotone" />
                Limpar filtros
              </button>
              <button
                onClick={exportPaymentsCsv}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <DownloadSimple size={14} weight="duotone" />
                Exportar CSV
              </button>
            </div>
          </div>
          {sectionsOpen.payments ? (
            <>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white">
              <MagnifyingGlass size={16} weight="bold" className="text-slate-400" />
              <input
                type="text"
                value={paymentQuery}
                onChange={(event) => setPaymentQuery(event.target.value)}
                placeholder="Buscar por loja, email, providerId..."
                className="ml-2 bg-transparent ds-focus-ring text-sm w-48"
              />
            </div>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring flex items-center gap-2"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="all">Todo período</option>
            </select>
            <input
              type="number"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="Min R$"
              className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            />
            <input
              type="number"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="Max R$"
              className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            />
            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Status: Todos</option>
              <option value="PAID">Pago</option>
              <option value="PENDING">Pendente</option>
              <option value="FAILED">Falhou</option>
            </select>
            <select
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Metodo: Todos</option>
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartão</option>
              <option value="BOLETO">Boleto</option>
            </select>
            <select
              value={paymentProviderFilter}
              onChange={(event) => setPaymentProviderFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Provider: Todos</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="MOCK">Mock</option>
            </select>
          </div>
          <table className="ds-table">
            <thead className="text-xs uppercase text-slate-400 border-b">
              <tr>
                <th className="py-2 pr-4 text-left">Data</th>
                <th className="py-2 pr-4 text-left">Loja</th>
                <th className="py-2 pr-4 text-left">Metodo</th>
                <th className="py-2 pr-4 text-left">Status</th>
                <th className="py-2 pr-4 text-left">Provider</th>
                <th className="py-2 text-right">Valor</th>
                <th className="py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedPayments.map((payment: any) => {
                const latestEvent = paymentEventByPayment.get(payment.id);
                const isOpen = openPaymentPayloadId === payment.id;
                return (
                  <React.Fragment key={payment.id}>
                    <tr>
                      <td className="py-3 pr-4">{formatDate(payment.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-700 flex items-center gap-2">
                          {payment.store?.name || '-'}
                          {storeVipById.get(payment.store?.id) && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{payment.store?.slug || '-'}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const paymentMeta = getPaymentMethodMeta(payment.method);
                          return (
                            <span className="inline-flex items-center gap-2 text-slate-700">
                              {paymentMeta.icon && (
                                <img
                                  src={paymentMeta.icon}
                                  alt={paymentMeta.label}
                                  className="h-4 w-4 object-contain"
                                />
                              )}
                              {paymentMeta.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const providerMeta = getPaymentProviderMeta(payment.provider);
                          return (
                            <span className="inline-flex items-center gap-2 text-slate-700">
                              {providerMeta.icon && (
                                <img
                                  src={providerMeta.icon}
                                  alt={providerMeta.label}
                                  className="h-4 w-4 object-contain"
                                />
                              )}
                              {providerMeta.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 text-right font-semibold text-brand-primary">
                        {formatCurrency(payment.amount || 0)}
                      </td>
                      <td className="py-3 pl-4 text-right space-x-2">
                        <button
                          onClick={() =>
                            setOpenPaymentPayloadId(isOpen ? '' : payment.id)
                          }
                          className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                          disabled={!latestEvent?.payload}
                        >
                          {isOpen ? 'Fechar payload' : 'Ver payload'}
                        </button>
                        <button
                          onClick={() => handleReprocess(payment.id, payment.providerId)}
                          disabled={reprocessingId === payment.id || payment.provider !== 'MERCADO_PAGO'}
                          className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {reprocessingId === payment.id ? 'Reprocessando...' : 'Reprocessar'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && latestEvent?.payload && (
                      <tr>
                        <td colSpan={7} className="pb-4">
                          <div className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-auto max-h-60">
                            <pre>{JSON.stringify(latestEvent.payload, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="text-center text-slate-500 py-8">Nenhum pagamento encontrado.</div>
          )}
          {filteredPayments.length > PAYMENTS_PER_PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
              <span>
                Pagina {paymentsPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentsPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                  disabled={paymentsPage === 1}
                >
                  <CaretLeft weight="bold" size={16} />
                </button>
                <button
                  onClick={() => setPaymentsPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                  disabled={paymentsPage === totalPages}
                >
                  <CaretRight weight="bold" size={16} />
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 text-sm text-slate-600">
            Total filtrado: <span className="font-semibold">{formatCurrency(filteredTotal)}</span>
          </div>
          </>
          ) : (
            <div className="text-sm text-slate-500">Tabela de pagamentos oculta.</div>
          )}
        </FormSection>

        <FormSection
          title="Logs de acesso"
          variant="neutral"
          className={`bg-gradient-to-br from-slate-50 via-white to-white overflow-x-auto ${
            activeSection !== 'logs' ? 'hidden' : ''
          }`}
          contentClassName="space-y-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Funnel size={18} weight="duotone" className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Logs de acesso</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSection('logs')}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <CaretRight weight="bold"
                  size={14}
                  className={`transition-transform ${sectionsOpen.logs ? 'rotate-90' : ''}`}
                />
                {sectionsOpen.logs ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                onClick={() => loadAccessLogs(accessLogsPage)}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <ArrowClockwise size={14} weight="duotone" />
                Atualizar
              </button>
            </div>
          </div>
          {sectionsOpen.logs ? (
            <>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white">
              <MagnifyingGlass size={16} weight="bold" className="text-slate-400" />
              <input
                type="text"
                value={accessLogQuery}
                onChange={(event) => setAccessLogQuery(event.target.value)}
                placeholder="Buscar rota ou user-agent..."
                className="ml-2 bg-transparent ds-focus-ring text-sm w-48"
              />
            </div>
            <select
              value={accessLogRole}
              onChange={(event) => setAccessLogRole(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Role: Todas</option>
              <option value="SUPER_ADMIN">Super admin</option>
              <option value="ADMIN">Admin</option>
              <option value="LOJISTA">Lojista</option>
            </select>
            <select
              value={accessLogMethod}
              onChange={(event) => setAccessLogMethod(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Metodo: Todos</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <select
              value={accessLogStatus}
              onChange={(event) => setAccessLogStatus(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Status: Todos</option>
              <option value="200">200</option>
              <option value="201">201</option>
              <option value="204">204</option>
              <option value="400">400</option>
              <option value="401">401</option>
              <option value="403">403</option>
              <option value="404">404</option>
              <option value="500">500</option>
            </select>
            <select
              value={accessLogStore}
              onChange={(event) => setAccessLogStore(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Loja: Todas</option>
              {stores.map((store: any) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <table className="ds-table">
            <thead className="text-xs uppercase text-slate-400 border-b">
              <tr>
                <th className="py-2 pr-4 text-left">Data</th>
                <th className="py-2 pr-4 text-left">Role</th>
                <th className="py-2 pr-4 text-left">Usuário</th>
                <th className="py-2 pr-4 text-left">Loja</th>
                <th className="py-2 pr-4 text-left">Metodo</th>
                <th className="py-2 pr-4 text-left">Rota</th>
                <th className="py-2 pr-4 text-left">Status</th>
                <th className="py-2 pr-4 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accessLogs.map((entry: any) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-4">{formatDate(entry.createdAt)}</td>
                  <td className="py-3 pr-4">{entry.role}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{entry.userId}</td>
                  <td className="py-3 pr-4">{entry.storeId ? storeNameById.get(entry.storeId) || '-' : '-'}</td>
                  <td className="py-3 pr-4">{entry.method}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{entry.path}</td>
                  <td className="py-3 pr-4">{entry.status}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{entry.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {accessLogsLoading && <div className="text-center text-slate-500 py-6">Carregando...</div>}
          {!accessLogsLoading && accessLogs.length === 0 && (
            <div className="text-center text-slate-500 py-8">Nenhum log encontrado.</div>
          )}
          {accessLogsTotal > 25 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
              <span>
                Pagina {accessLogsPage} de {accessLogsTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setAccessLogsPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                  disabled={accessLogsPage === 1}
                >
                  <CaretLeft weight="bold" size={16} />
                </button>
                <button
                  onClick={() => setAccessLogsPage((prev) => Math.min(accessLogsTotalPages, prev + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                  disabled={accessLogsPage === accessLogsTotalPages}
                >
                  <CaretRight weight="bold" size={16} />
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 text-sm text-slate-600">
            Total de logs: <span className="font-semibold">{accessLogsTotal}</span>
          </div>
          </>
          ) : (
            <div className="text-sm text-slate-500">Logs ocultos.</div>
          )}
        </FormSection>

        <FormSection
          title="Eventos de pagamento"
          variant="primary"
          className={`bg-gradient-to-br from-blue-50/50 via-white to-white border-blue-100 overflow-x-auto ${
            activeSection !== 'events' ? 'hidden' : ''
          }`}
          contentClassName="space-y-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowClockwise size={20} weight="duotone" className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Eventos de pagamento</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSection('events')}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <CaretRight weight="bold"
                  size={14}
                  className={`transition-transform ${sectionsOpen.events ? 'rotate-90' : ''}`}
                />
                {sectionsOpen.events ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                onClick={exportEventsCsv}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <DownloadSimple size={14} weight="duotone" />
                Exportar CSV
              </button>
            </div>
          </div>
          {sectionsOpen.events ? (
            <>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={eventStoreFilter}
              onChange={(event) => setEventStoreFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Todas as lojas</option>
              {stores.map((store: any) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <select
              value={eventStatusFilter}
              onChange={(event) => setEventStatusFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm ds-focus-ring"
            >
              <option value="all">Status: Todos</option>
              <option value="approved">Aprovado</option>
              <option value="pending">Pendente</option>
              <option value="rejected">Rejeitado</option>
              <option value="cancelled">Cancelado</option>
              <option value="charged_back">Chargeback</option>
              <option value="refunded">Reembolsado</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
          <table className="ds-table">
            <thead className="text-xs uppercase text-slate-400 border-b">
              <tr>
                <th className="py-2 pr-4 text-left">Data</th>
                <th className="py-2 pr-4 text-left">Pagamento</th>
                <th className="py-2 pr-4 text-left">Status</th>
                <th className="py-2 pr-4 text-left">Provider</th>
                <th className="py-2 pr-4 text-left">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEvents.map((event: any) => (
                <tr key={event.id}>
                  <td className="py-3 pr-4">{formatDate(event.createdAt)}</td>
                  <td className="py-3 pr-4">{event.payment?.id || '-'}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${eventBadge(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {(() => {
                      const providerMeta = getPaymentProviderMeta(event.provider);
                      return (
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          {providerMeta.icon && (
                            <img
                              src={providerMeta.icon}
                              alt={providerMeta.label}
                              className="h-4 w-4 object-contain"
                            />
                          )}
                          {providerMeta.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setSelectedEventPayload(event.payload || {})}
                      className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Ver payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {eventsLoading && <div className="text-center text-slate-500 py-6">Carregando...</div>}
          {!eventsLoading && filteredEvents.length === 0 && (
            <div className="text-center text-slate-500 py-8">Nenhum evento encontrado.</div>
          )}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <span>Pagina {eventsPage}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setEventsPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                disabled={eventsPage === 1}
              >
                <CaretLeft weight="bold" size={16} />
              </button>
              <button
                onClick={() => setEventsPage((prev) => prev + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                disabled={filteredEvents.length < EVENTS_PAGE_SIZE}
              >
                <CaretRight weight="bold" size={16} />
              </button>
            </div>
          </div>
          </>
          ) : (
            <div className="text-sm text-slate-500">Eventos ocultos.</div>
          )}
        </FormSection>

        <FormSection
          title="KYC (motoboys)"
          variant="warning"
          className={`bg-gradient-to-br from-violet-50/40 via-white to-white border-violet-100 ${
            activeSection !== 'kyc' ? 'hidden' : ''
          }`}
          contentClassName="space-y-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IdentificationCard size={20} weight="duotone" className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">KYC (motoboys)</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSection('kyc')}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <CaretRight
                  weight="bold"
                  size={14}
                  className={`transition-transform ${sectionsOpen.kyc ? 'rotate-90' : ''}`}
                />
                {sectionsOpen.kyc ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                onClick={() => {
                  loadKycQueue(token);
                  loadKycAudit(token, kycAuditDays);
                  loadKycRecentReviews(token);
                }}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                disabled={!token || kycLoading}
              >
                <ArrowClockwise size={14} weight="duotone" />
                {kycLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>

          {sectionsOpen.kyc ? (
            <>
              <div className="grid lg:grid-cols-[1.4fr,1fr] gap-3 mb-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Fila</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{kycQueue.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Motoboys com documentos pendentes.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Motivo (rejeição)</p>
                  <input
                    value={kycReason}
                    onChange={(e) => setKycReason(e.target.value)}
                    placeholder="Ex: Documento ilegível / selfie não confere"
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm ds-focus-ring"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Dica: use um motivo curto e claro para o entregador reenviar.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Auditoria KYC</p>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Período
                  </span>
                  <select
                    value={kycAuditDays}
                    onChange={(e) => setKycAuditDays(Number(e.target.value || 30))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value={7}>7 dias</option>
                    <option value={30}>30 dias</option>
                    <option value={90}>90 dias</option>
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">Documentos</p>
                    <p className="text-xl font-black text-slate-900">{Number(kycAudit?.totals?.totalDocs || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] text-emerald-700">Aprovação</p>
                    <p className="text-xl font-black text-emerald-800">{Number(kycAudit?.totals?.approvalRate || 0)}%</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                    <p className="text-[11px] text-rose-700">Auto-rejeição</p>
                    <p className="text-xl font-black text-rose-800">{Number(kycAudit?.totals?.autoRejectRate || 0)}%</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-[11px] text-amber-700">Pendentes</p>
                    <p className="text-xl font-black text-amber-800">{Number(kycAudit?.totals?.pendingDocs || 0)}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 mt-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Distribuição score</p>
                    <div className="flex flex-wrap gap-2">
                      {(['alto', 'medio', 'baixo', 'indisponivel'] as const).map((label) => (
                        <span key={label} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${faceTone(label)}`}>
                          {label}: {Number(kycAudit?.scoreLabels?.[label] || 0)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Motivos mais comuns</p>
                    {Array.isArray(kycAudit?.topReasons) && kycAudit.topReasons.length > 0 ? (
                      <div className="space-y-1.5">
                        {kycAudit.topReasons.slice(0, 5).map((r: any) => (
                          <div key={String(r.reason)} className="flex items-center justify-between text-[12px]">
                            <span className="text-slate-700 font-medium">{faceReasonLabel(String(r.reason || ''))}</span>
                            <span className="text-slate-900 font-extrabold">{Number(r.count || 0)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">Sem motivos no período.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Histórico de revisões</p>
                    <p className="text-sm font-bold text-slate-800">Aprovados e reprovados recentes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadKycRecentReviews(token)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                    disabled={!token || kycRecentReviewsLoading}
                  >
                    {kycRecentReviewsLoading ? 'Atualizando...' : 'Atualizar histórico'}
                  </button>
                </div>

                {kycRecentReviewsLoading ? (
                  <div className="text-sm text-slate-500">Carregando histórico...</div>
                ) : groupedRecentKycReviews.length === 0 ? (
                  <div className="text-sm text-slate-500">Nenhuma revisão recente registrada.</div>
                ) : (
                  <div className="space-y-3">
                    {groupedRecentKycReviews.map((entry: any) => {
                      const motoboy = entry?.motoboy || {};
                      const docs = Array.isArray(entry?.typeSummary) ? entry.typeSummary : [];
                      return (
                        <div key={String(motoboy?.id || entry.latestReviewedAt || 'motoboy')} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <KycAvatar
                                name={motoboy?.user?.fullName || 'Motoboy'}
                                profileImageUrl={motoboy?.user?.profileImageUrl || ''}
                              />
                              <div>
                                <div className="text-sm font-black text-slate-900">{motoboy?.user?.fullName || 'Motoboy'}</div>
                                <div className="text-xs text-slate-500">{motoboy?.user?.email || '-'}</div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Revisões: {entry.docs.length} • Aprovados: {entry.approvedCount} • Reprovados: {entry.rejectedCount}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-slate-200 bg-white text-slate-700">
                                Última revisão: {formatDate(entry.latestReviewedAt)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openKycHistory(motoboy)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                              >
                                Ver histórico Face/KYC
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 grid gap-2 md:grid-cols-3">
                            {docs.map((doc: any) => {
                              const status = String(doc?.status || '').toUpperCase();
                              const face = doc?.metadata?.face || {};
                              const isMissing = Boolean(doc?._missing);
                              return (
                                <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-800">{String(doc?.docType || '-').toUpperCase()}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      isMissing
                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                        : status === 'APPROVED'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : status === 'REJECTED'
                                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                                          : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                      {isMissing ? 'Aguardando' : status === 'APPROVED' ? 'Aprovado' : status === 'REJECTED' ? 'Reprovado' : 'Pendente'}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-600">
                                    {isMissing
                                      ? 'Sem revisão recente desse documento'
                                      : String(doc?.docType || '').toUpperCase() === 'SELFIE'
                                        ? `Face: ${String(face?.scoreLabel || 'indisponivel')} • Score: ${faceScoreLabel(face?.faceMatchScore)}`
                                        : 'Face: N/A • Score: N/A (apenas SELFIE)'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {kycQueue.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Nenhum documento pendente agora.
                </div>
              ) : (
                <div className="grid gap-3">
                  {kycQueue.map((entry: any) => {
                    const motoboy = entry?.motoboy;
                    const docs = Array.isArray(entry?.documents) ? entry.documents : [];
                    const name = motoboy?.user?.fullName || 'Motoboy';
                    const email = motoboy?.user?.email || '-';
                    const phone = motoboy?.user?.phone || '';
                    return (
                      <div
                        key={motoboy?.id || entry?.latestAt || Math.random()}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_26px_60px_-48px_rgba(15,23,42,0.35)]"
                        style={{ borderLeftWidth: 6, borderLeftColor: 'rgb(245 158 11)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-2.5">
                            <KycAvatar name={name} profileImageUrl={motoboy?.user?.profileImageUrl || ''} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">{name}</p>
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                  Pendente
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{email}</p>
                              {phone ? <p className="text-xs text-slate-500">{phone}</p> : null}
                              <p className="text-[11px] text-slate-400 mt-2">
                                Último envio: {formatDate(entry?.latestAt)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => loadKycQueue(token)}
                            className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                          >
                            Recarregar
                          </button>
                          <button
                            type="button"
                            onClick={() => openKycHistory(motoboy)}
                            className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                            title="Ver histórico de uploads e validações KYC"
                          >
                            Histórico KYC
                          </button>
                        </div>

                        <div className="mt-3 grid md:grid-cols-3 gap-2">
                          {docs.map((doc: any) => {
                            const type = String(doc?.docType || '').toUpperCase();
                            const icon =
                              type === 'CNH' ? <IdentificationCard size={16} weight="duotone" /> : type === 'SELFIE' ? <Camera size={16} weight="duotone" /> : <Car size={16} weight="duotone" />;
                            return (
                              <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-slate-700">{icon}</span>
                                    <span className="text-xs font-extrabold text-slate-900 truncate">{type}</span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {formatDate(doc.uploadedAt)}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <a
                                    href={doc.fileKey}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                                  >
                                    Ver
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => reviewKycDocument(motoboy.id, doc.id, 'approve')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => reviewKycDocument(motoboy.id, doc.id, 'reject')}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold"
                                  >
                                    Rejeitar
                                  </button>
                                </div>

                                {doc?.metadata?.face ? (
                                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Face worker</div>
                                    <div className="mt-1 text-[11px] text-slate-700 space-y-0.5">
                                      <div>
                                        Status: <span className="font-semibold">{faceStatusLabel(String(doc.metadata.face.status || '-'))}</span>
                                      </div>
                                      <div>
                                        Nível: <span className="font-semibold">{String(doc.metadata.face.scoreLabel || '-')}</span>
                                      </div>
                                      <div>
                                        Score: <span className="font-semibold">{faceScoreLabel(doc.metadata.face.faceMatchScore)}</span>
                                      </div>
                                      <div>
                                        Motivo: <span className="font-semibold">{faceReasonLabel(String(doc.metadata.face.reason || ''))}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-slate-500">KYC oculto.</div>
          )}
        </FormSection>

        <FormSection
          title="Versões e Build"
          subtitle="Controle de versão do frontend e mudanças incluídas no deploy."
          variant="neutral"
          className={`${activeSection !== 'versions' ? 'hidden' : ''}`}
        >
          {activeSection === 'versions' && (
            <div className="space-y-4">
              {(() => {
                const latestCommit = APP_BUILD_INFO.commits?.[0];
                return (
              <>
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] p-5 shadow-[0_32px_68px_-46px_rgba(15,23,42,0.4)]">
                <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" />
                <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-emerald-200/30 blur-3xl" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                      <Sparkle size={12} weight="fill" className="text-amber-500" />
                      Centro de release
                    </div>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      Build estável com rastreabilidade completa
                    </h3>
                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600">
                      Versão publicada com identificação de commit, autoria e trilha de mudanças pronta para auditoria operacional e técnica.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <RocketLaunch size={14} weight="duotone" />
                        <p className="text-[10px] font-black uppercase tracking-[0.14em]">Versão</p>
                      </div>
                      <p className="mt-2 text-base font-black text-slate-950">{APP_BUILD_INFO.versionLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <GitCommit size={14} weight="duotone" />
                        <p className="text-[10px] font-black uppercase tracking-[0.14em]">Hash</p>
                      </div>
                      <p className="mt-2 text-base font-black text-slate-950">{APP_BUILD_INFO.shortHash || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Cpu size={14} weight="duotone" />
                        <p className="text-[10px] font-black uppercase tracking-[0.14em]">Branch</p>
                      </div>
                      <p className="mt-2 text-sm font-black uppercase tracking-[0.08em] text-slate-950">{APP_BUILD_INFO.branch || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck size={14} weight="duotone" className="text-emerald-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.14em]">Status</p>
                      </div>
                      <p className="mt-2 text-sm font-black text-emerald-700">Release ativa</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.26)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Build ID</p>
                  <p className="mt-2 text-sm font-black text-slate-900 break-all">{APP_BUILD_INFO.buildId}</p>
                </div>
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.26)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Gerado em</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{buildDate}</p>
                </div>
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.26)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Autor principal</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{latestCommit?.authorName || '-'}</p>
                  <p className="mt-1 text-[11px] text-slate-500 break-all">{latestCommit?.authorEmail || '-'}</p>
                </div>
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.26)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Repositório</p>
                  {latestCommit?.commitUrl ? (
                    <a
                      href={latestCommit.commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-black text-sky-700 transition hover:text-sky-800"
                    >
                      Abrir commit {latestCommit.shortHash}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-black text-slate-900">Link indisponível</p>
                  )}
                </div>
              </div>
              </>
                );
              })()}

              <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_24px_56px_-40px_rgba(15,23,42,0.28)]">
                <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_55%,#eef6ff_100%)] px-4 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-700">Mudanças incluídas nesta versão</p>
                      <p className="text-[11px] text-slate-500">Baseado no histórico de commits do build atual.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                      <GitCommit size={12} weight="duotone" />
                      {APP_BUILD_INFO.commits.length} commit{APP_BUILD_INFO.commits.length === 1 ? '' : 's'} rastreado{APP_BUILD_INFO.commits.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="max-h-[420px] overflow-auto">
                  {APP_BUILD_INFO.commits.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">Sem histórico disponível nesta build.</div>
                  ) : (
                    <table className="ds-table min-w-[640px]">
                      <thead>
                        <tr>
                          <th className="text-left">Data</th>
                          <th className="text-left">Hash</th>
                          <th className="text-left">Autor</th>
                          <th className="text-left">Descrição</th>
                          <th className="text-left">GitHub</th>
                        </tr>
                      </thead>
                      <tbody>
                        {APP_BUILD_INFO.commits.map((commit) => (
                          <tr key={commit.hash || commit.shortHash}>
                            <td className="text-xs text-slate-600 whitespace-nowrap">
                              {commit.dateIso ? new Date(commit.dateIso).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="text-xs font-bold text-slate-800 whitespace-nowrap">{commit.shortHash || '-'}</td>
                            <td className="text-xs text-slate-600 whitespace-nowrap">{commit.authorName || '-'}</td>
                            <td className="text-sm text-slate-700">{commit.subject || '-'}</td>
                            <td className="text-xs whitespace-nowrap">
                              {commit.commitUrl ? (
                                <a
                                  href={commit.commitUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-sky-700 hover:text-sky-800 underline"
                                >
                                  abrir
                                </a>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#172554_52%,#0f172a_100%)] p-5 text-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.72)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Governança de release</p>
                    <h4 className="mt-2 text-xl font-black tracking-tight">Histórico técnico pronto para operação, suporte e auditoria</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Cada publicação fica vinculada a versão, branch, autoria e trilha de commits, reforçando previsibilidade de deploy e confiança institucional.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                      Build {APP_BUILD_INFO.versionLabel}
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                      Release verificada
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </FormSection>

      {selectedEventPayload && (
        <div className="ds-sheet-backdrop">
          <div className="ds-sheet-panel w-full max-w-3xl rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
            <div className="sm:hidden ds-sheet-handle" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Payload do webhook</h3>
              <button
                onClick={() => setSelectedEventPayload(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-auto max-h-[60vh]">
              {JSON.stringify(selectedEventPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {kycHistoryOpen && (
        <div className="ds-sheet-backdrop">
          <div className="ds-sheet-panel w-full max-w-5xl rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-hidden">
            <div className="sm:hidden ds-sheet-handle" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2.5">
                <KycAvatar
                  name={kycHistoryMotoboy?.user?.fullName || 'Motoboy'}
                  profileImageUrl={kycHistoryMotoboy?.user?.profileImageUrl || ''}
                />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-800">Histórico KYC</h3>
                  <p className="text-xs text-slate-500 truncate">
                    {kycHistoryMotoboy?.user?.fullName || 'Motoboy'} • {kycHistoryMotoboy?.user?.email || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setKycHistoryOpen(false);
                  setKycHistoryDocs([]);
                  setKycHistoryMotoboy(null);
                }}
                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="overflow-auto max-h-[72vh] rounded-xl border border-slate-200">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Filtros</span>
                <select
                  value={kycHistoryStatusFilter}
                  onChange={(e) => setKycHistoryStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="all">Status: todos</option>
                  <option value="PENDING">Status: pendente</option>
                  <option value="APPROVED">Status: aprovado</option>
                  <option value="REJECTED">Status: rejeitado</option>
                </select>
                <select
                  value={kycHistoryFaceFilter}
                  onChange={(e) => setKycHistoryFaceFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="all">Face: todos</option>
                  <option value="alto">Face: alto</option>
                  <option value="medio">Face: médio</option>
                  <option value="baixo">Face: baixo</option>
                  <option value="indisponivel">Face: indisponível</option>
                </select>
                <span className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-700">
                  {filteredKycHistoryDocs.length} registro{filteredKycHistoryDocs.length === 1 ? '' : 's'}
                </span>
              </div>
              {kycHistoryDocSummary.length > 0 ? (
                <div className="p-3 border-b border-slate-200 bg-white">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 mb-2">Resumo por documento</p>
                  <div className="grid md:grid-cols-3 gap-2">
                    {kycHistoryDocSummary.map((item: any) => (
                      <div key={item.docType} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <div className="text-xs font-extrabold text-slate-800">{item.docType}</div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          Tentativas: {item.total} • Aprovado: {item.approved} • Reprovado: {item.rejected}
                        </div>
                        <div className="mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            item.latestStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : item.latestStatus === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            Atual: {item.latestStatus}
                          </span>
                          <span className="ml-2 text-[10px] text-slate-500">{formatDate(item.latestAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {kycHistoryLoading ? (
                <div className="p-4 text-sm text-slate-500">Carregando histórico...</div>
              ) : filteredKycHistoryDocs.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Sem histórico para este motoboy.</div>
              ) : (
                <table className="ds-table">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-2">Tipo</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Enviado</th>
                      <th className="text-left px-3 py-2">Revisão</th>
                      <th className="text-left px-3 py-2">Face Worker</th>
                      <th className="text-left px-3 py-2">Arquivo</th>
                      <th className="text-left px-3 py-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKycHistoryDocs.map((doc: any) => {
                      const review = doc?.metadata?.review || {};
                      const face = doc?.metadata?.face || {};
                      const reviewedByPlatform =
                        review?.reviewedByPlatformAdminUsername || review?.reviewedByPlatformAdminId || '-';
                      const reviewedByUser = review?.reviewedByUserId || '-';
                      const faceLabel = String(face?.scoreLabel || 'indisponivel').toLowerCase();
                      const statusText = String(doc?.status || '-').toUpperCase();
                      return (
                        <tr key={doc.id} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-2 font-semibold text-slate-800">{String(doc?.docType || '-')}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              statusText === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : statusText === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{formatDate(doc?.uploadedAt)}</td>
                          <td className="px-3 py-2 text-[12px] text-slate-700">
                            <div>Escopo: <span className="font-semibold">{String(review?.scope || '-')}</span></div>
                            <div>Motivo: <span className="font-semibold">{String(review?.reason || '-')}</span></div>
                            <div>Revisor plataforma: <span className="font-semibold">{String(reviewedByPlatform)}</span></div>
                            <div>Revisor usuário: <span className="font-semibold">{String(reviewedByUser)}</span></div>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-slate-700">
                            {String(doc?.docType || '').toUpperCase() === 'SELFIE' ? (
                              <>
                                <div>Status: <span className="font-semibold">{faceStatusLabel(String(face?.status || '-'))}</span></div>
                                <div className="flex items-center gap-1.5">
                                  <span>Nível:</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${faceTone(faceLabel)}`}>
                                    {faceLabel}
                                  </span>
                                </div>
                                <div>Score: <span className="font-semibold">{faceScoreLabel(face?.faceMatchScore)}</span></div>
                                <div>Motivo: <span className="font-semibold">{faceReasonLabel(String(face?.reason || ''))}</span></div>
                              </>
                            ) : (
                              <div>Face/Score: <span className="font-semibold">N/A (apenas SELFIE)</span></div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <a
                              href={doc?.fileKey || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 inline-block"
                            >
                              Abrir
                            </a>
                          </td>
                          <td className="px-3 py-2">
                            {statusText === 'APPROVED' ? (
                              <button
                                type="button"
                                onClick={() => reviewKycDocument(kycHistoryMotoboy?.id, doc.id, 'reject')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold"
                              >
                                Reprovar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => reviewKycDocument(kycHistoryMotoboy?.id, doc.id, 'approve')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold"
                              >
                                Aprovar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      <AccountMfaPanel open={mfaPanelOpen} authMode="superadmin" onClose={() => setMfaPanelOpen(false)} />
    </AdminLayout>
  );
}
