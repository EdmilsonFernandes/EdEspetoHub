import { expect, test, type Page } from '@playwright/test';

const storeSlug = 'checkout-layout-e2e';
const store = {
  id: 'store-checkout-layout-e2e',
  slug: storeSlug,
  name: 'Loja Checkout Layout E2E',
  openNow: true,
  owner: { phone: '(12) 99999-0000', address: 'Rua Teste, 100' },
  subscription: { status: 'ACTIVE', planExempt: true },
  settings: {
    logoUrl: '/janocaminho.jpg',
    bannerUrl: '/janocaminho.jpg',
    segment: 'Restaurante',
    address: 'Rua Teste, 100 - Centro',
    city: 'Sao Jose dos Campos',
    state: 'SP',
    isOrderingEnabled: true,
    orderTypes: ['pickup', 'delivery', 'table'],
    lat: -23.2237,
    lng: -45.9009,
    deliveryRadiusKm: 5,
    deliveryFee: 6.5,
  },
  paymentSummary: {
    cashEnabled: true,
    manualPixEnabled: false,
    onlineEnabled: true,
    methods: {
      pixOnline: true,
      creditOnline: true,
      debitOnline: true,
      manualPix: false,
      cash: true,
    },
  },
};

const product = {
  id: 'product-checkout-layout-e2e',
  name: 'Combo Checkout Premium',
  price: 42,
  imageUrl: '/janocaminho.jpg',
  category: 'Combos',
  active: true,
};

const customerSession = {
  token: 'customer-token-e2e',
  user: {
    id: 'customer-checkout-layout-e2e',
    fullName: 'Cliente Checkout E2E',
    phone: '(12) 99999-0000',
    email: 'cliente-checkout@e2e.test',
  },
};

const nearAddress = {
  id: 'address-near-checkout-e2e',
  label: 'Casa',
  recipientName: 'Cliente Checkout E2E',
  phone: '(12) 99999-0000',
  cep: '12210-000',
  street: 'Rua Teste Cliente',
  number: '55',
  neighborhood: 'Centro',
  city: 'Sao Jose dos Campos',
  state: 'SP',
  lat: -23.224,
  lng: -45.901,
  isDefault: true,
};

const farAddress = {
  ...nearAddress,
  id: 'address-far-checkout-e2e',
  label: 'Bahia',
  cep: '40000-000',
  street: 'Rua Distante',
  number: '999',
  neighborhood: 'Centro',
  city: 'Salvador',
  state: 'BA',
  lat: -12.9777,
  lng: -38.5016,
};

const buildCustomer = (overrides: Record<string, unknown> = {}) => ({
  name: 'Cliente Checkout E2E',
  phone: '(12) 99999-0000',
  type: 'pickup',
  ...overrides,
});

const seedCheckoutDraft = async (
  page: Page,
  customerOverrides: Record<string, unknown> = {},
  options: { paymentMethod?: string; deliveryMode?: string } = {}
) => {
  await page.addInitScript(({ slug, item, session, customer, paymentMethod, deliveryMode }) => {
    localStorage.clear();
    const draft = {
      version: 1,
      savedAt: Date.now(),
      context: 'public',
      cart: {
        [item.id]: { ...item, qty: 1 },
      },
      customer,
      paymentMethod,
      deliveryMode,
      selectedPostalServiceCode: '',
      view: 'cart',
    };
    localStorage.setItem('customerSession', JSON.stringify(session));
    localStorage.setItem(`customerSession:${slug}`, JSON.stringify(session));
    localStorage.setItem(`storeCheckoutDraft:${slug}:public`, JSON.stringify(draft));
  }, {
    slug: storeSlug,
    item: product,
    session: customerSession,
    customer: buildCustomer(customerOverrides),
    paymentMethod: options.paymentMethod || 'dinheiro',
    deliveryMode: options.deliveryMode || 'distance',
  });
};

test.use({ serviceWorkers: 'block' });

test.describe('Store checkout layout', () => {
  let customerAddresses: Record<string, unknown>[];
  let createdOrders: Record<string, any>[];

  test.beforeEach(async ({ page }) => {
    customerAddresses = [];
    createdOrders = [];

    await page.route(`**/api/stores/slug/${storeSlug}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(store) });
    });
    await page.route(`**/api/public/stores/slug/${storeSlug}/products**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) });
    });
    await page.route(`**/api/public/stores/slug/${storeSlug}/categories**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'cat-combos', name: 'Combos', active: true }]) });
    });
    await page.route(`**/api/public/stores/slug/${storeSlug}/tables/status**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/api/public/stores/slug/${storeSlug}/highlights**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/api/public/stores/slug/${storeSlug}/track`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/api/customer/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(customerSession.user),
      });
    });
    await page.route('**/api/customer/addresses', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customerAddresses) });
    });
    await page.route('**/api/customer/orders**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/customers**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/api/stores/slug/${storeSlug}/orders`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
        return;
      }

      const payload = route.request().postDataJSON();
      createdOrders.push(payload);
      const orderId = `order-checkout-layout-${payload.type || 'pedido'}-${createdOrders.length}`;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: orderId,
          status: 'pending',
          type: payload.type,
          table: payload.table || null,
          customerName: payload.customerName,
          customerNote: payload.customerNote || null,
          paymentStatus: 'PENDING',
          accessToken: `access-${createdOrders.length}`,
          queuePosition: 1,
        }),
      });
    });
    await page.route('**/api/orders/**/public', async (route) => {
      const lastOrder = createdOrders.at(-1) || {};
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-checkout-layout-public',
          status: 'pending',
          type: lastOrder.type || 'pickup',
          table: lastOrder.table || null,
          customerName: lastOrder.customerName || 'Cliente Checkout E2E',
          items: [{ id: product.id, name: product.name, quantity: 1, price: product.price }],
          total: product.price,
        }),
      });
    });
  });

  const openRestoredCheckout = async (page: Page) => {
    await page.goto(`/${storeSlug}`);
    await expect(page.getByText(product.name).first()).toBeVisible({ timeout: 15000 });
  };

  const submitCheckoutFlow = async (page: Page) => {
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar|Validar endereço/i }).click();
    await expect(page.getByTestId('checkout-payment-summary-card')).toBeVisible();
    await page.getByRole('button', { name: /Revisar pedido/i }).click({ force: true });
    await expect(page.getByTestId('checkout-review-payment-card')).toBeVisible();
    await page.getByRole('button', { name: /Enviar pedido para a loja/i }).click({ force: true });
    await expect.poll(() => createdOrders.length).toBe(1);
  };

  const submitDeliveryCheckoutFlow = async (page: Page) => {
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Entrega\s+No endereço/i }).click();
    await expect(page.getByText(/Rua Teste Cliente/i)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Continuar|Validar endereço/i }).click();
    await expect(page.getByTestId('checkout-payment-summary-card')).toBeVisible();
    await page.getByRole('button', { name: /Revisar pedido/i }).click({ force: true });
    await expect(page.getByTestId('checkout-review-payment-card')).toBeVisible();
    await page.getByRole('button', { name: /Enviar pedido para a loja/i }).click({ force: true });
    await expect.poll(() => createdOrders.length).toBe(1);
  };

  test('mantem pagamento e troco visiveis acima do CTA fixo no mobile', async ({ page }) => {
    await seedCheckoutDraft(page);
    await page.setViewportSize({ width: 390, height: 640 });
    await openRestoredCheckout(page);

    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Sem troco/i }).click();
    await page.getByPlaceholder('0,00').fill('100');
    await page.getByRole('button', { name: /Revisar pedido/i }).click();

    const paymentCard = page.getByTestId('checkout-review-payment-card');
    const fixedAction = page.getByTestId('checkout-fixed-action');
    await expect(paymentCard).toContainText('Troco para R$ 100,00');

    await paymentCard.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    const [cardBox, actionBox] = await Promise.all([
      paymentCard.boundingBox(),
      fixedAction.boundingBox(),
    ]);

    expect(cardBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect((cardBox!.y + cardBox!.height)).toBeLessThanOrEqual(actionBox!.y - 8);
  });

  test('edita observacao e troca pagamento por sheet no checkout mobile', async ({ page }) => {
    await seedCheckoutDraft(page);
    await page.setViewportSize({ width: 390, height: 700 });
    await openRestoredCheckout(page);
    await page.getByTestId('customer-order-note-card').click();

    const noteSheet = page.getByTestId('customer-order-note-sheet');
    await expect(noteSheet).toBeVisible();
    await noteSheet.getByTestId('customer-order-note-input').fill('Sem cebola e avisar ao chegar');
    await noteSheet.getByRole('button', { name: /Salvar observação/i }).click();
    await expect(noteSheet).toBeHidden();
    await expect(page.getByTestId('customer-order-note-card')).toContainText('Sem cebola e avisar ao chegar');

    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    const paymentSummary = page.getByTestId('checkout-payment-summary-card');
    await expect(paymentSummary).toContainText('Dinheiro');
    await paymentSummary.getByRole('button', { name: /Trocar/i }).click();

    const paymentSheet = page.getByTestId('checkout-payment-method-sheet');
    await expect(paymentSheet).toBeVisible();
    await paymentSheet.getByRole('button', { name: /^Pix\b/i }).first().click({ force: true });
    await expect(paymentSheet).toBeHidden();
    await expect(paymentSummary).toContainText('Pix');

    await page.getByRole('button', { name: /Revisar pedido/i }).click({ force: true });
    await expect(page.getByTestId('customer-order-note-summary')).toContainText('Sem cebola e avisar ao chegar');
    await expect(page.getByTestId('checkout-review-payment-card')).toContainText('Pix');
  });

  test('confirma pedido de retirada enviando payload correto', async ({ page }) => {
    await seedCheckoutDraft(page);
    await page.setViewportSize({ width: 390, height: 700 });
    await openRestoredCheckout(page);

    await submitCheckoutFlow(page);

    expect(createdOrders[0]).toMatchObject({
      customerName: 'Cliente Checkout E2E',
      type: 'pickup',
      paymentMethod: 'dinheiro',
    });
    expect(createdOrders[0].items).toEqual([
      expect.objectContaining({ productId: product.id, quantity: 1 }),
    ]);
  });

  test('confirma pedido de entrega com endereco salvo, taxa e coordenadas validas', async ({ page }) => {
    customerAddresses = [nearAddress];
    await seedCheckoutDraft(page);
    await page.setViewportSize({ width: 390, height: 720 });
    await openRestoredCheckout(page);

    await submitDeliveryCheckoutFlow(page);

    expect(createdOrders[0]).toMatchObject({
      customerName: 'Cliente Checkout E2E',
      type: 'delivery',
      fulfillmentMode: 'distance',
      paymentMethod: 'dinheiro',
      deliveryFee: 6.5,
    });
    expect(createdOrders[0].address).toContain('Rua Teste Cliente');
    expect(createdOrders[0].items).toEqual([
      expect.objectContaining({ productId: product.id, quantity: 1 }),
    ]);
  });

  test('confirma pedido de mesa preservando numero da mesa no payload', async ({ page }) => {
    await seedCheckoutDraft(page, { type: 'table', table: '7' });
    await page.setViewportSize({ width: 390, height: 700 });
    await openRestoredCheckout(page);

    await submitCheckoutFlow(page);

    expect(createdOrders[0]).toMatchObject({
      customerName: 'Cliente Checkout E2E',
      type: 'table',
      table: '7',
      paymentMethod: 'dinheiro',
    });
    expect(createdOrders[0].items).toEqual([
      expect.objectContaining({ productId: product.id, quantity: 1 }),
    ]);
  });

  test('bloqueia entrega fora do raio antes de criar pedido', async ({ page }) => {
    customerAddresses = [farAddress];
    await seedCheckoutDraft(page);
    await page.setViewportSize({ width: 390, height: 720 });
    await openRestoredCheckout(page);

    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Entrega\s+No endereço/i }).click();
    await expect(page.getByText(/Não chegamos até aí ainda/i)).toBeVisible({ timeout: 15000 });

    expect(createdOrders).toHaveLength(0);
  });
});
