/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CondominiumService.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { resolvePlanFeatures } from '../config/planFeatures';
import { AppError } from '../errors/AppError';
import { CondominiumRepository } from '../repositories/CondominiumRepository';
import { saveBase64Image } from '../utils/imageStorage';
import { OrderReviewService } from './OrderReviewService';
import { SubscriptionService } from './SubscriptionService';

/**
 * Provides CondominiumService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-04-12
 */
export class CondominiumService {
  private condominiumRepository = new CondominiumRepository();
  private subscriptionService = new SubscriptionService();
  private orderReviewService = new OrderReviewService();

  async adminOverview() {
    const [condominiums, stores, pendingRequests] = await Promise.all([
      this.condominiumRepository.listAllForAdmin(),
      this.condominiumRepository.listAllStoresForAdmin(),
      this.condominiumRepository.listRequests(),
    ]);

    const eventGroups = await Promise.all(
      condominiums.map(async (condominium) => ({
        condominiumId: condominium.id,
        events: await this.condominiumRepository.listEventsByCondominiumId(condominium.id, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      }))
    );
    const eventsByCondominium = new Map(eventGroups.map((group) => [group.condominiumId, group.events]));

    return {
      condominiums: condominiums.map((condominium) => ({
        ...this.toPublicCondominium(condominium, null),
        events: (eventsByCondominium.get(condominium.id) || []).map((event) => this.toPublicEvent(event)),
      })),
      stores: stores.map((store: any) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        logoUrl: store.settings?.logoUrl || null,
        bannerUrl: store.settings?.bannerUrl || null,
        segment: store.settings?.segment || 'outros',
        city: store.settings?.city || null,
        state: store.settings?.state || null,
      })),
      requests: pendingRequests.map((request) => this.toPublicRequest(request)),
    };
  }

  async adminCreateCondominium(payload: any) {
    const name = String(payload?.name || '').trim();
    const slug = String(payload?.slug || this.slugify(name)).trim();
    if (!name || !slug) throw new AppError('CONDO-002', 400, { message: 'Nome e slug sao obrigatorios.' });
    const safeSlug = this.slugify(slug || name) || 'condominio';
    const uploadedLogo = await saveBase64Image(payload?.logoFile, `condominium-logo-${safeSlug}`, 'condominiums');
    const uploadedBanner = await saveBase64Image(payload?.bannerFile, `condominium-banner-${safeSlug}`, 'condominiums');
    const condominium = await this.condominiumRepository.saveCondominium({
      name,
      slug,
      description: payload?.description || null,
      address: payload?.address || null,
      city: payload?.city || null,
      state: payload?.state || null,
      zipCode: payload?.zipCode || null,
      logoUrl: uploadedLogo || payload?.logoUrl || null,
      bannerUrl: uploadedBanner || payload?.bannerUrl || null,
      active: payload?.active !== false,
    });
    return this.toPublicCondominium(condominium, null);
  }

  async adminCreateEvent(condominiumId: string, payload: any) {
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    const title = String(payload?.title || `Feira do ${condominium.name}`).trim();
    const startsAt = new Date(payload?.startsAt);
    const endsAt = new Date(payload?.endsAt);
    if (!title || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new AppError('CONDO-003', 400, { message: 'Informe titulo, inicio e fim validos para a feira.' });
    }
    const event = await this.condominiumRepository.saveEvent({
      condominiumId,
      title,
      startsAt,
      endsAt,
      status: String(payload?.status || 'scheduled').trim() || 'scheduled',
      pickupLocation: payload?.pickupLocation || null,
      notes: payload?.notes || null,
      active: payload?.active !== false,
    });
    return this.toPublicEvent(event);
  }

  async adminApproveStore(condominiumId: string, storeId: string) {
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    await this.condominiumRepository.upsertStoreCondominium(condominiumId, storeId, true);
    return { ok: true };
  }

  async adminAddStoreToEvent(eventId: string, storeId: string) {
    await this.condominiumRepository.upsertEventStore(eventId, storeId);
    return { ok: true };
  }

  async adminReviewRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.condominiumRepository.findRequestById(requestId);
    if (!request) throw new AppError('CONDO-004', 404, { message: 'Solicitacao nao encontrada.' });
    const status = String(payload?.status || '').trim().toLowerCase();
    if (![ 'approved', 'rejected', 'blocked' ].includes(status)) {
      throw new AppError('CONDO-005', 400, { message: 'Status de revisao invalido.' });
    }
    request.status = status;
    request.reviewNote = payload?.reviewNote || null;
    request.reviewedBy = reviewedBy || null;
    request.reviewedAt = new Date();
    const saved = await this.condominiumRepository.saveRequest(request);
    if (status === 'approved') {
      await this.condominiumRepository.upsertStoreCondominium(request.condominiumId, request.storeId, true);
    }
    return this.toPublicRequest(saved);
  }

  async listStoreCondominiumOptions(storeId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const [condominiums, requests, links] = await Promise.all([
      this.condominiumRepository.listActive(),
      this.condominiumRepository.listRequests(undefined, storeId),
      this.condominiumRepository.listStoreLinksByStoreId(storeId),
    ]);
    const summaries = await this.condominiumRepository.getEventSummaryByCondominiumIds(condominiums.map((condominium) => condominium.id));
    const requestByCondominium = new Map(requests.map((request) => [request.condominiumId, request]));
    const linkByCondominium = new Map(links.map((link) => [link.condominiumId, link]));
    return condominiums.map((condominium) => {
      const link = linkByCondominium.get(condominium.id);
      const request = requestByCondominium.get(condominium.id);
      return {
        condominium: this.toPublicCondominium(condominium, summaries.get(condominium.id) || null),
        status: link?.active ? 'approved' : request?.status || 'available',
        request: request ? this.toPublicRequest(request) : null,
      };
    });
  }

  async createStoreRequest(storeId: string, payload: any, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const condominiumId = String(payload?.condominiumId || '').trim();
    if (!condominiumId) throw new AppError('CONDO-006', 400, { message: 'Condominio obrigatorio.' });
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium || condominium.active === false) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    const existing = await this.condominiumRepository.findRequestByStoreAndCondominium(storeId, condominiumId);
    if (existing && [ 'pending', 'approved' ].includes(String(existing.status || '').toLowerCase())) {
      return this.toPublicRequest(existing);
    }
    const request = existing || {
      storeId,
      condominiumId,
    };
    const saved = await this.condominiumRepository.saveRequest({
      ...request,
      status: 'pending',
      message: payload?.message || null,
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    });
    return this.toPublicRequest(saved);
  }

  async removeStoreCondominium(storeId: string, condominiumId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    if (!storeId || !condominiumId) throw new AppError('CONDO-006', 400, { message: 'Loja e condominio sao obrigatorios.' });

    await this.condominiumRepository.deactivateStoreCondominium(condominiumId, storeId);

    const request = await this.condominiumRepository.findRequestByStoreAndCondominium(storeId, condominiumId);
    if (request && [ 'pending', 'approved' ].includes(String(request.status || '').toLowerCase())) {
      request.status = 'cancelled';
      request.reviewNote = 'Cancelado pela loja.';
      request.reviewedAt = new Date();
      await this.condominiumRepository.saveRequest(request);
    }

    return { ok: true };
  }

  /**
   * Lists active condominiums for public Hub discovery.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  async listPublic() {
    const rows = await this.condominiumRepository.listActive();
    const summaries = await this.condominiumRepository.getEventSummaryByCondominiumIds(rows.map((row) => row.id));
    return rows.map((condominium) => this.toPublicCondominium(condominium, summaries.get(condominium.id) || null));
  }

  /**
   * Gets one public condominium by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  async getPublicBySlug(slug: string) {
    const condominium = await this.condominiumRepository.findActiveBySlug(slug);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    const events = await this.condominiumRepository.listActiveEventsBySlug(slug);
    return this.toPublicCondominium(condominium, events[0] || null);
  }

  /**
   * Lists public stores linked to one active condominium.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  async listPublicStoresBySlug(slug: string) {
    const events = await this.condominiumRepository.listActiveEventsBySlug(slug);
    const selectedEvent = this.pickCurrentOrNextEvent(events);
    const eventLinks = selectedEvent ? await this.condominiumRepository.listActiveStoreLinksByEventId(selectedEvent.id) : [];
    const links = eventLinks.length > 0 ? eventLinks : await this.condominiumRepository.listActiveStoreLinksBySlug(slug);
    const firstCondominium = (links[0] as any)?.condominium || selectedEvent?.condominium || await this.condominiumRepository.findActiveBySlug(slug);
    if (!firstCondominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    const eventState = selectedEvent ? this.getEventState(selectedEvent) : 'none';
    const canOrderInCondominium = eventState === 'live';

    const stores = await Promise.all(
      links.map(async (link) => {
        const store = link.store;
        if (!store) return null;

        const subscription = await this.subscriptionService.getCurrentByStore(store.id);
        const isVip = Boolean(store?.settings?.planExempt);
        const isActive = isVip || this.subscriptionService.isActiveSubscription(subscription);
        if (!isActive) return null;

        const features = resolvePlanFeatures({
          planName: subscription?.plan?.name,
          planExempt: Boolean(store.settings?.planExempt),
          subscriptionStatus: subscription?.status,
        });
        const baseOrderTypes = Array.isArray(store.settings?.orderTypes) && store.settings.orderTypes.length > 0
          ? store.settings.orderTypes
          : [ 'delivery', 'pickup', 'table' ];
        const orderTypes = features.deliveryMode
          ? baseOrderTypes
          : baseOrderTypes.filter((type) => String(type || '').toLowerCase() !== 'delivery');

        return {
          id: store.id,
          name: store.name,
          slug: store.slug,
          open: store.open,
          condominium: {
            id: firstCondominium.id,
            name: firstCondominium.name,
            slug: firstCondominium.slug,
          },
          condominiumLink: {
            schedule: Array.isArray((link as any).schedule) ? (link as any).schedule : [],
            pickupInstructions: (link as any).pickupInstructions || null,
            allowPickupAtStall: (link as any).allowPickupAtStall !== false,
            allowApartmentDelivery: Boolean((link as any).allowApartmentDelivery),
            apartmentDeliveryFee: (link as any).apartmentDeliveryFee != null ? Number((link as any).apartmentDeliveryFee) : null,
            notes: link.notes || null,
          },
          condominiumEvent: selectedEvent
            ? {
                ...this.toPublicEvent(selectedEvent),
                canOrderInCondominium,
              }
            : null,
          reviewSummary: await this.orderReviewService.publicSummaryByStoreId(store.id),
          settings: store.settings
            ? {
                logoUrl: store.settings.logoUrl || null,
                bannerUrl: store.settings.bannerUrl || null,
                description: store.settings.description || null,
                address: store.settings.address || null,
                openingHours: Array.isArray(store.settings.openingHours) ? store.settings.openingHours : [],
                primaryColor: store.settings.primaryColor || null,
                secondaryColor: store.settings.secondaryColor || null,
                segment: store.settings.segment || 'outros',
                city: store.settings.city || null,
                state: store.settings.state || null,
                isOrderingEnabled: store.settings.isOrderingEnabled !== false,
                orderTypes,
                postalEnabled: Boolean(store.settings.postalEnabled),
              }
            : null,
        };
      })
    );

    return {
      condominium: this.toPublicCondominium(firstCondominium, selectedEvent || null),
      event: selectedEvent
        ? {
            ...this.toPublicEvent(selectedEvent),
            canOrderInCondominium,
          }
        : null,
      stores: stores.filter(Boolean),
    };
  }

  /**
   * Serializes condominium public payload.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  private toPublicCondominium(condominium: any, event?: any | null) {
    return {
      id: condominium.id,
      name: condominium.name,
      slug: condominium.slug,
      description: condominium.description || null,
      address: condominium.address || null,
      city: condominium.city || null,
      state: condominium.state || null,
      zipCode: condominium.zipCode || null,
      lat: condominium.lat != null ? Number(condominium.lat) : null,
      lng: condominium.lng != null ? Number(condominium.lng) : null,
      logoUrl: condominium.logoUrl || null,
      bannerUrl: condominium.bannerUrl || null,
      active: condominium.active !== false,
      eventSummary: event ? this.toPublicEvent(event) : null,
    };
  }

  private pickCurrentOrNextEvent(events: any[]) {
    if (!Array.isArray(events) || events.length === 0) return null;
    const live = events.find((event) => this.getEventState(event) === 'live');
    return live || events[0] || null;
  }

  private getEventState(event: any) {
    const now = Date.now();
    const startsAt = new Date(event.startsAt).getTime();
    const endsAt = new Date(event.endsAt).getTime();
    if (Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt <= now && endsAt >= now) return 'live';
    if (Number.isFinite(startsAt) && startsAt > now) return 'upcoming';
    return 'finished';
  }

  private toPublicEvent(event: any) {
    const storeLinks = Array.isArray(event?.storeLinks) ? event.storeLinks : [];
    return {
      id: event.id,
      title: event.title,
      status: event.status || 'scheduled',
      state: this.getEventState(event),
      startsAt: event.startsAt instanceof Date ? event.startsAt.toISOString() : event.startsAt,
      endsAt: event.endsAt instanceof Date ? event.endsAt.toISOString() : event.endsAt,
      pickupLocation: event.pickupLocation || null,
      notes: event.notes || null,
      stores: storeLinks
        .filter((link: any) => link?.active !== false && link?.store)
        .map((link: any) => ({
          id: link.store.id,
          name: link.store.name,
          slug: link.store.slug,
          logoUrl: link.store.settings?.logoUrl || null,
          bannerUrl: link.store.settings?.bannerUrl || null,
          segment: link.store.settings?.segment || null,
        })),
    };
  }

  private toPublicRequest(request: any) {
    return {
      id: request.id,
      status: request.status,
      message: request.message || null,
      reviewNote: request.reviewNote || null,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt,
      reviewedAt: request.reviewedAt instanceof Date ? request.reviewedAt.toISOString() : request.reviewedAt || null,
      store: request.store
        ? {
            id: request.store.id,
            name: request.store.name,
            slug: request.store.slug,
            logoUrl: request.store.settings?.logoUrl || null,
            bannerUrl: request.store.settings?.bannerUrl || null,
          }
        : null,
      condominium: request.condominium ? this.toPublicCondominium(request.condominium, null) : null,
      storeId: request.storeId,
      condominiumId: request.condominiumId,
    };
  }

  private slugify(value: string) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
