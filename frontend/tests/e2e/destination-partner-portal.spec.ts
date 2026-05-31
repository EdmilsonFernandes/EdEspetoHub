import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const partner = {
  id: 'partner-1',
  name: 'Parceiro Serra',
  email: 'parceiro.serra@janocaminho.test',
  status: 'active',
};

const hospitalityResource = {
  permissionId: 'perm-place-1',
  resourceType: 'HOSPITALITY_PLACE',
  permission: 'OWNER',
  item: {
    id: 'place-1',
    name: 'Chalé Serra',
    slug: 'chale-serra',
    description: 'Descrição atual',
    whatsapp: '11999998888',
    phone: '',
    instagramUrl: '',
    websiteUrl: '',
    address: 'Estrada da Serra',
    addressNumber: '100',
    district: 'Centro',
    city: 'São Bento do Sapucaí',
    state: 'SP',
    zipCode: '12490000',
    lat: -22.68,
    lng: -45.73,
    logoUrl: '/janocaminho.jpg',
    bannerUrl: '/janocaminho.jpg',
    deliveryInstructions: 'Portaria principal.',
    destination: { slug: 'sao-bento-do-sapucai' },
  },
};

const sessionPayload = {
  token: 'partner-token',
  partner,
  resources: [hospitalityResource],
};

const waitForAppIntro = async (page: Page) => {
  await expect(page.getByText('Conectando com segurança')).toBeHidden({ timeout: 10000 });
};

const mockPartnerApi = async (page: Page, options?: { onPatch?: (payload: any) => void }) => {
  await page.route('**/destination-partner/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/login')) {
      return route.fulfill({ json: sessionPayload });
    }

    if (url.includes('/auth/activate')) {
      return route.fulfill({ json: sessionPayload });
    }

    if (url.endsWith('/destination-partner/me') || url.endsWith('/destination-partner/resources')) {
      return route.fulfill({
        json: {
          partner,
          resources: [hospitalityResource],
        },
      });
    }

    if (method === 'PATCH' && url.includes('/hospitality-places/place-1')) {
      const payload = JSON.parse(route.request().postData() || '{}');
      options?.onPatch?.(payload);
      return route.fulfill({
        json: {
          ...hospitalityResource.item,
          ...payload,
        },
      });
    }

    return route.fulfill({ status: 404, json: { message: 'Rota mockada não encontrada.' } });
  });
};

test.describe('Portal do parceiro de destinos', () => {
  test('ativa convite e abre os cadastros liberados', async ({ page }) => {
    await mockPartnerApi(page);

    await page.goto('/parceiro/ativar?token=convite-e2e');
    await waitForAppIntro(page);

    await page.getByPlaceholder('Crie uma senha segura').fill('senha123');
    await page.getByPlaceholder('Digite a senha novamente').fill('senha123');
    await page.getByRole('button', { name: /Ativar meu acesso/i }).click();

    await expect(page).toHaveURL(/\/parceiro$/);
    await expect(page.getByRole('heading', { name: 'Chalé Serra' })).toBeVisible();
    await expect(page.getByText('Hospedagem').first()).toBeVisible();
  });

  test('login do parceiro carrega portal e salva campos operacionais seguros', async ({ page }) => {
    let patchPayload: any = null;
    await mockPartnerApi(page, { onPatch: (payload) => { patchPayload = payload; } });

    await page.goto('/parceiro');
    await waitForAppIntro(page);

    await page.getByPlaceholder('email@empresa.com.br').fill(partner.email);
    await page.getByPlaceholder('Sua senha').fill('senha123');
    await page.getByRole('button', { name: /Entrar no portal/i }).click();

    await expect(page.getByRole('heading', { name: 'Chalé Serra' })).toBeVisible();
    await page.getByLabel('Nome público').fill('Chalé Serra Atualizado');
    await page.getByLabel('WhatsApp').fill('11988887777');
    await page.getByLabel('Instruções de entrega').fill('Entrar pela portaria lateral.');
    await page.getByRole('button', { name: /Salvar alterações/i }).click();

    await expect(page.getByText('Informações salvas.')).toBeVisible();
    expect(patchPayload).toMatchObject({
      name: 'Chalé Serra Atualizado',
      whatsapp: '11988887777',
      deliveryInstructions: 'Entrar pela portaria lateral.',
    });
    expect(patchPayload).not.toHaveProperty('active');
    expect(patchPayload).not.toHaveProperty('sortOrder');
  });
});
