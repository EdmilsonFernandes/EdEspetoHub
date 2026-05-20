import { expect, test } from '@playwright/test';

const storeId = '00000000-0000-4000-8000-000000000001';

const adminSession = {
  token: 'e2e-token',
  user: {
    id: 'admin-e2e',
    role: 'ADMIN',
    name: 'Admin E2E',
    email: 'admin-e2e@janocaminho.test',
  },
  store: {
    id: storeId,
    slug: 'e2e-store',
    name: 'Loja E2E',
    settings: {
      logoUrl: '/janocaminho.jpg',
      prepBaseMinutes: 20,
      orderNotificationSound: '',
      orderNotificationSoundDuration: 5,
    },
  },
  subscription: {
    status: 'ACTIVE',
    plan: { name: 'Basico' },
  },
  features: {
    motoboyManagement: false,
  },
};

const queueOrders = [
  {
    id: 'order-e2e-1',
    customerName: 'Cliente E2E',
    name: 'Cliente E2E',
    phone: '(11) 99999-0000',
    status: 'pending',
    type: 'delivery',
    fulfillmentMode: 'distance',
    payment: 'pix',
    paymentStatus: 'PENDING',
    total: 29,
    deliveryFee: 5,
    address: 'Rua Teste, 123',
    createdAt: new Date(Date.now() - 90_000).toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: 'item-e2e-1',
        productId: 'product-e2e-1',
        name: 'Medalhao de Palmito',
        qty: 2,
        unitPrice: 12,
        price: 24,
        isPrinted: true,
      },
    ],
  },
];

const products = [
  {
    id: 'product-e2e-1',
    name: 'Medalhao de Palmito',
    category: 'Espetos',
    price: 12,
    imageUrl: '/janocaminho.jpg',
    active: true,
  },
  {
    id: 'product-e2e-2',
    name: 'Suco de Uva',
    category: 'Bebidas',
    price: 8,
    imageUrl: '/janocaminho.jpg',
    active: true,
  },
];

test.use({ serviceWorkers: 'block' });

test.describe('Admin queue UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((session) => {
      localStorage.setItem('adminSession', JSON.stringify(session));
      localStorage.setItem('adminSidebar:compact', 'false');
    }, adminSession);

    await page.route(`**/api/stores/${storeId}/orders/queue`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(queueOrders) });
    });
    await page.route(`**/api/stores/${storeId}/orders`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(`**/api/stores/${storeId}/products`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(products) });
    });
    await page.route('**/api/stores/slug/e2e-store', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: storeId, slug: 'e2e-store', name: 'Loja E2E', settings: adminSession.store.settings }),
      });
    });
  });

  test('abre detalhe do pedido e mostra picker de produto com imagem, categoria e preco', async ({ page }) => {
    await page.goto('/admin/queue');

    await expect(page.getByTestId('admin-order-card').first()).toBeVisible();
    await expect(page.getByText('Cliente E2E')).toBeVisible();

    await page.getByText('Cliente E2E').first().click();
    await expect(page.getByTestId('admin-order-detail')).toBeVisible();
    await expect(page.getByText('Medalhao de Palmito').first()).toBeVisible();

    await page.getByTestId('admin-product-picker-button').click();
    await page.getByTestId('admin-product-picker-search').fill('palmito');

    const option = page.getByTestId('admin-product-option').filter({ hasText: 'Medalhao de Palmito' }).first();
    await expect(option).toBeVisible();
    await expect(option).toContainText('Espetos');
    await expect(option).toContainText('R$ 12,00');
  });

  test.describe('viewport web', () => {
    test.use({ viewport: { width: 1280, height: 860 }, isMobile: false, hasTouch: false });

    test('mantem o detalhe centralizado em viewport web', async ({ page }) => {
      await page.goto('/admin/queue');

      await page.getByTestId('admin-order-card').first().click();

      const detail = page.getByTestId('admin-order-detail');
      await expect(detail).toBeVisible();
      const box = await detail.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 1280;
      const expectedLeft = box ? (viewportWidth - box.width) / 2 : 0;

      expect(box?.width).toBeLessThan(viewportWidth * 0.85);
      expect(Math.abs((box?.x || 0) - expectedLeft)).toBeLessThan(48);
    });
  });
});
