import { expect, test } from '@playwright/test';

/**
 * E2E regression guard: SuperAdmin destinations form submissions.
 *
 * Context: A migration to the <Button> component broke all form submissions
 * because <Button> defaults to type="button". Clicking submit did nothing.
 *
 * Strategy: We verify that each submit button has type="submit" by checking
 * the button element's attribute directly, and verify the form's onSubmit
 * fires by intercepting the resulting API call.
 */

const destination = {
  id: 'dest-e2e-form',
  name: 'Cidade Teste E2E',
  slug: 'cidade-teste-e2e',
  city: 'Cidade Teste',
  state: 'SP',
  active: true,
  placesCount: 1,
  listingsCount: 1,
};

const existingPlace = {
  id: 'place-e2e-form',
  destinationId: destination.id,
  name: 'Chalé Teste',
  slug: 'chale-teste',
  type: 'CHALE',
  description: 'Chalé para teste.',
  address: 'Rua Teste',
  addressNumber: '100',
  district: 'Centro',
  city: 'Cidade Teste',
  state: 'SP',
  zipCode: '12345000',
  whatsapp: '5512999999999',
  active: true,
  sortOrder: 0,
  destination,
};

const existingListing = {
  id: 'listing-e2e-form',
  destinationId: destination.id,
  category: 'RESTAURANTE',
  name: 'Restaurante Teste',
  description: 'Restaurante teste.',
  city: 'Cidade Teste',
  state: 'SP',
  active: true,
  sortOrder: 0,
  destination,
};

const overviewPayload = {
  destinations: [destination],
  places: [existingPlace],
  listings: [existingListing],
  partnerRequests: [],
  storeRequests: [],
  stores: [],
};

const summaryPayload = {
  destinations: [destination],
  states: ['SP'],
  categories: ['RESTAURANTE'],
  pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1, hasPrevious: false, hasNext: false },
};

test.use({ serviceWorkers: 'block' });

test.describe('SuperAdmin destinations form buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('superAdminToken', 'super-admin-token-e2e');
    });

    await page.route('**/api/admin/destinations/manage/summary**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(summaryPayload) });
    });

    await page.route('**/api/admin/destinations/manage**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overviewPayload) });
    });

    await page.route(`**/api/admin/destinations/${destination.id}/places**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [existingPlace], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }),
      });
    });

    await page.route(`**/api/admin/destinations/${destination.id}/listings**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [existingListing], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }),
      });
    });

    await page.route(`**/api/admin/destinations/${destination.id}/banners`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });

    await page.route('**/api/admin/hospitality-places/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(existingPlace) });
    });

    await page.route('**/api/admin/destination-listings/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(existingListing) });
    });
  });

  test('destination create form button has type="submit"', async ({ page }) => {
    await page.goto('/superadmin/destinations');
    await page.getByRole('button', { name: /Cadastro/i }).click();
    await page.getByRole('button', { name: /Cidade/i }).click();

    // The "Salvar destino" button must be type="submit"
    const submitBtn = page.getByRole('button', { name: /Salvar destino/i });
    await expect(submitBtn).toBeVisible();
    const btnType = await submitBtn.getAttribute('type');
    expect(btnType).toBe('submit');
  });

  test('destination edit form button has type="submit"', async ({ page }) => {
    await page.goto('/superadmin/destinations');

    // Open destination, click edit
    await page.getByText(destination.name).first().click();
    await page.getByRole('button', { name: /Editar destino/i }).click();

    const submitBtn = page.getByRole('button', { name: /Atualizar destino/i });
    await expect(submitBtn).toBeVisible();
    const btnType = await submitBtn.getAttribute('type');
    expect(btnType).toBe('submit');
  });

  test('hospitality place form button has type="submit"', async ({ page }) => {
    await page.goto('/superadmin/destinations');

    // Open destination, click edit on place
    await page.getByText(destination.name).first().click();
    await page.getByRole('button', { name: `Editar hospedagem ${existingPlace.name}` }).click();

    const submitBtn = page.getByRole('button', { name: /Atualizar hospedagem/i });
    await expect(submitBtn).toBeVisible();
    const btnType = await submitBtn.getAttribute('type');
    expect(btnType).toBe('submit');
  });

  test('listing/service form button has type="submit"', async ({ page }) => {
    await page.goto('/superadmin/destinations');
    await page.getByRole('button', { name: /Cadastro/i }).click();
    await page.getByRole('button', { name: /Serviço/i }).click();

    const submitBtn = page.getByRole('button', { name: /Salvar serviço/i });
    await expect(submitBtn).toBeVisible();
    const btnType = await submitBtn.getAttribute('type');
    expect(btnType).toBe('submit');
  });

  test('store link form button has type="submit"', async ({ page }) => {
    await page.goto('/superadmin/destinations');
    await page.getByRole('button', { name: /Cadastro/i }).click();
    await page.getByRole('button', { name: /Vínculo/i }).click();

    const submitBtn = page.getByRole('button', { name: /Vincular loja/i });
    await expect(submitBtn).toBeVisible();
    const btnType = await submitBtn.getAttribute('type');
    expect(btnType).toBe('submit');
  });

  test('clicking "Atualizar destino" triggers PATCH API call', async ({ page }) => {
    let patchCalled = false;
    await page.route(`**/api/admin/destinations/${destination.id}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(destination) });
      } else {
        await route.continue();
      }
    });

    await page.goto('/superadmin/destinations');
    await page.getByText(destination.name).first().click();
    await page.getByRole('button', { name: /Editar destino/i }).click();
    await page.getByRole('button', { name: /Atualizar destino/i }).click();

    await expect.poll(() => patchCalled, { timeout: 5000 }).toBe(true);
  });
});
