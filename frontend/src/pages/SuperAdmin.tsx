// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
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

const STORAGE_KEY = 'superAdminToken';
const STORAGE_USER_KEY = 'superAdminUser';
const FILTERS_KEY = 'superAdminPaymentFilters';
const EVENTS_FILTERS_KEY = 'superAdminEventFilters';
const EVENTS_PAGE_SIZE = 25;
const PAYMENTS_PER_PAGE = 10;

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

const SECTION_META: Record<string, { title: string; description: string; tone: string }> = {
  executive: {
    title: 'Resumo executivo',
    description: 'Visão rápida dos principais números da plataforma.',
    tone: 'from-slate-900 to-slate-700 text-white border-slate-800',
  },
  rankings: {
    title: 'Rankings',
    description: 'Comparativo de lojas por receita e volume de pedidos.',
    tone: 'from-emerald-500 to-emerald-600 text-white border-emerald-500',
  },
  stores: {
    title: 'Lojas e performance',
    description: 'Filtros, plano, VIP, métricas e saúde operacional das lojas.',
    tone: 'from-indigo-500 to-indigo-600 text-white border-indigo-500',
  },
  payments: {
    title: 'Pagamentos',
    description: 'Acompanhamento financeiro, status e reconciliação.',
    tone: 'from-teal-500 to-teal-600 text-white border-teal-500',
  },
  logs: {
    title: 'Logs de acesso',
    description: 'Rastreamento de acesso, segurança e auditoria de uso.',
    tone: 'from-slate-600 to-slate-700 text-white border-slate-600',
  },
  events: {
    title: 'Eventos',
    description: 'Fila de eventos e histórico técnico da plataforma.',
    tone: 'from-blue-500 to-blue-600 text-white border-blue-500',
  },
  kyc: {
    title: 'KYC de entregadores',
    description: 'Validação documental, score facial e decisões da plataforma.',
    tone: 'from-violet-500 to-violet-600 text-white border-violet-500',
  },
  versions: {
    title: 'Versões',
    description: 'Versão atual, build e histórico técnico de mudanças.',
    tone: 'from-slate-700 to-slate-900 text-white border-slate-700',
  },
  push: {
    title: 'Push Global',
    description: 'Disparo de notificação para toda a base de apps ativos.',
    tone: 'from-cyan-600 to-blue-600 text-white border-cyan-600',
  },
};

export function SuperAdmin() {
  const { showToast } = useToast();
  const platformLogo = '/janocaminho-logo.png';
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [superAdminUser, setSuperAdminUser] = useState(() => localStorage.getItem(STORAGE_USER_KEY) || '');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
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
  const [activeSection, setActiveSection] = useState('executive');
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body: '',
    url: 'https://janocaminho.com.br/hub',
    topic: 'janocaminho_global',
    limit: 1500,
  });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastLastResult, setBroadcastLastResult] = useState<any | null>(null);
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

  const loadOverview = async (authToken: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await superAdminService.fetchOverview(authToken);
      setOverview(data);
    } catch (err: any) {
      const message = err.message || 'Não foi possível carregar os dados.';
      if (message.includes('Token inválido') || message.includes('Token ausente')) {
        setSessionExpired(true);
        handleLogout();
      } else {
        showToast(message, 'error');
        setOverview(null);
      }
    } finally {
      setLoading(false);
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
    const interval = window.setInterval(() => loadOverview(token), 15000);
    return () => window.clearInterval(interval);
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
    setBroadcastSending(true);
    try {
      const result = await superAdminService.broadcastPush(token, {
        title: String(broadcastForm.title || '').trim(),
        body: String(broadcastForm.body || '').trim(),
        url: String(broadcastForm.url || '').trim(),
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
            <img src="/janocaminho-logo.png" alt="Já no Caminho" className="mx-auto h-14 w-auto rounded-xl" />
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-slate-500">Acesso da plataforma</p>
            <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.02em]">Login Super Admin</h2>
          </div>

          <div className="auth-segment">
            <button type="button" onClick={() => window.location.assign('/admin')} className="auth-segment-btn">Loja</button>
            <button type="button" onClick={() => window.location.assign('/motoboy/login')} className="auth-segment-btn">Entregador</button>
          </div>
          <p className="text-center text-[11px] font-semibold text-slate-500">Acesso Super Admin restrito</p>

          <form onSubmit={handleLogin} className="login-card-premium p-6 sm:p-7 space-y-3">
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
                type="text"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="floating-input"
                placeholder=" "
              />
              <label htmlFor="superadmin-user" className="floating-label">Usuário</label>
            </div>
            <div className="floating-field">
              <input
                id="superadmin-password"
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="floating-input"
                placeholder=" "
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
      </AuthLayout>
    );
  }

  return (
    <AdminLayout contextLabel="Plataforma" showHeader={false}>
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-4 py-4 sm:px-6 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
        <div className="relative flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white/80 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
              {superAdminUser ? superAdminUser.slice(0, 2).toUpperCase() : 'SA'}
            </div>
            <div className="text-xs leading-tight">
              <div className="font-semibold text-slate-800">{superAdminUser || 'Super Admin'}</div>
              <div className="text-slate-500">SUPER_ADMIN</div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-semibold text-slate-600">Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-brand-primary' : 'bg-slate-300'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <span
                className={`h-4 w-4 transform rounded-full bg-white transition-transform flex items-center justify-center ${
                  autoRefresh ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <button
            onClick={() => loadOverview(token)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <ArrowClockwise size={16} weight="duotone" />
            Atualizar
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/90 backdrop-blur border-b border-slate-200">
        <PremiumTabs
          items={[
            { id: 'executive', label: 'Resumo' },
            { id: 'rankings', label: 'Rankings' },
            { id: 'stores', label: 'Lojas' },
            { id: 'payments', label: 'Pagamentos' },
            { id: 'push', label: 'Push Global' },
            { id: 'logs', label: 'Logs' },
            { id: 'events', label: 'Eventos' },
            { id: 'kyc', label: 'KYC' },
            { id: 'versions', label: 'Versões' },
          ]}
          activeId={activeSection}
          onChange={(id) => setActiveSection(id)}
        />
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 bg-gradient-to-r ${(
          SECTION_META[activeSection] || SECTION_META.executive
        ).tone}`}
      >
        <p className="text-xs uppercase tracking-[0.16em] opacity-90">
          {(SECTION_META[activeSection] || SECTION_META.executive).title}
        </p>
        <p className="text-sm opacity-95">{(SECTION_META[activeSection] || SECTION_META.executive).description}</p>
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

        {loading && <div className="text-sm text-slate-500">Carregando...</div>}

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
                    Atualizado agora
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
          <FormSection
            title="Push Global"
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
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Título</span>
                <input
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  placeholder="Ex: Promoção Já no Caminho"
                  maxLength={80}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Mensagem</span>
                <textarea
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm((prev) => ({ ...prev, body: e.target.value }))}
                  className="min-h-[88px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  placeholder="Ex: Hoje frete grátis nas lojas parceiras."
                  maxLength={220}
                />
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">URL ao clicar</span>
                  <input
                    value={broadcastForm.url}
                    onChange={(e) => setBroadcastForm((prev) => ({ ...prev, url: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    placeholder="https://janocaminho.com.br/hub"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Limite</span>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={broadcastForm.limit}
                    onChange={(e) => setBroadcastForm((prev) => ({ ...prev, limit: Number(e.target.value || 1500) }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  Tópico: <span className="font-semibold text-slate-700">{broadcastForm.topic}</span>
                </span>
                <button
                  type="submit"
                  disabled={broadcastSending}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  {broadcastSending ? 'Enviando...' : 'Enviar Push Global'}
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
              <option value="CHURRASQUEIRO">Churrasqueiro</option>
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
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Versão</p>
                  <p className="mt-1 text-base font-black text-slate-900">{APP_BUILD_INFO.versionLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Build ID</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 break-all">{APP_BUILD_INFO.buildId}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Commit</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 break-all">{APP_BUILD_INFO.shortHash}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{APP_BUILD_INFO.branch}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Gerado em</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{buildDate}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <p className="text-xs font-extrabold text-slate-700">Mudanças incluídas nesta versão</p>
                  <p className="text-[11px] text-slate-500">Baseado no histórico de commits do build atual.</p>
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
                          <th className="text-left">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {APP_BUILD_INFO.commits.map((commit) => (
                          <tr key={commit.hash || commit.shortHash}>
                            <td className="text-xs text-slate-600 whitespace-nowrap">
                              {commit.dateIso ? new Date(commit.dateIso).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="text-xs font-bold text-slate-800 whitespace-nowrap">{commit.shortHash || '-'}</td>
                            <td className="text-sm text-slate-700">{commit.subject || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
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
    </AdminLayout>
  );
}


