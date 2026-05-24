import { expect, test } from '@playwright/test';

const destinationPayload = {
  destination: {
    id: 'dest-e2e-1',
    slug: 'sao-bento',
    name: 'Sao Bento Sapucai',
    city: 'Sao Bento Sapucai',
    state: 'SP',
    description: 'Destino E2E',
  },
  hospitalityPlaces: [
    {
      id: 'place-e2e-1',
      slug: 'chale-vista',
      name: 'Chale Vista da Pedra',
      type: 'CHALE',
      address: 'Estrada do Bau, km 7',
      lat: -22.6901,
      lng: -45.7321,
      whatsapp: '(12) 99999-1111',
      description: 'Hospedagem E2E',
      storeCount: 1,
    },
  ],
  listings: [
    {
      id: 'listing-e2e-1',
      title: 'Passeio de quadriciclo',
      category: 'PASSEIO',
      address: 'Av. Monte Verde, 100',
      whatsapp: '(12) 99999-2222',
      description: 'Servico E2E',
    },
  ],
  banners: [],
};

const hospitalityPayload = {
  destination: destinationPayload.destination,
  hospitalityPlace: destinationPayload.hospitalityPlaces[0],
  stores: [
    {
      id: 'link-e2e-1',
      deliveryEnabled: true,
      deliveryFee: 5,
      estimatedMinutes: 35,
      store: {
        id: 'store-e2e-1',
        slug: 'gustavao-e2e',
        name: 'Gustavao E2E',
        settings: {
          description: 'Espetos para o chale',
          logoUrl: '/janocaminho.jpg',
        },
      },
    },
  ],
  listings: [],
};

test.use({ serviceWorkers: 'block' });

test.describe('Destination WhatsApp location', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/destinations/sao-bento', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(destinationPayload),
      });
    });

    await page.route('**/api/public/destinations/sao-bento/hospitality/chale-vista', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(hospitalityPayload),
      });
    });
  });

  test('inclui endereco e mapa no link de WhatsApp da hospedagem', async ({ page }) => {
    await page.goto('/destinos/sao-bento');

    const talkLink = page.locator('a[href*="phone=5512999991111"]').first();
    await expect(talkLink).toBeVisible();

    const href = await talkLink.getAttribute('href');
    const decodedHref = decodeURIComponent(href || '');

    expect(decodedHref).toContain('Endereço para entrega: Estrada do Bau, km 7');
    expect(decodedHref).toContain('Localização do chalé: https://www.google.com/maps/search/?api=1&query=-22.6901%2C-45.7321');
    expect(decodedHref).toContain('Link do Já no Caminho para ver a hospedagem e instalar o app');
  });

  test('leva o contexto da hospedagem para lojas oficiais dentro do chale', async ({ page }) => {
    await page.goto('/destinos/sao-bento/chales/chale-vista');

    const storeLink = page.locator('a[href^="/gustavao-e2e?"]').first();
    await expect(storeLink).toBeVisible();

    const href = await storeLink.getAttribute('href');
    const params = new URLSearchParams((href || '').split('?')[1] || '');

    expect(href).toContain('/gustavao-e2e?');
    expect(params.get('hospedagem_endereco')).toBe('Estrada do Bau, km 7');
    expect(params.get('hospedagem_lat')).toBe('-22.6901');
    expect(params.get('hospedagem_lng')).toBe('-45.7321');
  });
});
