import { expect, test } from '@playwright/test';

const storeId = '00000000-0000-4000-8000-000000000044';

const operatorSession = {
  token: 'operator-e2e-token',
  user: {
    id: 'operator-e2e',
    role: 'OPERATOR',
    name: 'Operador E2E',
    email: 'operador-e2e@janocaminho.test',
  },
  store: {
    id: storeId,
    slug: 'loja-impressora-e2e',
    name: 'Loja Impressora E2E',
    settings: {
      logoUrl: '/janocaminho.jpg',
      orderTypes: ['pickup', 'table'],
    },
  },
  subscription: {
    status: 'ACTIVE',
    plan: { name: 'Basico' },
  },
  features: {},
};

test.use({ serviceWorkers: 'block' });

test.describe('Configuração de impressora térmica', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((session) => {
      localStorage.setItem('adminSession', JSON.stringify(session));
      sessionStorage.setItem('admin:activeTab', 'config');
    }, operatorSession);

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (route.request().method() !== 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }
      if (
        url.includes('/orders') ||
        url.includes('/products') ||
        url.includes('/reviews') ||
        url.includes('/motoboy') ||
        url.includes('/payments')
      ) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
  });

  test('operador acessa a configuração local da impressora sem abrir configurações sensíveis da loja', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=config&section=printer');

    const printerRegion = page.getByRole('region', { name: 'Impressora térmica' });
    await expect(printerRegion).toBeVisible({ timeout: 15000 });
    await expect(printerRegion).toContainText('Impressora térmica');
    await expect(printerRegion).toContainText('Admin e operador podem salvar a impressora usada na fila de pedidos.');
    await expect(printerRegion).toContainText('Abra esta tela pelo app Android da loja');
    await expect(page.getByText('Perfil e marca')).toBeHidden();
    await expect(page.getByText('Entrega e logística')).toBeHidden();
  });
});
