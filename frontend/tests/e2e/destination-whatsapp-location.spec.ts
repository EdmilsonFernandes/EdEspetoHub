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
      bannerUrl: '/janocaminho.jpg',
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
  listings: [
    {
      id: 'listing-route-e2e',
      title: 'Restaurante Silvia Lanches',
      category: 'RESTAURANTE',
      address: 'Estrada do Bau',
      addressNumber: '9',
      district: 'Centro',
      city: 'Sao Bento Sapucai',
      state: 'SP',
      zipCode: '12490-000',
      whatsapp: '(12) 99999-3333',
      description: 'Lanches proximos ao chale',
      logoUrl: '/janocaminho.jpg',
      lat: -22.6907,
      lng: -45.7315,
    },
  ],
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

  test('abre a pagina do chale ao tocar no card da hospedagem sem derrubar a SPA', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/destinos/sao-bento');
    await page.getByText('Chale Vista da Pedra').click();

    await expect(page).toHaveURL(/\/destinos\/sao-bento\/chales\/chale-vista/);
    await expect(page.locator('a[href^="/gustavao-e2e?"]').first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('mostra rota da hospedagem com mapa, logos e navegacao sem voltar duplicado', async ({ page }) => {
    await page.goto('/destinos/sao-bento/chales/chale-vista/rota?servico=listing-route-e2e');

    await expect(page.getByRole('heading', { name: 'Rota da hospedagem' })).toBeVisible();
    await expect(page.getByText('Restaurante Silvia Lanches até Chale Vista da Pedra')).toBeVisible();
    await expect(page.getByText('Origem').first()).toBeVisible();
    await expect(page.getByText('Destino do hóspede')).toBeVisible();
    await expect(page.getByText(/Rota (estimada|viva)/i)).toBeVisible();
    await expect(page.getByText(/4 min(?: aprox\.)?/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir no Google Maps/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir no Waze/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copiar link/i })).toBeVisible();
    await expect(page.getByText('Voltar para o chalé')).toHaveCount(0);
  });
});
