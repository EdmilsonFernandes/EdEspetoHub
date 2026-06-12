export type AdminQueueTab = 'queue' | 'inroute' | 'completed';
export type AdminSalesReportRange = 'today' | 'yesterday' | 'last7' | 'custom';

type LoadingStateInput = {
  activeTab: AdminQueueTab;
  loading: boolean;
  historyLoading: boolean;
  queueCount: number;
  inRouteCount: number;
  historyCount: number;
};

const loadingLabels: Record<AdminQueueTab, string> = {
  queue: 'Carregando pedidos da fila...',
  inroute: 'Carregando pedidos em rota...',
  completed: 'Carregando dados de vendas...',
};

export const getAdminQueueLoadingState = ({
  activeTab,
  loading,
  historyLoading,
  queueCount,
  inRouteCount,
  historyCount,
}: LoadingStateInput) => {
  const activeLoading = activeTab === 'completed' ? historyLoading : loading;
  const activeCount =
    activeTab === 'completed'
      ? Math.max(0, Number(historyCount || 0))
      : activeTab === 'inroute'
        ? Math.max(0, Number(inRouteCount || 0))
        : Math.max(0, Number(queueCount || 0));
  const showInitialSkeleton = activeLoading && activeCount === 0;

  return {
    activeLoading,
    label: loadingLabels[activeTab],
    showRefreshBanner: activeLoading && activeCount > 0,
    showQueueSkeleton: activeTab === 'queue' && showInitialSkeleton,
    showInRouteSkeleton: activeTab === 'inroute' && showInitialSkeleton,
    showSalesSkeleton: activeTab === 'completed' && showInitialSkeleton,
  };
};

const dateKeyInSaoPaulo = (value: number | Date = Date.now()) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const addDaysToDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = String(dateKey || '').split('-').map((part) => Number(part));
  if (!year || !month || !day) return dateKeyInSaoPaulo();
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return dateKeyInSaoPaulo(date);
};

const normalizeDateKey = (value: unknown, fallback: string) => {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
};

export const resolveAdminSalesHistoryWindow = ({
  reportRange,
  reportFrom,
  reportTo,
  now = Date.now(),
}: {
  reportRange: AdminSalesReportRange;
  reportFrom?: string | null;
  reportTo?: string | null;
  now?: number | Date;
}) => {
  const today = dateKeyInSaoPaulo(now instanceof Date ? now : Number(now));
  const normalizedRange = reportRange || 'today';

  if (normalizedRange === 'yesterday') {
    const yesterday = addDaysToDateKey(today, -1);
    return {
      startDate: addDaysToDateKey(yesterday, -1),
      endDate: yesterday,
    };
  }

  if (normalizedRange === 'last7') {
    return {
      startDate: addDaysToDateKey(today, -13),
      endDate: today,
    };
  }

  if (normalizedRange === 'custom') {
    const fromInput = normalizeDateKey(reportFrom, today);
    const toInput = normalizeDateKey(reportTo, fromInput);
    const start = fromInput <= toInput ? fromInput : toInput;
    const end = fromInput <= toInput ? toInput : fromInput;
    const startMs = Date.parse(`${start}T12:00:00Z`);
    const endMs = Date.parse(`${end}T12:00:00Z`);
    const rangeDays = Number.isFinite(startMs) && Number.isFinite(endMs)
      ? Math.max(0, Math.round((endMs - startMs) / 86400000))
      : 0;
    return {
      startDate: addDaysToDateKey(start, -(rangeDays + 1)),
      endDate: end,
    };
  }

  return {
    startDate: addDaysToDateKey(today, -1),
    endDate: today,
  };
};

export const normalizeAdminQueueSearch = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const filterAdminQueueProducts = <T extends { name?: unknown; category?: unknown }>(
  products: T[] | null | undefined,
  query: string,
  limit = 40
) => {
  const list = Array.isArray(products) ? products : [];
  const target = normalizeAdminQueueSearch(query);
  const filtered = target
    ? list.filter((product) => {
        const searchable = `${String(product?.name || '')} ${String(product?.category || '')}`;
        return normalizeAdminQueueSearch(searchable).includes(target);
      })
    : list;

  return filtered.slice(0, Math.max(1, Number(limit || 40)));
};

export const mergeAdminQueueOrderSources = <T extends { id?: unknown }>(
  ...sources: Array<T[] | null | undefined>
) => {
  const byId = new Map<string, T>();
  let anonymousIndex = 0;

  for (const source of sources) {
    for (const order of Array.isArray(source) ? source : []) {
      const id = String(order?.id || '').trim();
      const key = id || `anonymous-${anonymousIndex++}`;
      if (!byId.has(key)) {
        byId.set(key, order);
      }
    }
  }

  return Array.from(byId.values());
};

type AdminQueueTableOrder = {
  id?: unknown;
  table?: unknown;
  tableNumber?: unknown;
  table_number?: unknown;
  type?: unknown;
  status?: unknown;
  total?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  customerName?: unknown;
  name?: unknown;
  items?: Array<{
    name?: unknown;
    product?: { name?: unknown };
    qty?: unknown;
    quantity?: unknown;
  }>;
};

export type AdminQueueTableGroup = {
  tableKey: string;
  tableNumber: string;
  displayNumber: string;
  orders: AdminQueueTableOrder[];
  ordersCount: number;
  itemsCount: number;
  total: number;
  oldestCreatedAt: number;
  latestCreatedAt: number;
  stage: 'pending' | 'preparing' | 'ready' | 'mixed';
  previewItems: Array<{ name: string; qty: number }>;
};

const getTableNumber = (order: AdminQueueTableOrder) =>
  String(order?.table ?? order?.tableNumber ?? order?.table_number ?? '').trim();

const formatTableDisplayNumber = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Sem numero';
  return /^\d+$/.test(normalized) ? normalized.padStart(2, '0') : normalized.toUpperCase();
};

const getOrderCreatedAtMs = (order: AdminQueueTableOrder) => {
  const raw = order?.createdAt ?? order?.created_at;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const parsed = raw ? new Date(String(raw)).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveTableStage = (orders: AdminQueueTableOrder[]): AdminQueueTableGroup['stage'] => {
  const statuses = orders.map((order) => String(order?.status || '').toLowerCase());
  if (statuses.some((status) => status === 'pending')) return 'pending';
  if (statuses.some((status) => status === 'preparing')) return 'preparing';
  if (statuses.length && statuses.every((status) => status === 'ready')) return 'ready';
  if (statuses.some((status) => status === 'ready')) return 'mixed';
  return 'mixed';
};

const buildPreviewItems = (orders: AdminQueueTableOrder[]) => {
  const byName = new Map<string, { name: string; qty: number }>();
  for (const order of orders) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const name = String(item?.name || item?.product?.name || 'Item').trim() || 'Item';
      const qty = Math.max(0, Number(item?.qty ?? item?.quantity ?? 0) || 0);
      if (!qty) continue;
      const current = byName.get(name) || { name, qty: 0 };
      current.qty += qty;
      byName.set(name, current);
    }
  }
  return Array.from(byName.values())
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 4);
};

export const buildAdminTableGroups = (
  orders: AdminQueueTableOrder[] | null | undefined,
  query = ''
): AdminQueueTableGroup[] => {
  const target = normalizeAdminQueueSearch(query);
  const activeStatuses = new Set(['pending', 'preparing', 'ready']);
  const byTable = new Map<string, AdminQueueTableOrder[]>();

  for (const order of Array.isArray(orders) ? orders : []) {
    if (String(order?.type || '').toLowerCase() !== 'table') continue;
    if (!activeStatuses.has(String(order?.status || '').toLowerCase())) continue;

    const tableNumber = getTableNumber(order);
    if (!tableNumber) continue;

    const key = normalizeAdminQueueSearch(tableNumber) || tableNumber;
    const group = byTable.get(key) || [];
    group.push(order);
    byTable.set(key, group);
  }

  return Array.from(byTable.entries())
    .map(([tableKey, tableOrders]) => {
      const sortedOrders = [...tableOrders].sort((a, b) => getOrderCreatedAtMs(a) - getOrderCreatedAtMs(b));
      const tableNumber = getTableNumber(sortedOrders[0]) || tableKey;
      const createdTimes = sortedOrders.map(getOrderCreatedAtMs).filter((value) => value > 0);
      const itemsCount = sortedOrders.reduce(
        (sum, order) =>
          sum +
          (Array.isArray(order?.items)
            ? order.items.reduce((itemSum, item) => itemSum + Math.max(0, Number(item?.qty ?? item?.quantity ?? 0) || 0), 0)
            : 0),
        0
      );

      return {
        tableKey,
        tableNumber,
        displayNumber: formatTableDisplayNumber(tableNumber),
        orders: sortedOrders,
        ordersCount: sortedOrders.length,
        itemsCount,
        total: sortedOrders.reduce((sum, order) => sum + (Number(order?.total || 0) || 0), 0),
        oldestCreatedAt: createdTimes.length ? Math.min(...createdTimes) : 0,
        latestCreatedAt: createdTimes.length ? Math.max(...createdTimes) : 0,
        stage: resolveTableStage(sortedOrders),
        previewItems: buildPreviewItems(sortedOrders),
      } satisfies AdminQueueTableGroup;
    })
    .filter((group) => {
      if (!target) return true;
      const searchable = [
        group.tableNumber,
        group.displayNumber,
        `mesa ${group.tableNumber}`,
        ...group.orders.map((order) => `${String(order?.customerName || order?.name || '')} ${String(order?.id || '')}`),
      ].join(' ');
      return normalizeAdminQueueSearch(searchable).includes(target);
    })
    .sort((a, b) => {
      const aNum = Number(a.tableNumber);
      const bNum = Number(b.tableNumber);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return a.displayNumber.localeCompare(b.displayNumber, 'pt-BR');
    });
};
