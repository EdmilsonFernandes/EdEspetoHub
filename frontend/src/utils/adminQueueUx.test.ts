import { describe, expect, it } from 'vitest';
import { filterAdminQueueProducts, getAdminQueueLoadingState } from './adminQueueUx';

describe('getAdminQueueLoadingState', () => {
  it('mostra skeleton inicial da fila sem duplicar banner', () => {
    const state = getAdminQueueLoadingState({
      activeTab: 'queue',
      loading: true,
      historyLoading: false,
      queueCount: 0,
      inRouteCount: 0,
      historyCount: 0,
    });

    expect(state.showQueueSkeleton).toBe(true);
    expect(state.showRefreshBanner).toBe(false);
  });

  it('mostra banner de atualização quando a fila já tem pedidos', () => {
    const state = getAdminQueueLoadingState({
      activeTab: 'queue',
      loading: true,
      historyLoading: false,
      queueCount: 2,
      inRouteCount: 0,
      historyCount: 0,
    });

    expect(state.showQueueSkeleton).toBe(false);
    expect(state.showRefreshBanner).toBe(true);
  });

  it('separa loading de vendas do loading da fila', () => {
    const state = getAdminQueueLoadingState({
      activeTab: 'completed',
      loading: true,
      historyLoading: false,
      queueCount: 0,
      inRouteCount: 0,
      historyCount: 0,
    });

    expect(state.activeLoading).toBe(false);
    expect(state.showSalesSkeleton).toBe(false);
  });

  it('mostra skeleton inicial em rota quando a aba ativa esta vazia', () => {
    const state = getAdminQueueLoadingState({
      activeTab: 'inroute',
      loading: true,
      historyLoading: false,
      queueCount: 3,
      inRouteCount: 0,
      historyCount: 0,
    });

    expect(state.showInRouteSkeleton).toBe(true);
    expect(state.showQueueSkeleton).toBe(false);
  });
});

describe('filterAdminQueueProducts', () => {
  const products = [
    { id: '1', name: 'Medalhao de Palmito', category: 'Espetos' },
    { id: '2', name: 'Suco de Uva', category: 'Bebidas' },
    { id: '3', name: 'X-Burger', category: 'Lanches' },
  ];

  it('busca produto ignorando acento e caixa', () => {
    expect(filterAdminQueueProducts(products, 'medalhão')).toEqual([products[0]]);
  });

  it('permite buscar por categoria e respeita limite', () => {
    expect(filterAdminQueueProducts(products, 'bebidas', 1)).toEqual([products[1]]);
  });
});
