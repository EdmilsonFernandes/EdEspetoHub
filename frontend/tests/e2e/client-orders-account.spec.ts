import { expect, test } from '@playwright/test';

const customerSession = {
  token: 'customer-e2e-token',
  user: {
    id: 'customer-e2e',
    fullName: 'Cliente E2E',
    email: 'cliente.e2e@janocaminho.test',
    phone: '11987654321',
  },
};

const customerProfile = {
  id: 'customer-e2e',
  fullName: 'Cliente E2E',
  email: 'cliente.e2e@janocaminho.test',
  phone: '11987654321',
  createdAt: '2026-01-15T10:00:00.000Z',
  profileImageUrl: '',
};

const addresses = [
  {
    id: 'address-e2e-1',
    label: 'Casa',
    address: 'Rua das Flores',
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    district: 'Centro',
    neighborhood: 'Centro',
    city: 'Sao Jose dos Campos',
    state: 'SP',
    zipCode: '12200-000',
    cep: '12200000',
    receiverName: 'Cliente E2E',
    receiverPhone: '11987654321',
    isDefault: true,
  },
];

const orders = [
  {
    id: 'order-active-e2e',
    status: 'PREPARING',
    type: 'delivery',
    customerName: 'Cliente E2E',
    total: 42,
    payment: 'pix',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    store: {
      id: 'store-gustavao-e2e',
      slug: 'gustavao-e2e',
      name: 'Gustavao Espetos E2E',
      phone: '(12) 99999-0000',
      settings: { logoUrl: '/janocaminho.jpg' },
    },
    items: [
      {
        id: 'item-active-e2e',
        productId: 'product-palmito-e2e',
        name: 'Medalhao de Palmito',
        qty: 2,
        unitPrice: 12,
        price: 24,
        imageUrl: '/janocaminho.jpg',
      },
    ],
  },
  {
    id: 'order-done-e2e',
    status: 'DONE',
    type: 'pickup',
    customerName: 'Cliente E2E',
    total: 48,
    payment: 'dinheiro',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    store: {
      id: 'store-gustavao-e2e',
      slug: 'gustavao-e2e',
      name: 'Gustavao Espetos E2E',
      phone: '(12) 99999-0000',
      settings: { logoUrl: '/janocaminho.jpg' },
    },
    items: [
      {
        id: 'item-done-e2e',
        productId: 'product-palmito-e2e',
        name: 'Medalhao de Palmito',
        qty: 2,
        unitPrice: 12,
        price: 24,
        imageUrl: '/janocaminho.jpg',
      },
    ],
  },
  {
    id: 'order-cancelled-e2e',
    status: 'CANCELLED',
    type: 'delivery',
    customerName: 'Cliente E2E',
    total: 35,
    payment: 'pix',
    paymentStatus: 'PENDING',
    canceledReason: 'Cliente desistiu',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    store: {
      id: 'store-brisa-e2e',
      slug: 'brecho-brisa-e2e',
      name: 'Brecho da Brisa E2E',
      phone: '(12) 99999-2222',
      settings: { logoUrl: '/janocaminho.jpg' },
    },
    items: [
      {
        id: 'item-cancelled-e2e',
        productId: 'product-costela-e2e',
        name: 'Costela bovina',
        qty: 1,
        unitPrice: 35,
        price: 35,
        imageUrl: '/janocaminho.jpg',
      },
    ],
  },
];

const notifications = [
  {
    id: 'notification-informative-e2e',
    title: 'Aviso importante',
    body: 'Mensagem completa para o cliente ler dentro da central, sem depender do texto cortado pelo banner do celular.',
    url: null,
    imageUrl: '/janocaminho.jpg',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notification-route-e2e',
    title: 'Pedido atualizado',
    body: 'Toque para ver seus pedidos.',
    url: '/cliente/pedidos',
    imageUrl: '/janocaminho.jpg',
    read: true,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
];

test.use({ serviceWorkers: 'block' });

test.describe('Cliente pedidos e conta', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((session) => {
      localStorage.setItem('customerSession', JSON.stringify(session));
    }, customerSession);

    await page.route('**/api/customer/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customerProfile) });
    });

    await page.route('**/api/customer/addresses', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(addresses) });
    });

    await page.route('**/api/customer/orders**', async (route) => {
      const url = new URL(route.request().url());
      const isPaginated = url.searchParams.has('limit') || url.searchParams.has('offset');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isPaginated ? { data: orders, hasMore: false } : orders),
      });
    });

    await page.route('**/api/customer/notifications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: notifications, unreadCount: 1 }),
        });
        return;
      }
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }
      await route.continue();
    });

    await page.route('**/api/customer/notifications/**/read', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.route('**/api/orders/order-active-e2e/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...orders[0],
          eta: { windowMin: 25, windowMax: 35, totalMinutes: 30 },
        }),
      });
    });
  });

  test('filtra pedidos e abre preview premium da imagem do item', async ({ page }) => {
    await page.goto('/cliente/pedidos');

    await expect(page.getByRole('heading', { name: 'Meus Pedidos' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Último pedido')).toBeVisible();
    await expect(page.getByText('Peça de novo')).toBeVisible();
    await expect(page.getByText('Filtre sem perder o histórico.')).toBeVisible();
    await expect(page.getByLabel('Todos: 3 pedidos')).toBeVisible();
    await expect(page.getByLabel('Em andamento: 1 pedido')).toBeVisible();
    await expect(page.getByLabel('Cancelados: 1 pedido')).toBeVisible();

    await page.getByLabel('Cancelados: 1 pedido').click();
    await expect(page.getByText('Brecho da Brisa E2E')).toBeVisible();
    await expect(page.getByText('Resumo do cancelamento:')).toBeVisible();
    await expect(page.getByText('Pedido cancelado conforme solicitação registrada no atendimento.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelados: 1 pedido' })).toBeVisible();

    await page.getByLabel(/Ampliar imagem de Costela bovina/i).click();
    const dialog = page.getByRole('dialog', { name: /Imagem ampliada do pedido: Costela bovina/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fechar imagem ampliada' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Fechar imagem ampliada' }).click();
    await expect(dialog).toBeHidden();
  });

  test('mostra conta, endereco principal e telefone mascarado na edicao', async ({ page }) => {
    await page.goto('/cliente/conta');

    await expect(page.getByRole('heading', { name: 'Minha Conta' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Cliente E2E')).toBeVisible();
    await expect(page.getByText('cliente.e2e@janocaminho.test')).toBeVisible();
    await expect(page.getByText(/\+55/)).toBeVisible();
    await expect(page.getByText('Meus pedidos')).toBeVisible();
    await expect(page.getByRole('button', { name: /Meus endereços 1 endereço/i })).toBeVisible();
    await expect(page.getByText('Principal')).toBeVisible();
    await expect(page.getByText('Rua das Flores')).toBeVisible();

    await page.getByRole('button', { name: /Editar perfil/i }).first().click();
    await expect(page.getByText('Altere apenas nome e telefone quando precisar.')).toBeVisible();
    await expect(page.getByPlaceholder('(12) 99999-9999')).toHaveValue('(11) 98765-4321');
  });

  test('abre detalhe completo para notificacao sem direcionamento', async ({ page }) => {
    await page.goto('/notificacoes');

    await expect(page.getByRole('heading', { name: 'Notificações' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Aviso importante/i }).click();

    const dialog = page.getByRole('dialog', { name: /Detalhe da notificação: Aviso importante/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Mensagem completa para o cliente ler dentro da central');
    await expect(dialog).toContainText('Sem direcionamento');
    await dialog.getByRole('button', { name: 'Fechar detalhe da notificação' }).click();
    await expect(dialog).toBeHidden();
  });
});
