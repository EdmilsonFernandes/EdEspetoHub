import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.describe('Solicitação de parceiro de destinos', () => {
  test('envia parceiro para uma cidade existente com os dados do responsável', async ({ page }) => {
    let submittedPayload: any = null;

    await page.route('**/api/public/destinations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'destination-sao-bento',
            slug: 'sao-bento-do-sapucai',
            name: 'São Bento do Sapucaí',
            city: 'São Bento do Sapucaí',
            state: 'SP',
          },
        ]),
      });
    });

    await page.route('**/api/public/destination-partner-requests', async (route) => {
      submittedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'partner-request-e2e', status: 'PENDING' }),
      });
    });

    await page.goto('/destinos/cadastrar');
    await expect(page.getByText('Conectando com segurança')).toBeHidden({ timeout: 10000 });

    await expect(page.getByRole('heading', { name: 'Dados do parceiro' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cidade aberta' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByLabel('Nome público').fill('Chalé Horizonte');
    await page.getByLabel('Descrição pública').fill('Hospedagem próxima aos principais passeios.');
    await page.getByLabel('Nome do responsável').fill('Ana Souza');
    await page.getByLabel('E-mail do responsável').fill('ana@example.com');
    await page.getByLabel('WhatsApp do responsável').fill('12999998888');
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();

    await expect(page.getByText('Recebemos sua solicitação')).toBeVisible();
    expect(submittedPayload).toMatchObject({
      destinationId: 'destination-sao-bento',
      destinationCity: 'São Bento do Sapucaí',
      destinationState: 'SP',
      partnerType: 'HOSPITALITY',
      name: 'Chalé Horizonte',
      responsibleName: 'Ana Souza',
      responsibleEmail: 'ana@example.com',
      responsiblePhone: '(12) 99999-8888',
    });
  });
});
