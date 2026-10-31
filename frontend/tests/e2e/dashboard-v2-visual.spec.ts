// QA visual da V2 (não é spec de assert): tira screenshots em 390px e 1280px
// de cada seção com dados mockados, para inspeção de layout/cortes/overflow.
// Uso: npx playwright test tests/e2e/dashboard-v2-visual.ts --project "Mobile Chrome" --headed=false
// Screenshots: frontend/test-results/dashboard-v2/
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const storeId = '00000000-0000-4000-8000-0000000000v2';

const adminSession = {
  token: 'admin-e2e-token',
  user: { id: 'admin-e2e', role: 'ADMIN', name: 'Lojista E2E', email: 'lojista@janocaminho.test' },
  store: {
    id: storeId,
    slug: 'loja-v2-e2e',
    name: 'EC Ponto da Fruta E2E',
    city: 'São José dos Campos',
    settings: { logoUrl: '', segment: 'restaurantes', pixKey: 'pix@loja.com', orderTypes: ['delivery', 'pickup'] },
  },
  subscription: { status: 'ACTIVE', plan: { name: 'pro_monthly' }, planExempt: false },
  features: { motoboyManagement: true, tipPayouts: true },
};

const now = Date.now();
const queueOrders = [
  { id: 'a1', status: 'pending', createdAt: new Date(now - 4 * 60000).toISOString(), customerName: 'Maria Silva', payment: 'pix', paymentStatus: 'PAID', total: 42.5, items: [{ id: 'i1', qty: 1, unitPrice: 42.5, name: 'Combo espeto duplo' }] },
  { id: 'a2', status: 'preparing', createdAt: new Date(now - 14 * 60000).toISOString(), customerName: 'João Pereira Souza', payment: 'credito', paymentStatus: 'PENDING', total: 87.9, items: [{ id: 'i2', qty: 3, unitPrice: 29.3, name: 'Espeto de contra-filé' }] },
  { id: 'a3', status: 'ready_for_delivery', createdAt: new Date(now - 26 * 60000).toISOString(), customerName: 'Ana', payment: 'pix', paymentStatus: 'PAID', total: 25, items: [{ id: 'i3', qty: 1, unitPrice: 25, name: 'Marmitex' }] },
  { id: 'a4', status: 'in_delivery', createdAt: new Date(now - 40 * 60000).toISOString(), customerName: 'Carlos', payment: 'dinheiro', paymentStatus: 'PENDING', total: 60, items: [{ id: 'i4', qty: 2, unitPrice: 30, name: 'Pizza calabresa' }] },
];

const analytics = {
  summary: { totalRevenue: 12500, totalOrders: 320, avgTicket: 39.06, periodRevenue: 3200, monthRevenue: 6800 },
  salesByDay: Array.from({ length: 14 }).map((_, index) => ({ date: `2026-10-${String(17 + index).padStart(2, '0')}`, total: 200 + Math.round(Math.sin(index) * 180) + index * 20 })),
  byPaymentMethod: [
    { method: 'pix', orders: 18, revenue: 900 },
    { method: 'credito', orders: 7, revenue: 320 },
    { method: 'dinheiro', orders: 3, revenue: 90 },
  ],
  comparison: { current: { revenue: 3200, orders: 28 }, previous: { revenue: 2400, orders: 22 } },
  pixHealth: { failed: 1, paid: 12 },
  bestDay: { date: '2026-10-29', total: 620 },
};

const reviews = [
  { id: 'r1', rating: 5, comment: 'Espeto maravilhoso, chegou quente!', createdAt: new Date(now - 86400000).toISOString(), customerName: 'Maria Silva', reply: '' },
  { id: 'r2', rating: 4, comment: 'Bom, mas demorou um pouco.', createdAt: new Date(now - 3 * 86400000).toISOString(), customerName: 'João', reply: '', tipAmount: 5 },
];

const historyOrders = queueOrders.concat([
  { id: 'h1', status: 'delivered', createdAt: new Date(now - 86400000).toISOString(), customerName: 'Cliente Ontem', payment: 'pix', paymentStatus: 'PAID', total: 55, items: [{ id: 'h1i', qty: 1, unitPrice: 55, name: 'Combo família' }] },
  { id: 'h2', status: 'cancelled', createdAt: new Date(now - 3 * 86400000).toISOString(), customerName: 'Cliente Cancelado', payment: 'dinheiro', paymentStatus: 'PENDING', total: 20, items: [{ id: 'h2i', qty: 1, unitPrice: 20, name: 'Refrigerante' }] },
]);

const products = [
  { id: 'p1', name: 'Espeto de contra-filé', price: 29.3, active: true, category: 'Espetos', stock: 12 },
  { id: 'p2', name: 'Marmitex frango', price: 25, active: true, category: 'Marmitex', stock: 2 },
  { id: 'p3', name: 'Pizza calabresa', price: 60, active: false, category: 'Pizzas', stock: 0 },
];

const mockApi = async (route: any, request: any) => {
  const url = request.url();
  const method = request.method();
  const json = (body: any) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.includes(`/stores/slug/${adminSession.store.slug}`) && !url.includes('/products') && !url.includes('/categories')) {
    return json({ ...adminSession.store, openNow: true, owner: { phone: '(12) 99999-0000' } });
  }
  if (url.includes('/orders/queue')) return json(queueOrders);
  if (url.includes('/dashboard-analytics')) return json(analytics);
  if (url.includes('/inventory/alerts')) return json([{ id: 'p2', name: 'Marmitex frango', stock: 2 }]);
  if (url.includes('/reviews/summary')) return json({ average: 4.6, total: 25 });
  if (url.includes('/reviews')) return json(reviews);
  if (url.includes('/orders') && method === 'GET') return json(historyOrders);
  if (url.includes('/products') && method === 'GET') return json(products);
  if (url.includes('/categories')) return json([{ name: 'Espetos', priority: 1 }, { name: 'Marmitex', priority: 2 }]);
  if (url.includes('/subscription')) return json(adminSession.subscription);
  if (url.includes('/plans')) return json({ plans: [{ id: 'pl1', name: 'Pro mensal', price: 149.9, period: 'month' }, { id: 'pl2', name: 'Basic mensal', price: 89.9, period: 'month' }], founderPlans: [], founder: null });
  if (url.includes('/delivery-billing')) return json({ cycle: { amountDue: 42.5 } });
  if (url.includes('/payments')) return json([{ id: 'pay1', amount: 149.9, status: 'PAID', createdAt: new Date(now - 15 * 86400000).toISOString(), provider: 'mercado_pago' }]);
  if (url.includes('/inventory')) {
    return json([
      { id: 'p1', name: 'Espeto de contra-filé', category: 'Espetos', stock: 12, lowStockAlert: 3, manageStock: true },
      { id: 'p2', name: 'Marmitex frango', category: 'Marmitex', stock: 2, lowStockAlert: 5, manageStock: true },
      { id: 'p3', name: 'Pizza calabresa', category: 'Pizzas', stock: 0, lowStockAlert: 3, manageStock: true },
    ]);
  }
  if (url.includes('/coupons')) return json([{ id: 'c1', code: 'BEMVINDO10', discountType: 'percent', discountValue: 10, active: true, usageCount: 4 }]);
  if (url.includes('/featured-pricing')) return json({ tiers: [], daysOptions: [7, 15, 30] });
  if (url.includes('/featured-requests')) return json([{ id: 'f1', status: 'PENDING_APPROVAL', paymentStatus: 'PAID', createdAt: new Date(now - 86400000).toISOString(), days: 7 }]);
  if (url.includes('/promo-pushes')) return json([{ id: 'pp1', title: 'Combo em dobro', status: 'PENDING', paymentStatus: 'PENDING', createdAt: new Date(now - 2 * 86400000).toISOString() }]);
  if (url.includes('/stores/') && url.includes('/destinations')) {
    return json({ options: [{ id: 'd1', name: 'Amerê Chalés', city: 'São Bento do Sapucaí', state: 'SP', distanceKm: 99, available: true }], linked: [] });
  }
  if (url.includes('/condominiums')) return json({ available: [{ id: 'cd1', name: 'Residencial das Frutas', city: 'SJC' }], linked: [] });
  if (url.includes('/motoboy-requests')) return json([]);
  if (url.includes('/motoboys')) return json([]);
  if (url.includes('/users')) return json([{ id: 'u1', name: 'Operador Balcão', email: 'balcao@loja.com', role: 'OPERATOR' }]);
  if (url.includes('/link-stats')) return json({ clicks: 12 });
  if (url.includes('/payment-accounts/mercadopago/point/terminals')) return json({ terminals: [{ id: 't1', name: 'Pro 3 Balcão', status: 'online' }] });
  if (url.includes('/payment-accounts/mercadopago')) {
    return json({ connected: true, oauthConfigured: true, validation: { overallStatus: 'READY', pix: { available: true }, credit: { available: true }, debit: { available: false }, checkedAt: new Date().toISOString(), credentialMode: 'production' } });
  }
  if (method !== 'GET') return json({ ok: true });
  return json({});
};

test.use({ serviceWorkers: 'block' });

const SECTIONS: Array<[string, string]> = [
  ['home', '/admin/dashboardV2'],
  ['fila', '/admin/dashboardV2/fila'],
  ['fila-detalhe', '/admin/dashboardV2/fila'],
  ['pedidos', '/admin/dashboardV2/pedidos'],
  ['avaliacoes', '/admin/dashboardV2/avaliacoes'],
  ['produtos', '/admin/dashboardV2/produtos'],
  ['estoque', '/admin/dashboardV2/estoque'],
  ['destaques', '/admin/dashboardV2/destaques'],
  ['cupons', '/admin/dashboardV2/cupons'],
  ['destinos', '/admin/dashboardV2/destinos'],
  ['condominios', '/admin/dashboardV2/condominios'],
  ['usuarios', '/admin/dashboardV2/usuarios'],
  ['motoboys', '/admin/dashboardV2/motoboys'],
  ['assinatura', '/admin/dashboardV2/assinatura'],
  ['gateway', '/admin/dashboardV2/gateway'],
  ['config', '/admin/dashboardV2/config'],
  ['config-perfil', '/admin/dashboardV2/config/perfil'],
];

for (const width of [390, 1280]) {
  test(`visual ${width}px`, async ({ page }) => {
    test.setTimeout(420_000);
    const outDir = path.join(process.cwd(), 'test-results', 'dashboard-v2', `w${width}`);
    fs.mkdirSync(outDir, { recursive: true });
    await page.addInitScript((session) => {
      localStorage.setItem('adminSession', JSON.stringify(session));
    }, adminSession);
    await page.route('**/api/**', mockApi);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    for (const [name, url] of SECTIONS) {
      await page.goto(url);
      await page.waitForTimeout(600);
      if (name === 'fila-detalhe') {
        await page.getByText('Maria Silva').first().click();
        await page.waitForTimeout(400);
      }
      await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: width === 390 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (overflow) {
        throw new Error(`Overflow horizontal em ${name} @${width}px`);
      }
    }
  });
}
