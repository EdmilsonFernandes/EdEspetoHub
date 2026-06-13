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

const minasDestination = {
  id: 'dest-mg-e2e',
  name: 'Gonçalves',
  slug: 'goncalves',
  city: 'Gonçalves',
  state: 'MG',
  active: true,
  placesCount: 0,
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

const serviceRequest = {
  id: 'req-service-mg-e2e',
  destinationId: minasDestination.id,
  destination: minasDestination,
  partnerType: 'SERVICE_PROVIDER',
  category: 'RESTAURANTE',
  name: 'Bistrô da Mantiqueira',
  description: 'Restaurante local interessado em atender hospedagens.',
  city: 'Gonçalves',
  state: 'MG',
  responsibleName: 'Responsável Mantiqueira',
  responsibleEmail: 'mantiqueira@example.com',
  responsiblePhone: '5535999999999',
  message: 'Quero entrar como serviço.',
  status: 'pending',
  requestSource: 'destination_listing_interest',
  createdAt: '2026-05-31T13:00:00.000Z',
};

const overviewPayload = {
  destinations: [destination, minasDestination],
  places: [claimedPlace],
  listings: [],
  partnerRequests: [partnerRequest, serviceRequest],
  storeRequests: [],
  stores: [],
};

const summaryPayload = {
  destinations: [destination, minasDestination],
  states: ['SP', 'MG'],
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
    await page.getByRole('button', { name: /Abrir Chalés e pousadas de São Francisco Xavier/i }).click();
    await expect(page.getByText('Amerê Chalés Oficial')).toBeVisible();

    await page.getByRole('button', { name: /Detalhes e validação/i }).click();
    await expect(page.getByText('Conferência antifraude obrigatória')).toBeVisible();
    await expect(page.getByText('Cadastro atual', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Enviado', { exact: true }).first()).toBeVisible();
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

  test('filtra solicitações por estado, tipo e busca sem sair do mobile board', async ({ page }) => {
    await page.goto('/superadmin/destinations');
    await page.getByRole('button', { name: /Parceiros/i }).click();

    await expect(page.getByRole('button', { name: /solicitações de São Francisco Xavier/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /solicitações de Gonçalves/i })).toBeVisible();
    await page.getByRole('button', { name: /solicitações de São Francisco Xavier/i }).click();
    await page.getByRole('button', { name: /Abrir Chalés e pousadas de São Francisco Xavier/i }).click();
    await expect(page.getByText('Amerê Chalés Oficial')).toBeVisible();
    await page.getByRole('button', { name: /solicitações de Gonçalves/i }).click();
    await page.getByRole('button', { name: /Abrir Serviços e lugares de Gonçalves/i }).click();
    await expect(page.getByText('Bistrô da Mantiqueira')).toBeVisible();

    await page.getByRole('button', { name: /^MG/i }).click();
    await expect(page.getByText('Bistrô da Mantiqueira')).toBeVisible();
    await expect(page.getByText('Amerê Chalés Oficial')).toBeHidden();

    await page.getByRole('button', { name: /^Serviços/i }).click();
    await expect(page.getByText('Bistrô da Mantiqueira')).toBeVisible();

    await page.getByPlaceholder(/Buscar cidade, parceiro/i).fill('amerê');
    await expect(page.getByText('Nenhuma solicitação cadastrada')).toBeVisible();

    await page.getByPlaceholder(/Buscar cidade, parceiro/i).fill('');
    await page.getByRole('button', { name: /^Todos/i }).first().click();
    await page.getByRole('button', { name: /^Tudo/i }).click({ force: true });
    await expect(page.getByText('Amerê Chalés Oficial')).toBeVisible();
  });
});
