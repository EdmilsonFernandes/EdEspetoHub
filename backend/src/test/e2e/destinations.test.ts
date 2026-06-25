import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env';
import { AppDataSource } from '../../config/database';
import { activateSubscription, api, loginAdmin, loginCustomer, registerCustomer, registerStore, testEmail, verifyEmailDirectly } from '../helpers';

const superAdminToken = () => jwt.sign({ sub: '00000000-0000-0000-0000-000000000001', role: 'SUPER_ADMIN' }, env.jwtSecret);

async function findLatestStoreVerificationCode(email: string) {
  const rows = await AppDataSource.query(
    `
      SELECT ev.token_hash
      FROM email_verifications ev
      INNER JOIN users u ON u.id = ev.user_id
      WHERE LOWER(u.email) = LOWER($1)
      ORDER BY ev.created_at DESC
      LIMIT 1
    `,
    [email]
  );
  const tokenHash = rows[0]?.token_hash;
  for (let index = 0; index <= 9999; index += 1) {
    const code = String(index).padStart(4, '0');
    if (crypto.createHash('sha256').update(code).digest('hex') === tokenHash) return code;
  }
  throw new Error(`Verification code not found for ${email}`);
}

async function waitForEmailLog(templateKey: string, requestId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const rows = await AppDataSource.query(
      `SELECT to_email, status
         FROM email_send_logs
        WHERE template_key = $1
          AND metadata->>'requestId' = $2`,
      [templateKey, requestId]
    );
    if (rows.length) return rows;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return [];
}

describe('Destination Hub', () => {
  let adminToken = '';
  let storeId = '';
  let storeSlug = '';
  let platformToken = '';

  beforeAll(async () => {
    platformToken = superAdminToken();
    const store = await registerStore({
      storeName: `Loja Destino ${Date.now()}`,
      city: 'São Bento do Sapucaí',
      state: 'SP',
    });
    await verifyEmailDirectly(store.email);
    storeId = String(store.body.store?.id || '');
    await activateSubscription(storeId);
    const login = await loginAdmin(store.email, store.password);
    adminToken = String(login.token || '');
    storeSlug = String(login.store?.slug || '');
  });

  it('creates a real destination, hospitality place, listing and store link flow', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Teste ${suffix}`,
        slug: `destino-teste-${suffix}`,
        city: 'Gonçalves',
        state: 'MG',
        lat: -22.6586,
        lng: -45.8551,
        heroTitle: 'Experiência de teste',
      });

    expect(destinationRes.status).toBe(201);
    const destinationId = destinationRes.body.id;

    const firstBannerRes = await api
      .post('/api/admin/destination-banners')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId,
        title: 'Vista principal',
        subtitle: 'Foto de capa da cidade',
        imageUrl: 'https://example.com/destino-capa.jpg',
        actionType: 'EXTERNAL_URL',
        actionTarget: 'https://example.com/roteiro',
        sortOrder: 0,
      });

    expect(firstBannerRes.status, JSON.stringify(firstBannerRes.body)).toBe(201);
    expect(firstBannerRes.body.actionTarget).toBe('https://example.com/roteiro');

    const secondBannerRes = await api
      .post('/api/admin/destination-banners')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId,
        title: 'Mirante',
        imageUrl: 'https://example.com/destino-mirante.jpg',
        sortOrder: 1,
      });

    expect(secondBannerRes.status, JSON.stringify(secondBannerRes.body)).toBe(201);

    const adminBannersRes = await api
      .get(`/api/admin/destinations/${destinationId}/banners`)
      .set('Authorization', `Bearer ${platformToken}`);

    expect(adminBannersRes.status, JSON.stringify(adminBannersRes.body)).toBe(200);
    expect(adminBannersRes.body.items).toHaveLength(2);
    expect(adminBannersRes.body.items[0]).toEqual(expect.objectContaining({
      id: firstBannerRes.body.id,
      imageUrl: 'https://example.com/destino-capa.jpg',
      actionTarget: 'https://example.com/roteiro',
      sortOrder: 0,
    }));

    const placeRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId,
        name: `Chalé Real ${suffix}`,
        slug: `chale-real-${suffix}`,
        type: 'CHALE',
        address: 'Estrada do teste, 10',
        addressNumber: '10',
        district: 'Bairro Teste',
        city: 'Gonçalves',
        state: 'MG',
        zipCode: '37680-000',
        lat: -22.6586,
        lng: -45.8551,
        deliveryInstructions: 'Entregar na recepção.',
      });

    expect(placeRes.status).toBe(201);
    const placeId = placeRes.body.id;

    const listingRes = await api
      .post('/api/admin/destination-listings')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId,
        title: `Passeio Teste ${suffix}`,
        category: 'PASSEIO',
        address: 'Rua do passeio',
        addressNumber: '22',
        district: 'Centro',
        city: 'Gonçalves',
        state: 'MG',
        zipCode: '37680-000',
        lat: -22.6577,
        lng: -45.8562,
        ctaType: 'WHATSAPP',
        ctaUrl: '5511999999999',
      });

    expect(listingRes.status).toBe(201);
    expect(listingRes.body.category).toBe('PASSEIO');
    expect(listingRes.body).toEqual(expect.objectContaining({
      addressNumber: '22',
      district: 'Centro',
      zipCode: '37680000',
      city: 'Gonçalves',
      state: 'MG',
      lat: -22.6577,
      lng: -45.8562,
    }));

    const summaryRes = await api
      .get('/api/admin/destinations/manage/summary')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({
        page: 1,
        pageSize: 5,
        search: `Destino Teste ${suffix}`,
        state: 'MG',
        status: 'active',
        contentType: 'all',
        listingCategory: 'PASSEIO',
      });

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.pagination).toEqual(expect.objectContaining({
      page: 1,
      pageSize: 5,
      total: expect.any(Number),
    }));
    expect(summaryRes.body.destinations.some((item: any) => item.id === destinationId)).toBe(true);
    expect(summaryRes.body.categories.some((item: any) => item.id === 'PASSEIO')).toBe(true);

    const adminPlacesRes = await api
      .get(`/api/admin/destinations/${destinationId}/places`)
      .set('Authorization', `Bearer ${platformToken}`)
      .query({ page: 1, pageSize: 5, search: 'Chalé', status: 'active' });

    expect(adminPlacesRes.status, JSON.stringify(adminPlacesRes.body)).toBe(200);
    expect(adminPlacesRes.body.items.some((item: any) => item.id === placeId)).toBe(true);
    expect(adminPlacesRes.body.pagination.total).toBeGreaterThanOrEqual(1);

    const adminListingsRes = await api
      .get(`/api/admin/destinations/${destinationId}/listings`)
      .set('Authorization', `Bearer ${platformToken}`)
      .query({ page: 1, pageSize: 5, search: 'Passeio', status: 'active', listingCategory: 'PASSEIO' });

    expect(adminListingsRes.status, JSON.stringify(adminListingsRes.body)).toBe(200);
    expect(adminListingsRes.body.items.some((item: any) => item.id === listingRes.body.id)).toBe(true);
    expect(adminListingsRes.body.pagination.total).toBeGreaterThanOrEqual(1);

    const optionsBefore = await api
      .get(`/api/stores/${storeId}/destinations`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(optionsBefore.status).toBe(200);
    const createdDestination = optionsBefore.body.find((item: any) => item.id === destinationId);
    expect(createdDestination?.destinationMatch).toEqual(expect.objectContaining({
      recommended: expect.any(Boolean),
      reason: expect.any(String),
    }));
    expect(createdDestination?.hospitalityPlaces?.[0]?.status).toBe('available');

    const requestRes = await api
      .post(`/api/stores/${storeId}/destination-requests`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hospitalityPlaceId: placeId,
        message: 'Atendo este chalé com delivery.',
        deliveryFee: 12.5,
        estimatedMinutes: 35,
      });

    expect(requestRes.status).toBe(201);
    expect(requestRes.body.status).toBe('pending');

    const reviewRes = await api
      .patch(`/api/admin/destination-store-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe('approved');

    const placePublicRes = await api.get(
      `/api/public/destinations/${destinationRes.body.slug}/hospitality/${placeRes.body.slug}`
    );

    expect(placePublicRes.status).toBe(200);
    expect(placePublicRes.body.hospitalityPlace.id).toBe(placeId);
    expect(placePublicRes.body.hospitalityPlace).toEqual(expect.objectContaining({
      addressNumber: '10',
      district: 'Bairro Teste',
      zipCode: '37680000',
      lat: -22.6586,
      lng: -45.8551,
    }));
    expect(placePublicRes.body.stores.some((entry: any) => entry.store?.slug === storeSlug)).toBe(true);
    expect(placePublicRes.body.listings.some((entry: any) => entry.title === listingRes.body.title)).toBe(true);

    const publicDestinationRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    expect(publicDestinationRes.status).toBe(200);
    expect(publicDestinationRes.body.banners).toEqual(expect.arrayContaining([
      expect.objectContaining({
        imageUrl: 'https://example.com/destino-capa.jpg',
        actionTarget: 'https://example.com/roteiro',
      }),
    ]));

    const publicListRes = await api
      .get('/api/public/destinations')
      .query({ city: 'Gonçalves', state: 'MG', lat: -22.6586, lng: -45.8551 });
    expect(publicListRes.status).toBe(200);
    const publicDestination = publicListRes.body.find((item: any) => item.id === destinationId);
    expect(publicDestination?.destinationMatch).toEqual(expect.objectContaining({
      recommended: true,
      reason: expect.any(String),
      distanceKm: expect.any(Number),
    }));
  });

  it('returns a clear conflict when updating a destination to an existing slug', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const firstDestinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Duplicado A ${suffix}`,
        slug: `destino-duplicado-a-${suffix}`,
        city: 'São José dos Campos',
        state: 'SP',
      });

    expect(firstDestinationRes.status, JSON.stringify(firstDestinationRes.body)).toBe(201);

    const secondDestinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Duplicado B ${suffix}`,
        slug: `destino-duplicado-b-${suffix}`,
        city: 'São Francisco Xavier',
        state: 'SP',
      });

    expect(secondDestinationRes.status, JSON.stringify(secondDestinationRes.body)).toBe(201);

    const conflictRes = await api
      .patch(`/api/admin/destinations/${secondDestinationRes.body.id}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        ...secondDestinationRes.body,
        name: firstDestinationRes.body.name,
        slug: firstDestinationRes.body.slug,
      });

    expect(conflictRes.status, JSON.stringify(conflictRes.body)).toBe(409);
    expect(conflictRes.body.code).toBe('DEST-013');
  });

  it('keeps inactive destinations visible in admin catalog for reactivation', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Inativo ${suffix}`,
        slug: `destino-inativo-${suffix}`,
        city: 'São Bento do Sapucaí',
        state: 'SP',
      });

    expect(destinationRes.status).toBe(201);

    const listingRes = await api
      .post('/api/admin/destination-listings')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        title: `Restaurante Ativo ${suffix}`,
        category: 'RESTAURANTE_VISITAR',
        active: true,
      });

    expect(listingRes.status).toBe(201);

    const deactivateRes = await api
      .patch(`/api/admin/destinations/${destinationRes.body.id}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        ...destinationRes.body,
        active: false,
      });

    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.active).toBe(false);

    const inactiveAllRes = await api
      .get('/api/admin/destinations/manage/summary')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({
        page: 1,
        pageSize: 10,
        search: `Destino Inativo ${suffix}`,
        status: 'inactive',
        contentType: 'all',
      });

    expect(inactiveAllRes.status, JSON.stringify(inactiveAllRes.body)).toBe(200);
    expect(inactiveAllRes.body.destinations.some((item: any) => item.id === destinationRes.body.id)).toBe(true);

    const inactiveListingsRes = await api
      .get('/api/admin/destinations/manage/summary')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({
        page: 1,
        pageSize: 10,
        search: `Destino Inativo ${suffix}`,
        status: 'inactive',
        contentType: 'listings',
      });

    expect(inactiveListingsRes.status, JSON.stringify(inactiveListingsRes.body)).toBe(200);
    expect(inactiveListingsRes.body.destinations.some((item: any) => item.id === destinationRes.body.id)).toBe(true);
  });

  it('allows one service listing to appear in multiple hospitality places', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Multi Serviço ${suffix}`,
        slug: `destino-multi-servico-${suffix}`,
        city: 'São Bento do Sapucaí',
        state: 'SP',
      });

    expect(destinationRes.status).toBe(201);

    const firstPlaceRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        name: `Chalé Serra ${suffix}`,
        slug: `chale-serra-${suffix}`,
        type: 'CHALE',
        address: 'Estrada da Serra, 10',
      });

    const secondPlaceRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        name: `Pousada Vale ${suffix}`,
        slug: `pousada-vale-${suffix}`,
        type: 'POUSADA',
        address: 'Rua do Vale, 20',
      });

    expect(firstPlaceRes.status).toBe(201);
    expect(secondPlaceRes.status).toBe(201);

    const listingRes = await api
      .post('/api/admin/destination-listings')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        title: `Restaurante Multi ${suffix}`,
        category: 'RESTAURANTE_VISITAR',
        hospitalityPlaceIds: [firstPlaceRes.body.id, secondPlaceRes.body.id],
        hospitalityPlaceLinks: [
          { hospitalityPlaceId: firstPlaceRes.body.id, sortOrder: 20 },
          { hospitalityPlaceId: secondPlaceRes.body.id, sortOrder: 5 },
        ],
        whatsapp: '5512999999999',
      });

    expect(listingRes.status, JSON.stringify(listingRes.body)).toBe(201);
    expect([...listingRes.body.hospitalityPlaceIds].sort()).toEqual([firstPlaceRes.body.id, secondPlaceRes.body.id].sort());
    expect(listingRes.body.hospitalityPlaces.map((place: any) => place.id).sort()).toEqual([
      firstPlaceRes.body.id,
      secondPlaceRes.body.id,
    ].sort());
    expect(listingRes.body.hospitalityPlaceLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ hospitalityPlaceId: firstPlaceRes.body.id, sortOrder: 20 }),
      expect.objectContaining({ hospitalityPlaceId: secondPlaceRes.body.id, sortOrder: 5 }),
    ]));

    const priorityListingRes = await api
      .post('/api/admin/destination-listings')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        title: `Restaurante Prioritário ${suffix}`,
        category: 'RESTAURANTE_VISITAR',
        hospitalityPlaceIds: [firstPlaceRes.body.id, secondPlaceRes.body.id],
        hospitalityPlaceLinks: [
          { hospitalityPlaceId: firstPlaceRes.body.id, sortOrder: 1 },
          { hospitalityPlaceId: secondPlaceRes.body.id, sortOrder: 30 },
        ],
        whatsapp: '5512888888888',
      });

    expect(priorityListingRes.status, JSON.stringify(priorityListingRes.body)).toBe(201);

    const firstPublicRes = await api.get(
      `/api/public/destinations/${destinationRes.body.slug}/hospitality/${firstPlaceRes.body.slug}`
    );
    const secondPublicRes = await api.get(
      `/api/public/destinations/${destinationRes.body.slug}/hospitality/${secondPlaceRes.body.slug}`
    );

    expect(firstPublicRes.status).toBe(200);
    expect(secondPublicRes.status).toBe(200);
    expect(firstPublicRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(true);
    expect(secondPublicRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(true);
    const firstPublicListingIds = firstPublicRes.body.listings.map((listing: any) => listing.id);
    const secondPublicListingIds = secondPublicRes.body.listings.map((listing: any) => listing.id);
    expect(firstPublicListingIds.indexOf(priorityListingRes.body.id)).toBeLessThan(firstPublicListingIds.indexOf(listingRes.body.id));
    expect(secondPublicListingIds.indexOf(listingRes.body.id)).toBeLessThan(secondPublicListingIds.indexOf(priorityListingRes.body.id));

    const updateToSecondOnly = await api
      .patch(`/api/admin/destination-listings/${listingRes.body.id}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        hospitalityPlaceIds: [secondPlaceRes.body.id],
      });

    expect(updateToSecondOnly.status, JSON.stringify(updateToSecondOnly.body)).toBe(200);
    expect(updateToSecondOnly.body.hospitalityPlaceIds).toEqual([secondPlaceRes.body.id]);

    const firstAfterRestrictRes = await api.get(
      `/api/public/destinations/${destinationRes.body.slug}/hospitality/${firstPlaceRes.body.slug}`
    );
    const secondAfterRestrictRes = await api.get(
      `/api/public/destinations/${destinationRes.body.slug}/hospitality/${secondPlaceRes.body.slug}`
    );

    expect(firstAfterRestrictRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(false);
    expect(secondAfterRestrictRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(true);

    const updateToDestinationWide = await api
      .patch(`/api/admin/destination-listings/${listingRes.body.id}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        hospitalityPlaceIds: [],
      });

    expect(updateToDestinationWide.status, JSON.stringify(updateToDestinationWide.body)).toBe(200);
    expect(updateToDestinationWide.body.hospitalityPlaceIds).toEqual([]);

    const firstGlobalRes = await api.get(
      `/api/public/destinations/${destinationRes.body.slug}/hospitality/${firstPlaceRes.body.slug}`
    );
    expect(firstGlobalRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(true);
  });

  it('accepts partner requests and converts approved hospitality into real records', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Parceiro ${suffix}`,
        slug: `destino-parceiro-${suffix}`,
        city: 'São Francisco Xavier',
        state: 'SP',
      });

    expect(destinationRes.status).toBe(201);

    const partnerEmail = testEmail('destino-parceiro');
    const requestRes = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'HOSPITALITY',
      placeType: 'POUSADA',
      name: `Pousada Sol ${suffix}`,
      responsibleName: 'Maria Responsável',
      responsibleEmail: partnerEmail,
      responsiblePhone: '11999999999',
      whatsapp: '11999999999',
      deliveryInstructions: 'Confirmar casa pelo WhatsApp.',
    });

    expect(requestRes.status).toBe(201);
    expect(requestRes.body.status).toBe('pending');

    // A notificação por e-mail é disparada de forma assíncrona (fire-and-forget)
    // para não travar a resposta do cadastro, então fazemos um poll curto.
    let notificationLogs: any[] = [];
    for (let attempt = 0; attempt < 60; attempt += 1) {
      notificationLogs = await AppDataSource.query(
        `SELECT to_email, status
           FROM email_send_logs
          WHERE template_key = $1
            AND metadata->>'requestId' = $2`,
        ['destination_partner_request_notification', requestRes.body.id]
      );
      if (Array.isArray(notificationLogs) && notificationLogs.length) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const notifiedEmails = notificationLogs.map((row: any) => String(row.to_email || '').toLowerCase());
    expect(notifiedEmails).toContain(String(env.email.auditInbox || 'edmls2008@gmail.com').toLowerCase());
    expect(notifiedEmails).toContain('contato@janocaminho.com.br');

    // O próprio parceiro recebe um e-mail confirmando o recebimento da solicitação.
    let confirmationLogs: any[] = [];
    for (let attempt = 0; attempt < 60; attempt += 1) {
      confirmationLogs = await AppDataSource.query(
        `SELECT to_email FROM email_send_logs WHERE template_key = $1 AND lower(to_email) = $2`,
        ['destination_partner_request_confirmation', partnerEmail.toLowerCase()]
      );
      if (Array.isArray(confirmationLogs) && confirmationLogs.length) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(confirmationLogs.length).toBeGreaterThan(0);

    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe('approved');
    expect(reviewRes.body.createdHospitalityPlaceId).toBeTruthy();
    expect(reviewRes.body.createdPartnerAccountId).toBeTruthy();
    expect(reviewRes.body.partnerActivationToken).toBeTruthy();

    const publicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    expect(publicRes.status).toBe(200);
    expect(
      publicRes.body.hospitalityPlaces.some((place: any) => place.id === reviewRes.body.createdHospitalityPlaceId)
    ).toBe(true);

    const activateRes = await api.post('/api/destination-partner/auth/activate').send({
      token: reviewRes.body.partnerActivationToken,
      password: 'senha123',
    });

    expect(activateRes.status, JSON.stringify(activateRes.body)).toBe(200);
    expect(activateRes.body.token).toBeTruthy();
    expect(activateRes.body.resources).toHaveLength(1);

    const meRes = await api
      .get('/api/destination-partner/me')
      .set('Authorization', `Bearer ${activateRes.body.token}`);

    expect(meRes.status, JSON.stringify(meRes.body)).toBe(200);
    expect(meRes.body.resources[0]).toEqual(expect.objectContaining({
      resourceType: 'HOSPITALITY_PLACE',
    }));

    const updateRes = await api
      .patch(`/api/destination-partner/hospitality-places/${reviewRes.body.createdHospitalityPlaceId}`)
      .set('Authorization', `Bearer ${activateRes.body.token}`)
      .send({
        name: `Pousada Sol Atualizada ${suffix}`,
        description: 'Descrição atualizada pelo parceiro.',
        whatsapp: '11988887777',
        active: false,
        sortOrder: 999,
      });

    expect(updateRes.status, JSON.stringify(updateRes.body)).toBe(200);
    expect(updateRes.body.name).toBe(`Pousada Sol Atualizada ${suffix}`);
    expect(updateRes.body.description).toBe('Descrição atualizada pelo parceiro.');
    expect(updateRes.body.active).toBe(true);

    const publicAfterUpdateRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    const updatedPublicPlace = publicAfterUpdateRes.body.hospitalityPlaces.find(
      (place: any) => place.id === reviewRes.body.createdHospitalityPlaceId
    );
    expect(updatedPublicPlace.description).toBe('Descrição atualizada pelo parceiro.');
  });

  it('lets an invited hospitality owner claim an existing profile without duplicating it', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Claim Hospedagem ${suffix}`,
        slug: `destino-claim-hospedagem-${suffix}`,
        city: 'São Bento do Sapucaí',
        state: 'SP',
      });

    expect(destinationRes.status).toBe(201);

    const placeRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        name: `Chalé Já Cadastrado ${suffix}`,
        slug: `chale-ja-cadastrado-${suffix}`,
        type: 'CHALE',
        address: 'Estrada da Serra, 100',
        whatsapp: '5512999999999',
      });

    expect(placeRes.status).toBe(201);

    const requestRes = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'HOSPITALITY',
      placeType: 'CHALE',
      name: placeRes.body.name,
      requestSource: 'hospitality_place_claim',
      claimedHospitalityPlaceId: placeRes.body.id,
      responsibleName: 'Dono do Chalé',
      responsibleEmail: testEmail('destino-claim-hospedagem'),
      responsiblePhone: '11999999999',
      whatsapp: '5512999999999',
      message: 'Quero assumir este perfil.',
    });

    expect(requestRes.status, JSON.stringify(requestRes.body)).toBe(201);
    expect(requestRes.body.claimedHospitalityPlaceId).toBe(placeRes.body.id);

    const unsafeReviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });

    expect(unsafeReviewRes.status, JSON.stringify(unsafeReviewRes.body)).toBe(400);
    expect(unsafeReviewRes.body.code).toBe('DPARTNER-010');

    const reviewWithoutAuditNoteRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved', claimVerified: true });

    expect(reviewWithoutAuditNoteRes.status, JSON.stringify(reviewWithoutAuditNoteRes.body)).toBe(400);
    expect(reviewWithoutAuditNoteRes.body.code).toBe('DPARTNER-012');

    const claimReviewNote = 'Confirmado pelo WhatsApp oficial cadastrado no perfil.';
    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved', claimVerified: true, reviewNote: claimReviewNote });

    expect(reviewRes.status, JSON.stringify(reviewRes.body)).toBe(200);
    expect(reviewRes.body.createdHospitalityPlaceId).toBe(placeRes.body.id);
    expect(reviewRes.body.partnerActivationToken).toBeTruthy();
    expect(reviewRes.body.reviewNote).toBe(claimReviewNote);

    const placeRows = await AppDataSource.query(
      `SELECT id FROM hospitality_places WHERE destination_id = $1 ORDER BY created_at ASC`,
      [destinationRes.body.id]
    );
    expect(placeRows).toHaveLength(1);
    expect(placeRows[0].id).toBe(placeRes.body.id);

    const resendRes = await api
      .post(`/api/admin/destination-partner-requests/${requestRes.body.id}/invite/resend`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({});

    expect(resendRes.status, JSON.stringify(resendRes.body)).toBe(200);
    expect(resendRes.body.partnerActivationToken).toBeTruthy();
    expect(resendRes.body.partnerActivationUrl).toContain('/parceiro/ativar?token=');

    const oldActivateRes = await api.post('/api/destination-partner/auth/activate').send({
      token: reviewRes.body.partnerActivationToken,
      password: 'senha123',
    });
    expect(oldActivateRes.status).toBe(400);

    const activateRes = await api.post('/api/destination-partner/auth/activate').send({
      token: resendRes.body.partnerActivationToken,
      password: 'senha123',
    });

    expect(activateRes.status, JSON.stringify(activateRes.body)).toBe(200);
    expect(activateRes.body.resources[0]).toEqual(expect.objectContaining({
      resourceType: 'HOSPITALITY_PLACE',
    }));
    expect(activateRes.body.resources[0].item.id).toBe(placeRes.body.id);

    const secondClaimRes = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'HOSPITALITY',
      placeType: 'CHALE',
      name: placeRes.body.name,
      requestSource: 'hospitality_place_claim',
      claimedHospitalityPlaceId: placeRes.body.id,
      responsibleName: 'Pessoa Sem Titularidade',
      responsibleEmail: testEmail('destino-claim-hospedagem-fraude'),
      responsiblePhone: '11888887777',
      whatsapp: '5511888887777',
      message: 'Quero assumir este perfil também.',
    });

    expect(secondClaimRes.status, JSON.stringify(secondClaimRes.body)).toBe(201);

    const rejectWithoutReasonRes = await api
      .patch(`/api/admin/destination-partner-requests/${secondClaimRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'rejected' });

    expect(rejectWithoutReasonRes.status, JSON.stringify(rejectWithoutReasonRes.body)).toBe(400);
    expect(rejectWithoutReasonRes.body.code).toBe('DPARTNER-014');

    const duplicatedOwnerRes = await api
      .patch(`/api/admin/destination-partner-requests/${secondClaimRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved', claimVerified: true, reviewNote: 'Confirmado pelo contato oficial informado.' });

    expect(duplicatedOwnerRes.status, JSON.stringify(duplicatedOwnerRes.body)).toBe(409);
    expect(duplicatedOwnerRes.body.code).toBe('DPARTNER-011');

    const rejectWithReasonRes = await api
      .patch(`/api/admin/destination-partner-requests/${secondClaimRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'rejected', reviewNote: 'Responsável não comprovou a titularidade do chalé.' });

    expect(rejectWithReasonRes.status, JSON.stringify(rejectWithReasonRes.body)).toBe(200);
    expect(rejectWithReasonRes.body.status).toBe('rejected');
  });

  it('accepts service partner requests and lets the partner update only safe listing fields', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Serviço Parceiro ${suffix}`,
        slug: `destino-servico-parceiro-${suffix}`,
        city: 'São Bento do Sapucaí',
        state: 'SP',
      });

    expect(destinationRes.status).toBe(201);

    const requestRes = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'SERVICE_PROVIDER',
      category: 'SERVICO',
      name: `Restaurante Parceiro ${suffix}`,
      responsibleName: 'João Serviço',
      responsibleEmail: testEmail('destino-servico-parceiro'),
      responsiblePhone: '11977776666',
      whatsapp: '11977776666',
      description: 'Restaurante inicial.',
    });

    expect(requestRes.status, JSON.stringify(requestRes.body)).toBe(201);
    expect(requestRes.body.status).toBe('pending');

    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });

    expect(reviewRes.status, JSON.stringify(reviewRes.body)).toBe(200);
    expect(reviewRes.body.status).toBe('approved');
    expect(reviewRes.body.createdListingId).toBeTruthy();
    expect(reviewRes.body.createdPartnerAccountId).toBeTruthy();
    expect(reviewRes.body.partnerActivationToken).toBeTruthy();

    const activateRes = await api.post('/api/destination-partner/auth/activate').send({
      token: reviewRes.body.partnerActivationToken,
      password: 'senha123',
    });

    expect(activateRes.status, JSON.stringify(activateRes.body)).toBe(200);
    expect(activateRes.body.resources[0]).toEqual(expect.objectContaining({
      resourceType: 'DESTINATION_LISTING',
    }));

    const resourcesRes = await api
      .get('/api/destination-partner/resources')
      .set('Authorization', `Bearer ${activateRes.body.token}`);

    expect(resourcesRes.status, JSON.stringify(resourcesRes.body)).toBe(200);
    expect(resourcesRes.body.resources).toHaveLength(1);
    expect(resourcesRes.body.resources[0].item.title).toBe(`Restaurante Parceiro ${suffix}`);

    const updateRes = await api
      .patch(`/api/destination-partner/listings/${reviewRes.body.createdListingId}`)
      .set('Authorization', `Bearer ${activateRes.body.token}`)
      .send({
        title: `Restaurante Parceiro Atualizado ${suffix}`,
        description: 'Cardápio e atendimento atualizados pelo parceiro.',
        whatsapp: '11966665555',
        category: 'PASSEIO',
        featured: true,
        active: false,
        sortOrder: 999,
      });

    expect(updateRes.status, JSON.stringify(updateRes.body)).toBe(200);
    expect(updateRes.body.title).toBe(`Restaurante Parceiro Atualizado ${suffix}`);
    expect(updateRes.body.description).toBe('Cardápio e atendimento atualizados pelo parceiro.');
    expect(updateRes.body.whatsapp).toBe('11966665555');
    expect(updateRes.body.category).toBe('SERVICO');
    expect(updateRes.body.featured).toBe(false);
    expect(updateRes.body.active).toBe(true);

    const publicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    const listing = publicRes.body.listings.find((item: any) => item.id === reviewRes.body.createdListingId);
    expect(listing.title).toBe(`Restaurante Parceiro Atualizado ${suffix}`);
    expect(listing.category).toBe('SERVICO');
  });

  it('accepts partner requests for a city that is not public yet', async () => {
    const suffix = Date.now();
    const requestRes = await api.post('/api/public/destination-partner-requests').send({
      destinationCity: `Cidade Nova ${suffix}`,
      destinationState: 'MG',
      partnerType: 'SERVICE_PROVIDER',
      category: 'PASSEIO',
      name: `Experiência Nova ${suffix}`,
      responsibleName: 'Responsável Nova Cidade',
      responsibleEmail: testEmail('destino-nova-cidade'),
      responsiblePhone: '11999999999',
      whatsapp: '11999999999',
    });

    expect(requestRes.status).toBe(201);
    expect(requestRes.body.status).toBe('pending');
    expect(requestRes.body.destination).toEqual(expect.objectContaining({
      city: `Cidade Nova ${suffix}`,
      state: 'MG',
      active: false,
    }));

    const publicListRes = await api.get('/api/public/destinations');
    expect(publicListRes.status).toBe(200);
    expect(publicListRes.body.some((destination: any) => destination.id === requestRes.body.destinationId)).toBe(false);
  });

  it('keeps a claimed destination listing pending until admin approval converts the service into a store link', async () => {
    const suffix = Date.now();
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Claim ${suffix}`,
        slug: `destino-claim-${suffix}`,
        city: 'São Bento do Sapucaí',
        state: 'SP',
      });

    expect(destinationRes.status).toBe(201);

    const placeRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        name: `Chalé Captado ${suffix}`,
        slug: `chale-captado-${suffix}`,
        type: 'CHALE',
        address: 'Estrada do convite, 10',
      });

    expect(placeRes.status).toBe(201);

    const secondPlaceRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        name: `Pousada Captada ${suffix}`,
        slug: `pousada-captada-${suffix}`,
        type: 'POUSADA',
        address: 'Rua do convite, 20',
      });

    expect(secondPlaceRes.status).toBe(201);

    const listingRes = await api
      .post('/api/admin/destination-listings')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        title: `Restaurante Captado ${suffix}`,
        category: 'RESTAURANTE_VISITAR',
        whatsapp: '5512999999999',
        ctaType: 'WHATSAPP',
        ctaUrl: '5512999999999',
      });

    expect(listingRes.status).toBe(201);
    expect(listingRes.body.storeId).toBeNull();

    const claimedStore = await registerStore({
      storeName: listingRes.body.title,
      city: 'São Bento do Sapucaí',
      state: 'SP',
      acquisitionAttribution: {
        source: 'destination_listing_claim',
        destinationListingId: listingRes.body.id,
        destinationId: destinationRes.body.id,
        destinationSlug: destinationRes.body.slug,
        destinationName: destinationRes.body.name,
        listingTitle: listingRes.body.title,
        destinationDeliveryMode: 'selected',
        destinationHospitalityPlaceIds: [placeRes.body.id, secondPlaceRes.body.id],
        destinationHospitalityPlaceNames: [placeRes.body.name, secondPlaceRes.body.name],
      },
    });

    expect(claimedStore.res.status).toBe(201);
    expect(claimedStore.body.token).toBeNull();
    expect(claimedStore.body.storeStatus).toBe('PENDING_REVIEW');
    const verificationCode = await findLatestStoreVerificationCode(claimedStore.email);
    const verifyRes = await api
      .post('/api/auth/verify-email')
      .send({ email: claimedStore.email, token: verificationCode });

    expect(verifyRes.status, JSON.stringify(verifyRes.body)).toBe(200);
    expect(verifyRes.body.destinationClaimStatus).toBe('pending_review');
    expect(verifyRes.body.destinationClaimRequestId).toBeTruthy();

    const attributionRows = await AppDataSource.query(
      `SELECT acquisition_attribution FROM store_settings WHERE store_id = $1`,
      [claimedStore.body.store.id]
    );
    expect(attributionRows[0]?.acquisition_attribution).toEqual(expect.objectContaining({
      source: 'destination_listing_claim',
      destinationListingId: listingRes.body.id,
      destinationDeliveryMode: 'selected',
      destinationHospitalityPlaceIds: [placeRes.body.id, secondPlaceRes.body.id],
      destinationHospitalityPlaceNames: [placeRes.body.name, secondPlaceRes.body.name],
    }));

    const claimRows = await AppDataSource.query(
      `
        SELECT id, status, request_source, claimed_listing_id, store_id
        FROM destination_partner_requests
        WHERE store_id = $1 AND claimed_listing_id = $2
      `,
      [claimedStore.body.store.id, listingRes.body.id]
    );
    expect(claimRows).toHaveLength(1);
    expect(claimRows[0]).toEqual(expect.objectContaining({
      status: 'pending',
      request_source: 'store_signup_destination_claim',
      claimed_listing_id: listingRes.body.id,
      store_id: claimedStore.body.store.id,
    }));

    const claimPendingLogs = await waitForEmailLog('destination_store_claim_pending', claimRows[0].id);
    expect(claimPendingLogs.map((row: any) => String(row.to_email || '').toLowerCase())).toContain(claimedStore.email);

    const storeRequestRows = await AppDataSource.query(
      `
        SELECT id, status, store_id, hospitality_place_id, message
        FROM destination_store_requests
        WHERE store_id = $1
        ORDER BY created_at ASC
      `,
      [claimedStore.body.store.id]
    );
    expect(storeRequestRows).toHaveLength(2);
    expect(storeRequestRows.map((row: any) => row.hospitality_place_id).sort()).toEqual([placeRes.body.id, secondPlaceRes.body.id].sort());
    expect(storeRequestRows.every((row: any) => row.status === 'pending')).toBe(true);
    expect(storeRequestRows.every((row: any) => String(row.message || '').includes(claimRows[0].id))).toBe(true);

    const overviewBeforeReviewRes = await api
      .get('/api/admin/destinations/manage')
      .set('Authorization', `Bearer ${platformToken}`);
    expect(overviewBeforeReviewRes.status).toBe(200);
    const overviewClaim = overviewBeforeReviewRes.body.partnerRequests.find((request: any) => request.id === claimRows[0].id);
    expect(overviewClaim.requestedHospitalityPlaces.map((place: any) => place.id).sort()).toEqual([placeRes.body.id, secondPlaceRes.body.id].sort());
    const overviewChildRequests = overviewBeforeReviewRes.body.storeRequests.filter((request: any) => request.parentPartnerRequestId === claimRows[0].id);
    expect(overviewChildRequests).toHaveLength(2);

    const childReviewRes = await api
      .patch(`/api/admin/destination-store-requests/${storeRequestRows[0].id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });
    expect(childReviewRes.status).toBe(400);
    expect(childReviewRes.body.code).toBe('DPARTNER-015');

    const pendingStoreRows = await AppDataSource.query(
      `SELECT open FROM stores WHERE id = $1`,
      [claimedStore.body.store.id]
    );
    expect(pendingStoreRows[0].open).toBe(false);

    const blockedGenericLoginRes = await api
      .post('/api/auth/login')
      .send({ email: claimedStore.email, password: claimedStore.password });
    expect(blockedGenericLoginRes.status).toBe(409);
    expect(blockedGenericLoginRes.body.code).toBe('AUTH-029');

    const blockedAdminLoginRes = await api
      .post('/api/auth/admin-login')
      .send({ identifier: claimedStore.email, password: claimedStore.password });
    expect(blockedAdminLoginRes.status).toBe(409);
    expect(blockedAdminLoginRes.body.code).toBe('AUTH-029');

    const staleAdminToken = jwt.sign(
      { sub: claimedStore.body.user.id, storeId: claimedStore.body.store.id, role: 'ADMIN' },
      env.jwtSecret
    );
    const staleTokenStoreRouteRes = await api
      .get(`/api/stores/${claimedStore.body.store.id}/products`)
      .set('Authorization', `Bearer ${staleAdminToken}`);
    expect(staleTokenStoreRouteRes.status).toBe(409);
    expect(staleTokenStoreRouteRes.body.code).toBe('AUTH-029');

    const publicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    expect(publicRes.status).toBe(200);
    const claimedListing = publicRes.body.listings.find((listing: any) => listing.id === listingRes.body.id);

    expect(claimedListing).toEqual(expect.objectContaining({
      storeId: null,
      ctaType: 'WHATSAPP',
      ctaUrl: '5512999999999',
    }));
    expect(claimedListing.store).toBeNull();
    expect(claimedStore.body.store.id).toBeTruthy();

    const validationRes = await api
      .patch(`/api/admin/destination-partner-requests/${claimRows[0].id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        status: 'approved',
        claimVerified: true,
        reviewNote: 'Posse conferida por contato direto antes de converter o serviço em loja.',
      });

    expect(validationRes.status).toBe(200);
    expect(validationRes.body.status).toBe('approved');
    expect(validationRes.body.store).toEqual(expect.objectContaining({
      id: claimedStore.body.store.id,
      slug: claimedStore.body.store.slug,
    }));
    expect(validationRes.body.createdPartnerAccountId).toBeNull();

    const claimApprovalLogs = await waitForEmailLog('destination_store_claim_approved', claimRows[0].id);
    expect(claimApprovalLogs.map((row: any) => String(row.to_email || '').toLowerCase())).toContain(claimedStore.email);

    const approvedAdminLoginRes = await api
      .post('/api/auth/admin-login')
      .send({ identifier: claimedStore.email, password: claimedStore.password });
    expect(approvedAdminLoginRes.status).toBe(200);
    expect(approvedAdminLoginRes.body.store).toEqual(expect.objectContaining({
      id: claimedStore.body.store.id,
      slug: claimedStore.body.store.slug,
    }));

    const approvedTokenStoreRouteRes = await api
      .get(`/api/stores/${claimedStore.body.store.id}/products`)
      .set('Authorization', `Bearer ${staleAdminToken}`);
    expect(approvedTokenStoreRouteRes.status).toBe(200);

    const convertedRows = await AppDataSource.query(
      `SELECT active, store_id FROM destination_listings WHERE id = $1`,
      [listingRes.body.id]
    );
    expect(convertedRows[0]).toEqual(expect.objectContaining({
      active: false,
      store_id: claimedStore.body.store.id,
    }));

    const approvedStoreRows = await AppDataSource.query(
      `SELECT open FROM stores WHERE id = $1`,
      [claimedStore.body.store.id]
    );
    expect(approvedStoreRows[0].open).toBe(true);

    const approvedStoreRequestRows = await AppDataSource.query(
      `SELECT status, reviewed_at FROM destination_store_requests WHERE store_id = $1 ORDER BY created_at ASC`,
      [claimedStore.body.store.id]
    );
    expect(approvedStoreRequestRows).toHaveLength(2);
    expect(approvedStoreRequestRows.every((row: any) => row.status === 'approved')).toBe(true);
    expect(approvedStoreRequestRows.every((row: any) => row.reviewed_at)).toBe(true);

    const validatedPublicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    expect(validatedPublicRes.status).toBe(200);
    expect(validatedPublicRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(false);

    const placePublicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}/hospitality/${placeRes.body.slug}`);
    expect(placePublicRes.status).toBe(200);
    expect(placePublicRes.body.listings.some((listing: any) => listing.id === listingRes.body.id)).toBe(false);
    expect(placePublicRes.body.stores.some((link: any) => link.store?.id === claimedStore.body.store.id)).toBe(true);
    const linkedStore = placePublicRes.body.stores.find((link: any) => link.store?.id === claimedStore.body.store.id)?.store;
    expect(linkedStore).toEqual(expect.objectContaining({
      id: claimedStore.body.store.id,
      slug: claimedStore.body.store.slug,
      name: listingRes.body.title,
    }));

    const secondPlacePublicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}/hospitality/${secondPlaceRes.body.slug}`);
    expect(secondPlacePublicRes.status).toBe(200);
    expect(secondPlacePublicRes.body.stores.some((link: any) => link.store?.id === claimedStore.body.store.id)).toBe(true);
  });

  it('rejects a destination listing store claim as one review and notifies the store owner', async () => {
    const suffix = `${Date.now()}-reject`;
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: `Destino Recusa ${suffix}`,
        slug: `destino-recusa-${suffix}`,
        city: 'São Bento do Sapucaí',
        state: 'SP',
      });
    expect(destinationRes.status).toBe(201);

    const placeRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        name: `Chalé Recusa ${suffix}`,
        slug: `chale-recusa-${suffix}`,
        type: 'CHALE',
        address: 'Estrada da recusa, 10',
      });
    expect(placeRes.status).toBe(201);

    const listingRes = await api
      .post('/api/admin/destination-listings')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId: destinationRes.body.id,
        title: `Serviço Recusa ${suffix}`,
        category: 'RESTAURANTE_VISITAR',
        whatsapp: '5512988888888',
        ctaType: 'WHATSAPP',
        ctaUrl: '5512988888888',
      });
    expect(listingRes.status).toBe(201);

    const claimedStore = await registerStore({
      storeName: listingRes.body.title,
      city: 'São Bento do Sapucaí',
      state: 'SP',
      acquisitionAttribution: {
        source: 'destination_listing_claim',
        destinationListingId: listingRes.body.id,
        destinationId: destinationRes.body.id,
        destinationSlug: destinationRes.body.slug,
        destinationName: destinationRes.body.name,
        listingTitle: listingRes.body.title,
        destinationDeliveryMode: 'selected',
        destinationHospitalityPlaceIds: [placeRes.body.id],
        destinationHospitalityPlaceNames: [placeRes.body.name],
      },
    });
    expect(claimedStore.res.status).toBe(201);

    const verificationCode = await findLatestStoreVerificationCode(claimedStore.email);
    const verifyRes = await api
      .post('/api/auth/verify-email')
      .send({ email: claimedStore.email, token: verificationCode });
    expect(verifyRes.status).toBe(200);

    const claimRows = await AppDataSource.query(
      `
        SELECT id, status
        FROM destination_partner_requests
        WHERE store_id = $1 AND claimed_listing_id = $2
      `,
      [claimedStore.body.store.id, listingRes.body.id]
    );
    expect(claimRows).toHaveLength(1);

    const rejectionRes = await api
      .patch(`/api/admin/destination-partner-requests/${claimRows[0].id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        status: 'rejected',
        reviewNote: 'Não foi possível confirmar a titularidade pelo contato oficial informado.',
      });
    expect(rejectionRes.status, JSON.stringify(rejectionRes.body)).toBe(200);
    expect(rejectionRes.body.status).toBe('rejected');

    const claimRejectionLogs = await waitForEmailLog('destination_store_claim_rejected', claimRows[0].id);
    expect(claimRejectionLogs.map((row: any) => String(row.to_email || '').toLowerCase())).toContain(claimedStore.email);

    const childRequestRows = await AppDataSource.query(
      `SELECT status, review_note, reviewed_at FROM destination_store_requests WHERE store_id = $1`,
      [claimedStore.body.store.id]
    );
    expect(childRequestRows).toHaveLength(1);
    expect(childRequestRows[0].status).toBe('rejected');
    expect(childRequestRows[0].reviewed_at).toBeTruthy();

    const listingRows = await AppDataSource.query(
      `SELECT active, store_id FROM destination_listings WHERE id = $1`,
      [listingRes.body.id]
    );
    expect(listingRows[0]).toEqual(expect.objectContaining({
      active: true,
      store_id: null,
    }));

    const blockedAdminLoginRes = await api
      .post('/api/auth/admin-login')
      .send({ identifier: claimedStore.email, password: claimedStore.password });
    expect(blockedAdminLoginRes.status).toBe(409);
    expect(blockedAdminLoginRes.body.code).toBe('AUTH-029');
  });

  it('associates an approved chale to the logged-in customer login (Fase 2a)', async () => {
    const suffix = Date.now();

    // 1. Cliente se registra, valida e-mail e loga.
    const customer = await registerCustomer({ fullName: 'Cliente Dono Chalé', termsAccepted: true, lgpdAccepted: true });
    await verifyEmailDirectly(customer.email);
    const customerLogin = await loginCustomer(customer.email, customer.password);
    expect(customerLogin.res.status, JSON.stringify(customerLogin.res.body)).toBe(200);
    expect(customerLogin.token).toBeTruthy();

    // 2. Cria um destino (admin).
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Vínculo ${suffix}`, slug: `destino-vinculo-${suffix}`, city: 'São Francisco Xavier', state: 'SP' });
    expect(destinationRes.status).toBe(201);

    // 3. Solicita o chalé LOGADO como cliente (Bearer do cliente).
    const requestRes = await api
      .post('/api/public/destination-partner-requests')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        destinationId: destinationRes.body.id,
        partnerType: 'HOSPITALITY',
        placeType: 'CHALE',
        name: `Chalé Vínculo ${suffix}`,
        responsibleName: 'Cliente Dono',
        responsibleEmail: customer.email,
        responsiblePhone: '11999999999',
        whatsapp: '11999999999',
        deliveryInstructions: 'Confirmar casa pelo WhatsApp.',
      });
    expect(requestRes.status).toBe(201);

    // 4. O pedido fica vinculado ao cliente.
    const reqRow = await AppDataSource.query(
      `SELECT user_id FROM destination_partner_requests WHERE id = $1`,
      [requestRes.body.id]
    );
    expect(reqRow[0].user_id).toBeTruthy();

    // 5. Aprova como admin.
    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.createdHospitalityPlaceId).toBeTruthy();
    expect(reviewRes.body.createdPartnerAccountId).toBeTruthy();

    // 6. A conta parceiro fica VINCULADA (user_id, ativa, sem senha própria).
    const accountRow = await AppDataSource.query(
      `SELECT user_id, status, password_hash FROM destination_partner_accounts WHERE id = $1`,
      [reviewRes.body.createdPartnerAccountId]
    );
    expect(accountRow[0].user_id).toBeTruthy();
    expect(accountRow[0].status).toBe('active');
    expect(accountRow[0].password_hash).toBeNull();

    // 7. O cliente entra no portal do parceiro com a MESMA senha de cliente.
    const partnerLoginRes = await api
      .post('/api/destination-partner/auth/login')
      .send({ email: customer.email, password: customer.password });
    expect(partnerLoginRes.status, JSON.stringify(partnerLoginRes.body)).toBe(200);
    expect(partnerLoginRes.body.token).toBeTruthy();
    expect(partnerLoginRes.body.partner).toBeTruthy();
    expect(partnerLoginRes.body.resources?.length).toBeGreaterThan(0);
  });

  it('creates a separate partner account when the customer declines to link (Fase 2a)', async () => {
    const suffix = Date.now();
    const customer = await registerCustomer({ fullName: 'Cliente Sem Vinculo', termsAccepted: true, lgpdAccepted: true });
    await verifyEmailDirectly(customer.email);
    const customerLogin = await loginCustomer(customer.email, customer.password);

    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Sem Vinculo ${suffix}`, slug: `destino-sem-vinculo-${suffix}`, city: 'São Francisco Xavier', state: 'SP' });

    // Recusa o vínculo e usa um e-mail DIFERENTE do cliente → conta separada.
    const otherEmail = testEmail('chale-separado');
    const requestRes = await api
      .post('/api/public/destination-partner-requests')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        destinationId: destinationRes.body.id,
        partnerType: 'HOSPITALITY',
        placeType: 'CHALE',
        name: `Chalé Separado ${suffix}`,
        responsibleName: 'Outro Responsável',
        responsibleEmail: otherEmail,
        responsiblePhone: '11999999999',
        whatsapp: '11999999999',
        linkToAccount: false,
      });
    expect(requestRes.status, JSON.stringify(requestRes.body)).toBe(201);

    // Pedido NÃO vinculado.
    const reqRow = await AppDataSource.query(
      `SELECT user_id FROM destination_partner_requests WHERE id = $1`,
      [requestRes.body.id]
    );
    expect(reqRow[0].user_id).toBeNull();

    // Aprova → conta parceira separada (legado: invited, sem user_id).
    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });
    expect(reviewRes.status).toBe(200);
    const accountRow = await AppDataSource.query(
      `SELECT user_id, status FROM destination_partner_accounts WHERE id = $1`,
      [reviewRes.body.createdPartnerAccountId]
    );
    expect(accountRow[0].user_id).toBeNull();
    expect(accountRow[0].status).toBe('invited');
  });

  it('rejects a separate account when the email already belongs to a customer (Fase 2a)', async () => {
    const suffix = Date.now();
    const customer = await registerCustomer({ fullName: 'Cliente Email Existente', termsAccepted: true, lgpdAccepted: true });
    await verifyEmailDirectly(customer.email);
    const customerLogin = await loginCustomer(customer.email, customer.password);

    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Email Existente ${suffix}`, slug: `destino-email-existente-${suffix}`, city: 'São Francisco Xavier', state: 'SP' });

    // Recusa o vínculo MAS usa o MESMO e-mail do cliente → rejeitado (não pode duplicar).
    const requestRes = await api
      .post('/api/public/destination-partner-requests')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        destinationId: destinationRes.body.id,
        partnerType: 'HOSPITALITY',
        placeType: 'CHALE',
        name: `Chalé Email Existente ${suffix}`,
        responsibleName: 'Mesmo Cliente',
        responsibleEmail: customer.email,
        responsiblePhone: '11999999999',
        whatsapp: '11999999999',
        linkToAccount: false,
      });
    expect(requestRes.status).toBe(409);
    expect(requestRes.body.code).toBe('DEST-014');
  });

  it('rejects an anonymous request when the email already belongs to a customer (Fase 2a)', async () => {
    const suffix = Date.now();
    const customer = await registerCustomer({ fullName: 'Cliente Anonimo Email', termsAccepted: true, lgpdAccepted: true });
    await verifyEmailDirectly(customer.email);

    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Anonimo ${suffix}`, slug: `destino-anonimo-${suffix}`, city: 'São Francisco Xavier', state: 'SP' });

    // Anônimo (sem Authorization) usando e-mail que já é de cliente → rejeitado.
    const requestRes = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'HOSPITALITY',
      placeType: 'CHALE',
      name: `Chalé Anonimo ${suffix}`,
      responsibleName: 'Outro',
      responsibleEmail: customer.email,
      responsiblePhone: '11999999999',
      whatsapp: '11999999999',
    });
    expect(requestRes.status).toBe(409);
    expect(requestRes.body.code).toBe('DEST-014');
  });

  it('links a SERVICE_PROVIDER (listing) to the logged-in customer login too (Fase 2a)', async () => {
    const suffix = Date.now();
    const customer = await registerCustomer({ fullName: 'Cliente Servico', termsAccepted: true, lgpdAccepted: true });
    await verifyEmailDirectly(customer.email);
    const customerLogin = await loginCustomer(customer.email, customer.password);

    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Servico Vinc ${suffix}`, slug: `destino-servico-vinc-${suffix}`, city: 'São Bento do Sapucaí', state: 'SP' });

    const requestRes = await api
      .post('/api/public/destination-partner-requests')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        destinationId: destinationRes.body.id,
        partnerType: 'SERVICE_PROVIDER',
        category: 'SERVICO',
        name: `Restaurante Vinc ${suffix}`,
        responsibleName: 'Cliente Dono',
        responsibleEmail: customer.email,
        responsiblePhone: '11999999999',
        whatsapp: '11999999999',
        description: 'Restaurante.',
        linkToAccount: true,
      });
    expect(requestRes.status, JSON.stringify(requestRes.body)).toBe(201);

    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });
    expect(reviewRes.status, JSON.stringify(reviewRes.body)).toBe(200);
    expect(reviewRes.body.createdPartnerAccountId).toBeTruthy();

    // Conta vinculada + ativa.
    const accountRow = await AppDataSource.query(
      `SELECT user_id, status FROM destination_partner_accounts WHERE id = $1`,
      [reviewRes.body.createdPartnerAccountId]
    );
    expect(accountRow[0].user_id).toBeTruthy();
    expect(accountRow[0].status).toBe('active');

    // Entra no portal com a senha de cliente e vê o serviço.
    const partnerLoginRes = await api
      .post('/api/destination-partner/auth/login')
      .send({ email: customer.email, password: customer.password });
    expect(partnerLoginRes.status).toBe(200);
    expect(partnerLoginRes.body.resources?.length).toBeGreaterThan(0);
  });

  it('reuses a legacy partner account when the customer later links with the same email (Fase 2a)', async () => {
    const suffix = Date.now();
    const legacyEmail = testEmail('chale-legado');

    // 1. Conta parceira LEGADA (anônima, com invite) — sem user_id.
    const destinationRes = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Legado ${suffix}`, slug: `destino-legado-${suffix}`, city: 'São Francisco Xavier', state: 'SP' });
    const legacyReq = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'HOSPITALITY',
      placeType: 'CHALE',
      name: `Chalé Legado ${suffix}`,
      responsibleName: 'Legado',
      responsibleEmail: legacyEmail,
      responsiblePhone: '11999999999',
      whatsapp: '11999999999',
    });
    expect(legacyReq.status).toBe(201);
    const legacyReview = await api
      .patch(`/api/admin/destination-partner-requests/${legacyReq.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });
    const legacyAccountId = legacyReview.body.createdPartnerAccountId;
    expect(legacyAccountId).toBeTruthy();
    const legacyRow = await AppDataSource.query(
      `SELECT user_id FROM destination_partner_accounts WHERE id = $1`,
      [legacyAccountId]
    );
    expect(legacyRow[0].user_id).toBeNull();

    // 2. Cliente criado com o MESMO e-mail da conta legada.
    //    (registerCustomer retorna o email gerado, então usamos legacyEmail direto.)
    const customer = await registerCustomer({ fullName: 'Cliente Legado', email: legacyEmail, termsAccepted: true, lgpdAccepted: true });
    await verifyEmailDirectly(legacyEmail);
    const customerLogin = await loginCustomer(legacyEmail, customer.password);
    expect(customerLogin.token).toBeTruthy();

    // 3. Solicita OUTRO chalé vinculado → a conta legada é reutilizada (byEmail) e vinculada.
    const dest2 = await api
      .post('/api/admin/destinations')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Destino Legado 2 ${suffix}`, slug: `destino-legado-2-${suffix}`, city: 'São Francisco Xavier', state: 'SP' });
    const linkReq = await api
      .post('/api/public/destination-partner-requests')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        destinationId: dest2.body.id,
        partnerType: 'HOSPITALITY',
        placeType: 'CHALE',
        name: `Chalé Vinc Legado ${suffix}`,
        responsibleName: 'Cliente',
        responsibleEmail: legacyEmail,
        responsiblePhone: '11999999999',
        whatsapp: '11999999999',
        linkToAccount: true,
      });
    expect(linkReq.status).toBe(201);

    await api
      .patch(`/api/admin/destination-partner-requests/${linkReq.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });

    // A conta reusada (mesmo email) agora tem user_id e não duplicou.
    const reusedRow = await AppDataSource.query(
      `SELECT user_id FROM destination_partner_accounts WHERE lower(email) = lower($1)`,
      [legacyEmail]
    );
    expect(reusedRow[0].user_id).toBeTruthy();
    const countRow = await AppDataSource.query(
      `SELECT count(*)::int AS n FROM destination_partner_accounts WHERE lower(email) = lower($1)`,
      [legacyEmail]
    );
    expect(countRow[0].n).toBe(1);
  });
});
