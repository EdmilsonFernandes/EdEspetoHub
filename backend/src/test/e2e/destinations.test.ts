import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env';
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

    const placeRes = await api
      .post('/api/admin/hospitality-places')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        destinationId,
        name: `Chalé Real ${suffix}`,
        slug: `chale-real-${suffix}`,
        type: 'CHALE',
        address: 'Estrada do teste, 10',
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
        ctaType: 'WHATSAPP',
        ctaUrl: '5511999999999',
      });

    expect(listingRes.status).toBe(201);
    expect(listingRes.body.category).toBe('PASSEIO');

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
    expect(placePublicRes.body.stores.some((entry: any) => entry.store?.slug === storeSlug)).toBe(true);
    expect(placePublicRes.body.listings.some((entry: any) => entry.title === listingRes.body.title)).toBe(true);

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
      },
    });

    expect(claimedStore.res.status).toBe(201);

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
