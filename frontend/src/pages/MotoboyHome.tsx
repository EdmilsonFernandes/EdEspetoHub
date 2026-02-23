import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  ListChecks,
  NavigationArrow,
  ShieldCheck,
  Storefront,
  UserCircle,
  Wallet,
} from '@phosphor-icons/react';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { motoboyService } from '../services/motoboyService';
import { formatCurrency } from '../utils/format';
import { formatMotoboyAccountStatus } from '../utils/motoboyStatus';
import { StatusBadge } from '../components/Motoboy/StatusBadge';

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Aceito',
  PICKED_UP: 'Pedido retirado',
  IN_TRANSIT: 'Em rota',
};

export function MotoboyHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [nextOrder, setNextOrder] = useState<any | null>(null);
  const [earningsToday, setEarningsToday] = useState<{ total: number; count: number } | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [current, available, earnings, profileData, storeRequests] = await Promise.all([
        motoboyService.getCurrentOrder().catch(() => null),
        motoboyService.listAvailableOrders().catch(() => []),
        motoboyService.getEarningsToday().catch(() => null),
        motoboyService.getProfile().catch(() => null),
        motoboyService.listStoreRequests().catch(() => []),
      ]);

      setActiveOrder(current || null);
      const list = Array.isArray(available) ? available : [];
      setQueueCount(list.length);
      setNextOrder(list.length > 0 ? list[0] : null);
      setProfile(profileData || null);
      setRequests(Array.isArray(storeRequests) ? storeRequests : []);

      if (earnings) {
        setEarningsToday({ total: Number(earnings?.total || 0), count: Number(earnings?.count || 0) });
      } else {
        setEarningsToday({ total: 0, count: 0 });
      }
      setLastUpdatedAt(Date.now());
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void load({ silent: true });
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const deliveryStatus = useMemo(
    () => String(activeOrder?.delivery?.status || '').toUpperCase(),
    [activeOrder?.delivery?.status]
  );
  const hasActive = useMemo(
    () => Boolean(activeOrder?.id && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(deliveryStatus)),
    [activeOrder?.id, deliveryStatus]
  );

  const approvedStores = useMemo(
    () => requests.filter((req) => String(req?.status || '').toUpperCase() === 'APPROVED').length,
    [requests]
  );
  const pendingRequests = useMemo(
    () => requests.filter((req) => String(req?.status || '').toUpperCase() === 'PENDING').length,
    [requests]
  );
  const accountStatus = useMemo(() => formatMotoboyAccountStatus(profile?.status), [profile?.status]);
  const nextOrderLabel = useMemo(() => {
    if (!nextOrder) return '';
    const customer = String(nextOrder?.customerName || 'Cliente');
    const store = String(nextOrder?.store?.name || 'Loja');
    return `${store} • ${customer}`;
  }, [nextOrder]);

  const headline = useMemo(() => {
    if (loading) return 'Atualizando painel...';
    if (hasActive) return 'Você está com entrega ativa. Continue sua rota em um toque.';
    if (queueCount > 0) return `Há ${queueCount} pedido${queueCount === 1 ? '' : 's'} disponível${queueCount === 1 ? '' : 's'} agora.`;
    return 'Sem pedidos no momento. A fila atualiza automaticamente.';
  }, [loading, hasActive, queueCount]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return '—';
    return new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [lastUpdatedAt]);

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
      <MotoboyHeader
        title="Painel do Entregador"
        subtitle={headline}
        rightAction={
          <button
            type="button"
            onClick={() => void load({ silent: true })}
            className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      <section className="premium-card-glass p-4 sm:p-5 motoboy-fade-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status operacional</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={hasActive ? 'in_delivery' : queueCount > 0 ? 'waiting_for_motoboy' : 'pending'} />
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${accountStatus.tone}`}>
                Conta: {accountStatus.label}
              </span>
              {pendingRequests > 0 ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold border border-amber-200 bg-amber-50 text-amber-800">
                  {pendingRequests} vínculo{pendingRequests === 1 ? '' : 's'} pendente{pendingRequests === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Última atualização: <span className="font-semibold">{lastUpdatedLabel}</span>
            </p>
          </div>

          <div className="w-full lg:w-auto">
            {hasActive ? (
              <button
                type="button"
                onClick={() => navigate('/motoboy/delivery')}
                className="btn-press w-full lg:w-auto rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] inline-flex items-center justify-center gap-2"
              >
                Continuar entrega <ArrowRight size={18} weight="duotone" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/motoboy/available')}
                className="btn-press w-full lg:w-auto rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] inline-flex items-center justify-center gap-2"
              >
                Ver fila agora <ArrowRight size={18} weight="duotone" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ganhos de hoje</p>
            <span className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center">
              <Wallet size={20} weight="duotone" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600">
            {formatCurrency(Number(earningsToday?.total || 0))}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {Number(earningsToday?.count || 0)} entrega{Number(earningsToday?.count || 0) === 1 ? '' : 's'} concluída{Number(earningsToday?.count || 0) === 1 ? '' : 's'}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fila agora</p>
            <span className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center justify-center">
              <ListChecks size={20} weight="duotone" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{queueCount}</p>
          <p className="text-xs text-slate-600 mt-1">
            {queueCount > 0 ? 'Pedidos disponíveis para aceitar' : 'Nenhum pedido no momento'}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Lojas vinculadas</p>
            <span className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center justify-center">
              <Storefront size={20} weight="duotone" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{approvedStores}</p>
          <p className="text-xs text-slate-600 mt-1">
            {approvedStores > 0 ? 'Vínculos aprovados ativos' : 'Solicite vínculo no perfil'}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Conta e documentos</p>
            <span className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 inline-flex items-center justify-center">
              <ShieldCheck size={20} weight="duotone" />
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">{accountStatus.label}</p>
          <p className="text-xs text-slate-600 mt-1">
            {profile?.status === 'ACTIVE'
              ? 'Tudo certo para operar'
              : 'Finalize seu perfil para liberar todas as entregas'}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{hasActive ? 'Entrega ativa' : 'Próximo pedido'}</p>
            <p className="text-sm font-extrabold text-slate-900 mt-1">
              {hasActive
                ? `${activeOrder?.store?.name || 'Loja'} • ${activeOrder?.customerName || 'Cliente'}`
                : queueCount > 0
                ? nextOrderLabel || 'Pedido disponível'
                : 'Aguardando novos pedidos'}
            </p>
            {hasActive ? (
              <p className="text-xs text-slate-600 mt-1">
                Status atual: <span className="font-semibold">{DELIVERY_STATUS_LABELS[deliveryStatus] || deliveryStatus || 'Em andamento'}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-600 mt-1">
                A fila atualiza automaticamente a cada poucos segundos.
              </p>
            )}
          </div>
          <span className={`h-11 w-11 rounded-2xl inline-flex items-center justify-center border ${hasActive ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {hasActive ? <NavigationArrow size={20} weight="duotone" /> : <Clock size={20} weight="duotone" />}
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/motoboy/available')}
          className="btn-press rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fila de pedidos</p>
          <p className="text-lg font-black text-slate-900 mt-2">Gerenciar fila</p>
          <p className="text-xs text-slate-600 mt-1">Aceitar novos pedidos e iniciar rotas.</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/motoboy/earnings')}
          className="btn-press rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ganhos e histórico</p>
          <p className="text-lg font-black text-slate-900 mt-2">Ver detalhes financeiros</p>
          <p className="text-xs text-slate-600 mt-1">Acompanhe entregas, gorjetas e repasses.</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/motoboy/delivery')}
          className="btn-press rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Entrega em andamento</p>
          <p className="text-lg font-black text-slate-900 mt-2">Abrir entrega atual</p>
          <p className="text-xs text-slate-600 mt-1">
            {hasActive ? 'Continue sua rota ativa.' : 'Sem entrega ativa agora.'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/motoboy/profile')}
          className="btn-press rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Perfil e documentos</p>
          <p className="text-lg font-black text-slate-900 mt-2">Atualizar cadastro</p>
          <p className="text-xs text-slate-600 mt-1">Dados pessoais, documentos e lojas vinculadas.</p>
        </button>
      </section>

      {!loading && queueCount === 0 && !hasActive ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center text-slate-600 motoboy-fade-up">
          <div className="mx-auto h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 inline-flex items-center justify-center">
            <UserCircle size={22} weight="duotone" />
          </div>
          <p className="mt-3 text-sm font-semibold">Sem pedidos disponíveis no momento</p>
          <p className="mt-1 text-xs">
            Fique online que assim que um novo pedido entrar, a fila será atualizada automaticamente.
          </p>
        </section>
      ) : null}
    </div>
  );
}
