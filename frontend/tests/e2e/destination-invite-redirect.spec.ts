import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const destinationPayload = {
  destination: {
    id: 'destination-sao-bento',
    slug: 'sao-bento-do-sapucai',
    name: 'São Bento do Sapucaí',
    city: 'São Bento do Sapucaí',
    state: 'SP',
  },
  hospitalityPlaces: [
    {
      id: 'place-amere',
      slug: 'amere-chales',
      name: 'Amerê Chalés',
      type: 'CHALE',
      description: 'Hospedagem em São Bento do Sapucaí.',
      address: 'Estrada do Paiol Grande, 100',
      city: 'São Bento do Sapucaí',
      state: 'SP',
      zipCode: '12490000',
      whatsapp: '12999998888',
      logoUrl: '/janocaminho.jpg',
      bannerUrl: '/janocaminho.jpg',
    },
  ],
  listings: [],
};

test.describe('Convite público de destinos', () => {
  test('abre o cadastro preenchido para assumir uma hospedagem', async ({ page }) => {
    await page.route('**/api/public/destinations/sao-bento-do-sapucai', async (route) => {
      await route.fulfill({ json: destinationPayload });
    });

    await page.goto('/convite/chale/sao-bento-do-sapucai/amere-chales');
    await expect(page.getByText('Conectando com segurança')).toBeHidden({ timeout: 10000 });

    await expect(page).toHaveURL(/\/destinos\/cadastrar\?/);
    await expect(page).toHaveURL(/source=hospitality_place_claim/);
    await expect(page).toHaveURL(/placeId=place-amere/);
    await expect(page).toHaveURL(/name=Amer%/);
  });

  test('oferece retorno seguro quando o perfil do convite não existe', async ({ page }) => {
    await page.route('**/api/public/destinations/sao-bento-do-sapucai', async (route) => {
      await route.fulfill({ json: destinationPayload });
    });

    await page.goto('/convite/chale/sao-bento-do-sapucai/chale-inexistente');
    await expect(page.getByText('Conectando com segurança')).toBeHidden({ timeout: 10000 });

    await expect(page.getByRole('heading', { name: 'Convite oficial' })).toBeVisible();
    await expect(page.getByText('Não encontramos essa hospedagem no guia.')).toBeVisible();
    await page.getByRole('button', { name: 'Ver destinos' }).click();
    await expect(page).toHaveURL(/\/destinos$/);
  });
});
