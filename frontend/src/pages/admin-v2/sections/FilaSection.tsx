// Fila V2 — board kanban dos pedidos ativos (padrão tempo-tasks/ReUI kanban).
// Drag = PATCH /orders/{id}/status (onValueCommit com rollback no erro);
// polling 1,5s visível / 10s oculto (mesma cadência do GrillQueue). Sem
// reimplementar regra: transições vêm do backend, cartão mostra o que há.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CaretRight,
  MagnifyingGlass,
  Printer,
  XCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { orderService } from '../../../services/orderService';
import { formatAddress, formatCurrency, formatOrderDisplayId } from '../../../utils/format';
import { formatSelectedModifiers } from '../../../utils/productModifiers';
import { printReceiptAsImage } from '../../../utils/printReceiptImage';
import { getPaymentMethodMeta } from '../../../utils/paymentAssets';
import { ChargeSheet } from '../../../components/Admin/ChargeSheet';
import { Badge } from '../../../components/reui/badge';
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  KanbanBoard,
} from '../../../components/reui/kanban';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../../components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  formatV2Age,
  getV2AgeTone,
  getV2NextStatus,
  getV2StatusMeta,
  V2_ACTIVE_STATUSES,
  V2_BOARD_COLUMNS,
} from '../v2Orders';

const POLL_VISIBLE_MS = 1500;
const POLL_HIDDEN_MS = 10_000;

type ColumnsState = Record<string, any[]>;

const columnIdForStatus = (status: string): string => {
  const normalized = String(status || '').toLowerCase();
  const column = V2_BOARD_COLUMNS.find((entry) => entry.statuses.includes(normalized as any));
  return column?.id || 'pending';
};

const statusForColumn = (columnId: string, order: any): string => {
  const column = V2_BOARD_COLUMNS.find((entry) => entry.id === columnId);
  if (!column) return 'pending';
  if (column.id === 'ready') {
    const isPostal = String(order?.fulfillmentMode || '').toLowerCase() === 'postal';
    return isPostal ? 'ready' : 'ready_for_delivery';
  }
  return column.statuses[0];
};

const orderTotal = (order: any): number => {
  const direct = Number(order?.total);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return (order?.items || []).reduce(
    (acc: number, item: any) =>
      acc + Number(item?.qty ?? item?.quantity ?? 0) * Number(item?.unitPrice ?? item?.price ?? 0),
    0
  );
};

const AGE_TONE_CLASS: Record<string, string> = {
  ok: 'text-muted-foreground',
  warn: 'text-amber-600 dark:text-amber-400',
  late: 'text-rose-600 dark:text-rose-400',
};

const OrderCard = ({
  order,
  storeSlug,
  onOpen,
  isOverlay,
}: {
  order: any;
  storeSlug: string;
  onOpen: (order: any) => void;
  isOverlay?: boolean;
}) => {
  const meta = getV2StatusMeta(order?.status);
  const tone = getV2AgeTone(order?.createdAt);
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemCount = items.reduce((acc: number, item: any) => acc + Number(item?.qty ?? item?.quantity ?? 0), 0);
  const payment = order?.payment || order?.paymentMethod;
  const paymentMeta = payment ? getPaymentMethodMeta(payment) : null;
  const paid =
    String(order?.paymentStatus || '').toUpperCase() === 'PAID' ||
    String(order?.status || '').toLowerCase() === 'done';

  const card = (
    <Card size="sm" className="gap-0 p-0" aria-label={`Pedido ${formatOrderDisplayId(order?.id, storeSlug)}`}>
      <CardHeader className="flex min-h-10 flex-row items-center gap-2 px-3 py-2.5">
        <CardTitle className="min-w-0 flex-1 truncate text-sm">
          #{formatOrderDisplayId(order?.id, storeSlug)}
        </CardTitle>
        <span className={cn('shrink-0 text-xs font-medium tabular-nums', AGE_TONE_CLASS[tone])}>
          {formatV2Age(order?.createdAt)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3 pb-3">
        <p className="truncate text-sm">
          {String(order?.customerName ?? order?.customer?.name ?? 'Cliente')}
          {order?.table ? ` · mesa ${order.table}` : ''}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          {items[0]?.name ? ` · ${items[0].name}` : ''}
        </p>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold tabular-nums">
            {formatCurrency(orderTotal(order))}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {paymentMeta && (
              <Badge variant="outline" className="text-muted-foreground border-border">
                {paymentMeta.label}
              </Badge>
            )}
            <Badge className={cn(meta.badge, 'border')}>
              {paid ? 'Pago' : meta.label}
            </Badge>
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (isOverlay) return card;
  return (
    <KanbanItem value={String(order.id)} onClick={() => onOpen(order)}>
      <KanbanItemHandle className="block">{card}</KanbanItemHandle>
    </KanbanItem>
  );
};

export const FilaSection = () => {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '');
  const storeSlug = String(auth?.store?.slug || '');
  const storeName = String(auth?.store?.name || 'Minha loja');
  const storePixKey = String(auth?.store?.settings?.pixKey || '');

  const [orders, setOrders] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const draggingRef = useRef(false);
  const searchRef = useRef('');
  searchRef.current = search;

  // ————— polling (1,5s visível / 10s oculto; pausa durante drag) —————
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await orderService.fetchQueue(storeId);
        if (!alive || draggingRef.current) return;
        setOrders(Array.isArray(data) ? data : []);
        setError(false);
        setLastSync(Date.now());
      } catch {
        if (alive) setError(true);
      }
    };
    if (storeId) void load();
    const timer = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') void load();
      },
      document.visibilityState === 'visible' ? POLL_VISIBLE_MS : POLL_HIDDEN_MS
    );
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [storeId]);

  const activeOrders = useMemo(
    () =>
      (orders || [])
        .filter((order) => (V2_ACTIVE_STATUSES as string[]).includes(String(order?.status || '').toLowerCase()))
        .map((order) => ({ ...order, _column: columnIdForStatus(order.status) })),
    [orders]
  );

  const filtered = useMemo(() => {
    const query = searchRef.current.trim().toLowerCase();
    if (!query) return activeOrders;
    return activeOrders.filter(
      (order) =>
        String(order?.customerName ?? order?.customer?.name ?? '')
          .toLowerCase()
          .includes(query) ||
        String(order?.id ?? '').toLowerCase().includes(query) ||
        String(order?.customerPhone ?? order?.phone ?? '').includes(query)
    );
  }, [activeOrders, search]);

  const columns: ColumnsState = useMemo(() => {
    const byColumn: ColumnsState = {};
    for (const column of V2_BOARD_COLUMNS) byColumn[column.id] = [];
    for (const order of filtered) {
      const columnId = order._column;
      (byColumn[columnId] = byColumn[columnId] || []).push(order);
    }
    return byColumn;
  }, [filtered]);

  const applyServerOrders = useCallback((next: any[]) => {
    setOrders(next);
    setLastSync(Date.now());
  }, []);

  // ————— drag = mudança de status (commit único, rollback no erro) —————
  const handleValueChange = (next: ColumnsState) => {
    // preview ao vivo: refletimos no estado local derivado dos orders
    const byId = new Map((orders || []).map((order) => [String(order.id), order]));
    const nextOrders: any[] = [];
    for (const [columnId, items] of Object.entries(next)) {
      for (const item of items) {
        const original = byId.get(String(item.id));
        if (!original) continue;
        nextOrders.push({ ...original, status: statusForColumn(columnId, original) });
      }
    }
    // preserva pedidos que não estão em nenhuma coluna visível (filtro)
    const seen = new Set(nextOrders.map((order) => String(order.id)));
    for (const order of orders || []) {
      if (!seen.has(String(order.id))) nextOrders.push(order);
    }
    setOrders(nextOrders);
  };

  const handleCommit = (next: ColumnsState, meta: any) => {
    const activeId = meta?.event?.active?.id ?? meta?.activeId;
    const targetColumn =
      Object.entries(next).find(([, items]) =>
        items.some((item: any) => String(item.id) === String(activeId))
      )?.[0] || null;
    const order = (orders || []).find((entry) => String(entry.id) === String(activeId));
    if (!order || !targetColumn) return;
    const nextStatus = statusForColumn(targetColumn, order);
    if (String(order.status).toLowerCase() === nextStatus) return;
    void (async () => {
      try {
        await orderService.updateStatus(order.id, nextStatus);
        showToast(`Pedido #${formatOrderDisplayId(order.id, storeSlug)} → ${getV2StatusMeta(nextStatus).label}.`, 'success');
        const refreshed = await orderService.fetchQueue(storeId);
        applyServerOrders(Array.isArray(refreshed) ? refreshed : []);
      } catch (err: any) {
        setOrders(meta.previousValue ? Object.values(meta.previousValue).flat().map((entry: any) => ({ ...entry })) : orders || []);
        // rollback simples: recarrega do servidor
        try {
          const refreshed = await orderService.fetchQueue(storeId);
          applyServerOrders(Array.isArray(refreshed) ? refreshed : []);
        } catch {
          /* mantém erro visível no próximo poll */
        }
        showToast(String(err?.message || 'Não foi possível mover o pedido.'), 'error');
      }
    })();
  };

  const advance = async (order: any) => {
    const next = getV2NextStatus(order?.status, order?.fulfillmentMode);
    if (!next) return;
    setBusy(true);
    try {
      await orderService.updateStatus(order.id, next.status);
      showToast(`Pedido avançado: ${next.label}.`, 'success');
      setSelected(null);
      const refreshed = await orderService.fetchQueue(storeId);
      applyServerOrders(Array.isArray(refreshed) ? refreshed : []);
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível avançar o pedido.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      showToast('Informe o motivo do cancelamento.', 'info');
      return;
    }
    setBusy(true);
    try {
      await orderService.updateStatus(cancelTarget.id, 'cancelled', { reason });
      showToast('Pedido cancelado.', 'success');
      setCancelTarget(null);
      setCancelReason('');
      setSelected(null);
      const refreshed = await orderService.fetchQueue(storeId);
      applyServerOrders(Array.isArray(refreshed) ? refreshed : []);
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível cancelar o pedido.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const printOrder = async (order: any) => {
    setBusy(true);
    try {
      const items = Array.isArray(order?.items) ? order.items : [];
      const result = await printReceiptAsImage({
        storeName: storeName.toUpperCase(),
        platformName: 'Já no Caminho',
        orderLabel: `#${formatOrderDisplayId(order.id, storeSlug)}`,
        customerLabel: String(order?.customerName ?? order?.customer?.name ?? 'Cliente'),
        customerPhone: String(order?.customerPhone ?? order?.phone ?? ''),
        locationLabel: order?.address ? formatAddress(order.address) : '',
        tableLabel: order?.table ? String(order.table) : '',
        dateLabel: order?.createdAt
          ? new Date(order.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          : new Date().toLocaleString('pt-BR'),
        items: items.map((item: any) => ({
          quantity: Number(item?.qty ?? item?.quantity ?? 0),
          name: String(item?.name || 'Item'),
          lineTotal: formatCurrency(
            Number(item?.qty ?? item?.quantity ?? 0) * Number(item?.unitPrice ?? item?.price ?? 0)
          ),
          notes: formatSelectedModifiers(item?.modifiers ?? item?.selectedModifiers).join(' | '),
        })),
        totalLabel: formatCurrency(orderTotal(order)),
      });
      if (result?.mode) {
        void orderService
          .markItemsPrinted(order.id, items.map((item: any) => String(item?.id || '')).filter(Boolean))
          .catch(() => undefined);
        showToast('Cupom enviado para a impressora.', 'success');
      }
    } catch (err: any) {
      showToast(
        String(err?.message || 'Falha ao imprimir. Verifique a impressora e tente novamente.'),
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  const selectedMeta = selected ? getV2NextStatus(selected.status, selected.fulfillmentMode) : null;
  const syncLabel =
    lastSync == null
      ? ''
      : `atualizado ${new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-80">
          <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cliente, telefone ou nº"
            className="pl-8"
            aria-label="Buscar pedidos"
          />
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <Badge className="border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
              conexão instável
            </Badge>
          )}
          <span className="text-muted-foreground text-xs tabular-nums">{syncLabel}</span>
        </div>
      </div>

      {orders === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {V2_BOARD_COLUMNS.map((column) => (
            <Card key={column.id} size="sm" className="gap-2 p-3">
              <p className="text-muted-foreground text-xs font-medium">{column.title}</p>
              <div className="bg-muted h-20 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : (
        <Kanban
          value={columns}
          onValueChange={handleValueChange}
          onValueCommit={handleCommit}
          onDragStart={() => {
            draggingRef.current = true;
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              draggingRef.current = false;
            }, 400);
          }}
          getItemValue={(item) => String(item.id)}
          className="min-h-0 flex-1"
        >
          <KanbanBoard className="min-h-0">
            <div className="flex h-full min-h-0 min-w-full items-stretch gap-3 overflow-x-auto pb-2 max-sm:flex-col max-sm:overflow-visible">
              {V2_BOARD_COLUMNS.map((column) => {
                const items = columns[column.id] || [];
                return (
                  <KanbanColumn
                    key={column.id}
                    value={column.id}
                    className="h-full min-h-0 w-full shrink-0 sm:w-[19rem]"
                  >
                    <Card size="sm" className="flex h-full min-h-0 flex-col gap-0 p-0">
                      <CardHeader className="flex min-h-10 flex-row items-center gap-2 px-3 py-2.5">
                        <CardTitle className="text-sm">{column.title}</CardTitle>
                        <Badge variant="outline" className="ml-auto">
                          {items.length}
                        </Badge>
                      </CardHeader>
                      <CardContent className="min-h-0 flex-1 overflow-y-auto p-2 pt-0">
                        <KanbanColumnContent value={column.id} className="min-h-full gap-2">
                          {items.map((order) => (
                            <OrderCard key={order.id} order={order} storeSlug={storeSlug} onOpen={setSelected} />
                          ))}
                          {items.length === 0 && (
                            <div className="text-muted-foreground flex min-h-20 items-center justify-center rounded-md border border-dashed px-3 text-center text-xs">
                              {search ? 'Nada aqui com esse filtro' : 'Sem pedidos'}
                            </div>
                          )}
                        </KanbanColumnContent>
                      </CardContent>
                    </Card>
                  </KanbanColumn>
                );
              })}
            </div>
          </KanbanBoard>
          <KanbanOverlay>
            {({ value }) => {
              const order = (orders || []).find((entry) => String(entry.id) === String(value));
              return order ? (
                <OrderCard order={order} storeSlug={storeSlug} onOpen={() => undefined} isOverlay />
              ) : null;
            }}
          </KanbanOverlay>
        </Kanban>
      )}

      {/* ————— detalhe do pedido ————— */}
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
                  {formatV2Age(selected.createdAt)} · {formatCurrency(orderTotal(selected))}
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-medium">{String(selected.customerName ?? selected.customer?.name ?? 'Cliente')}</p>
                  {String(selected.customerPhone ?? selected.phone ?? '') && (
                    <p className="text-muted-foreground text-xs">{String(selected.customerPhone ?? selected.phone ?? '')}</p>
                  )}
                  {selected.address && (
                    <p className="text-muted-foreground text-xs">{formatAddress(selected.address)}</p>
                  )}
                  {selected.table && <p className="text-xs">Mesa {selected.table}</p>}
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

                <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                  <p>
                    Pagamento:{' '}
                    {selected.payment
                      ? getPaymentMethodMeta(selected.payment)?.label || selected.payment
                      : '—'}
                    {' · '}
                    {String(selected.paymentStatus || '—').toUpperCase() === 'PAID' ? 'pago' : String(selected.paymentStatus || 'pendente')}
                  </p>
                  {selected.createdAt && (
                    <p>Criado {new Date(selected.createdAt).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t p-3">
                {selectedMeta && (
                  <Button type="button" onClick={() => advance(selected)} disabled={busy}>
                    {selectedMeta.label}
                    <CaretRight className="ml-1 size-4" aria-hidden="true" />
                  </Button>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => printOrder(selected)} disabled={busy}>
                    <Printer className="size-4" aria-hidden="true" />
                    Imprimir
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setChargeOpen(true)} disabled={busy}>
                    Cobrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    onClick={() => setCancelTarget(selected)}
                    disabled={busy}
                  >
                    <XCircle className="size-4" aria-hidden="true" />
                    Cancelar
                  </Button>
                </div>
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
          void orderService.fetchQueue(storeId).then((data: any[]) => applyServerOrders(data || []));
        }}
        storePixKey={storePixKey}
        storeName={storeName}
      />

      {/* ————— cancelamento com motivo ————— */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              O motivo é obrigatório e fica registrado no histórico do pedido.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Ex.: cliente desistiu, endereço fora do raio…"
            aria-label="Motivo do cancelamento"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmCancel}
              disabled={busy || !cancelReason.trim()}
            >
              Cancelar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
