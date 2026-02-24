import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChartLineUp, Clock, CurrencyCircleDollar, Wallet } from '@phosphor-icons/react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

const toCurrency = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function MotoboyEarnings() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tipPayouts, setTipPayouts] = useState<any[]>([]);
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
      const [historyData, tipData] = await Promise.all([
        motoboyService.listHistory(30),
        motoboyService.listTipPayouts(300).catch(() => []),
      ]);
      setOrders(Array.isArray(historyData) ? historyData : []);
      setTipPayouts(Array.isArray(tipData) ? tipData : []);
      setBlocked(false);
      setLastUpdatedAt(Date.now());
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
        setTipPayouts([]);
      } else {
        showToast(error?.message || 'Não foi possível carregar ganhos.', 'error');
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

  const todayKey = new Date().toDateString();
  const deliveriesToday = useMemo(
    () =>
      orders.filter((order) => {
        const createdAt = order.createdAt ? new Date(order.createdAt).toDateString() : '';
        return createdAt === todayKey;
      }),
    [orders, todayKey]
  );

  const totalToday = deliveriesToday.reduce((acc, order) => acc + Number(order.deliveryFee || 0), 0);
  const totalMonth = orders.reduce((acc, order) => acc + Number(order.deliveryFee || 0), 0);
  const avgDeliveryFee = orders.length > 0 ? totalMonth / orders.length : 0;

  const tipRowsPaid = tipPayouts.filter((row) => String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID');
  const tipRowsPending = tipPayouts.filter((row) => String(row?.tipPayoutStatus || '').toUpperCase() !== 'PAID');
  const totalTipsMonth = tipPayouts.reduce((acc, row) => acc + Number(row?.tipAmount || 0), 0);
  const totalTipsPending = tipRowsPending.reduce((acc, row) => acc + Number(row?.tipAmount || 0), 0);
  const totalTipsPaid = tipRowsPaid.reduce((acc, row) => acc + Number(row?.tipAmount || 0), 0);

  const totalGross30d = totalMonth + totalTipsMonth;
  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const recentTipPayouts = useMemo(() => tipPayouts.slice(0, 5), [tipPayouts]);
  const tipsByOrderId = useMemo(() => {
    const map = new Map<string, { tipAmount: number; tipPayoutStatus: string }>();
    (tipPayouts || []).forEach((row: any) => {
      const orderId = String(row?.orderId || '').trim();
      if (!orderId) return;
      const prev = map.get(orderId);
      const currentAmount = Number(row?.tipAmount || 0);
      if (!prev) {
        map.set(orderId, {
          tipAmount: currentAmount,
          tipPayoutStatus: String(row?.tipPayoutStatus || 'PENDING'),
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
        subtitle="Visão financeira da sua operação nos últimos 30 dias."
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

      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro está em análise. Aguarde aprovação para visualizar ganhos.
        </div>
      )}

      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/motoboy/profile')}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700"
        >
          {pendingCount} solicitação{pendingCount === 1 ? '' : 'es'} pendente{pendingCount === 1 ? '' : 's'} de vínculo
        </button>
      )}

      <section className="premium-card-glass p-4 sm:p-5 motoboy-fade-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Resumo financeiro</p>
            <p className="text-sm text-slate-700 mt-1">Atualizado às <span className="font-semibold">{lastUpdatedLabel}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/motoboy/history')}
              className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700"
            >
              Histórico completo
            </button>
            <button
              type="button"
              onClick={() => navigate('/motoboy/profile')}
              className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700"
            >
              Perfil
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total do dia</p>
            <p className="text-2xl font-black text-emerald-600 mt-2">{toCurrency(totalToday)}</p>
            <p className="text-xs text-slate-500 mt-1">{deliveriesToday.length} entrega(s) hoje</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Wallet size={22} weight="duotone" />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Frete 30 dias</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{toCurrency(totalMonth)}</p>
            <p className="text-xs text-slate-500 mt-1">{orders.length} entrega(s) concluída(s)</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <ChartLineUp size={22} weight="duotone" />
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Gorjetas (30 dias)</p>
            <p className="text-2xl font-black text-emerald-700 mt-2">{toCurrency(totalTipsMonth)}</p>
            <p className="text-xs text-emerald-700/80 mt-1">{tipPayouts.length} gorjeta(s) paga(s) por cliente</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/80 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CurrencyCircleDollar size={22} weight="duotone" />
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Repasse pendente</p>
            <p className="text-2xl font-black text-amber-700 mt-2">{toCurrency(totalTipsPending)}</p>
            <p className="text-xs text-amber-700/80 mt-1">{tipRowsPending.length} item(ns) aguardando repasse</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/80 text-amber-700 flex items-center justify-center border border-amber-200">
            <Clock size={22} weight="duotone" />
          </div>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-700">Total bruto 30 dias</p>
            <p className="text-2xl font-black text-blue-700 mt-2">{toCurrency(totalGross30d)}</p>
            <p className="text-xs text-blue-700/80 mt-1">Frete + gorjetas pagas por cliente • ticket frete: {toCurrency(avgDeliveryFee)}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/85 text-blue-700 flex items-center justify-center border border-blue-200">
            <Wallet size={22} weight="duotone" />
          </div>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Últimas entregas (30 dias)</p>
            <button
              type="button"
              onClick={() => navigate('/motoboy/history')}
              className="text-xs font-extrabold text-slate-700 inline-flex items-center gap-1"
            >
              Ver tudo <ArrowRight size={14} weight="bold" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Mostra o total do pedido e o seu ganho real por entrega (frete + gorjeta).
          </p>
          <div className="mt-3">
            {loading ? (
              <div className="grid gap-3">
                <div className="motoboy-skeleton h-[92px]" />
                <div className="motoboy-skeleton h-[92px]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-6">Nenhuma entrega finalizada ainda.</div>
            ) : (
              <div className="grid gap-4">
                {paginatedOrders.map((order) => {
                  const isOpen = expanded.has(order.id);
                  const tipInfo = tipsByOrderId.get(String(order?.id || '')) || { tipAmount: 0, tipPayoutStatus: 'PENDING' };
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      compact={!isOpen}
                      showCourierEarnings
                      tipAmount={tipInfo.tipAmount}
                      tipPayoutStatus={tipInfo.tipPayoutStatus}
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
                        onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
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
                        onClick={() => setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))}
                        disabled={ordersPage >= totalOrdersPages}
                        className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 disabled:opacity-45"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Histórico de repasses</p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Repassado: <span className="font-extrabold">{toCurrency(totalTipsPaid)}</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Aguardando repasse: <span className="font-extrabold">{toCurrency(totalTipsPending)}</span>
          </div>

          {recentTipPayouts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500 text-center">
              Ainda não há gorjetas registradas.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTipPayouts.map((row: any) => {
                const payoutStatus = String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
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
                        {payoutStatus === 'PAID' ? 'Repassado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 flex items-center justify-between gap-2">
                      <span>{toCurrency(Number(row?.tipAmount || 0))}</span>
                      <span>{row?.tipPaidAt ? new Date(row.tipPaidAt).toLocaleDateString('pt-BR') : '-'}</span>
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
