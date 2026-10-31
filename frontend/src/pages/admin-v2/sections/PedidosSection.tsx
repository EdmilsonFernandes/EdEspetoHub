// Histórico V2 — tabela data-grid dos pedidos (padrão tempo-tasks). Ações com
// o MESMO contrato da V1: reembolso/recusa (POST /refund|/refund-deny), cobrar
// (ChargeSheet), auditoria (getPaymentAudit + PaymentAuditPanel/Technical) e
// reabertura (reopenOrder). Sem regra nova.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CaretRight, DownloadSimple, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useTable, type PaginationState, type SortingState, type ColumnDef } from '@tanstack/react-table';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { orderService } from '../../../services/orderService';
import { formatCurrency, formatDateTime, formatOrderDisplayId } from '../../../utils/format';
import { formatSelectedModifiers } from '../../../utils/productModifiers';
import { getPaymentMethodMeta } from '../../../utils/paymentAssets';
import { resolveAssetUrl } from '../../../utils/resolveAssetUrl';
import { ChargeSheet } from '../../../components/Admin/ChargeSheet';
import { PaymentAuditPanel } from '../../../components/Admin/PaymentAuditPanel';
import { PaymentTechnicalModal } from '../../../components/Admin/PaymentTechnicalModal';
import { Badge } from '../../../components/reui/badge';
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '../../../components/reui/data-grid/data-grid-column-header';
import { DataGridPagination } from '../../../components/reui/data-grid/data-grid-pagination';
import { DataGridScrollArea } from '../../../components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle } from '../../../components/reui/frame';
import { Button } from '../../../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../../../components/ui/input-group';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../components/ui/sheet';
import { cn } from '@/lib/utils';
import { getV2StatusMeta } from '../v2Orders';
import { V2LoadingRegion } from '../v2ui';

const HISTORY_STATUSES = 'done,delivered,finished,cancelled';

type StatusFilter = 'all' | 'done' | 'cancelled' | 'refunds';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'done', label: 'Concluídos' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'refunds', label: 'Reembolsos' },
];

type PeriodFilter = 7 | 30 | 90 | 0;

const PERIOD_FILTERS: Array<{ value: PeriodFilter; label: string }> = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 0, label: 'Tudo' },
];

const orderTotal = (order: any): number => {
  const direct = Number(order?.total);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return (order?.items || []).reduce(
    (acc: number, item: any) =>
      acc + Number(item?.qty ?? item?.quantity ?? 0) * Number(item?.unitPrice ?? item?.price ?? 0),
    0
  );
};

const refundStatusOf = (order: any) =>
  order?.refundStatus || order?.onlinePayment?.refundStatus || order?.payment?.refundStatus || null;

export const PedidosSection = () => {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '');
  const storeSlug = String(auth?.store?.slug || '');
  const storeName = String(auth?.store?.name || 'Minha loja');
  const storePixKey = String(auth?.store?.settings?.pixKey || '');

  const [orders, setOrders] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>(30);
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const [selected, setSelected] = useState<any | null>(null);
  const [audit, setAudit] = useState<any | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    const options: any = { statuses: HISTORY_STATUSES };
    if (period > 0) {
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
      options.startDate = startDate.toISOString().slice(0, 10);
    }
    setError(false);
    orderService
      .fetchAll(storeId, options)
      .then((list: any[]) => setOrders(Array.isArray(list) ? list : []))
      .catch(() => setError(true));
  }, [storeId, period]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll suave (30s visível — mesma cadência da V1 para o histórico).
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !selected && !chargeOpen) load();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [load, selected, chargeOpen]);

  const loadAudit = useCallback(
    async (orderId: string) => {
      setAuditLoading(true);
      try {
        const payload = await orderService.getPaymentAudit(storeId, orderId);
        setAudit(payload || null);
        return payload;
      } catch {
        setAudit(null);
        return null;
      } finally {
        setAuditLoading(false);
      }
    },
    [storeId]
  );

  const openDetail = (order: any) => {
    setSelected(order);
    setAudit(null);
    if (order?.onlinePayment) void loadAudit(String(order.id));
  };

  const visible = useMemo(() => {
    let list = orders || [];
    if (statusFilter === 'done') list = list.filter((o) => String(o.status) !== 'cancelled');
    if (statusFilter === 'cancelled') list = list.filter((o) => String(o.status) === 'cancelled');
    if (statusFilter === 'refunds') list = list.filter((o) => refundStatusOf(o));
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      list = list.filter(
        (order) =>
          String(order?.customerName ?? order?.customer?.name ?? '').toLowerCase().includes(normalized) ||
          String(order?.id ?? '').toLowerCase().includes(normalized) ||
          String(order?.customerPhone ?? order?.phone ?? '').includes(normalized)
      );
    }
    return list;
  }, [orders, statusFilter, query]);

  const columns = useMemo<ColumnDef<DataGridFeatures, any>[]>(() => {
    const base: ColumnDef<DataGridFeatures, any>[] = [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Pedido" />
        ),
        cell: ({ row }) => {
          const thumb = (row.original?.items || []).find((item: any) => item?.imageUrl)?.imageUrl;
          const thumbUrl = thumb ? resolveAssetUrl(thumb) : '';
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt=""
                  className="border-border size-9 shrink-0 rounded-md border object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-xs">
                  №
                </span>
              )}
              <div className="min-w-0">
                <button
                  type="button"
                  className="hover:text-primary block max-w-full truncate text-left text-sm font-medium underline-offset-2 transition-colors hover:underline"
                  onClick={() => openDetail(row.original)}
                >
                  #{formatOrderDisplayId(row.original.id, storeSlug)}
                </button>
                <div className="text-muted-foreground truncate text-xs">
                  {row.original.createdAt ? formatDateTime(row.original.createdAt) : '—'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Cliente" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">
              {String(row.original?.customerName ?? row.original?.customer?.name ?? 'Cliente')}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {String(row.original?.customerPhone ?? row.original?.phone ?? '')}
            </div>
          </div>
        ),
      },
      {
        id: 'items',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Itens" />,
        cell: ({ row }) => {
          const count = (row.original?.items || []).reduce(
            (acc: number, item: any) => acc + Number(item?.qty ?? item?.quantity ?? 0),
            0
          );
          return <span className="text-muted-foreground text-sm tabular-nums">{count}</span>;
        },
      },
      {
        accessorKey: 'total',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">{formatCurrency(orderTotal(row.original))}</span>
        ),
      },
      {
        id: 'payment',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Pagamento" />,
        cell: ({ row }) => {
          const order = row.original;
          const meta = order?.payment ? getPaymentMethodMeta(order.payment) : null;
          const status = String(order?.paymentStatus || '').toUpperCase();
          const refund = refundStatusOf(order);
          return (
            <span className="flex flex-wrap items-center gap-1">
              {meta && <Badge variant="outline" className="text-muted-foreground border-border">{meta.label}</Badge>}
              {status === 'PAID' && !refund && (
                <Badge className="border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Pago</Badge>
              )}
              {refund && refund !== 'DENIED' && (
                <Badge className="border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  Reembolso
                </Badge>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const meta = getV2StatusMeta(row.original?.status);
          return <Badge className={cn(meta.badge, 'border')}>{meta.label}</Badge>;
        },
      },
      {
        id: 'actions',
        header: () => <span className="text-muted-foreground text-xs font-medium">Ações</span>,
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openDetail(row.original)}>
            Ver
            <CaretRight className="ml-0.5 size-3.5" aria-hidden="true" />
          </Button>
        ),
      },
    ];
    return base;
    // openDetail muda a cada render; colunas dependem só de storeSlug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  const pageCount = Math.max(Math.ceil(visible.length / pagination.pageSize), 1);
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useTable({
    features: dataGridFeatures,
    data: visible,
    columns,
    pageCount,
    state: { pagination: { ...pagination, pageIndex }, sorting },
    getRowId: (row: any) => String(row.id),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  const exportCsv = () => {
    const rows = visible;
    if (rows.length === 0) return;
    const header = ['pedido', 'data', 'cliente', 'telefone', 'itens', 'total', 'pagamento', 'status'];
    const lines = rows.map((order) =>
      [
        `#${formatOrderDisplayId(order.id, storeSlug)}`,
        order?.createdAt ? formatDateTime(order.createdAt) : '',
        String(order?.customerName ?? order?.customer?.name ?? ''),
        String(order?.customerPhone ?? order?.phone ?? ''),
        String((order?.items || []).length),
        String(orderTotal(order).toFixed(2)),
        String(order?.payment ?? ''),
        String(order?.status ?? ''),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const postJson = async (path: string, body: any) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth?.token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.details?.message || err?.error || err?.message || 'Falha na operação.');
    }
    return response.json();
  };

  const submitRefund = async () => {
    if (!selected || !refundReason.trim()) return;
    setBusy(true);
    try {
      const body: any = { reason: refundReason.trim() };
      if (refundType === 'partial' && refundAmount) body.amount = Number(refundAmount);
      const data = await postJson(`/api/stores/${storeId}/orders/${selected.id}/refund`, body);
      showToast(
        data?.refundStatus === 'PARTIALLY_REFUNDED'
          ? 'Reembolso parcial processado.'
          : 'Reembolso processado.',
        'success'
      );
      setRefundOpen(false);
      setRefundReason('');
      setRefundAmount('');
      setSelected(null);
      load();
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível processar o reembolso.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitDeny = async () => {
    if (!selected || !denyReason.trim()) return;
    setBusy(true);
    try {
      await postJson(`/api/stores/${storeId}/orders/${selected.id}/refund-deny`, {
        reason: denyReason.trim(),
      });
      showToast('Reembolso recusado.', 'success');
      setDenyOpen(false);
      setDenyReason('');
      setSelected(null);
      load();
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível recusar o reembolso.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitReopen = async () => {
    if (!selected || !reopenReason.trim()) return;
    setBusy(true);
    try {
      await orderService.reopenOrder(selected.id, { reason: reopenReason.trim() });
      showToast('Pedido reaberto — ele volta para a fila.', 'success');
      setReopenOpen(false);
      setReopenReason('');
      setSelected(null);
      load();
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível reabrir o pedido.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const summaryLabel =
    orders === null
      ? 'Carregando pedidos…'
      : `${visible.length} ${visible.length === 1 ? 'pedido' : 'pedidos'}${
          period > 0 ? ` · últimos ${period} dias` : ' · todo o período'
        }`;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1180px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted inline-flex items-center rounded-lg p-0.5" role="group" aria-label="Filtro de status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setStatusFilter(filter.id);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              className={
                statusFilter === filter.id
                  ? 'bg-background text-foreground rounded-md px-3 py-1.5 text-xs font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium'
              }
              aria-pressed={statusFilter === filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select
          className="border-input bg-background h-9 rounded-lg border px-2 text-xs"
          value={period}
          onChange={(event) => setPeriod(Number(event.target.value) as PeriodFilter)}
          aria-label="Período"
        >
          {PERIOD_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={!visible.length}>
          <DownloadSimple className="size-4" aria-hidden="true" />
          CSV
        </Button>
      </div>

      {error ? (
        <div className="border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400 flex items-center gap-2 rounded-lg border p-4 text-sm">
          Não foi possível carregar o histórico.
          <button type="button" className="underline underline-offset-2" onClick={load}>
            Tentar de novo
          </button>
        </div>
      ) : orders === null ? (
        <V2LoadingRegion rows={6} />
      ) : (
        <DataGrid
          table={table}
          recordCount={visible.length}
          emptyMessage="Nenhum pedido encontrado com esses filtros."
          tableLayout={{
            dense: true,
            rowBorder: true,
            headerSticky: false,
            columnsVisibility: false,
            columnsResizable: true,
            columnsMovable: false,
            width: 'fixed',
          }}
        >
          <Frame className="min-w-0">
            <FrameHeader className="flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-px">
                <FrameTitle>Histórico de pedidos</FrameTitle>
                <FrameDescription>{summaryLabel}</FrameDescription>
              </div>
              <InputGroup className="w-full sm:w-64">
                <InputGroupAddon>
                  <MagnifyingGlass className="text-muted-foreground size-4" aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                  }}
                  placeholder="Buscar cliente, telefone ou nº"
                  aria-label="Buscar no histórico"
                />
                {query.length > 0 && (
                  <InputGroupAddon align="inline-end">
                    <button
                      type="button"
                      aria-label="Limpar busca"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setQuery('')}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </FrameHeader>
            <FramePanel className="p-0!">
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </FramePanel>
            <FrameFooter>
              <DataGridPagination sizes={[10, 25, 50]} info="{from} - {to} de {count} pedidos" className="py-0" />
            </FrameFooter>
          </Frame>
        </DataGrid>
      )}

      {/* ————— detalhe ————— */}
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md" side="right">
          {selected && (
            <>
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="flex items-center gap-2">
                  Pedido #{formatOrderDisplayId(selected.id, storeSlug)}
                  <Badge className={cn(getV2StatusMeta(selected.status).badge, 'border')}>
                    {getV2StatusMeta(selected.status).label}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-muted-foreground text-xs tabular-nums">
                  {selected.createdAt ? formatDateTime(selected.createdAt) : ''} ·{' '}
                  {formatCurrency(orderTotal(selected))}
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-medium">{String(selected.customerName ?? selected.customer?.name ?? 'Cliente')}</p>
                  {String(selected.customerPhone ?? selected.phone ?? '') && (
                    <p className="text-muted-foreground text-xs">{String(selected.customerPhone ?? selected.phone ?? '')}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Itens</h4>
                  {(selected.items || []).map((item: any, index: number) => {
                    const modifiers = formatSelectedModifiers(item?.modifiers ?? item?.selectedModifiers);
                    return (
                      <div key={item?.id ?? index} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">
                            <span className="font-medium tabular-nums">{Number(item?.qty ?? item?.quantity ?? 0)}×</span>{' '}
                            {String(item?.name || 'Item')}
                          </p>
                          {modifiers.length > 0 && (
                            <p className="text-muted-foreground text-xs">{modifiers.join(' · ')}</p>
                          )}
                        </div>
                        <span className="shrink-0 tabular-nums">
                          {formatCurrency(
                            Number(item?.qty ?? item?.quantity ?? 0) * Number(item?.unitPrice ?? item?.price ?? 0)
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(orderTotal(selected))}</span>
                  </div>
                </div>

                {selected.onlinePayment && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Pagamento</h4>
                    {auditLoading ? (
                      <V2LoadingRegion rows={1} />
                    ) : (
                      <PaymentAuditPanel
                        title="Informações de pagamento do pedido"
                        summary={audit?.summary}
                        events={audit?.events || []}
                        showTechnicalButton
                        technicalLoading={auditLoading}
                        onTechnicalClick={async () => {
                          const payload = audit || (await loadAudit(String(selected.id)));
                          if (payload) setTechnicalOpen(true);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 border-t p-3">
                {String(selected.paymentStatus || '').toUpperCase() !== 'PAID' && (
                  <Button type="button" onClick={() => setChargeOpen(true)} disabled={busy}>
                    Cobrar
                  </Button>
                )}
                {refundStatusOf(selected) && refundStatusOf(selected) !== 'DENIED' && (
                  <Button type="button" variant="outline" onClick={() => setDenyOpen(true)} disabled={busy}>
                    Recusar reembolso
                  </Button>
                )}
                {String(selected.status || '').toLowerCase() !== 'cancelled' && !refundStatusOf(selected) && (
                  <Button type="button" variant="outline" onClick={() => setRefundOpen(true)} disabled={busy}>
                    Reembolsar
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setReopenOpen(true)} disabled={busy}>
                  Reabrir
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ChargeSheet
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        storeId={storeId}
        order={selected}
        onPaid={() => {
          setChargeOpen(false);
          load();
        }}
        storePixKey={storePixKey}
        storeName={storeName}
      />

      <PaymentTechnicalModal
        open={technicalOpen}
        title="Detalhes técnicos do pagamento"
        audit={audit}
        onClose={() => setTechnicalOpen(false)}
      />

      {/* ————— modais de reembolso / recusa / reabertura ————— */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reembolsar pedido</DialogTitle>
            <DialogDescription>O valor volta pelo mesmo meio de pagamento.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="bg-muted inline-flex w-fit items-center rounded-lg p-0.5" role="group" aria-label="Tipo de reembolso">
              {(['full', 'partial'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRefundType(type)}
                  className={
                    refundType === type
                      ? 'bg-background text-foreground rounded-md px-3 py-1.5 text-xs font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium'
                  }
                  aria-pressed={refundType === type}
                >
                  {type === 'full' ? 'Total' : 'Parcial'}
                </button>
              ))}
            </div>
            {refundType === 'partial' && (
              <label className="flex flex-col gap-1.5 text-sm">
                Valor (R$)
                <input
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              Motivo
              <textarea
                className="border-input bg-background min-h-16 rounded-md border px-3 py-2 text-sm"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Ex.: item indisponível…"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
              Voltar
            </Button>
            <Button type="button" onClick={submitRefund} disabled={busy || !refundReason.trim()}>
              Confirmar reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar reembolso</DialogTitle>
            <DialogDescription>Registre o motivo da recusa.</DialogDescription>
          </DialogHeader>
          <textarea
            className="border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm"
            value={denyReason}
            onChange={(event) => setDenyReason(event.target.value)}
            placeholder="Ex.: pedido entregue conforme…"
            aria-label="Motivo da recusa"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDenyOpen(false)}>
              Voltar
            </Button>
            <Button type="button" onClick={submitDeny} disabled={busy || !denyReason.trim()}>
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir pedido</DialogTitle>
            <DialogDescription>O pedido volta para a fila com o motivo registrado.</DialogDescription>
          </DialogHeader>
          <textarea
            className="border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm"
            value={reopenReason}
            onChange={(event) => setReopenReason(event.target.value)}
            placeholder="Ex.: cliente devolveu por item errado…"
            aria-label="Motivo da reabertura"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReopenOpen(false)}>
              Voltar
            </Button>
            <Button type="button" onClick={submitReopen} disabled={busy || !reopenReason.trim()}>
              Reabrir pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
