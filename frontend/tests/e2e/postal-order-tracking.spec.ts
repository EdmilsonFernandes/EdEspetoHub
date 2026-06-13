import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const baseOrder = {
  id: 'postal-order-e2e',
  status: 'dispatched',
  type: 'delivery',
  fulfillmentMode: 'postal',
  customerName: 'Cliente Postal E2E',
  phone: '11999990002',
  address: 'Rua Postal, 100 - Centro',
  paymentMethod: 'pix',
  paymentStatus: 'PAID',
  total: 54.9,
  deliveryFee: 12.9,
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-01T13:00:00.000Z',
  statusTimeline: [
    { status: 'pending', at: '2026-05-01T12:00:00.000Z' },
    { status: 'dispatched', at: '2026-05-01T13:00:00.000Z' },
  ],
  store: {
    id: 'store-postal-e2e',
    name: 'Loja Postal E2E',
    slug: 'loja-postal-e2e',
    phone: '12999990000',
    settings: { logoUrl: '/janocaminho.jpg' },
  },
  items: [
    {
      id: 'item-postal-e2e',
      productId: 'product-postal-e2e',
      name: 'Produto Postal',
      quantity: 1,
      qty: 1,
      price: 42,
      imageUrl: '/janocaminho.jpg',
    },
  ],
};

test.describe('Pedido postal - acompanhamento do cliente', () => {
  test('mostra rastreio postal com timeline dentro do app', async ({ page }) => {
    await page.route('**/api/orders/postal-order-e2e/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseOrder,
          shipment: {
            provider: 'internal_postal_v1',
            serviceCode: 'PAC',
            serviceName: 'PAC',
            estimatedDays: 5,
            trackingCode: 'AA123456789BR',
            trackingUrl: 'https://rastreamento.correios.com.br/app/index.php?objetos=AA123456789BR',
            shipmentStatus: 'posted',
            postedAt: '2026-05-01T13:00:00.000Z',
            trackingSummary: {
              status: 'posted',
              label: 'Pedido postado',
              description: 'O pedido foi entregue aos Correios pela loja.',
            },
            events: [
              {
                id: 'event-carrier',
                source: 'carrier',
                status: 'in_transit',
                title: 'Objeto em trânsito',
                description: 'A encomenda foi encaminhada para a próxima unidade.',
                location: 'São José dos Campos / SP',
                eventAt: '2026-05-01T14:00:00.000Z',
              },
              {
                id: 'event-posted',
                source: 'seller',
                status: 'posted',
                title: 'Pedido postado',
                description: 'A loja informou que o pedido foi entregue aos Correios.',
                eventAt: '2026-05-01T13:00:00.000Z',
              },
              {
                id: 'event-code',
                source: 'seller',
                status: 'tracking_code_added',
                title: 'Código de rastreio informado',
                description: 'A loja informou o código para acompanhar o envio postal.',
                eventAt: '2026-05-01T12:55:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.goto('/pedido/postal-order-e2e');

    await expect(page.getByText('Acompanhe seu envio', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido postado').first()).toBeVisible();
    await expect(page.getByText('AA123456789BR')).toBeVisible();
    await expect(page.getByRole('button', { name: /acompanhar envio/i })).toBeVisible();
    await expect(page.getByText('Próximo passo')).toBeVisible();
    await expect(page.getByRole('button', { name: /ver andamento completo/i })).toBeVisible();
    await page.getByRole('button', { name: /ver andamento completo/i }).click();
    await expect(page.getByRole('button', { name: /ocultar andamento/i })).toBeVisible();
    await expect(page.getByText('Histórico do envio')).toBeVisible();
    await expect(page.getByText('Objeto em trânsito')).not.toBeVisible();
    await page.getByRole('button', { name: /ver histórico/i }).click();
    await expect(page.getByText('Objeto em trânsito')).toBeVisible();
    await expect(page.getByText('Correios').first()).toBeVisible();
    await expect(page.getByText('Rastreio integrado')).toBeVisible();
    await expect(page.getByText('Loja').first()).toBeVisible();
    await expect(page.getByText('Atualizado pela loja.').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Atualizar$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ver rastreio externo/i })).toBeVisible();
  });

  test('mostra estado claro quando a loja ainda não informou o rastreio', async ({ page }) => {
    await page.route('**/api/orders/postal-order-e2e/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseOrder,
          status: 'preparing',
          shipment: {
            provider: 'internal_postal_v1',
            serviceCode: 'PAC',
            serviceName: 'PAC',
            estimatedDays: 5,
            trackingCode: null,
            trackingUrl: null,
            shipmentStatus: 'pending_posting',
            trackingSummary: {
              status: 'pending_posting',
              label: 'Aguardando postagem',
              description: 'A loja está preparando o pedido para enviar pelos Correios.',
            },
            events: [
              {
                id: 'event-pending',
                source: 'system',
                status: 'pending_posting',
                title: 'Pedido recebido pela loja',
                description: 'A loja recebeu o pedido e vai preparar o envio pelos Correios.',
                eventAt: '2026-05-01T12:00:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.goto('/pedido/postal-order-e2e');

    await expect(page.getByText('Acompanhe seu envio', { exact: true })).toBeVisible();
    await expect(page.getByText('Aguardando postagem').first()).toBeVisible();
    await expect(page.getByText(/ainda vai informar o c[oó]digo de rastreio/i)).toBeVisible();
  });

  test('permite atualizar rastreio pelo app antes de abrir site externo', async ({ page }) => {
    await page.route('**/api/orders/postal-order-e2e/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseOrder,
          shipment: {
            provider: 'internal_postal_v1',
            serviceCode: 'PAC',
            serviceName: 'PAC',
            estimatedDays: 5,
            trackingCode: 'OK819652779BR',
            trackingUrl: 'https://rastreamento.correios.com.br/app/index.php?objetos=OK819652779BR',
            shipmentStatus: 'posted',
            postedAt: '2026-05-01T13:00:00.000Z',
            trackingFallback: true,
            trackingUnavailableReason: 'Período inválido',
            trackingSummary: {
              status: 'posted',
              label: 'Pedido postado',
              description: 'O pedido foi entregue aos Correios pela loja.',
            },
            events: [
              {
                id: 'event-posted',
                source: 'seller',
                status: 'posted',
                title: 'Pedido postado',
                description: 'A loja informou que o pedido foi entregue aos Correios.',
                eventAt: '2026-05-01T13:00:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/v2/orders/postal-order-e2e/tracking', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseOrder,
          shipment: {
            provider: 'internal_postal_v1',
            serviceCode: 'PAC',
            serviceName: 'PAC',
            estimatedDays: 5,
            trackingCode: 'OK819652779BR',
            trackingUrl: 'https://rastreamento.correios.com.br/app/index.php?objetos=OK819652779BR',
            shipmentStatus: 'in_transit',
            postedAt: '2026-05-01T13:00:00.000Z',
            trackingFallback: false,
            trackingSummary: {
              status: 'in_transit',
              label: 'Em trânsito',
              description: 'A encomenda está a caminho do endereço informado.',
            },
            events: [
              {
                id: 'event-carrier',
                source: 'carrier',
                status: 'in_transit',
                title: 'Objeto em trânsito',
                description: 'A encomenda foi encaminhada.',
                location: 'São José dos Campos / SP',
                eventAt: '2026-05-01T15:00:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.goto('/pedido/postal-order-e2e');

    await expect(page.getByText('OK819652779BR')).toBeVisible();
    await expect(page.getByText('Rastreio externo disponível')).toBeVisible();
    await page.getByRole('button', { name: /^Atualizar$/i }).click();
    await expect(page.getByText('Em trânsito').first()).toBeVisible();
    await page.getByRole('button', { name: /ver histórico/i }).click();
    await expect(page.getByText('Objeto em trânsito')).toBeVisible();
    await expect(page.getByText('Rastreio integrado')).toBeVisible();
  });

  test('cliente confirma recebimento quando rastreio postal indica entrega', async ({ page }) => {
    let confirmCalled = false;
    await page.addInitScript(() => {
      window.localStorage.setItem('customerSession', JSON.stringify({
        token: 'customer-postal-token-e2e',
        customer: { id: 'customer-postal-e2e', name: 'Cliente Postal E2E' },
      }));
    });

    await page.route('**/api/orders/postal-order-e2e/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseOrder,
          status: 'dispatched',
          shipment: {
            provider: 'internal_postal_v1',
            serviceCode: 'PAC',
            serviceName: 'PAC',
            estimatedDays: 5,
            trackingCode: 'AD328626570BR',
            trackingUrl: 'https://www.sitecorreios.com.br/AD328626570BR',
            shipmentStatus: 'delivered',
            postedAt: '2026-05-01T13:00:00.000Z',
            deliveredAt: '2026-05-03T15:40:00.000Z',
            trackingSummary: {
              status: 'delivered',
              label: 'Entregue',
              description: 'A encomenda foi entregue ao destinatário.',
            },
            events: [
              {
                id: 'event-delivered',
                source: 'carrier',
                status: 'delivered',
                title: 'Objeto entregue',
                description: 'A encomenda foi entregue ao destinatário.',
                location: 'São José dos Campos / SP',
                eventAt: '2026-05-03T15:40:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/customer/orders/postal-order-e2e/confirm-received', async (route) => {
      confirmCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          orderId: 'postal-order-e2e',
          status: 'finished',
          customerReceivedAt: '2026-05-03T16:00:00.000Z',
        }),
      });
    });

    await page.goto('/pedido/postal-order-e2e');

    await expect(page.getByText('O rastreio indica entrega. Confirme apenas se você recebeu o pacote.')).toBeVisible();
    await page.getByRole('button', { name: /recebi o pacote/i }).click();
    expect(confirmCalled).toBe(true);
    await expect(page.getByText('Pacote recebido pelo cliente')).toBeVisible();
  });
});
