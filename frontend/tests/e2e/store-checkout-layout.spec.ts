import { expect, test } from '@playwright/test';

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
    orderTypes: ['pickup', 'delivery'],
    lat: -23.2237,
    lng: -45.9009,
  },
  paymentSummary: {
    cashEnabled: true,
    manualPixEnabled: false,
    onlineEnabled: true,
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

test.use({ serviceWorkers: 'block' });

test.describe('Store checkout layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ slug, item }) => {
      localStorage.clear();
      const customerSession = {
        token: 'customer-token-e2e',
        user: {
          id: 'customer-checkout-layout-e2e',
          fullName: 'Cliente Checkout E2E',
          phone: '(12) 99999-0000',
          email: 'cliente-checkout@e2e.test',
        },
      };
      const draft = {
        version: 1,
        savedAt: Date.now(),
        context: 'public',
        cart: {
          [item.id]: { ...item, qty: 1 },
        },
        customer: {
          name: 'Cliente Checkout E2E',
          phone: '(12) 99999-0000',
          type: 'pickup',
        },
        paymentMethod: 'dinheiro',
        deliveryMode: 'distance',
        selectedPostalServiceCode: '',
        view: 'cart',
      };
      localStorage.setItem('customerSession', JSON.stringify(customerSession));
      localStorage.setItem(`customerSession:${slug}`, JSON.stringify(customerSession));
      localStorage.setItem(`storeCheckoutDraft:${slug}:public`, JSON.stringify(draft));
    }, { slug: storeSlug, item: product });

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
        body: JSON.stringify({
          id: 'customer-checkout-layout-e2e',
          fullName: 'Cliente Checkout E2E',
          phone: '(12) 99999-0000',
          email: 'cliente-checkout@e2e.test',
        }),
      });
    });
    await page.route('**/api/customer/addresses', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/customer/orders**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
  });

  test('mantem pagamento e troco visiveis acima do CTA fixo no mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto(`/${storeSlug}`);

    await expect(page.getByText('Pedido em andamento restaurado neste aparelho.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(product.name)).toBeVisible();

    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Sem troco/i }).click();
    await page.getByPlaceholder('0,00').fill('100');
    await page.getByRole('button', { name: /Revisar pedido/i }).click();

    const paymentCard = page.getByTestId('checkout-review-payment-card');
    const fixedAction = page.getByTestId('checkout-fixed-action');
    await expect(paymentCard).toContainText('Troco para R$ 100,00');

    await paymentCard.scrollIntoViewIfNeeded();
    const [cardBox, actionBox] = await Promise.all([
      paymentCard.boundingBox(),
      fixedAction.boundingBox(),
    ]);

    expect(cardBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect((cardBox!.y + cardBox!.height)).toBeLessThanOrEqual(actionBox!.y - 8);
  });
});
