// Resumo V2 — home do painel. Dados 100% reais:
// dashboard-analytics (receita/pedidos/ticket/delta/métodos/recorde), fila
// (fetchQueue), avaliações (summary + pendentes de resposta), estoque (alerts)
// e assinatura (sessão). Plano ReUI: operational · dashboard grid · Frame-led.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowsClockwise, Star } from '@phosphor-icons/react';
import { useAuth } from '../../../contexts/AuthContext';
import { orderService } from '../../../services/orderService';
import { productService } from '../../../services/productService';
import { storeService } from '../../../services/storeService';
import { formatCurrency } from '../../../utils/format';
import { ADMIN_V2_BASE } from '../../../navigation/adminV2Routes';
import { Badge } from '../../../components/reui/badge';
import { Button } from '../../../components/ui/Button';
import { FramePanel } from '../../../components/reui/frame';
import {
  formatV2Age,
  getV2StatusMeta,
  V2_ACTIVE_STATUSES,
} from '../v2Orders';
import { V2DeltaChip, V2EmptyRegion, V2ErrorRegion, V2LoadingRegion, V2MetricTile } from '../v2ui';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  debito: 'Débito (maquininha)',
  debito_presencial: 'Débito (maquininha)',
  credito: 'Crédito',
  credito_presencial: 'Crédito (maquininha)',
  pix: 'Pix',
  pix_loja: 'Pix (chave da loja)',
  dinheiro: 'Dinheiro',
  outros: 'Outros',
};

const paymentMethodLabel = (method: unknown) =>
  PAYMENT_METHOD_LABELS[String(method ?? '').trim().toLowerCase()] ||
  String(method || 'Outros')
    .replace(/_/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const deltaPct = (current: unknown, previous: unknown): number | null => {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p <= 0 || c < 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
};

const shortDate = (dateKey: string) => {
  const iso = String(dateKey || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

type PeriodOption = 7 | 30;

const PERIOD_OPTIONS: Array<{ value: PeriodOption; label: string }> = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
];

export const ResumoSection = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const storeId = String(auth?.store?.id || '');
  const storeName = String(auth?.store?.name || 'sua loja');

  const [period, setPeriod] = useState<PeriodOption>(7);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [queue, setQueue] = useState<any[] | null>(null);
  const [queueError, setQueueError] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<any | null>(null);
  const [pendingReviews, setPendingReviews] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<number | null>(null);

  const loadAnalytics = useCallback(() => {
    if (!storeId) return;
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    storeService
      .getDashboardAnalytics(storeId, { periodDays: period })
      .then((data: any) => setAnalytics(data || null))
      .catch(() => setAnalyticsError(true))
      .finally(() => setAnalyticsLoading(false));
  }, [storeId, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    orderService
      .fetchQueue(storeId)
      .then((orders: any[]) => {
        if (alive) setQueue(Array.isArray(orders) ? orders : []);
      })
      .catch(() => alive && setQueueError(true));
    orderService
      .getReviewSummaryByStore(storeId)
      .then((data: any) => {
        if (!alive) return;
        setReviewSummary(data || null);
        return orderService.listReviewsByStore(storeId, 30);
      })
      .then((reviews: any) => {
        if (!alive || !Array.isArray(reviews)) return;
        setPendingReviews(reviews.filter((review: any) => !review?.reply && !review?.hidden).length);
      })
      .catch(() => undefined);
    productService
      .getInventoryAlerts(storeId)
      .then((alerts: any) => {
        if (!alive) return;
        const items = Array.isArray(alerts) ? alerts : (alerts?.items ?? alerts?.alerts ?? []);
        setLowStock(items.length);
      })
      .catch(() => alive && setLowStock(null));
    return () => {
      alive = false;
    };
  }, [storeId]);

  const metrics = useMemo(() => {
    const summary = analytics?.summary || null;
    const comparison = analytics?.comparison || null;
    const current = comparison?.current || null;
    const previous = comparison?.previous || null;
    const periodStats =
      current && Number(current.orders) > 0
        ? { orders: Number(current.orders), revenue: Number(current.revenue || 0) }
        : null;
    return {
      revenue: periodStats
        ? periodStats.revenue
        : Number(summary?.periodRevenue ?? summary?.totalRevenue ?? 0),
      orders: periodStats ? periodStats.orders : Number(summary?.totalOrders ?? 0),
      ticket:
        periodStats && periodStats.orders > 0
          ? periodStats.revenue / periodStats.orders
          : Number(summary?.avgTicket ?? 0),
      deltas: {
        revenue: current && previous ? deltaPct(current.revenue, previous.revenue) : null,
        orders: current && previous ? deltaPct(current.orders, previous.orders) : null,
        ticket:
          current && previous && Number(previous.orders) > 0
            ? deltaPct(
                Number(current.revenue || 0) / Number(current.orders || 1),
                Number(previous.revenue || 0) / Number(previous.orders || 1)
              )
            : null,
      },
    };
  }, [analytics]);

  const chartData = useMemo(() => {
    const rows = Array.isArray(analytics?.salesByDay) ? analytics.salesByDay : [];
    return rows
      .map((row: any) => ({
        label: shortDate(String(row?.date || '')),
        total: Number(row?.total || 0),
      }))
      .sort((a: any, b: any) => (String(a.label) > String(b.label) ? 1 : -1));
  }, [analytics]);

  const paymentRows = useMemo(() => {
    const rows = Array.isArray(analytics?.byPaymentMethod) ? analytics.byPaymentMethod : [];
    const totalOrders = rows.reduce((acc: number, row: any) => acc + Number(row?.orders || 0), 0);
    return rows
      .map((row: any) => {
        const orders = Number(row?.orders || 0);
        return {
          method: String(row?.method || 'outros'),
          label: paymentMethodLabel(row?.method),
          orders,
          revenue: Number(row?.revenue || 0),
          pct: totalOrders > 0 ? (orders / totalOrders) * 100 : 0,
        };
      })
      .sort((a: any, b: any) => b.orders - a.orders)
      .slice(0, 5);
  }, [analytics]);

  const rating = useMemo(() => {
    const average = Number(reviewSummary?.average ?? reviewSummary?.avg ?? 0);
    if (!Number.isFinite(average) || average <= 0) return null;
    return Math.round(average * 10) / 10;
  }, [reviewSummary]);

  const activeQueue = useMemo(
    () =>
      (queue || [])
        .filter((order) => (V2_ACTIVE_STATUSES as string[]).includes(String(order?.status || '').toLowerCase()))
        .sort((a, b) => (Date.parse(String(b?.createdAt || '')) || 0) - (Date.parse(String(a?.createdAt || '')) || 0)),
    [queue]
  );

  const attentions = useMemo(() => {
    const items: Array<{ id: string; label: string; hint: string; cta: string; to: string }> = [];
    if (activeQueue.length > 0) {
      const oldest = activeQueue[activeQueue.length - 1];
      items.push({
        id: 'queue',
        label: `${activeQueue.length} ${activeQueue.length === 1 ? 'pedido em aberto' : 'pedidos em abertos'}`,
        hint: `mais antigo ${formatV2Age(oldest?.createdAt)}`,
        cta: 'Abrir fila',
        to: `${ADMIN_V2_BASE}/fila`,
      });
    }
    if (pendingReviews != null && pendingReviews > 0) {
      items.push({
        id: 'reviews',
        label: `${pendingReviews} ${pendingReviews === 1 ? 'avaliação sem resposta' : 'avaliações sem resposta'}`,
        hint: 'responder melhora sua vitrine',
        cta: 'Responder',
        to: `${ADMIN_V2_BASE}/avaliacoes`,
      });
    }
    if (lowStock != null && lowStock > 0) {
      items.push({
        id: 'stock',
        label: `${lowStock} ${lowStock === 1 ? 'produto com estoque baixo' : 'produtos com estoque baixo'}`,
        hint: 'repõe antes de esgotar',
        cta: 'Ver estoque',
        to: `${ADMIN_V2_BASE}/estoque`,
      });
    }
    const status = String(auth?.subscription?.status || '').toUpperCase();
    if (!auth?.subscription?.planExempt && ['EXPIRED', 'SUSPENDED', 'CANCELLED'].includes(status)) {
      items.push({
        id: 'subscription',
        label: 'Assinatura precisa de atenção',
        hint: `status ${status.toLowerCase()}`,
        cta: 'Regularizar',
        to: `${ADMIN_V2_BASE}/assinatura`,
      });
    }
    return items;
  }, [activeQueue, pendingReviews, lowStock, auth?.subscription]);

  const pixHealth = analytics?.pixHealth || null;
  const showPixAlert = pixHealth && Number(pixHealth.failed) >= 3 && Number(pixHealth.failed) > Number(pixHealth.paid);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {greeting}, {storeName}
          </h2>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </p>
        </div>
        <div className="bg-muted inline-flex items-center rounded-lg p-0.5" role="group" aria-label="Período">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={
                period === option.value
                  ? 'bg-background text-foreground rounded-md px-3 py-1.5 text-xs font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium'
              }
              aria-pressed={period === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {showPixAlert && (
        <div className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm" role="alert">
          <span>
            Pix com {pixHealth.failed} tentativas falhas × {pixHealth.paid} pagos no período — vale
            conferir a conexão do gateway.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`${ADMIN_V2_BASE}/gateway`)}
          >
            Ver pagamentos online
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <FramePanel key={index} className="flex flex-col gap-2 p-4">
              <div className="bg-muted h-3 w-20 rounded" />
              <div className="bg-muted h-7 w-28 rounded" />
            </FramePanel>
          ))
        ) : analyticsError ? (
          <FramePanel className="col-span-full p-4">
            <V2ErrorRegion message="Não foi possível carregar os números da loja." onRetry={loadAnalytics} />
          </FramePanel>
        ) : (
          <>
            <V2MetricTile
              label="Receita do período"
              value={formatCurrency(metrics.revenue)}
              delta={<V2DeltaChip pct={metrics.deltas.revenue} />}
              hint="vs. anterior"
            />
            <V2MetricTile
              label="Pedidos"
              value={String(metrics.orders)}
              delta={<V2DeltaChip pct={metrics.deltas.orders} />}
              hint="vs. anterior"
            />
            <V2MetricTile
              label="Ticket médio"
              value={formatCurrency(metrics.ticket)}
              delta={<V2DeltaChip pct={metrics.deltas.ticket} />}
              hint="vs. anterior"
            />
            <V2MetricTile
              label="Avaliação média"
              value={rating ? `${rating.toFixed(1)} / 5` : '—'}
              hint={rating ? 'dos seus clientes' : 'sem avaliações ainda'}
              delta={
                rating ? (
                  <span className="text-amber-500 inline-flex items-center gap-0.5 text-xs">
                    <Star weight="fill" className="size-3" aria-hidden="true" />
                  </span>
                ) : null
              }
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FramePanel className="flex flex-col gap-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Receita por dia</h3>
            <span className="text-muted-foreground text-xs">últimos {period} dias</span>
          </div>
          {analyticsLoading ? (
            <V2LoadingRegion rows={1} className="h-[220px] [&>div]:h-full" />
          ) : chartData.length === 0 ? (
            <V2EmptyRegion
              title="Sem vendas no período"
              hint="Os pedidos aparecem aqui conforme entram."
            />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="v2RevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground, #64748b)' }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    width={56}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground, #64748b)' }}
                    tickFormatter={(value: number) =>
                      value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--color-primary)', strokeDasharray: '4 4' }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Receita']}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid var(--color-border, #e2e8f0)',
                      background: 'var(--color-background, #fff)',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#v2RevenueFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </FramePanel>

        <FramePanel className="flex flex-col gap-3 p-4">
          <h3 className="text-sm font-semibold">Como o cliente pagou</h3>
          {analyticsLoading ? (
            <V2LoadingRegion rows={4} />
          ) : paymentRows.length === 0 ? (
            <V2EmptyRegion title="Sem pagamentos no período" />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentRows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground, #64748b)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-muted, #f1f5f9)' }}
                    formatter={(_value: any, _name: any, entry: any) => [
                      `${entry?.payload?.orders ?? 0} pedidos · ${formatCurrency(Number(entry?.payload?.revenue) || 0)}`,
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid var(--color-border, #e2e8f0)',
                      background: 'var(--color-background, #fff)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="orders" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </FramePanel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FramePanel className="flex flex-col gap-3 p-4">
          <h3 className="text-sm font-semibold">Precisa de atenção</h3>
          {attentions.length === 0 ? (
            <V2EmptyRegion title="Tudo em ordem" hint="Nenhuma pendência no momento." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attentions.map((attention) => (
                <li key={attention.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{attention.label}</p>
                    <p className="text-muted-foreground truncate text-xs">{attention.hint}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => navigate(attention.to)}
                  >
                    {attention.cta}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </FramePanel>

        <FramePanel className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pedidos em andamento</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${ADMIN_V2_BASE}/fila`)}
            >
              Ver fila
              <ArrowsClockwise className="ml-1 size-3.5" aria-hidden="true" />
            </Button>
          </div>
          {queueError ? (
            <V2ErrorRegion message="Não foi possível carregar a fila." onRetry={() => navigate(`${ADMIN_V2_BASE}/fila`)} />
          ) : queue === null ? (
            <V2LoadingRegion rows={4} />
          ) : activeQueue.length === 0 ? (
            <V2EmptyRegion
              title="Nenhum pedido em andamento"
              hint="Quando entrar um pedido, ele aparece aqui."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {activeQueue.slice(0, 6).map((order) => {
                const meta = getV2StatusMeta(order?.status);
                const total = Number(
                  order?.total ?? (order?.items || []).reduce(
                    (acc: number, item: any) => acc + Number(item?.qty ?? item?.quantity ?? 0) * Number(item?.unitPrice ?? item?.price ?? 0),
                    0
                  )
                );
                return (
                  <li key={order?.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        #{String(order?.displayId ?? order?.id ?? '').slice(-6)} ·{' '}
                        {String(order?.customerName ?? order?.customer?.name ?? 'Cliente')}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {formatCurrency(Number.isFinite(total) ? total : 0)} · {formatV2Age(order?.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0">
                      <Badge className={`${meta.badge} border`}>{meta.label}</Badge>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </FramePanel>
      </div>
    </div>
  );
};
