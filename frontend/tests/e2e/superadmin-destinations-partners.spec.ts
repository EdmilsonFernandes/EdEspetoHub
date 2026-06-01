import { expect, test } from '@playwright/test';

const destination = {
  id: 'dest-sfx-e2e',
  name: 'São Francisco Xavier',
  slug: 'sao-francisco-xavier',
  city: 'São Francisco Xavier',
  state: 'SP',
  active: true,
  placesCount: 1,
  listingsCount: 1,
};

const claimedPlace = {
  id: 'place-amere-e2e',
  destinationId: destination.id,
  name: 'Amerê Chalés',
  slug: 'amere-chales',
  type: 'CHALE',
  description: 'Perfil atual do chalé.',
  address: 'Estrada da Montanha',
  addressNumber: '120',
  district: 'Centro',
  city: 'São Bento do Sapucaí',
  state: 'SP',
  zipCode: '12490000',
  whatsapp: '5512999999999',
  phone: '5512988887777',
  instagramUrl: 'https://instagram.com/amere',
  websiteUrl: 'https://amere.example.com',
  active: true,
  sortOrder: 10,
  destination,
};

const partnerRequest = {
  id: 'req-claim-e2e',
  destinationId: destination.id,
  partnerType: 'HOSPITALITY',
  placeType: 'CHALE',
  name: 'Amerê Chalés Oficial',
  description: 'Nova descrição enviada pelo responsável.',
  address: 'Estrada da Montanha',
  addressNumber: '120',
  district: 'Centro',
  city: 'São Bento do Sapucaí',
  state: 'SP',
  zipCode: '12490000',
  whatsapp: '5512999999999',
  phone: '5512988887777',
  instagramUrl: 'https://instagram.com/amereoficial',
  websiteUrl: 'https://amere.example.com',
  responsibleName: 'Responsável Amerê',
  responsibleEmail: 'parceiro-amere@example.com',
  responsiblePhone: '5512999999999',
  message: 'Quero assumir este perfil.',
  status: 'pending',
  requestSource: 'hospitality_place_claim',
  claimedHospitalityPlaceId: claimedPlace.id,
  claimedHospitalityPlace: claimedPlace,
  createdAt: '2026-05-31T12:00:00.000Z',
  reviewedAt: null,
};

const overviewPayload = {
  destinations: [destination],
  places: [claimedPlace],
  listings: [],
  partnerRequests: [partnerRequest],
  storeRequests: [],
  stores: [],
};

const summaryPayload = {
  destinations: [destination],
  states: ['SP'],
  categories: [],
  pagination: {
    page: 1,
    pageSize: 12,
    total: 1,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  },
};

test.use({ serviceWorkers: 'block' });

test.describe('Super Admin destinations partners', () => {
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
        body: JSON.stringify({ items: [claimedPlace], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }),
      });
    });

    await page.route(`**/api/admin/destinations/${destination.id}/listings**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } }),
      });
    });

    await page.route(`**/api/admin/destinations/${destination.id}/banners`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });
  });

  test('filtra claims, compara dados e exige registro antes de aprovar posse', async ({ page }) => {
    let reviewPayload: any = null;
    await page.route(`**/api/admin/destination-partner-requests/${partnerRequest.id}/review`, async (route) => {
      reviewPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...partnerRequest,
          status: reviewPayload.status,
          reviewNote: reviewPayload.reviewNote,
          createdHospitalityPlaceId: claimedPlace.id,
          createdPartnerAccountId: 'partner-account-e2e',
        }),
      });
    });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/superadmin/destinations');
    await page.getByRole('button', { name: /Parceiros/i }).click();

    await expect(page.getByText('Onboarding de parceiros')).toBeVisible();
    await page.getByRole('button', { name: /Validação de posse/i }).click();
    await expect(page.getByText('Amerê Chalés Oficial')).toBeVisible();

    await page.getByRole('button', { name: /Detalhes e validação/i }).click();
    await expect(page.getByText('Conferência antifraude obrigatória')).toBeVisible();
    await expect(page.getByText('Cadastro atual', { exact: true })).toBeVisible();
    await expect(page.getByText('Enviado na solicitação', { exact: true })).toBeVisible();
    await expect(page.getByText('Amerê Chalés', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Amerê Chalés Oficial').first()).toBeVisible();

    await page.getByRole('button', { name: /Aprovar com conferência/i }).click();
    await expect(page.getByText('Registre como a titularidade foi conferida antes de aprovar este parceiro.')).toBeVisible();
    expect(reviewPayload).toBeNull();

    await page.getByPlaceholder(/confirmei pelo WhatsApp oficial/i).fill('Confirmado pelo WhatsApp oficial cadastrado no perfil.');
    await page.getByRole('button', { name: /Aprovar com conferência/i }).click();

    await expect.poll(() => reviewPayload).toEqual({
      status: 'approved',
      claimVerified: true,
      reviewNote: 'Confirmado pelo WhatsApp oficial cadastrado no perfil.',
    });
  });
});
