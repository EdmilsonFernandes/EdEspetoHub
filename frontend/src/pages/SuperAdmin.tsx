// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  TrendingUp,
  Store,
  CheckCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  Clock,
  BarChart3,
  Filter,
  Download,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { superAdminService } from '../services/superAdminService';
import { formatCurrency, formatPlanName } from '../utils/format';
import { exportToCsv } from '../utils/export';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Lottie from 'lottie-react';
import fireAnimation from '../assets/fire.json';
import { useToast } from '../contexts/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';

const STORAGE_KEY = 'superAdminToken';
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

export function SuperAdmin() {
  const { showToast } = useToast();
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const loadOverview = async (authToken: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await superAdminService.fetchOverview(authToken);
      setOverview(data);
    } catch (err: any) {
      const message = err.message || 'Falha ao carregar';
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

  useEffect(() => {
    if (token) {
      loadOverview(token);
    }
  }, [token]);

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
      setToken(nextToken);
      showToast('Login realizado com sucesso', 'success');
    } catch (err: any) {
      const message = err.message || 'Falha ao autenticar';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken('');
    setOverview(null);
  };

  const summary = overview?.summary;
  const stores = overview?.stores || [];
  const payments = overview?.payments || [];
  const paymentEvents = overview?.paymentEvents || [];
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

  const handleReprocess = async (paymentId: string, providerId?: string) => {
    if (!token) return;
    setReprocessingId(paymentId);
    try {
      await superAdminService.reprocessPayment(token, paymentId, providerId);
      await loadOverview(token);
      showToast('Pagamento reprocessado com sucesso', 'success');
    } catch (err: any) {
      const message = err.message || 'Falha ao reprocessar';
      showToast(message, 'error');
    } finally {
      setReprocessingId('');
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
      showToast(err.message || 'Falha ao carregar eventos', 'error');
    } finally {
      setEventsLoading(false);
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

  const platformLogo = '/logo.svg';

  if (!token) {
    return (
      <AuthLayout>
          <form
            onSubmit={handleLogin}
           className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">Super Admin</h2>
              <p className="text-sm text-gray-500">Acesso da plataforma</p>
              <p className="text-sm text-gray-500">Entre com suas credenciais de super administrador.</p>
            </div>

            {sessionExpired && (
              <div className="flex items-center gap-3 text-sm text-slate-700 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Sessao expirada. Entre novamente.
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Digite seu email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="Sua senha de acesso"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginForm.email || !loginForm.password}
              className="w-full text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-brand-gradient hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Entrando...' : '🔐 Entrar no painel'}
            </button>
          </form>
      </AuthLayout>
    );
  }

  return (
    <AdminLayout contextLabel="Plataforma" showHeader={false}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Super Admin</h1>
          <p className="text-sm text-slate-500">Visão geral da plataforma</p>
        </div>
        <div className="flex gap-2">
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
            >

            </span>
          </button>
        </div>
            <button
              onClick={() => loadOverview(token)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <RefreshCw size={16} />
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

        {loading && <div className="text-sm text-slate-500">Carregando...</div>}

        {summary && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Lojas</p>
                <Store size={20} className="text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-800">{summary.totalStores}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Assinaturas ativas</p>
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{summary.activeSubscriptions}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Expirando</p>
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-600">{summary.expiringSubscriptions}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Receita confirmada</p>
                <DollarSign size={20} className="text-brand-primary" />
              </div>
              <p className="text-2xl font-black text-brand-primary">{paidRevenue}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Pagamentos pagos</p>
                <CheckCircle size={20} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-800">{summary.paidPayments}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Pagamentos pendentes</p>
                <Clock size={20} className="text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-800">{summary.pendingPayments}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">Mensal vs Anual</p>
                <TrendingUp size={20} className="text-slate-500" />
              </div>
              <p className="text-lg font-semibold text-slate-700">
                {summary.monthlyPlans} mensal · {summary.yearlyPlans} anual
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-slate-400 font-semibold">MRR projetado</p>
                <TrendingUp size={20} className="text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(summary.mrrProjected || 0)}</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Receita por mês</h2>
            </div>
          </div>
          {revenueByMonth.length === 0 ? (
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
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Receita paga no periodo selecionado: <span className="font-semibold">{formatCurrency(periodTotal)}</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b">
              <tr>
                <th className="py-2 pr-4 text-left">Loja</th>
                <th className="py-2 pr-4 text-left">Plano</th>
                <th className="py-2 pr-4 text-left">Status</th>
                <th className="py-2 pr-4 text-left">Criada</th>
                <th className="py-2 pr-4 text-left">Expira</th>
                <th className="py-2 pr-4 text-left">Dias</th>
                <th className="py-2 pr-4 text-left">Pagamento</th>
                <th className="py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stores.map((store: any) => {
                const planName =
                  store.subscription?.plan?.displayName ||
                  formatPlanName(store.subscription?.plan?.name || '-');
                const planPrice = store.subscription?.plan?.price || 0;
                const status = store.subscription?.status || 'PENDING';
                const endDate = store.subscription?.endDate;
                const remaining = daysUntil(endDate);
                const paymentStatus = store.latestPayment?.status || '-';
                return (
                  <tr key={store.id}>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-700">{store.name}</div>
                      <div className="text-xs text-slate-400">{store.slug}</div>
                    </td>
                    <td className="py-3 pr-4 capitalize">{planName}</td>
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
          {stores.length === 0 && (
            <div className="text-center text-slate-500 py-8">Nenhuma loja encontrada.</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Pagamentos recentes</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <Trash2 size={14} />
                Limpar filtros
              </button>
              <button
                onClick={exportPaymentsCsv}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <Download size={14} />
                Exportar CSV
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={paymentQuery}
                onChange={(event) => setPaymentQuery(event.target.value)}
                placeholder="Buscar por loja, email, providerId..."
                className="ml-2 bg-transparent outline-none text-sm w-48"
              />
            </div>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none flex items-center gap-2"
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
              className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
            />
            <input
              type="number"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="Max R$"
              className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
            />
            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
            >
              <option value="all">Status: Todos</option>
              <option value="PAID">Pago</option>
              <option value="PENDING">Pendente</option>
              <option value="FAILED">Falhou</option>
            </select>
            <select
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
            >
              <option value="all">Metodo: Todos</option>
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartao</option>
              <option value="BOLETO">Boleto</option>
            </select>
            <select
              value={paymentProviderFilter}
              onChange={(event) => setPaymentProviderFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
            >
              <option value="all">Provider: Todos</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="MOCK">Mock</option>
            </select>
          </div>
          <table className="min-w-full text-sm">
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
                        <div className="font-semibold text-slate-700">{payment.store?.name || '-'}</div>
                        <div className="text-xs text-slate-400">{payment.store?.slug || '-'}</div>
                      </td>
                      <td className="py-3 pr-4">{payment.method}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{payment.provider || '-'}</td>
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
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPaymentsPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                  disabled={paymentsPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 text-sm text-slate-600">
            Total filtrado: <span className="font-semibold">{formatCurrency(filteredTotal)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={20} className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">Eventos de pagamento</h2>
            </div>
            <button
              onClick={exportEventsCsv}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={eventStoreFilter}
              onChange={(event) => setEventStoreFilter(event.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
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
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
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
          <table className="min-w-full text-sm">
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
                  <td className="py-3 pr-4">{event.provider}</td>
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
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setEventsPage((prev) => prev + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                disabled={filteredEvents.length < EVENTS_PAGE_SIZE}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      {selectedEventPayload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl p-6 space-y-4">
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
    </AdminLayout>
  );
}

