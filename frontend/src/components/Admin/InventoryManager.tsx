// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsClockwise, WarningCircle, Package, TrendDown, TrendUp, Info } from '@phosphor-icons/react';
import { productService } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

type InventoryItem = {
  id: string;
  name: string;
  category?: string;
  active?: boolean;
  manageStock?: boolean;
  stockQuantity?: number;
  lowStockAlert?: number;
  inventoryStatus?: 'ok' | 'low' | 'out' | 'not_managed';
};

const statusMeta: Record<string, { label: string; className: string }> = {
  out: { label: 'Esgotado', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  low: { label: 'Baixo estoque', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ok: { label: 'OK', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  not_managed: { label: 'Sem controle', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const movementMeta: Record<string, { label: string; className: string }> = {
  manual_in: { label: 'Entrada manual', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  manual_out: { label: 'Saída manual', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  manual_set_increase: { label: 'Ajuste de inventário (aumentou)', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  manual_set_decrease: { label: 'Ajuste de inventário (reduziu)', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  sale: { label: 'Venda', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  order_cancel_restock: { label: 'Reposição por cancelamento', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  order_items_adjust_consume: { label: 'Ajuste de pedido (consumo)', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  order_items_adjust_restock: { label: 'Ajuste de pedido (reposição)', className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const resolveMovementMeta = (type: unknown) => {
  const key = String(type || '').trim();
  if (movementMeta[key]) return movementMeta[key];
  return {
    label: key ? key.replace(/_/g, ' ') : 'Movimentação',
    className: 'bg-slate-50 text-slate-700 border-slate-200',
  };
};

const resolveMovementOrigin = (movement: any) => {
  const type = String(movement?.movementType || '').trim();
  const actorName = String(movement?.actorName || '').trim();
  const actorRole = String(movement?.actorRole || '').trim().toUpperCase();
  if (actorName) {
    const roleLabel =
      actorRole === 'ADMIN' || actorRole === 'STORE_OWNER'
        ? 'Admin'
        : actorRole === 'OPERATOR' || actorRole === 'CHURRASQUEIRO'
        ? 'Operador'
        : 'Usuário';
    return `${roleLabel}: ${actorName}`;
  }
  if (type === 'sale') return 'Canal cliente';
  if (type.includes('order_')) return 'Automação de pedidos';
  return 'Sistema';
};

const shortOrderId = (value: unknown) => {
  const id = String(value || '').trim();
  if (!id) return '';
  return id.slice(0, 8).toUpperCase();
};

const parseOrderIdFromReason = (value: unknown) => {
  const text = String(value || '');
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match?.[0] || '';
};

export const InventoryManager = ({ onProductsChange }: { onProductsChange?: (items: any[]) => void }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const movementsSectionRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'out' | 'low' | 'ok' | 'not_managed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [movementProductId, setMovementProductId] = useState<string>('');
  const [movementQuery, setMovementQuery] = useState('');
  const [adjustModal, setAdjustModal] = useState<null | {
    item: InventoryItem;
    mode: 'in' | 'out' | 'set';
    quantity: string;
    reason: string;
    manageStock: boolean;
    lowStockAlert: string;
  }>(null);
  const [showAdjustHelp, setShowAdjustHelp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [inventoryResp, alertsResp, movementsResp] = await Promise.all([
        productService.listInventory({ status: statusFilter, query, includeNotManaged: true, limit: 500 }),
        productService.getInventoryAlerts(),
        productService.listInventoryMovements({ limit: 120, productId: movementProductId || undefined }),
      ]);
      setItems(Array.isArray(inventoryResp?.items) ? inventoryResp.items : []);
      setAlerts(alertsResp || null);
      setMovements(Array.isArray(movementsResp?.items) ? movementsResp.items : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar o estoque.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter, movementProductId]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    (items || []).forEach((item) => {
      const category = String(item?.category || '').trim();
      if (category) unique.add(category);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = String(query || '').trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && String(item?.category || '') !== categoryFilter) return false;
      if (!normalized) return true;
      return `${item?.name || ''} ${item?.category || ''}`.toLowerCase().includes(normalized);
    });
  }, [items, query, categoryFilter]);

  const filteredMovements = useMemo(() => {
    const normalized = String(movementQuery || '').trim().toLowerCase();
    if (!normalized) return movements;
    return (movements || []).filter((movement: any) => {
      const haystack = [
        movement?.productName,
        movement?.reason,
        movement?.orderId,
        movement?.orderCustomerName,
        movement?.movementType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [movements, movementQuery]);

  const handleAdjust = async () => {
    if (!adjustModal) return;
    const quantity = Math.max(0, Math.floor(Number(adjustModal.quantity || 0)));
    if (!Number.isFinite(quantity)) {
      showToast('Quantidade inválida.', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      const previous = items.find((item) => item.id === adjustModal.item.id);
      const lowStockAlert = Math.max(1, Math.floor(Number(adjustModal.lowStockAlert || 3)));
      const updated = await productService.adjustStock(adjustModal.item.id, {
        mode: adjustModal.mode,
        quantity,
        reason: adjustModal.reason || undefined,
        manageStock: Boolean(adjustModal.manageStock),
        lowStockAlert,
      });

      // Atualização otimista imediata na tabela de estoque.
      setItems((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                manageStock: Boolean(updated.manageStock),
                stockQuantity: Number(updated.stockQuantity ?? item.stockQuantity ?? 0),
                lowStockAlert: Number(updated.lowStockAlert ?? item.lowStockAlert ?? 3),
                inventoryStatus: (updated.inventoryStatus || item.inventoryStatus) as any,
              }
            : item
        )
      );

      // Atualiza a lista de produtos do dashboard sem buscar tudo de novo.
      if (onProductsChange) {
        (onProductsChange as any)((prevProducts: any[]) =>
          (Array.isArray(prevProducts) ? prevProducts : []).map((product: any) =>
            String(product?.id || '') === String(updated.id || '')
              ? {
                  ...product,
                  manageStock: Boolean(updated.manageStock),
                  stockQuantity: Number(updated.stockQuantity ?? product?.stockQuantity ?? 0),
                  lowStockAlert: Number(updated.lowStockAlert ?? product?.lowStockAlert ?? 3),
                }
              : product
          )
        );
      }

      // Movimento recente otimista para feedback instantâneo.
      if (previous) {
        const beforeQuantity = Math.max(0, Number(previous.stockQuantity || 0));
        const afterQuantity = Math.max(0, Number(updated.stockQuantity || 0));
        const modeLabel =
          adjustModal.mode === 'in'
            ? 'manual_in'
            : adjustModal.mode === 'out'
            ? 'manual_out'
            : afterQuantity >= beforeQuantity
            ? 'manual_set_increase'
            : 'manual_set_decrease';
        setMovements((prev) => [
          {
            id: `tmp-${Date.now()}`,
            productId: updated.id,
            productName: updated.name || previous.name,
            movementType: modeLabel,
            quantity: Math.abs(afterQuantity - beforeQuantity),
            beforeQuantity,
            afterQuantity,
            reason: adjustModal.reason || null,
            createdAt: new Date().toISOString(),
          },
          ...(Array.isArray(prev) ? prev : []),
        ].slice(0, 30));
      }

      showToast('Estoque atualizado com sucesso.', 'success');
      setAdjustModal(null);
      setShowAdjustHelp(false);
      // Revalida em background para manter consistência.
      void load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível ajustar o estoque.', 'error');
      setAdjustModal(null);
      setShowAdjustHelp(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold">Estoque</p>
            <h3 className="text-lg font-black text-slate-900">Controle inteligente de produtos</h3>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowsClockwise size={14} weight="bold" />
            Atualizar
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500">Produtos com controle</p>
            <p className="text-xl font-black text-slate-900">{Number(alerts?.managedCount || 0)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] text-amber-700">Baixo estoque</p>
            <p className="text-xl font-black text-amber-700">{Number(alerts?.lowCount || 0)}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[11px] text-rose-700">Esgotados</p>
            <p className="text-xl font-black text-rose-700">{Number(alerts?.outCount || 0)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou categoria..."
            className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
          {(['all', 'out', 'low', 'ok', 'not_managed'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === status
                  ? 'border-slate-300 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status === 'all'
                ? 'Todos'
                : status === 'not_managed'
                ? 'Sem controle'
                : status === 'out'
                ? 'Esgotados'
                : status === 'low'
                ? 'Baixo estoque'
                : 'OK'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              categoryFilter === 'all'
                ? 'border-slate-300 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todas categorias
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                categoryFilter === category
                  ? 'border-slate-300 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="py-2 pr-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Produto</th>
                <th className="py-2 pr-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Categoria</th>
                <th className="py-2 pr-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Estoque</th>
                <th className="py-2 pr-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Alerta</th>
                <th className="py-2 pr-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Status</th>
                <th className="py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const meta = statusMeta[item.inventoryStatus || 'not_managed'] || statusMeta.not_managed;
                return (
                  <tr key={item.id}>
                    <td className="py-2 pr-3">
                      <div className="inline-flex items-center gap-2">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-sm text-slate-600">{item.category || '—'}</td>
                    <td className="py-2 pr-3 text-sm font-bold text-slate-800">{Math.max(0, Number(item.stockQuantity || 0))}</td>
                    <td className="py-2 pr-3 text-sm text-slate-600">{Math.max(1, Number(item.lowStockAlert || 3))}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                        {item.inventoryStatus === 'out' ? <WarningCircle size={11} weight="fill" /> : null}
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMovementProductId(String(item.id || ''));
                            setMovementQuery('');
                            movementsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Histórico
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdjustHelp(false);
                            setAdjustModal({
                              item,
                              mode: item?.manageStock ? 'in' : 'set',
                              quantity: '1',
                              reason: '',
                              manageStock: Boolean(item?.manageStock),
                              lowStockAlert: String(Math.max(1, Number(item?.lowStockAlert || 3))),
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Ajustar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    Nenhum item encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section ref={movementsSectionRef} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendUp size={16} className="text-slate-500" />
          <h4 className="text-sm font-bold text-slate-800">Movimentações recentes</h4>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <select
            value={movementProductId}
            onChange={(event) => setMovementProductId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          >
            <option value="">Todos os produtos</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            value={movementQuery}
            onChange={(event) => setMovementQuery(event.target.value)}
            placeholder="Buscar na movimentação..."
            className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
          {(movementProductId || movementQuery) && (
            <button
              type="button"
              onClick={() => {
                setMovementProductId('');
                setMovementQuery('');
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-[320px] overflow-auto">
          {filteredMovements.length === 0 ? (
            <p className="text-sm text-slate-500">Sem movimentações recentes.</p>
          ) : (
            filteredMovements.map((movement) => {
              const meta = resolveMovementMeta(movement.movementType);
              const origin = resolveMovementOrigin(movement);
              const effectiveOrderId = String(movement?.orderId || parseOrderIdFromReason(movement?.reason) || '').trim();
              return (
                <div key={movement.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_16px_-14px_rgba(15,23,42,0.45)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{movement.productName || 'Produto'}</p>
                  <span className="text-[11px] text-slate-500">{new Date(movement.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${meta.className}`}>{meta.label}</span>
                  {effectiveOrderId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/orders?orderId=${encodeURIComponent(effectiveOrderId)}`)}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                    >
                      Pedido #{shortOrderId(effectiveOrderId)}
                    </button>
                  ) : null}
                  {movement?.orderCustomerName ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                      Cliente: {String(movement.orderCustomerName)}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">Origem: {origin}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">Qtd: <strong>{movement.quantity}</strong></span>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"><strong>{movement.beforeQuantity}</strong> → <strong>{movement.afterQuantity}</strong></span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {movement.reason ? <span>Obs: {movement.reason}</span> : null}
                  {effectiveOrderId ? (
                    <a
                      href={`/pedido/${effectiveOrderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-700 hover:text-indigo-800 font-semibold underline"
                    >
                      Abrir pedido público
                    </a>
                  ) : null}
                </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {adjustModal && (
        <div className="fixed inset-0 z-[12000] bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => { setAdjustModal(null); setShowAdjustHelp(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            {(() => {
              const currentStock = Math.max(0, Number(adjustModal.item?.stockQuantity || 0));
              const inputQuantity = Math.max(0, Math.floor(Number(adjustModal.quantity || 0)));
              const nextStock =
                !adjustModal.manageStock
                  ? currentStock
                  : adjustModal.mode === 'in'
                  ? currentStock + inputQuantity
                  : adjustModal.mode === 'out'
                  ? Math.max(0, currentStock - inputQuantity)
                  : inputQuantity;
              return (
                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Estoque atual</p>
                      <p className="text-lg font-black text-slate-900">{currentStock}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Resultado previsto</p>
                      <p className="text-lg font-black text-brand-primary">{nextStock}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold">Ajuste de estoque</p>
                <h4 className="text-lg font-black text-slate-900 mt-1">{adjustModal.item.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustHelp((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Info size={12} />
                Como funciona
              </button>
            </div>
            {showAdjustHelp && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800 space-y-1">
                <p><strong>Entrada (+):</strong> soma ao estoque atual.</p>
                <p><strong>Saída (-):</strong> reduz do estoque atual.</p>
                <p><strong>Definir total (=):</strong> substitui pelo valor final exato.</p>
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['in', 'out', 'set'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!adjustModal.manageStock}
                  onClick={() => setAdjustModal((prev) => (prev ? { ...prev, mode } : prev))}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    adjustModal.mode === mode
                      ? 'border-slate-300 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {mode === 'in' ? (
                    <span className="inline-flex items-center gap-1"><TrendUp size={12} /> Entrada</span>
                  ) : mode === 'out' ? (
                    <span className="inline-flex items-center gap-1"><TrendDown size={12} /> Saída</span>
                  ) : (
                    'Definir total'
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={Boolean(adjustModal.manageStock)}
                  onChange={(event) =>
                    setAdjustModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            manageStock: event.target.checked,
                            mode: event.target.checked ? prev.mode : 'set',
                            quantity: event.target.checked ? prev.quantity : '0',
                          }
                        : prev
                    )
                  }
                />
                Controlar estoque deste produto
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500">Alerta baixo</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={adjustModal.lowStockAlert}
                    onChange={(event) => setAdjustModal((prev) => (prev ? { ...prev, lowStockAlert: event.target.value } : prev))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="3"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                {adjustModal.mode === 'in'
                  ? 'Entrada: soma ao estoque atual.'
                  : adjustModal.mode === 'out'
                  ? 'Saída: reduz do estoque atual.'
                  : 'Definir total: substitui o estoque pelo valor informado.'}
              </p>
              <input
                type="number"
                min="0"
                step="1"
                value={adjustModal.quantity}
                onChange={(event) => setAdjustModal((prev) => (prev ? { ...prev, quantity: event.target.value } : prev))}
                disabled={!adjustModal.manageStock}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Quantidade"
              />
              <input
                value={adjustModal.reason}
                onChange={(event) => setAdjustModal((prev) => (prev ? { ...prev, reason: event.target.value } : prev))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Motivo (opcional)"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setAdjustModal(null); setShowAdjustHelp(false); }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleAdjust()}
                disabled={submitting}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? 'Salvando...' : 'Salvar ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
