import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CurrencyCircleDollar, Wallet } from '@phosphor-icons/react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

const toCurrency = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function MotoboyEarnings() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tipPayouts, setTipPayouts] = useState<any[]>([]);
  const [earningsToday, setEarningsToday] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ordersPage, setOrdersPage] = useState(1);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const [historyData, tipData, todayData] = await Promise.all([
        motoboyService.listHistory(30),
        motoboyService.listTipPayouts(300).catch(() => []),
        motoboyService.getEarningsToday().catch(() => ({ total: 0, count: 0 })),
      ]);
      setOrders(Array.isArray(historyData) ? historyData : []);
      setTipPayouts(Array.isArray(tipData) ? tipData : []);
      setEarningsToday({
        total: Number(todayData?.total || 0),
        count: Number(todayData?.count || 0),
      });
      setBlocked(false);
      setLastUpdatedAt(Date.now());
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
        setTipPayouts([]);
        setEarningsToday({ total: 0, count: 0 });
      } else {
        showToast(error?.message || 'Nao foi possivel carregar ganhos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [showToast]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await motoboyService.listStoreRequests();
        const requests = Array.isArray(data) ? data : [];
        setPendingCount(requests.filter((req) => req.status === 'PENDING').length);
      } catch {
        setPendingCount(0);
      }
    };
    void loadRequests();
  }, []);

  const totalToday = Number(earningsToday?.total || 0);
  const deliveriesTodayCount = Number(earningsToday?.count || 0);
  const totalDeliveryFees30d = orders.reduce((acc, order) => acc + Number(order.deliveryFee || 0), 0);

  const tipsCutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const tipRows30d = tipPayouts.filter((row) => {
    const dt = row?.tipPaidAt || row?.createdAt;
    if (!dt) return false;
    return new Date(dt).getTime() >= tipsCutoffMs;
  });
  const isDirectTipSettlement = (row: any) => String(row?.tipSettlementMode || '').toUpperCase() === 'DIRECT_MOTOBOY';
  const tipRowsPaid = tipRows30d.filter((row) => String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID');
  const tipRowsPending = tipRows30d.filter((row) => String(row?.tipPayoutStatus || '').toUpperCase() !== 'PAID');
  const totalTipsPaid = tipRowsPaid.reduce((acc, row) => acc + Number(row?.tipAmount || 0), 0);
  const totalTipsPending = tipRowsPending.reduce((acc, row) => acc + Number(row?.tipAmount || 0), 0);
  const totalReceived30d = totalDeliveryFees30d + totalTipsPaid;

  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const recentTipPayouts = useMemo(() => tipPayouts.slice(0, 5), [tipPayouts]);
  const tipsByOrderId = useMemo(() => {
    const map = new Map<string, { tipAmount: number; tipPayoutStatus: string; tipSettlementMode: string }>();
    (tipPayouts || []).forEach((row: any) => {
      const orderId = String(row?.orderId || '').trim();
      if (!orderId) return;
      const prev = map.get(orderId);
      const currentAmount = Number(row?.tipAmount || 0);
      const currentSettlementMode = String(row?.tipSettlementMode || 'STORE_PAYOUT');
      if (!prev) {
        map.set(orderId, {
          tipAmount: currentAmount,
          tipPayoutStatus: String(row?.tipPayoutStatus || 'PENDING'),
          tipSettlementMode: currentSettlementMode,
        });
        return;
      }
      map.set(orderId, {
        tipAmount: prev.tipAmount + currentAmount,
        tipPayoutStatus:
          String(prev.tipPayoutStatus || '').toUpperCase() === 'PAID' &&
          String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID'
            ? 'PAID'
            : 'PENDING',
        tipSettlementMode:
          String(prev.tipSettlementMode || '').toUpperCase() === 'DIRECT_MOTOBOY' ||
          String(currentSettlementMode || '').toUpperCase() === 'DIRECT_MOTOBOY'
            ? 'DIRECT_MOTOBOY'
            : 'STORE_PAYOUT',
      });
    });
    return map;
  }, [tipPayouts]);

  const ordersPerPage = 10;
  const totalOrdersPages = Math.max(1, Math.ceil(orders.length / ordersPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage;
    return orders.slice(start, start + ordersPerPage);
  }, [orders, ordersPage]);

  useEffect(() => {
    if (ordersPage > totalOrdersPages) setOrdersPage(totalOrdersPages);
  }, [ordersPage, totalOrdersPages]);

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
      <MotoboyHeader
        title="Ganhos"
        subtitle="Veja o que entrou para voce e o que ainda falta receber."
        rightAction={
          <button
            type="button"
            onClick={load}
            className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {blocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro esta em analise. Aguarde aprovacao para visualizar ganhos.
        </div>
      ) : null}

      {pendingCount > 0 ? (
        <button
          type="button"
          onClick={() => navigate('/motoboy/profile')}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700"
        >
          {pendingCount} solicitacao{pendingCount === 1 ? '' : 'oes'} pendente{pendingCount === 1 ? '' : 's'} de loja
        </button>
      ) : null}

      <section className="premium-card-glass p-4 sm:p-5 motoboy-fade-up">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Resumo rapido</p>
            <p className="text-sm text-slate-700 mt-1">Atualizado as <span className="font-semibold">{lastUpdatedLabel}</span></p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/motoboy/profile')}
            className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
          >
            Abrir conta
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hoje voce ganhou</p>
            <p className="text-2xl font-black text-emerald-600 mt-2">{toCurrency(totalToday)}</p>
            <p className="text-xs text-slate-500 mt-1">{deliveriesTodayCount} entrega(s) hoje</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Wallet size={22} weight="duotone" />
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Ja caiu para voce</p>
            <p className="text-2xl font-black text-emerald-700 mt-2">{toCurrency(totalReceived30d)}</p>
            <p className="text-xs text-emerald-700/80 mt-1">Frete + gorjetas pagas dos ultimos 30 dias</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/80 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CurrencyCircleDollar size={22} weight="duotone" />
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">A loja ainda vai te pagar</p>
            <p className="text-2xl font-black text-amber-700 mt-2">{toCurrency(totalTipsPending)}</p>
            <p className="text-xs text-amber-700/80 mt-1">{tipRowsPending.length} gorjeta(s) aguardando repasse</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/80 text-amber-700 flex items-center justify-center border border-amber-200">
            <Clock size={22} weight="duotone" />
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        Nos ultimos 30 dias, voce recebeu <span className="font-extrabold text-slate-900">{toCurrency(totalDeliveryFees30d)}</span> de frete e{' '}
        <span className="font-extrabold text-slate-900">{toCurrency(totalTipsPaid)}</span> de gorjetas pagas.
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Ultimas entregas</p>
              <p className="mt-1 text-[11px] text-slate-500">Seu ganho por entrega aparece logo no card.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Ultimos 30 dias
            </span>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="grid gap-3">
                <div className="motoboy-skeleton h-[92px]" />
                <div className="motoboy-skeleton h-[92px]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="ds-empty-state text-center py-6">
                <p className="text-base font-semibold text-slate-800">Nenhuma entrega finalizada ainda</p>
                <p className="mt-1 text-xs text-slate-500">Quando concluir entregas, seus ganhos aparecerao aqui.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {paginatedOrders.map((order) => {
                  const isOpen = expanded.has(order.id);
                  const tipInfo = tipsByOrderId.get(String(order?.id || '')) || {
                    tipAmount: 0,
                    tipPayoutStatus: 'PENDING',
                    tipSettlementMode: 'STORE_PAYOUT',
                  };
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      compact={!isOpen}
                      showCourierEarnings
                      tipAmount={tipInfo.tipAmount}
                      tipPayoutStatus={tipInfo.tipPayoutStatus}
                      tipSettlementMode={tipInfo.tipSettlementMode}
                      actions={
                        <button
                          type="button"
                          onClick={() => {
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(order.id)) next.delete(order.id);
                              else next.add(order.id);
                              return next;
                            });
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
                        >
                          {isOpen ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </button>
                      }
                    />
                  );
                })}

                {orders.length > ordersPerPage ? (
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Mostrando {Math.min((ordersPage - 1) * ordersPerPage + 1, orders.length)}–
                      {Math.min(ordersPage * ordersPerPage, orders.length)} de {orders.length} entregas
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOrdersPage((page) => Math.max(1, page - 1))}
                        disabled={ordersPage <= 1}
                        className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 disabled:opacity-45"
                      >
                        Anterior
                      </button>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700">
                        {ordersPage}/{totalOrdersPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrdersPage((page) => Math.min(totalOrdersPages, page + 1))}
                        disabled={ordersPage >= totalOrdersPages}
                        className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 disabled:opacity-45"
                      >
                        Proxima
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Gorjetas</p>
            <p className="mt-1 text-[11px] text-slate-500">Aqui aparece o que ja foi pago e o que ainda esta pendente.</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Recebido: <span className="font-extrabold">{toCurrency(totalTipsPaid)}</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Falta receber: <span className="font-extrabold">{toCurrency(totalTipsPending)}</span>
          </div>

          {recentTipPayouts.length === 0 ? (
            <div className="ds-empty-state rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
              <p className="text-sm font-semibold text-slate-800">Ainda nao ha gorjetas registradas</p>
              <p className="mt-1 text-xs text-slate-500">As gorjetas pagas pelos clientes aparecerao neste historico.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTipPayouts.map((row: any) => {
                const payoutStatus = String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
                const directTipSettlement = isDirectTipSettlement(row);
                return (
                  <div key={row?.id || `${row?.orderId}-${row?.tipPaidAt}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {row?.storeName || 'Loja'} • Pedido #{String(row?.orderId || '').slice(0, 8)}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          payoutStatus === 'PAID'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {payoutStatus === 'PAID'
                          ? directTipSettlement
                            ? 'Recebida direto'
                            : 'Recebida'
                          : 'Pendente'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 flex items-center justify-between gap-2">
                      <span>{toCurrency(Number(row?.tipAmount || 0))}</span>
                      <span>{row?.tipPaidAt ? new Date(row.tipPaidAt).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {directTipSettlement
                        ? 'A gorjeta caiu direto no seu Mercado Pago conectado.'
                        : payoutStatus === 'PAID'
                          ? 'A loja confirmou o repasse.'
                          : 'A loja ainda vai confirmar esse repasse.'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
