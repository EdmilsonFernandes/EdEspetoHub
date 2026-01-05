// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { superAdminService } from '../services/superAdminService';
import { formatCurrency } from '../utils/format';

const STORAGE_KEY = 'superAdminToken';

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
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const loadOverview = async (authToken: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await superAdminService.fetchOverview(authToken);
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadOverview(token);
    }
  }, [token]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await superAdminService.login(loginForm.email, loginForm.password);
      const nextToken = data.token;
      localStorage.setItem(STORAGE_KEY, nextToken);
      setToken(nextToken);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
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

  const paidRevenue = useMemo(() => {
    return summary?.paidRevenue ? formatCurrency(summary.paidRevenue) : formatCurrency(0);
  }, [summary?.paidRevenue]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-white shadow-xl rounded-2xl border border-slate-200 p-6 w-full max-w-md space-y-4"
        >
          <div>
            <h1 className="text-xl font-black text-slate-800">Super Admin</h1>
            <p className="text-sm text-slate-500">Acesso da plataforma</p>
          </div>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}
          <div className="space-y-3">
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="Email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="Senha"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Super Admin</h1>
            <p className="text-sm text-slate-500">Visao geral da plataforma</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadOverview(token)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Sair
            </button>
          </div>
        </header>

        {loading && <div className="text-sm text-slate-500">Carregando...</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

        {summary && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Lojas</p>
              <p className="text-2xl font-black text-slate-800">{summary.totalStores}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Assinaturas ativas</p>
              <p className="text-2xl font-black text-emerald-600">{summary.activeSubscriptions}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Expirando</p>
              <p className="text-2xl font-black text-amber-600">{summary.expiringSubscriptions}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Receita confirmada</p>
              <p className="text-2xl font-black text-brand-primary">{paidRevenue}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Pagamentos pagos</p>
              <p className="text-2xl font-black text-slate-800">{summary.paidPayments}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Pagamentos pendentes</p>
              <p className="text-2xl font-black text-slate-800">{summary.pendingPayments}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">Mensal vs Anual</p>
              <p className="text-lg font-semibold text-slate-700">
                {summary.monthlyPlans} mensal · {summary.yearlyPlans} anual
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 font-semibold">MRR projetado</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(summary.mrrProjected || 0)}</p>
            </div>
          </div>
        )}

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
                const planName = store.subscription?.plan?.name || '-';
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
      </div>
    </div>
  );
}
