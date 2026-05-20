export type AdminQueueTab = 'queue' | 'inroute' | 'completed';

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
