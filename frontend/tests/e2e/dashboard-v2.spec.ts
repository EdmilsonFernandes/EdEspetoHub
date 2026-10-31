// E2E da V2 do painel do lojista (/admin/dashboardV2). Padrão do repo:
// adminSession fake no localStorage + /api/** mockado por rota. Cobre acesso
// direto, deep-link/refresh, seções, papel OPERATOR, regressão da V1 e
// overflow mobile.
import { expect, test } from '@playwright/test';

const storeId = '00000000-0000-4000-8000-0000000000v2';

const adminSession = {
  token: 'admin-e2e-token',
  user: {
    id: 'admin-e2e',
    role: 'ADMIN',
    name: 'Lojista E2E',
    email: 'lojista-e2e@janocaminho.test',
  },
  store: {
    id: storeId,
    slug: 'loja-v2-e2e',
    name: 'Loja V2 E2E',
    city: 'São José dos Campos',
    settings: {
      logoUrl: '/janocaminho.jpg',
      segment: 'restaurantes',
      pixKey: 'pix@loja.com',
      orderTypes: ['delivery', 'pickup'],
    },
  },
  subscription: {
    status: 'ACTIVE',
    plan: { name: 'pro_monthly' },
    planExempt: false,
  },
  features: { motoboyManagement: true, tipPayouts: true },
};

const operatorSession = {
  ...adminSession,
  token: 'operator-e2e-token',
  user: { ...adminSession.user, id: 'operator-e2e', role: 'OPERATOR', name: 'Operador E2E' },
};

const queueOrders = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    customerName: 'Maria E2E',
    customerPhone: '(12) 98888-7777',
    payment: 'pix',
    paymentStatus: 'PAID',
    total: 42.5,
    items: [{ id: 'i1', qty: 1, unitPrice: 42.5, name: 'Combo espeto' }],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'preparing',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    customerName: 'João E2E',
    payment: 'credito',
    paymentStatus: 'PENDING',
    total: 30,
    items: [{ id: 'i2', qty: 2, unitPrice: 15, name: 'Espeto de carne' }],
  },
];

const historyOrders = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    status: 'delivered',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    customerName: 'Cliente Ontem',
    payment: 'pix',
    paymentStatus: 'PAID',
    total: 55,
    items: [{ id: 'i3', qty: 1, unitPrice: 55, name: 'Combo família' }],
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    status: 'cancelled',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: 'Cliente Cancelado',
    payment: 'dinheiro',
    paymentStatus: 'PENDING',
    total: 20,
    items: [{ id: 'i4', qty: 1, unitPrice: 20, name: 'Refrigerante' }],
  },
];

const analytics = {
  summary: { totalRevenue: 12500, totalOrders: 320, avgTicket: 39.06, periodRevenue: 3200, monthRevenue: 6800 },
  salesByDay: [
    { date: '2026-10-28', total: 410 },
    { date: '2026-10-29', total: 620 },
    { date: '2026-10-30', total: 380 },
  ],
  byPaymentMethod: [
    { method: 'pix', orders: 18, revenue: 900 },
    { method: 'credito', orders: 7, revenue: 320 },
    { method: 'dinheiro', orders: 3, revenue: 90 },
  ],
  comparison: {
    current: { revenue: 3200, orders: 28 },
    previous: { revenue: 2400, orders: 22 },
  },
  pixHealth: { failed: 1, paid: 12 },
  bestDay: { date: '2026-10-29', total: 620 },
};

const mockApi = async (route: any, request: any) => {
  const url = request.url();
  const method = request.method();
  const json = (body: any) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  if (url.includes(`/stores/slug/${adminSession.store.slug}`) && !url.includes('/products') && !url.includes('/categories')) {
    return json({ ...adminSession.store, openNow: true, owner: { phone: '(12) 99999-0000' } });
  }
  if (url.includes('/orders/queue')) return json(queueOrders);
  if (url.includes('/dashboard-analytics')) return json(analytics);
  if (url.includes('/dashboard-movement')) return json({ orders: [] });
  if (url.includes('/inventory/alerts')) return json([]);
  if (url.includes('/reviews/summary')) return json({ average: 4.6, total: 25 });
  if (url.includes('/reviews')) return json([]);
  if (url.includes('/orders') && method === 'GET') return json(historyOrders);
  if (url.includes('/products') && method === 'GET') return json([]);
  if (url.includes('/categories')) return json([]);
  if (url.includes('/subscription')) return json(adminSession.subscription);
  if (url.includes('/plans')) return json({ plans: [], founderPlans: [], founder: null });
  if (url.includes('/delivery-billing')) return json({ cycle: null });
  if (url.includes('/payments')) return json([]);
  if (url.includes('/payment-accounts/mercadopago/point/terminals')) return json({ terminals: [] });
  if (url.includes('/payment-accounts/mercadopago')) {
    return json({
      connected: true,
      oauthConfigured: true,
      validation: { overallStatus: 'READY', pix: { available: true }, credit: { available: true }, debit: { available: false }, checkedAt: new Date().toISOString() },
    });
  }
  if (url.includes('/motoboy-requests')) return json([]);
  if (url.includes('/motoboys')) return json([]);
  if (url.includes('/users')) return json([]);
  if (url.includes('/destinations')) return json([]);
  if (url.includes('/condominiums')) return json([]);
  if (url.includes('/coupons')) return json([]);
  if (url.includes('/featured')) return json([]);
  if (url.includes('/promo-pushes')) return json([]);
  if (url.includes('/link-stats')) return json({ clicks: 0 });
  if (method !== 'GET') return json({ ok: true });
  return json({});
};

test.use({ serviceWorkers: 'block' });

const loginAs = async (page: any, session: any) => {
  await page.addInitScript((value) => {
    localStorage.setItem('adminSession', JSON.stringify(value));
  }, session);
};

test.describe('Painel V2 — acesso e navegação', () => {
  // Cold-start do dev server transforma chunks grandes (recharts, dashboard V1)
  // na primeira carga — tolerância maior nas assertions.
  test.setTimeout(120_000);

  test('sem sessão: /admin/dashboardV2 cai no login', async ({ page }) => {
    await page.goto('/admin/dashboardV2');
    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  });

  test('acesso direto renderiza o shell V2 com Resumo', async ({ page }) => {
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.goto('/admin/dashboardV2');
    await expect(page.getByRole('heading', { name: 'Resumo' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite)/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Receita do período')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('R$ 3.200,00')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Pedidos em andamento')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Loja aberta')).toBeVisible({ timeout: 20_000 });
  });

  test('deep-link na fila + refresh mantém a rota e o board', async ({ page }) => {
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.goto('/admin/dashboardV2/fila');
    await expect(page.getByRole('heading', { name: 'Gestor de Pedidos' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Novos', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Maria E2E').first()).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/dashboardV2\/fila/);
    await expect(page.getByText('Maria E2E').first()).toBeVisible({ timeout: 30_000 });
  });

  test('navegação interna e voltar do navegador (desktop, sidebar visível)', async ({ page }) => {
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/dashboardV2');
    await expect(page.getByRole('heading', { name: 'Resumo' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Histórico de Pedidos' }).first().click();
    await expect(page).toHaveURL(/\/admin\/dashboardV2\/pedidos/);
    await expect(page.getByText('Cliente Ontem').first()).toBeVisible({ timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/dashboardV2\/?$/);
    await expect(page.getByRole('heading', { name: 'Resumo' })).toBeVisible({ timeout: 20_000 });
  });

  test('seções principais renderizam com dados reais mockados', async ({ page }) => {
    test.setTimeout(150_000);
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    for (const path of [
      '/avaliacoes',
      '/produtos',
      '/estoque',
      '/cupons',
      '/assinatura',
      '/gateway',
      '/usuarios',
      '/config',
    ] as const) {
      await page.goto(`/admin/dashboardV2${path}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(250);
    }
  });

  test('gateway representa o estado real (débito indisponível aparece como indisponível)', async ({ page }) => {
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.goto('/admin/dashboardV2/gateway');
    await expect(page.getByText('Conectado e validado')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Indisponível')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Disponível').first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Painel V2 — OPERATOR', () => {
  test.setTimeout(90_000);
  test('cai na fila (base do operador), menu reduzido e área restrita sinalizada', async ({ page }) => {
    await loginAs(page, operatorSession);
    await page.route('**/api/**', mockApi);
    await page.goto('/admin/dashboardV2');
    await expect(page).toHaveURL(/\/admin\/dashboardV2\/fila/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Gestor de Pedidos' })).toBeVisible({ timeout: 20_000 });
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: 'Assinatura e plano' })).toHaveCount(0);
    await page.goto('/admin/dashboardV2/assinatura');
    await expect(page.getByText('Acesso restrito')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Painel V2 — board da fila', () => {
  test.setTimeout(90_000);
  test('clicar em card abre detalhe e avançar status chama a API', async ({ page }) => {
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.goto('/admin/dashboardV2/fila');
    await page.getByText('Maria E2E').first().click();
    await expect(page.getByRole('heading', { name: 'Itens' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('dialog').getByText('Combo espeto')).toBeVisible();
    const statusPatch = page.waitForRequest(
      (request) => request.url().includes('/orders/11111111') && request.method() === 'PATCH'
    );
    await page.getByRole('button', { name: /Começar a preparar/ }).click();
    await statusPatch;
  });
});

test.describe('Painel V2 — mobile e regressão V1', () => {
  test('sem overflow horizontal em 390px na home e na fila', async ({ page }) => {
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/dashboardV2');
    await page.waitForTimeout(400);
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(homeOverflow).toBe(false);
    await page.goto('/admin/dashboardV2/fila');
    await page.waitForTimeout(400);
    const filaOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(filaOverflow).toBe(false);
  });

  test('painel clássico (V1) continua no ar', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, adminSession);
    await page.route('**/api/**', mockApi);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    // chunk da V1 é grande: no dev cold-start passa dos 5s padrão; no mobile o
    // header colapsa o nome da loja — o anexo prova que a V1 carregou com a sessão.
    await expect(page.getByText('Loja V2 E2E').first()).toBeAttached({ timeout: 45_000 });
  });
});
