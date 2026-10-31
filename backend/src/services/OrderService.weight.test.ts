import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Venda por peso (30/10) — buildOrder do OrderService com produtos WEIGHT.
 * Regras da spec:
 * - quantidade canônica em GRAMAS INTEIRAS; validação de mín/incremento no
 *   BACKEND (ORDER-014), antes de qualquer efeito colateral;
 * - subtotal = round(preço/kg¢ × g ÷ 1000) em centavos inteiros;
 * - snapshot (saleUnit + unitPriceSnapshot) no OrderItem — mudança futura no
 *   cadastro não recalcula o item;
 * - carrinho misto: unidade + peso no mesmo pedido;
 * - produtos UNIT preservam o comportamento histórico (bundle promo etc.).
 *
 * Mocks no padrão de OrderPaymentService.*.test.ts (vi.mock dos módulos).
 */

const { productFindById, orderRepoCreate, subscriptionGetCurrent } = vi.hoisted(() => ({
  productFindById: vi.fn(),
  orderRepoCreate: vi.fn((order: any) => order),
  subscriptionGetCurrent: vi.fn(async () => null),
}));

vi.mock('../repositories/ProductRepository', () => ({
  ProductRepository: class { findById = productFindById; },
}));
vi.mock('../repositories/OrderRepository', () => ({
  OrderRepository: class { create = orderRepoCreate; },
}));
vi.mock('../repositories/StoreRepository', () => ({
  StoreRepository: class {},
}));
vi.mock('../repositories/UserRepository', () => ({ UserRepository: class {} }));
vi.mock('../repositories/StoreUserRepository', () => ({ StoreUserRepository: class {} }));
vi.mock('./DeliveryBillingService', () => ({ DeliveryBillingService: class {} }));
vi.mock('./SubscriptionService', () => ({
  SubscriptionService: class { getCurrentByStore = subscriptionGetCurrent; },
}));
vi.mock('./PushNotificationService', () => ({ PushNotificationService: class {} }));
vi.mock('./OrderPaymentService', () => ({ OrderPaymentService: class {} }));
vi.mock('./CustomerSecurityService', () => ({ CustomerSecurityService: class {} }));
vi.mock('../config/database', () => ({
  AppDataSource: {
    manager: {},
    query: vi.fn(async () => []),
    transaction: vi.fn(),
    getRepository: vi.fn(() => ({ find: vi.fn(async () => []), findOne: vi.fn(async () => null) })),
  },
}));

import { OrderService } from './OrderService';

const store: any = {
  id: 'store-1',
  name: 'Feira do Bairro',
  settings: { orderTypes: ['delivery', 'pickup', 'table'] },
};

const weightProduct: any = {
  id: 'prod-tomate',
  name: 'Tomate Italiano',
  price: 10,
  promoActive: false,
  saleUnit: 'WEIGHT',
  weightMinG: 250,
  weightStepG: 250,
  manageStock: false,
  stockQuantity: 0,
  modifiers: null,
  store,
};

const unitProduct: any = {
  id: 'prod-abacaxi',
  name: 'Abacaxi',
  price: 5,
  promoActive: false,
  saleUnit: 'UNIT',
  manageStock: false,
  stockQuantity: 0,
  modifiers: null,
  bundlePromoActive: false,
  store,
};

const baseInput = (items: any[]) => ({
  type: 'pickup' as const,
  items,
  customerName: 'Cliente Teste',
  paymentMethod: 'pix',
});

const buildOrder = (service: OrderService, items: any[]) =>
  (service as any).buildOrder(baseInput(items), store, undefined, 'order-ref-1');

describe('OrderService.buildOrder — venda por peso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionGetCurrent.mockResolvedValue(null);
    orderRepoCreate.mockImplementation((order: any) => order);
  });

  it('750 g a R$10/kg → subtotal R$ 7,50, quantity=750 (gramas), snapshot gravado', async () => {
    productFindById.mockResolvedValue(weightProduct);
    const service = new OrderService();
    const order = await buildOrder(service, [{ productId: 'prod-tomate', quantity: 750 }]);

    const item = order.items[0];
    expect(item.quantity).toBe(750); // gramas inteiras, nunca 0,75
    expect(item.saleUnit).toBe('WEIGHT');
    expect(item.unitPriceSnapshot).toBe(10); // preço/kg congelado no pedido
    expect(Number(item.price)).toBe(7.5);
    expect(Number(order.total)).toBe(7.5);
  });

  it('especificação completa: 250 g=2,50 · 500 g=5,00 · 750 g=7,50 · 1 kg=10,00 · 1,25 kg=12,50', async () => {
    productFindById.mockResolvedValue(weightProduct);
    const service = new OrderService();
    for (const [grams, expected] of [[250, 2.5], [500, 5], [750, 7.5], [1000, 10], [1250, 12.5]] as const) {
      const order = await buildOrder(service, [{ productId: 'prod-tomate', quantity: grams }]);
      expect(Number(order.items[0].price)).toBe(expected);
      expect(Number(order.total)).toBe(expected);
    }
  });

  it('abaixo do mínimo ou fora do incremento → ORDER-014 (backend é a autoridade)', async () => {
    productFindById.mockResolvedValue(weightProduct);
    const service = new OrderService();
    await expect(buildOrder(service, [{ productId: 'prod-tomate', quantity: 200 }]))
      .rejects.toMatchObject({ code: 'ORDER-014' }); // abaixo de 250 g
    await expect(buildOrder(service, [{ productId: 'prod-tomate', quantity: 300 }]))
      .rejects.toMatchObject({ code: 'ORDER-014' }); // fora do degrau de 250 g
    await expect(buildOrder(service, [{ productId: 'prod-tomate', quantity: 0.5 }]))
      .rejects.toMatchObject({ code: 'ORDER-014' }); // kg fracionário nunca vira "500 g"
  });

  it('carrinho misto: 2 abacaxis (un) + 750 g de tomate = R$ 17,50', async () => {
    productFindById.mockImplementation(async (id: string) =>
      id === 'prod-tomate' ? weightProduct : unitProduct);
    const service = new OrderService();
    const order = await buildOrder(service, [
      { productId: 'prod-abacaxi', quantity: 2 },
      { productId: 'prod-tomate', quantity: 750 },
    ]);

    const [unitItem, weightItem] = order.items;
    expect(unitItem.saleUnit).toBe('UNIT');
    expect(unitItem.quantity).toBe(2);
    expect(Number(unitItem.price)).toBe(10); // 2 × R$5
    expect(weightItem.saleUnit).toBe('WEIGHT');
    expect(Number(weightItem.price)).toBe(7.5);
    expect(Number(order.total)).toBe(17.5);
  });

  it('snapshot: preço do produto muda DEPOIS — item do pedido NÃO recalcula', async () => {
    productFindById.mockResolvedValue({ ...weightProduct, price: 10 });
    const service = new OrderService();
    const order = await buildOrder(service, [{ productId: 'prod-tomate', quantity: 500 }]);
    // Lojista dobra o preço no dia seguinte; o pedido antigo permanece:
    expect(Number(order.items[0].price)).toBe(5);
    expect(Number(order.items[0].unitPriceSnapshot)).toBe(10);

    const priceyProduct = { ...weightProduct, price: 20 };
    productFindById.mockResolvedValue(priceProductSafe(priceyProduct));
    const order2 = await buildOrder(service, [{ productId: 'prod-tomate', quantity: 500 }]);
    expect(Number(order2.items[0].price)).toBe(10); // pedido NOVO usa preço novo
    expect(Number(order2.items[0].unitPriceSnapshot)).toBe(20);
  });

  it('produto UNIT sem saleUnit (legado) — comportamento histórico preservado', async () => {
    const legacy: any = { ...unitProduct };
    delete legacy.saleUnit;
    productFindById.mockResolvedValue(legacy);
    const service = new OrderService();
    const order = await buildOrder(service, [{ productId: 'prod-abacaxi', quantity: 3 }]);
    expect(order.items[0].saleUnit).toBe('UNIT');
    expect(Number(order.items[0].price)).toBe(15);
  });

  it('adicionais em item por peso somam 1× (não escalam por grama)', async () => {
    productFindById.mockResolvedValue({
      ...weightProduct,
      modifiers: [{ id: 'm1', name: 'Embalagem extra', price: 2, active: true }],
    });
    const service = new OrderService();
    const order = await buildOrder(service, [
      { productId: 'prod-tomate', quantity: 750, selectedModifiers: [{ id: 'm1', quantity: 1 }] },
    ]);
    // 7,50 (peso) + 2,00 (adicional por linha) = 9,50 — nunca 7,50 + 2×0,75
    expect(Number(order.items[0].price)).toBe(9.5);
  });
});

/** Evita mutação acidental do objeto compartilhado entre testes. */
function priceProductSafe(product: any) {
  return { ...product, store };
}

describe('OrderService.buildOrder — pedido mínimo (ORDER-015)', () => {
  const minOrderStore: any = {
    ...store,
    settings: { ...store.settings, minOrderValue: 20 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionGetCurrent.mockResolvedValue(null);
    orderRepoCreate.mockImplementation((order: any) => order);
  });

  it('pickup abaixo do mínimo → ORDER-015 (backend é a autoridade, não só a UI)', async () => {
    productFindById.mockResolvedValue({ ...weightProduct, store: minOrderStore });
    const service = new OrderService();
    await expect(
      (service as any).buildOrder(
        { ...baseInput([{ productId: 'prod-tomate', quantity: 750 }]), storeId: 'store-1' },
        minOrderStore,
        undefined,
        'order-ref-1'
      )
    ).rejects.toMatchObject({ code: 'ORDER-015' }); // R$ 7,50 < R$ 20
  });

  it('igual ou acima do mínimo passa (régua: itens com desconto, sem frete)', async () => {
    productFindById.mockResolvedValue({ ...weightProduct, store: minOrderStore });
    const service = new OrderService();
    const order = await (service as any).buildOrder(
      { ...baseInput([{ productId: 'prod-tomate', quantity: 2000 }]), storeId: 'store-1' },
      minOrderStore,
      undefined,
      'order-ref-1'
    );
    expect(Number(order.total)).toBe(20); // 2 kg = R$ 20 → passa
  });

  it('envio postal é isento do pedido mínimo (mesma régua do checkout)', async () => {
    // Postal exige plano com delivery (features.deliveryMode) — mock Pro.
    subscriptionGetCurrent.mockResolvedValue({ status: 'ACTIVE', plan: { name: 'pro_monthly' } });
    productFindById.mockResolvedValue({ ...weightProduct, store: minOrderStore });
    const service = new OrderService();
    const order = await (service as any).buildOrder(
      {
        ...baseInput([{ productId: 'prod-tomate', quantity: 750 }]),
        storeId: 'store-1',
        type: 'delivery',
        fulfillmentMode: 'postal',
        paymentMethod: 'pix',
      },
      minOrderStore,
      undefined,
      'order-ref-1'
    );
    expect(Number(order.total)).toBe(7.5);
  });

  it('pedido criado pelo lojista (staff) NÃO é barrado pelo mínimo', async () => {
    productFindById.mockResolvedValue({ ...weightProduct, store: minOrderStore });
    const service = new OrderService();
    const order = await (service as any).buildOrder(
      { ...baseInput([{ productId: 'prod-tomate', quantity: 750 }]), storeId: 'store-1', actorRole: 'ADMIN' },
      minOrderStore,
      undefined,
      'order-ref-1'
    );
    expect(Number(order.total)).toBe(7.5);
  });

  it('sem mínimo configurado (default 0/legado) → comportamento histórico', async () => {
    productFindById.mockResolvedValue(weightProduct);
    const service = new OrderService();
    const order = await buildOrder(service, [{ productId: 'prod-tomate', quantity: 250 }]);
    expect(Number(order.total)).toBe(2.5);
  });
});
