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

    await expect(page.getByText('Envio pelos Correios', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido postado').first()).toBeVisible();
    await expect(page.getByText('AA123456789BR')).toBeVisible();
    await expect(page.getByText('Atualizações do envio')).toBeVisible();
    await expect(page.getByText('Loja').first()).toBeVisible();
    await expect(page.getByText('Atualizado pela loja.').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /abrir nos correios/i })).toBeVisible();
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

    await expect(page.getByText('Envio pelos Correios', { exact: true })).toBeVisible();
    await expect(page.getByText('Aguardando postagem').first()).toBeVisible();
    await expect(page.getByText(/ainda vai informar o codigo de rastreio/i)).toBeVisible();
  });
});
