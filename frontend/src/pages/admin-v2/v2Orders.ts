// Metadados de status de pedido para a V2 — espelha a máquina de estados que o
// GrillQueue opera (PATCH /orders/{id}/status). Só apresentação; a regra é do backend.
export type V2OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'ready_for_delivery'
  | 'waiting_for_motoboy'
  | 'in_delivery'
  | 'dispatched'
  | 'done'
  | 'delivered'
  | 'finished'
  | 'cancelled';

export const V2_ACTIVE_STATUSES: V2OrderStatus[] = [
  'pending',
  'preparing',
  'ready',
  'ready_for_delivery',
  'waiting_for_motoboy',
  'in_delivery',
];

export const V2_TERMINAL_STATUSES: V2OrderStatus[] = [
  'done',
  'delivered',
  'finished',
  'cancelled',
];

/** Colunas do board V2 — agrupam os status ativos (pronto junta as variações). */
export const V2_BOARD_COLUMNS: Array<{ id: string; title: string; statuses: V2OrderStatus[] }> = [
  { id: 'pending', title: 'Novos', statuses: ['pending'] },
  { id: 'preparing', title: 'Preparando', statuses: ['preparing'] },
  { id: 'ready', title: 'Prontos', statuses: ['ready', 'ready_for_delivery', 'waiting_for_motoboy'] },
  { id: 'in_delivery', title: 'Em rota', statuses: ['in_delivery', 'dispatched'] },
];

export type V2StatusMeta = {
  label: string;
  /** variante do Badge ReUI */
  badge: string;
  /** coluna do board (status ativos) */
  column?: string;
};

export const V2_STATUS_META: Record<string, V2StatusMeta> = {
  pending: { label: 'Novo', badge: 'bg-primary/10 text-primary border-primary/20', column: 'pending' },
  preparing: { label: 'Preparando', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400', column: 'preparing' },
  ready: { label: 'Pronto', badge: 'bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400', column: 'ready' },
  ready_for_delivery: { label: 'Pronto p/ entrega', badge: 'bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400', column: 'ready' },
  waiting_for_motoboy: { label: 'Aguardando entregador', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400', column: 'ready' },
  in_delivery: { label: 'Em rota', badge: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-400', column: 'in_delivery' },
  dispatched: { label: 'Despachado', badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-400', column: 'in_delivery' },
  done: { label: 'Concluído', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400' },
  delivered: { label: 'Entregue', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400' },
  finished: { label: 'Finalizado', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400' },
  cancelled: { label: 'Cancelado', badge: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400' },
};

export const getV2StatusMeta = (status: string): V2StatusMeta =>
  V2_STATUS_META[String(status || '').toLowerCase()] || {
    label: String(status || '—'),
    badge: 'bg-muted text-muted-foreground border-border',
  };

export const isV2TerminalStatus = (status: string) =>
  V2_TERMINAL_STATUSES.includes(String(status || '').toLowerCase() as V2OrderStatus);

/** "há 23 min" / "há 1 h 20" — idade do pedido desde createdAt (ms ou ISO). */
export const formatV2Age = (createdAt: unknown): string => {
  const raw = createdAt as any;
  if (!raw) return '—';
  const ts = typeof raw === 'number' ? raw : Date.parse(String(raw));
  if (!Number.isFinite(ts)) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h ${String(minutes % 60).padStart(2, '0')}`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
};

/** Classe de urgência do card pela idade (cozinha parada é a dor real do balcão). */
export const getV2AgeTone = (createdAt: unknown): 'ok' | 'warn' | 'late' => {
  const raw = createdAt as any;
  if (!raw) return 'ok';
  const ts = typeof raw === 'number' ? raw : Date.parse(String(raw));
  if (!Number.isFinite(ts)) return 'ok';
  const minutes = Math.max(0, (Date.now() - ts) / 60000);
  if (minutes >= 45) return 'late';
  if (minutes >= 20) return 'warn';
  return 'ok';
};

/** Próximo status no fluxo — espelha os botões do GrillQueue por modalidade
 *  (GQ:2876-3130). waiting_for_motoboy→in_delivery é ação do MOTOBOY (sem
 *  botão admin); in_delivery→done fecha no app do motoboy. */
export const getV2NextStatus = (
  status: string,
  order?: any
): { status: string; label: string } | null => {
  const normalized = String(status || '').toLowerCase();
  const type = String(order?.type || '').toLowerCase();
  const isDelivery = type === 'delivery';
  const isPostal = isDelivery && String(order?.fulfillmentMode || '').toLowerCase() === 'postal';
  switch (normalized) {
    case 'pending':
      return { status: 'preparing', label: 'Iniciar atendimento' };
    case 'preparing':
      if (isPostal) return { status: 'ready', label: 'Pronto para postagem' };
      if (isDelivery) return { status: 'ready_for_delivery', label: 'Marcar pronto' };
      return { status: 'ready', label: type === 'table' ? 'Marcar pronto' : 'Pronto p/ retirada' };
    case 'ready':
      if (isPostal) return { status: 'dispatched', label: 'Informar rastreio e postar' };
      if (isDelivery) return { status: 'waiting_for_motoboy', label: 'Aguardar entregador' };
      return { status: 'done', label: 'Confirmar retirada' };
    case 'ready_for_delivery':
      return { status: 'waiting_for_motoboy', label: 'Aguardar entregador' };
    case 'waiting_for_motoboy':
      if (isPostal) return { status: 'finished', label: 'Finalizar pedido' };
      return null; // quem retira é o motoboy (app dele)
    case 'in_delivery':
      return null; // fecha com código de entrega no app do motoboy
    case 'dispatched':
      return { status: 'finished', label: 'Finalizar pedido' };
    default:
      return null;
  }
};
