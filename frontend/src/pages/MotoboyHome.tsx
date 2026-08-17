import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowClockwise, ArrowRight, ListChecks, NavigationArrow, ShieldCheck, Storefront, Wallet } from '@phosphor-icons/react';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { motoboyService } from '../services/motoboyService';
import { formatCurrency } from '../utils/format';
import { formatMotoboyAccountStatus } from '../utils/motoboyStatus';

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'A caminho da loja',
  PICKED_UP: 'Pedido retirado',
  IN_TRANSIT: 'Em rota para o cliente',
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
      setEarningsToday({
        total: Number(earnings?.total || 0),
        count: Number(earnings?.count || 0),
      });
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

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return '—';
    return new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdatedAt]);

  const needsAccountAttention = useMemo(() => {
    const profileStatus = String(profile?.status || '').toUpperCase();
    const profileNeedsAttention = Boolean(profile?.status) && profileStatus !== 'ACTIVE';
    return profileNeedsAttention || pendingRequests > 0 || approvedStores === 0;
  }, [approvedStores, pendingRequests, profile?.status]);

  const primaryState = useMemo(() => {
    if (loading) {
      return {
        eyebrow: 'Atualizando',
        title: 'Carregando sua operação',
        description: 'Buscando sua fila, entrega atual e ganhos de hoje.',
        actionLabel: 'Aguarde',
        actionPath: '/motoboy/home',
      };
    }
    if (hasActive) {
      return {
        eyebrow: 'Entrega ativa',
        title: activeOrder?.store?.name || 'Continue sua entrega',
        description: `${DELIVERY_STATUS_LABELS[deliveryStatus] || 'Em andamento'}${activeOrder?.customerName ? ` • ${activeOrder.customerName}` : ''}`,
        actionLabel: 'Continuar entrega',
        actionPath: '/motoboy/delivery',
      };
    }
    if (needsAccountAttention) {
      return {
        eyebrow: 'Antes de operar',
        title: accountStatus.label,
        description:
          pendingRequests > 0
            ? `${pendingRequests} ${pendingRequests === 1 ? 'solicitação' : 'solicitações'} de loja aguardando resposta.`
            : approvedStores === 0
              ? 'Você precisa de pelo menos uma loja aprovada para receber entregas.'
              : 'Complete seu cadastro para liberar a operação.',
        actionLabel: 'Resolver cadastro',
        actionPath: '/motoboy/profile',
      };
    }
    if (queueCount > 0) {
      return {
        eyebrow: 'Fila agora',
        title: `${queueCount} pedido${queueCount === 1 ? '' : 's'} esperando`,
        description: nextOrderLabel || 'Tem pedido novo para você aceitar.',
        actionLabel: 'Abrir fila',
        actionPath: '/motoboy/available',
      };
    }
    return {
      eyebrow: 'Aguardando',
      title: 'Sem pedidos por agora',
      description: 'Se aparecer algo novo, a fila atualiza sozinha.',
      actionLabel: 'Abrir fila',
      actionPath: '/motoboy/available',
    };
  }, [accountStatus.label, activeOrder?.customerName, activeOrder?.store?.name, approvedStores, deliveryStatus, hasActive, loading, needsAccountAttention, nextOrderLabel, pendingRequests, queueCount]);

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
      <MotoboyHeader
        title="Início"
        subtitle={hasActive ? 'Continue pela etapa atual.' : 'Entregas e fila em tempo real.'}
      />

      <section className="premium-card-glass p-4 sm:p-5 motoboy-fade-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{primaryState.eyebrow}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{primaryState.title}</p>
            <p className="mt-1 text-sm text-slate-600">{primaryState.description}</p>
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                Última atualização: <span className="font-semibold text-slate-700">{lastUpdatedLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => void load({ silent: true })}
                className="btn-press inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 font-semibold text-slate-600"
                title="Atualizar agora"
              >
                <ArrowClockwise size={13} weight="bold" className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Atualizando' : 'Atualizar'}</span>
              </button>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                navigate(primaryState.actionPath);
              }}
              disabled={loading}
              className="btn-press w-full lg:w-auto rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {primaryState.actionLabel} <ArrowRight size={18} weight="duotone" />
            </button>
            {needsAccountAttention && primaryState.actionPath !== '/motoboy/profile' ? (
              <button
                type="button"
                onClick={() => navigate('/motoboy/profile')}
                className="btn-press w-full lg:w-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800"
              >
                Resolver cadastro
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {needsAccountAttention && !hasActive ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-extrabold">Conta: {accountStatus.label}</p>
          <p className="mt-1 text-amber-800">
            {pendingRequests > 0
              ? `${pendingRequests} ${pendingRequests === 1 ? 'solicitação' : 'solicitações'} de loja aguardando resposta.`
              : approvedStores === 0
                ? 'Você ainda precisa de uma loja aprovada para operar normalmente.'
                : 'Complete seu cadastro para liberar todas as entregas.'}
          </p>
        </section>
      ) : null}

      <section className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
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
            {Number(earningsToday?.count || 0)} entrega{Number(earningsToday?.count || 0) === 1 ? '' : 's'} concluída{Number(earningsToday?.count || 0) === 1 ? '' : 's'} hoje
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{hasActive ? 'Entrega em andamento' : 'Fila agora'}</p>
            <span className={`h-10 w-10 rounded-xl border inline-flex items-center justify-center ${hasActive ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {hasActive ? <NavigationArrow size={20} weight="duotone" /> : <ListChecks size={20} weight="duotone" />}
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-slate-900">
            {hasActive ? DELIVERY_STATUS_LABELS[deliveryStatus] || 'Em andamento' : `${queueCount} pedido${queueCount === 1 ? '' : 's'}`}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {hasActive ? (activeOrder?.customerName || 'Entrega em rota') : (nextOrderLabel || 'Nenhum pedido no momento')}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Cadastro e lojas</p>
            <span className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 inline-flex items-center justify-center">
              {approvedStores > 0 ? <Storefront size={20} weight="duotone" /> : <ShieldCheck size={20} weight="duotone" />}
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-slate-900">{accountStatus.label}</p>
          <p className="text-xs text-slate-600 mt-1">
            {approvedStores > 0
              ? `${approvedStores} loja${approvedStores === 1 ? '' : 's'} ativa${approvedStores === 1 ? '' : 's'}`
              : 'Nenhuma loja ativa ainda'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/motoboy/profile')}
            className="mt-3 btn-press w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-800"
          >
            Abrir cadastro
          </button>
        </article>
      </section>
    </div>
  );
}
