import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env';
import { AppDataSource } from '../../config/database';
import { activateSubscription, api, loginAdmin, registerStore, testEmail, verifyEmailDirectly } from '../helpers';

const superAdminToken = () => jwt.sign({ sub: '00000000-0000-0000-0000-000000000001', role: 'SUPER_ADMIN' }, env.jwtSecret);

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
        whatsapp: '5512999999999',
      });

    expect(listingRes.status, JSON.stringify(listingRes.body)).toBe(201);
    expect([...listingRes.body.hospitalityPlaceIds].sort()).toEqual([firstPlaceRes.body.id, secondPlaceRes.body.id].sort());
    expect(listingRes.body.hospitalityPlaces.map((place: any) => place.id).sort()).toEqual([
      firstPlaceRes.body.id,
      secondPlaceRes.body.id,
    ].sort());

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

    const requestRes = await api.post('/api/public/destination-partner-requests').send({
      destinationId: destinationRes.body.id,
      partnerType: 'HOSPITALITY',
      placeType: 'POUSADA',
      name: `Pousada Sol ${suffix}`,
      responsibleName: 'Maria Responsável',
      responsibleEmail: testEmail('destino-parceiro'),
      responsiblePhone: '11999999999',
      whatsapp: '11999999999',
      deliveryInstructions: 'Confirmar casa pelo WhatsApp.',
    });

    expect(requestRes.status).toBe(201);
    expect(requestRes.body.status).toBe('pending');

    const reviewRes = await api
      .patch(`/api/admin/destination-partner-requests/${requestRes.body.id}/review`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'approved' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe('approved');
    expect(reviewRes.body.createdHospitalityPlaceId).toBeTruthy();

    const publicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    expect(publicRes.status).toBe(200);
    expect(
      publicRes.body.hospitalityPlaces.some((place: any) => place.id === reviewRes.body.createdHospitalityPlaceId)
    ).toBe(true);
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

  it('keeps a claimed destination listing pending until admin validation links the store', async () => {
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
        destinationHospitalityPlaceIds: [placeRes.body.id],
        destinationHospitalityPlaceNames: [placeRes.body.name],
      },
    });

    expect(claimedStore.res.status).toBe(201);
    const attributionRows = await AppDataSource.query(
      `SELECT acquisition_attribution FROM store_settings WHERE store_id = $1`,
      [claimedStore.body.store.id]
    );
    expect(attributionRows[0]?.acquisition_attribution).toEqual(expect.objectContaining({
      source: 'destination_listing_claim',
      destinationListingId: listingRes.body.id,
      destinationDeliveryMode: 'selected',
      destinationHospitalityPlaceIds: [placeRes.body.id],
      destinationHospitalityPlaceNames: [placeRes.body.name],
    }));

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
      .patch(`/api/admin/destination-listings/${listingRes.body.id}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ storeId: claimedStore.body.store.id });

    expect(validationRes.status).toBe(200);
    expect(validationRes.body.storeId).toBe(claimedStore.body.store.id);
    expect(validationRes.body.store).toEqual(expect.objectContaining({
      id: claimedStore.body.store.id,
      slug: claimedStore.body.store.slug,
    }));

    const validatedPublicRes = await api.get(`/api/public/destinations/${destinationRes.body.slug}`);
    expect(validatedPublicRes.status).toBe(200);
    const validatedListing = validatedPublicRes.body.listings.find((listing: any) => listing.id === listingRes.body.id);
    expect(validatedListing).toEqual(expect.objectContaining({
      storeId: claimedStore.body.store.id,
    }));
    expect(validatedListing.store).toEqual(expect.objectContaining({
      id: claimedStore.body.store.id,
      slug: claimedStore.body.store.slug,
      name: listingRes.body.title,
    }));
  });
});
