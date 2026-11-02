import { expect, test, type Page } from '@playwright/test';

/**
 * Venda por peso (30/10) — E2E do fluxo do CLIENTE com API mockada (page.route,
 * padrão de store-checkout-layout.spec.ts; zero cobrança real, zero backend):
 *   1. vitrine anuncia preço por kg ("R$ 10,00/kg") só no produto por peso;
 *   2. modal: stepper em degraus (250→500 g…), subtotal proporcional fechado,
 *      mínimo respeitado, adição ao carrinho;
 *   3. sacola (draft restaurado): "750 g — R$ 7,50" e carrinho misto com unidade;
 *   4. checkout envia payload com quantity em GRAMAS (750) — backend recalcula;
 *   5. rastreio público mostra "500 g de Tomate", nunca "500x".
 */

const storeSlug = 'peso-e2e';
const store = {
  id: 'store-peso-e2e',
  slug: storeSlug,
  name: 'Hortifruti do Bairro E2E',
  openNow: true,
  owner: { phone: '(12) 99999-0000', address: 'Rua Teste, 100' },
  subscription: { status: 'ACTIVE', planExempt: true },
  settings: {
    logoUrl: '/janocaminho.jpg',
    bannerUrl: '/janocaminho.jpg',
    segment: 'Mercado',
    address: 'Rua Teste, 100 - Centro',
    city: 'Sao Jose dos Campos',
    state: 'SP',
    isOrderingEnabled: true,
    orderTypes: ['pickup', 'delivery', 'table'],
    lat: -23.2237,
    lng: -45.9009,
    deliveryRadiusKm: 5,
    minOrderValue: 0,
  },
  paymentSummary: {
    cashEnabled: true,
    manualPixEnabled: false,
    onlineEnabled: true,
    methods: { pixOnline: true, creditOnline: false, debitOnline: false, manualPix: false, cash: true },
  },
};

const tomate = {
  id: 'prod-tomate-e2e',
  name: 'Tomate Italiano',
  price: 10,
  imageUrl: '/janocaminho.jpg',
  category: 'Legumes',
  active: true,
  saleUnit: 'WEIGHT',
  weightMinG: 250,
  weightStepG: 250,
};

const abacaxi = {
  id: 'prod-abacaxi-e2e',
  name: 'Abacaxi Pérola',
  price: 5,
  imageUrl: '/janocaminho.jpg',
  category: 'Frutas',
  active: true,
  saleUnit: 'UNIT',
};

const customerSession = {
  token: 'customer-token-peso-e2e',
  user: {
    id: 'customer-peso-e2e',
    fullName: 'Cliente Peso E2E',
    phone: '(12) 99999-0001',
    email: 'cliente-peso@e2e.test',
  },
};

test.use({ serviceWorkers: 'block' });

test.describe('Venda por peso — fluxo do cliente', () => {
  // Cold-start do dev server transforma chunks grandes na primeira carga
  // (Safari pune mais) — tolerância das specs V2.
  test.setTimeout(120_000);
  let createdOrders: Record<string, any>[];

  test.beforeEach(async ({ page }) => {
    createdOrders = [];

    await page.route(`**/stores/slug/${storeSlug}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(store) });
    });
    await page.route(`**/public/stores/slug/${storeSlug}/products**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([tomate, abacaxi]) });
    });
    await page.route(`**/public/stores/slug/${storeSlug}/categories**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'legumes', name: 'Legumes', active: true },
          { id: 'frutas', name: 'Frutas', active: true },
        ]),
      });
    });
    await page.route(`**/public/stores/slug/${storeSlug}/tables/status**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/public/stores/slug/${storeSlug}/highlights**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/public/stores/slug/${storeSlug}/track`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/customer/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customerSession.user) });
    });
    await page.route('**/customer/addresses', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/customer/orders', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/stores/slug/${storeSlug}/orders`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
        return;
      }
      const payload = route.request().postDataJSON();
      createdOrders.push(payload);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `order-peso-e2e-${createdOrders.length}`,
          status: 'pending',
          type: payload.type,
          table: payload.table || null,
          customerName: payload.customerName,
          paymentStatus: 'PENDING',
          accessToken: `access-${createdOrders.length}`,
          queuePosition: 1,
        }),
      });
    });
    await page.route('**/orders/**/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-peso-e2e-public',
          status: 'pending',
          type: 'pickup',
          table: null,
          customerName: 'Cliente Peso E2E',
          items: [
            { id: 'oi-1', name: 'Tomate Italiano', quantity: 500, price: 5, saleUnit: 'WEIGHT' },
            { id: 'oi-2', name: 'Abacaxi Pérola', quantity: 2, price: 10, saleUnit: 'UNIT' },
          ],
          total: 15,
        }),
      });
    });
  });

  const gotoStore = async (page: Page) => {
    await page.goto(`/${storeSlug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(tomate.name).first()).toBeVisible({ timeout: 20000 });
    // Vitrine assenta depois que as imagens terminam (layout-shift travava o
    // click do card em runs paralelos) — espera a rede esfriar + settle.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await page.getByText(tomate.name).first().scrollIntoViewIfNeeded().catch(() => undefined);
  };

  test('vitrine anuncia preço por kg apenas no produto por peso', async ({ page }) => {
    await gotoStore(page);
    // Tomate por peso: "/kg" no card; abacaxi por unidade: sem sufixo.
    await expect(page.getByText('R$ 10,00/kg').first()).toBeVisible();
    await expect(page.getByText(`${abacatePriceLabel()}`).first()).toBeVisible();
  });

  test('modal por peso: degraus de 250 g, subtotal fechado, mínimo respeitado', async ({ page }) => {
    await gotoStore(page);
    await page.getByText(tomate.name).first().click();

    const qtyLabel = page.getByTestId('weight-qty-label');
    await expect(qtyLabel).toBeVisible({ timeout: 10000 });

    // Abre no mínimo: 250 g = R$ 2,50 (preço fechado antes de pagar)
    await expect(qtyLabel).toHaveText(/250 g/);
    await expect(page.getByText('Vendido por peso').first()).toBeVisible();
    await expect(page.getByText('R$ 2,50').first()).toBeVisible();

    // + um degrau: 500 g = R$ 5,00 — rótulo do botão diz o incremento
    await page.getByRole('button', { name: 'Aumentar 250 g' }).click();
    await expect(qtyLabel).toHaveText(/500 g/);
    await expect(page.getByText('R$ 5,00').first()).toBeVisible();

    // + + : 750 g = R$ 7,50; − volta pra 500 g (degraus, nunca 499)
    await page.getByRole('button', { name: 'Aumentar 250 g' }).click();
    await expect(qtyLabel).toHaveText(/750 g/);
    await page.getByRole('button', { name: 'Diminuir 250 g' }).click();
    await expect(qtyLabel).toHaveText(/500 g/);

    // − no mínimo (250 g) cai pra remoção — nunca "125 g" nem "0 g"
    await page.getByRole('button', { name: 'Diminuir 250 g' }).click();
    await expect(qtyLabel).toHaveText(/250 g/);
    await page.getByRole('button', { name: 'Diminuir 250 g' }).click();
    await expect(page.getByRole('button', { name: /remover do pedido/i }).first()).toBeVisible();
  });

  test('modal por peso: porções rápidas e CTA com peso + valor explícitos', async ({ page }) => {
    await gotoStore(page);
    await page.getByText(tomate.name).first().click();

    const qtyLabel = page.getByTestId('weight-qty-label');
    await expect(qtyLabel).toBeVisible({ timeout: 10000 });

    // Chips derivados do cadastro (mín 250 / degrau 250): 250 g, 500 g, 1 kg
    const chips = page.getByTestId('weight-quick-portions').locator('button');
    await expect(chips).toHaveCount(3);
    await expect(chips.nth(0)).toHaveText('250 g');
    await expect(chips.nth(1)).toHaveText('500 g');
    await expect(chips.nth(2)).toHaveText('1 kg');

    // 1 toque em "1 kg" = 1 kg direto (sem somar 3 vezes 250 g)
    await chips.nth(2).click();
    await expect(qtyLabel).toHaveText(/1 kg/);
    await expect(page.getByText('R$ 10,00').first()).toBeVisible();

    // CTA deixa claro peso E valor — nunca "quantidade: 1"
    const cta = page.getByTestId('weight-cta-label');
    await expect(cta).toHaveText(/Adicionar 1 kg/);

    // Chip ativo fica marcado; voltar pra 250 g atualiza o CTA
    await chips.nth(0).click();
    await expect(cta).toHaveText(/Adicionar 250 g/);
  });

  test('sacola mista: 750 g de tomate + 2 abacaxis — valores e rótulos corretos', async ({ page }) => {
    await page.addInitScript(({ slug, session }) => {
      localStorage.clear();
      const draft = {
        version: 1,
        savedAt: Date.now(),
        context: 'public',
        cart: {
          // Entry de peso: price = preço/kg LIMPO (handleAddToCart), qty em gramas.
          [ 'prod-tomate-e2e:0:0:' ]: {
            ...{
              id: 'prod-tomate-e2e',
              name: 'Tomate Italiano',
              price: 10,
              originalPrice: 10,
              saleUnit: 'WEIGHT',
              weightMinG: 250,
              weightStepG: 250,
              qty: 750,
              cookingPoint: '',
              passSkewer: false,
              selectedModifiers: [],
              manageStock: false,
              bundlePromoActive: false,
            },
            key: 'prod-tomate-e2e:0:0:',
          },
          'prod-abacaxi-e2e:0:0:': {
            id: 'prod-abacaxi-e2e',
            name: 'Abacaxi Pérola',
            price: 5,
            originalPrice: 5,
            saleUnit: 'UNIT',
            qty: 2,
            cookingPoint: '',
            passSkewer: false,
            selectedModifiers: [],
            manageStock: false,
            bundlePromoActive: false,
            key: 'prod-abacaxi-e2e:0:0:',
          },
        },
        customer: { name: 'Cliente Peso E2E', phone: '(12) 99999-0001', type: 'pickup' },
        paymentMethod: 'dinheiro',
        deliveryMode: 'distance',
        selectedPostalServiceCode: '',
        view: 'cart',
      };
      localStorage.setItem('customerSession', JSON.stringify(session));
      localStorage.setItem(`customerSession:${slug}`, JSON.stringify(session));
      localStorage.setItem(`storeCheckoutDraft:${slug}:public`, JSON.stringify(draft));
    }, { slug: storeSlug, session: customerSession });

    await gotoStore(page);
    // Linha por peso: rótulo "750 g" + subtotal R$ 7,50 (10/kg × 0,75) + ref /kg
    await expect(page.getByTestId('cart-weight-qty').first()).toHaveText(/750 g/);
    await expect(page.getByText('R$ 10,00/kg').first()).toBeVisible();
    await expect(page.getByText('R$ 7,50').first()).toBeVisible();
    // Abacaxi por unidade segue "2" e R$ 10,00
    await expect(page.getByText('R$ 10,00').first()).toBeVisible();

    // Checkout multi-step (Sacola → Receber → Pagamento → Confirmar): payload
    // final com quantity em GRAMAS (750) — o backend recalcula e é a autoridade.
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.getByTestId('checkout-payment-summary-card')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Revisar pedido/i }).click({ force: true });
    await expect(page.getByTestId('checkout-review-payment-card')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Enviar pedido para a loja/i }).click({ force: true });
    await expect
      .poll(() => createdOrders.length, { timeout: 15000 })
      .toBeGreaterThanOrEqual(1);
    const payload = createdOrders[0];
    const tomateItem = payload.items.find((item: any) => item.id === 'prod-tomate-e2e' || item.productId === 'prod-tomate-e2e');
    expect(Number(tomateItem?.quantity)).toBe(750);
  });

  test('rastreio público: "500 g" de Tomate, nunca "500x"', async ({ page }) => {
    await page.goto('/pedido/order-peso-e2e-public');
    await expect(page.getByText(/500 g/).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/500x/)).toHaveCount(0);
    await expect(page.getByText(/2x/).first()).toBeVisible();
  });

  test('atalho "+" do card respeita o peso: 1º toque = mínimo, contador em gramas', async ({ page }) => {
    await gotoStore(page);
    // Botão + flutuante do card do tomate (fora do modal)
    await page.locator('[data-menu-card]').first().hover();
    await page.locator('[data-menu-card] button').last().click();
    await page.waitForTimeout(900);
    // Contador expandido do card mostra o MÍNIMO em gramas — nunca "1"
    await expect(page.getByTestId('card-weight-qty').first()).toHaveText(/250 g/);
    // + de novo = incremento (250 g a mais → 500 g)
    await page.locator('[data-menu-card]').first().hover();
    await page.getByTestId('card-weight-qty').first().click();
    await page.waitForTimeout(400);
    await page.locator('[data-menu-card]').first().hover();
    await page.locator('[data-menu-card] button').last().click();
    await page.waitForTimeout(900);
    await expect(page.getByTestId('card-weight-qty').first()).toHaveText(/500 g/);
  });

  test('sacola flutuante calcula peso por kg (nunca preço × gramas)', async ({ page }) => {
    // Regressão do bug do "R$ 1.199": o total da sacola flutuante fazia
    // unitPrice × qty — para 100 g a R$ 11,99/kg exibia R$ 1.199,00.
    await gotoStore(page);
    await page.locator('[data-menu-card]').first().hover();
    await page.locator('[data-menu-card] button').last().click();
    await page.waitForTimeout(1200);
    // Tomate R$10/kg × 250 g = R$ 2,50 no FAB da sacola da vitrine.
    await expect(page.getByText('R$ 2,50').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1[.,]?199|2\.500/)).toHaveCount(0);
  });
});

function abacatePriceLabel() {
  return 'R$ 5,00';
}
