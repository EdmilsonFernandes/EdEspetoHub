import { describe, expect, it } from 'vitest';
import { buildAdminTableGroups, filterAdminQueueProducts, getAdminQueueLoadingState } from './adminQueueUx';

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

describe('buildAdminTableGroups', () => {
  const orders = [
    {
      id: 'order-1',
      type: 'table',
      table: '12',
      status: 'pending',
      total: 30,
      createdAt: '2026-05-20T10:00:00.000Z',
      items: [
        { name: 'Suco de Uva', qty: 2 },
        { name: 'Prato Executivo', qty: 1 },
      ],
    },
    {
      id: 'order-2',
      type: 'table',
      tableNumber: '12',
      status: 'preparing',
      total: 20,
      createdAt: '2026-05-20T10:05:00.000Z',
      items: [{ name: 'Suco de Uva', quantity: 1 }],
    },
    {
      id: 'order-3',
      type: 'delivery',
      table: '99',
      status: 'pending',
      total: 10,
      items: [{ name: 'Nao entra', qty: 1 }],
    },
    {
      id: 'order-4',
      type: 'table',
      table: '7',
      status: 'done',
      total: 10,
      items: [{ name: 'Finalizado', qty: 1 }],
    },
  ];

  it('agrupa pedidos ativos por mesa e soma itens e total', () => {
    const groups = buildAdminTableGroups(orders);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      tableNumber: '12',
      displayNumber: '12',
      ordersCount: 2,
      itemsCount: 4,
      total: 50,
      stage: 'pending',
    });
    expect(groups[0].previewItems[0]).toEqual({ name: 'Suco de Uva', qty: 3 });
  });

  it('filtra por numero da mesa aceitando termo simples', () => {
    expect(buildAdminTableGroups(orders, 'mesa 12')).toHaveLength(1);
    expect(buildAdminTableGroups(orders, '99')).toHaveLength(0);
  });
});
