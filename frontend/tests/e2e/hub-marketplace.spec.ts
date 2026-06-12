import { expect, test } from '@playwright/test';

const stores = [
  {
    id: 'store-gustavao-e2e',
    slug: 'gustavao-e2e',
    name: 'Gustavao Espetos E2E',
    openNow: true,
    distanceKm: 1.2,
    acceptsDelivery: true,
    acceptsPickup: true,
    deliveryFee: 0,
    reviewSummary: { totalReviews: 128, avgStoreRating: 4.9 },
    settings: {
      logoUrl: '/janocaminho.jpg',
      bannerUrl: '/janocaminho.jpg',
      segment: 'Restaurante',
      city: 'Sao Jose dos Campos',
      state: 'SP',
      isOrderingEnabled: true,
      orderTypes: ['delivery', 'pickup'],
      lat: -23.2237,
      lng: -45.9009,
    },
  },
  {
    id: 'store-brisa-e2e',
    slug: 'brecho-brisa-e2e',
    name: 'Brecho da Brisa E2E',
    openNow: true,
    distanceKm: 2.4,
    acceptsDelivery: false,
    acceptsPickup: true,
    deliveryFee: 7,
    reviewSummary: { totalReviews: 42, avgStoreRating: 4.7 },
    settings: {
      logoUrl: '/janocaminho.jpg',
      bannerUrl: '/janocaminho.jpg',
      segment: 'Loja',
      city: 'Sao Jose dos Campos',
      state: 'SP',
      isOrderingEnabled: true,
      orderTypes: ['pickup'],
      lat: -23.225,
      lng: -45.902,
    },
  },
];

const productsBySlug: Record<string, any[]> = {
  'gustavao-e2e': [
    {
      id: 'product-palmito-e2e',
      name: 'Medalhao Premium',
      price: 16,
      imageUrl: '/janocaminho.jpg',
      isFeatured: true,
      active: true,
    },
    {
      id: 'product-tulipa-e2e',
      name: 'Tulipa Especial',
      price: 18,
      imageUrl: '/janocaminho.jpg',
      isFeatured: true,
      active: true,
    },
  ],
  'brecho-brisa-e2e': [
    {
      id: 'product-achado-e2e',
      name: 'Achado especial',
      price: 25,
      imageUrl: '/janocaminho.jpg',
      isFeatured: true,
      active: true,
    },
    {
      id: 'product-presente-e2e',
      name: 'Presente criativo',
      price: 32,
      imageUrl: '/janocaminho.jpg',
      isFeatured: true,
      active: true,
    },
  ],
};

const featuredProducts = [
  {
    id: 'featured-palmito-e2e',
    productId: 'product-palmito-e2e',
    storeSlug: 'gustavao-e2e',
    storeName: 'Gustavao Espetos E2E',
    storeLogoUrl: '/janocaminho.jpg',
    productName: 'Medalhao Premium',
    imageUrl: '/janocaminho.jpg',
    price: 16,
    badge: 'Selecao',
  },
];

const homeConfig = {
  homeBanners: [],
  marketingPopup: {
    imageUrl: '',
    title: '',
    description: '',
    actionUrl: '',
    actionLabel: '',
    active: false,
    fit: 'cover',
  },
};

const customerSession = {
  token: 'customer-token-hub-e2e',
  user: {
    id: 'customer-hub-e2e',
    fullName: 'Wekoya Cliente E2E',
    phone: '(12) 98888-0000',
    email: 'wekoya@e2e.test',
  },
};

test.use({ serviceWorkers: 'block' });

test.describe('Hub marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.route('**/api/public/home-config', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(homeConfig) });
    });

    await page.route('**/api/public/condominiums', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/public/destinations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'dest-sfx-e2e',
            slug: 'sao-francisco-xavier',
            name: 'Sao Francisco Xavier',
            city: 'Sao Francisco Xavier',
            state: 'SP',
            bannerUrl: '/janocaminho.jpg',
            placesCount: 1,
            listingsCount: 2,
            active: true,
          },
        ]),
      });
    });

    await page.route('**/api/public/featured-products**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(featuredProducts) });
    });

    await page.route(/\/api\/public\/stores\/slug\/([^/]+)\/products(\?.*)?$/, async (route) => {
      const match = route.request().url().match(/\/api\/public\/stores\/slug\/([^/]+)\/products/);
      const slug = decodeURIComponent(match?.[1] || '');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(productsBySlug[slug] || []),
      });
    });

    await page.route(/\/api\/stores\/slug\/([^/?]+)(\?.*)?$/, async (route) => {
      const match = route.request().url().match(/\/api\/stores\/slug\/([^/?]+)/);
      const slug = decodeURIComponent(match?.[1] || '');
      const store = stores.find((entry) => entry.slug === slug);
      await route.fulfill({
        status: store ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(store || { message: 'Loja não encontrada' }),
      });
    });

    await page.route(/\/api\/public\/stores\/slug\/([^/]+)\/categories(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'cat-main-e2e', name: 'Principais', active: true }]),
      });
    });

    await page.route(/\/api\/public\/stores\/slug\/([^/]+)\/highlights(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(/\/api\/public\/stores\/slug\/([^/]+)\/tables\/status(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(/\/api\/public\/stores\/slug\/([^/]+)\/track(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.route('**/api/customer/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customerSession.user) });
    });

    await page.route('**/api/customer/addresses', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/customer/orders**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(/\/api\/public\/stores\/discovery(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'deliverable', stores }),
      });
    });

    await page.route(/\/api\/public\/stores(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stores) });
    });
  });

  test('carrega lojas, filtros e destaque sem perder dados principais', async ({ page }) => {
    await page.goto('/hub');

    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /Gustavao Espetos E2E 4\.9/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /Brecho da Brisa E2E 4\.7/i })).toBeVisible();
    await expect(page.getByLabel('Favoritar Gustavao Espetos E2E')).toBeVisible();
    await expect(page.getByLabel('Aberto agora')).toBeVisible();
    await expect(page.getByLabel('Entrega grátis')).toBeVisible();
    await expect(page.getByText('1,2 km')).toBeVisible();
    await expect(page.getByText('Grátis').first()).toBeVisible();

    const featuredSection = page.locator('section').filter({ hasText: 'Destaques de hoje' }).first();
    await expect(featuredSection).toContainText('Medalhao Premium', { timeout: 15000 });
    await expect(featuredSection).toContainText('por Gustavao Espetos E2E');
  });

  test('abre a tela de ver mais destaques e permite busca por item', async ({ page }) => {
    await page.goto('/hub');

    const featuredSection = page.locator('section').filter({ hasText: 'Destaques de hoje' }).first();
    const highlightsLink = featuredSection.getByRole('link', { name: /Ver mais/i });
    await expect(highlightsLink).toBeVisible({ timeout: 15000 });
    await expect(highlightsLink).toHaveAttribute('href', '/hub/destaques');

    await page.route(/\/api\/public\/stores\/discovery(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'deliverable', stores: [stores[1]] }),
      });
    });

    await page.goto('/hub/destaques');

    await expect(page).toHaveURL(/\/hub\/destaques/);
    await expect(page.getByRole('banner')).toContainText('Destaques de hoje');
    await expect(page.getByText('Escolha pelo que deu vontade')).toBeVisible();
    const filterGrid = page.getByTestId('highlight-category-filters');
    await expect(filterGrid).toBeVisible();
    await expect(filterGrid).toContainText('Todos');
    await expect(filterGrid).toContainText('Pratos');
    const filterButtonRows = await filterGrid.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => Math.round((button as HTMLElement).offsetTop))
    );
    expect(new Set(filterButtonRows).size).toBe(1);
    await expect(page.getByRole('link', { name: /Tulipa Especial/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Achado especial/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Voltar para a home/i })).toHaveCount(0);
    await page.getByPlaceholder('O que deu vontade agora?').fill('medalhao');
    await expect(page.getByRole('link', { name: /Medalhao Premium/ }).first()).toBeVisible();
    await expect(page.getByText('por Gustavao Espetos E2E')).toBeVisible();
  });

  test('menu do hub prioriza login de cliente e deixa profissional como secundario', async ({ page }) => {
    await page.goto('/hub');

    await expect(page.getByRole('link', { name: /Gustavao Espetos E2E 4\.9/i })).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Abrir menu de perfil').first().click();
    await expect(page.getByText('Acesse sua conta')).toBeVisible();
    await page.waitForTimeout(550);

    const professionalAccess = page.getByRole('button', { name: /Sou profissional/i });
    await expect(professionalAccess).toBeVisible();
    await professionalAccess.evaluate((element: HTMLElement) => element.click());
    await expect(page.getByRole('button', { name: /^Lojista/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Entregador/i })).toBeVisible();
    await page.getByLabel('Fechar escolha de acesso').click({ force: true });

    await page.locator('aside').getByRole('button', { name: /^Entrar/i }).click({ force: true });
    await expect(page).toHaveURL(/\/cliente\?mode=login/);
  });

  test('abre loja pelo hub em modo cliente mesmo com sessão lojista de outra loja', async ({ page }) => {
    await page.goto('/hub');
    await expect(page.getByRole('link', { name: /Brecho da Brisa E2E/i })).toBeVisible({ timeout: 15000 });

    await page.evaluate(({ session }) => {
      const adminSession = {
        token: 'admin-gustavao-e2e',
        user: { id: 'admin-gustavao-e2e', role: 'LOJISTA', email: 'gustavao@e2e.test' },
        store: { id: 'store-gustavao-e2e', slug: 'gustavao-e2e', name: 'Gustavao Espetos E2E', settings: {} },
      };
      localStorage.setItem(
        'adminSession',
        JSON.stringify(adminSession)
      );
      localStorage.setItem('customerSession', JSON.stringify(session));
      localStorage.setItem('customerSession:brecho-brisa-e2e', JSON.stringify(session));
      window.dispatchEvent(new CustomEvent('jnc:customer-session-updated', { detail: session }));
    }, { session: customerSession });

    await page.getByRole('link', { name: /Brecho da Brisa E2E 4\.7/i }).click();

    await expect(page).toHaveURL(/\/brecho-brisa-e2e/);
    await expect(page.locator('h1').filter({ hasText: 'Brecho da Brisa E2E' }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Minha conta')).toBeVisible();
    await expect(page.getByText('Painel Admin')).toHaveCount(0);
    await expect(page.getByText(/^Painel$/)).toHaveCount(0);
    await expect(page.getByText('Fila de Pedidos')).toHaveCount(0);
  });
});
