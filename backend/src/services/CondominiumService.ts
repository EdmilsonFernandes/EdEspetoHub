/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CondominiumService.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import bcrypt from 'bcryptjs';
import { resolvePlanFeatures } from '../config/planFeatures';
import { AppError } from '../errors/AppError';
import { CondominiumRepository } from '../repositories/CondominiumRepository';
import { saveBase64Image } from '../utils/imageStorage';
import { logger } from '../utils/logger';
import { EmailService } from './EmailService';
import { OrderReviewService } from './OrderReviewService';
import { SubscriptionService } from './SubscriptionService';

/**
 * Provides CondominiumService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-04-12
 */
export class CondominiumService {
  private condominiumRepository = new CondominiumRepository();
  private subscriptionService = new SubscriptionService();
  private orderReviewService = new OrderReviewService();
  private emailService = new EmailService();
  private log = logger.child({ scope: 'CondominiumService' });

  private async notifyAccessRequestByEmail(payload: {
    condominiumName: string;
    responsibleName: string;
    responsibleRole?: string | null;
    responsibleEmail: string;
    responsiblePhone?: string | null;
    city?: string | null;
    state?: string | null;
    requestId?: string;
  }) {
    try {
      await this.emailService.sendCondominiumAccessRequestNotification(payload);
    } catch (error) {
      this.log.error('Condominium access request notification failed', {
        condominiumName: payload.condominiumName,
        responsibleEmail: payload.responsibleEmail,
        requestId: payload.requestId || null,
        error,
      });
    }
  }

  async adminOverview() {
    const [condominiums, stores, pendingRequests, condominiumUsers, accessRequests] = await Promise.all([
      this.condominiumRepository.listAllForAdmin(),
      this.condominiumRepository.listAllStoresForAdmin(),
      this.condominiumRepository.listRequests(),
      this.condominiumRepository.listCondominiumUsers(),
      this.condominiumRepository.listAccessRequests(),
    ]);
    const condominiumIds = condominiums.map((condominium) => condominium.id);
    const [events, storeLinks] = await Promise.all([
      this.condominiumRepository.listEventsByCondominiumIds(condominiumIds, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      this.condominiumRepository.listStoreLinksByCondominiumIds(condominiumIds),
    ]);
    const eventsByCondominium = events.reduce((acc, event: any) => {
      const condominiumId = String(event?.condominiumId || '');
      if (!acc.has(condominiumId)) acc.set(condominiumId, []);
      acc.get(condominiumId)?.push(event);
      return acc;
    }, new Map<string, any[]>());
    const storeLinksByCondominium = storeLinks.reduce((acc, link: any) => {
      const condominiumId = String(link?.condominiumId || '');
      if (!acc.has(condominiumId)) acc.set(condominiumId, []);
      acc.get(condominiumId)?.push(link);
      return acc;
    }, new Map<string, any[]>());

    return {
      condominiums: condominiums.map((condominium) => ({
        ...this.toPublicCondominium(condominium, null),
        events: (eventsByCondominium.get(condominium.id) || []).map((event) => this.toPublicEvent(event)),
        approvedStores: (storeLinksByCondominium.get(condominium.id) || []).map((link: any) => this.toPublicStoreLink(link)),
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
      accessRequests: accessRequests.map((request) => this.toPublicAccessRequest(request)),
      condominiumUsers: condominiumUsers.map((user: any) => this.toPublicCondominiumUser(user)),
    };
  }

  async createAccessRequest(payload: any) {
    const condominiumName = String(payload?.condominiumName || payload?.name || '').trim();
    const responsibleName = String(payload?.responsibleName || '').trim();
    const responsibleEmail = String(payload?.responsibleEmail || '').trim().toLowerCase();
    const responsiblePhone = String(payload?.responsiblePhone || '').trim();
    if (!condominiumName || !responsibleName || !responsibleEmail || !responsiblePhone) {
      throw new AppError('CONDO-012', 400, { message: 'Condominio, responsavel, e-mail e WhatsApp sao obrigatorios.' });
    }
    const existing = await this.condominiumRepository.findPendingAccessRequestByEmailOrName(responsibleEmail, condominiumName);
    if (existing) {
      await this.notifyAccessRequestByEmail({
        condominiumName,
        responsibleName: existing.responsibleName || responsibleName,
        responsibleRole: existing.responsibleRole || payload?.responsibleRole || null,
        responsibleEmail,
        responsiblePhone: existing.responsiblePhone || responsiblePhone,
        city: existing.city || payload?.city || null,
        state: existing.state || payload?.state || null,
        requestId: existing.id,
      });
      return this.toPublicAccessRequest(existing);
    }

    const safeSlug = this.slugify(payload?.slug || condominiumName) || 'condominio';
    const uploadedLogo = await saveBase64Image(payload?.logoFile, `condominium-request-logo-${safeSlug}`, 'condominiums');
    const uploadedBanner = await saveBase64Image(payload?.bannerFile, `condominium-request-banner-${safeSlug}`, 'condominiums');
    const saved = await this.condominiumRepository.saveAccessRequest({
      condominiumName,
      slug: safeSlug,
      description: payload?.description || null,
      address: payload?.address || null,
      city: payload?.city || null,
      state: payload?.state || null,
      zipCode: payload?.zipCode || null,
      logoUrl: uploadedLogo || payload?.logoUrl || null,
      bannerUrl: uploadedBanner || payload?.bannerUrl || null,
      responsibleName,
      responsibleRole: payload?.responsibleRole || null,
      responsibleEmail,
      responsiblePhone,
      message: payload?.message || null,
      status: 'pending',
    });
    await this.notifyAccessRequestByEmail({
      condominiumName,
      responsibleName,
      responsibleRole: payload?.responsibleRole || null,
      responsibleEmail,
      responsiblePhone,
      city: payload?.city || null,
      state: payload?.state || null,
      requestId: saved.id,
    });
    return this.toPublicAccessRequest(saved);
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

  async adminUpdateCondominium(condominiumId: string, payload: any) {
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });

    const name = String(payload?.name || condominium.name || '').trim();
    const slugInput = String(payload?.slug || condominium.slug || this.slugify(name)).trim();
    if (!name || !slugInput) throw new AppError('CONDO-002', 400, { message: 'Nome e slug sao obrigatorios.' });

    const safeSlug = this.slugify(slugInput || name) || 'condominio';
    const uploadedLogo = await saveBase64Image(payload?.logoFile, `condominium-logo-${safeSlug}`, 'condominiums');
    const uploadedBanner = await saveBase64Image(payload?.bannerFile, `condominium-banner-${safeSlug}`, 'condominiums');
    const saved = await this.condominiumRepository.saveCondominium({
      ...condominium,
      name,
      slug: this.slugify(slugInput),
      description: payload?.description ?? condominium.description ?? null,
      address: payload?.address ?? condominium.address ?? null,
      city: payload?.city ?? condominium.city ?? null,
      state: payload?.state ?? condominium.state ?? null,
      zipCode: payload?.zipCode ?? condominium.zipCode ?? null,
      logoUrl: uploadedLogo || payload?.logoUrl || condominium.logoUrl || null,
      bannerUrl: uploadedBanner || payload?.bannerUrl || condominium.bannerUrl || null,
      active: payload?.active !== false,
    });
    return this.toPublicCondominium(saved, null);
  }

  async adminDeactivateCondominium(condominiumId: string) {
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    await this.condominiumRepository.deactivateCondominium(condominiumId);
    return { ok: true };
  }

  async adminCreateCondominiumUser(condominiumId: string, payload: any) {
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });

    const name = String(payload?.name || `Responsavel ${condominium.name}`).trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '').trim();
    if (!name || !email || !password) {
      throw new AppError('CONDO-011', 400, { message: 'Nome, usuario/e-mail e senha sao obrigatorios.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await this.condominiumRepository.findCondominiumUserByEmail(email);
    const saved = await this.condominiumRepository.saveCondominiumUser({
      ...(existing || {}),
      condominiumId,
      name,
      email,
      passwordHash,
      role: 'CONDOMINIUM_ADMIN',
      active: true,
    });
    let credentialsEmailSent = false;
    try {
      await this.emailService.sendCondominiumAccessCredentials({
        email,
        responsibleName: name,
        condominiumName: condominium.name,
        username: email,
        temporaryPassword: password,
      });
      credentialsEmailSent = true;
    } catch {
      credentialsEmailSent = false;
    }

    return {
      ...this.toPublicCondominiumUser({ ...saved, condominium }),
      temporaryPassword: password,
      credentialsEmailSent,
    };
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
    this.log.info('Creating condominium agenda event', {
      condominiumId,
      title,
      rawStartsAt: payload?.startsAt || null,
      rawEndsAt: payload?.endsAt || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    const sameDayEvent = await this.condominiumRepository.findSameDayEventForCondominium(condominiumId, startsAt);
    if (sameDayEvent) {
      this.log.warn('Condominium agenda create blocked by same-day event', {
        condominiumId,
        startsAt: startsAt.toISOString(),
        sameDayEventId: sameDayEvent.id,
      });
      throw new AppError('CONDO-009', 400, { message: 'Ja existe uma feira cadastrada para esse condominio nesse dia.' });
    }
    const conflictingEvent = await this.condominiumRepository.findOverlappingEventForCondominium(condominiumId, startsAt, endsAt);
    if (conflictingEvent) {
      this.log.warn('Condominium agenda create blocked by overlapping event', {
        condominiumId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        conflictingEventId: conflictingEvent.id,
      });
      throw new AppError('CONDO-008', 400, { message: 'Ja existe uma feira ativa nesse horario para o condominio.' });
    }
    const uploadedBanner = await saveBase64Image(
      payload?.bannerFile,
      this.buildEventBannerKey(condominium.slug || condominium.name || condominiumId, startsAt),
      'condominiums'
    );
    try {
      const event = await this.condominiumRepository.saveEvent({
        condominiumId,
        title,
        startsAt,
        endsAt,
        status: String(payload?.status || 'scheduled').trim() || 'scheduled',
        pickupLocation: this.normalizeOptionalText(payload?.pickupLocation),
        bannerUrl: uploadedBanner || this.normalizeOptionalText(payload?.bannerUrl),
        bannerTitle: this.normalizeOptionalText(payload?.bannerTitle),
        bannerDescription: this.normalizeOptionalText(payload?.bannerDescription),
        notes: this.normalizeOptionalText(payload?.notes),
        active: payload?.active !== false,
      });
      this.log.info('Condominium agenda event created', {
        eventId: event.id,
        condominiumId,
        startsAt: startsAt.toISOString(),
        hasBanner: Boolean(event.bannerUrl),
      });
      return this.toPublicEvent(event);
    } catch (error: any) {
      if (this.isAgendaStartConstraintError(error)) {
        this.log.warn('Condominium agenda create blocked by start-time unique constraint', {
          condominiumId,
          startsAt: startsAt.toISOString(),
          error,
        });
        throw new AppError('CONDO-009', 400, { message: 'Ja existe uma feira cadastrada para esse condominio nesse horario.' });
      }
      throw error;
    }
  }

  async adminUpdateEvent(eventId: string, payload: any) {
    const event = await this.condominiumRepository.findEventById(eventId);
    if (!event) throw new AppError('CONDO-007', 404, { message: 'Feira nao encontrada.' });

    const title = String(payload?.title || event.title || '').trim();
    const startsAt = new Date(payload?.startsAt || event.startsAt);
    const endsAt = new Date(payload?.endsAt || event.endsAt);
    if (!title || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new AppError('CONDO-003', 400, { message: 'Informe titulo, inicio e fim validos para a feira.' });
    }
    this.log.info('Updating condominium agenda event', {
      eventId,
      condominiumId: event.condominiumId,
      title,
      rawStartsAt: payload?.startsAt || null,
      rawEndsAt: payload?.endsAt || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    const sameDayEvent = await this.condominiumRepository.findSameDayEventForCondominium(event.condominiumId, startsAt, eventId);
    if (sameDayEvent) {
      this.log.warn('Condominium agenda update blocked by same-day event', {
        eventId,
        condominiumId: event.condominiumId,
        startsAt: startsAt.toISOString(),
        sameDayEventId: sameDayEvent.id,
      });
      throw new AppError('CONDO-009', 400, { message: 'Ja existe outra feira cadastrada para esse condominio nesse dia.' });
    }
    const conflictingEvent = await this.condominiumRepository.findOverlappingEventForCondominium(event.condominiumId, startsAt, endsAt, eventId);
    if (conflictingEvent) {
      this.log.warn('Condominium agenda update blocked by overlapping event', {
        eventId,
        condominiumId: event.condominiumId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        conflictingEventId: conflictingEvent.id,
      });
      throw new AppError('CONDO-008', 400, { message: 'Ja existe outra feira ativa nesse horario para o condominio.' });
    }
    const uploadedBanner = await saveBase64Image(
      payload?.bannerFile,
      this.buildEventBannerKey(event.condominium?.slug || event.condominiumId, startsAt, eventId),
      'condominiums'
    );

    try {
      const saved = await this.condominiumRepository.saveEvent({
        ...event,
        title,
        startsAt,
        endsAt,
        status: String(payload?.status || event.status || 'scheduled').trim() || 'scheduled',
        pickupLocation:
          payload?.pickupLocation !== undefined
            ? this.normalizeOptionalText(payload?.pickupLocation)
            : event.pickupLocation ?? null,
        bannerUrl:
          uploadedBanner ||
          (payload?.bannerUrl !== undefined || payload?.bannerFile !== undefined
            ? this.normalizeOptionalText(payload?.bannerUrl)
            : event.bannerUrl ?? null),
        bannerTitle:
          payload?.bannerTitle !== undefined
            ? this.normalizeOptionalText(payload?.bannerTitle)
            : event.bannerTitle ?? null,
        bannerDescription:
          payload?.bannerDescription !== undefined
            ? this.normalizeOptionalText(payload?.bannerDescription)
            : event.bannerDescription ?? null,
        notes: payload?.notes !== undefined ? this.normalizeOptionalText(payload?.notes) : event.notes ?? null,
        active: payload?.active !== false,
      });
      const refreshed = await this.condominiumRepository.findEventById(saved.id);
      this.log.info('Condominium agenda event updated', {
        eventId,
        condominiumId: event.condominiumId,
        startsAt: startsAt.toISOString(),
        hasBanner: Boolean((refreshed || saved).bannerUrl),
      });
      return this.toPublicEvent(refreshed || saved);
    } catch (error: any) {
      if (this.isAgendaStartConstraintError(error)) {
        this.log.warn('Condominium agenda update blocked by start-time unique constraint', {
          eventId,
          condominiumId: event.condominiumId,
          startsAt: startsAt.toISOString(),
          error,
        });
        throw new AppError('CONDO-009', 400, { message: 'Ja existe outra feira cadastrada para esse condominio nesse horario.' });
      }
      throw error;
    }
  }

  async adminDeactivateEvent(eventId: string) {
    const event = await this.condominiumRepository.findEventById(eventId);
    if (!event) throw new AppError('CONDO-007', 404, { message: 'Feira nao encontrada.' });
    await this.condominiumRepository.deactivateEvent(eventId);
    return { ok: true };
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

  async adminUpdateStoreSettings(condominiumId: string, storeId: string, payload: any) {
    const condominium = await this.condominiumRepository.findById(condominiumId);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });

    await this.condominiumRepository.updateStoreCondominiumSettings(condominiumId, storeId, {
      allowPickupAtStall: payload?.allowPickupAtStall,
      allowApartmentDelivery: payload?.allowApartmentDelivery,
      apartmentDeliveryFee:
        payload?.apartmentDeliveryFee === '' || payload?.apartmentDeliveryFee === null || payload?.apartmentDeliveryFee === undefined
          ? null
          : Number(payload.apartmentDeliveryFee),
    });

    const links = await this.condominiumRepository.listStoreLinksByCondominiumId(condominiumId);
    const updated = links.find((link: any) => link.storeId === storeId);
    if (!updated) throw new AppError('CONDO-010', 404, { message: 'Vinculo da loja com o condominio nao encontrado.' });
    return this.toPublicStoreLink(updated);
  }

  async adminReviewRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.condominiumRepository.findRequestById(requestId);
    if (!request) throw new AppError('CONDO-004', 404, { message: 'Solicitacao nao encontrada.' });
    const status = String(payload?.status || '').trim().toLowerCase();
    if (![ 'pending', 'approved', 'rejected', 'blocked', 'cancelled' ].includes(status)) {
      throw new AppError('CONDO-005', 400, { message: 'Status de revisao invalido.' });
    }
    request.status = status;
    request.reviewNote = payload?.reviewNote || null;
    request.reviewedBy = status === 'pending' ? null : reviewedBy || null;
    request.reviewedAt = status === 'pending' ? null : new Date();
    const saved = await this.condominiumRepository.saveRequest(request);
    if (status === 'approved') {
      await this.condominiumRepository.upsertStoreCondominium(request.condominiumId, request.storeId, true);
    } else {
      await this.condominiumRepository.upsertStoreCondominium(request.condominiumId, request.storeId, false);
    }
    return this.toPublicRequest(saved);
  }

  async adminReviewAccessRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.condominiumRepository.findAccessRequestById(requestId);
    if (!request) throw new AppError('CONDO-013', 404, { message: 'Solicitacao de condominio nao encontrada.' });
    const status = String(payload?.status || '').trim().toLowerCase();
    if (![ 'pending', 'approved', 'rejected', 'cancelled' ].includes(status)) {
      throw new AppError('CONDO-005', 400, { message: 'Status de revisao invalido.' });
    }

    let createdCondominiumId = request.createdCondominiumId || null;
    if (status === 'approved' && !createdCondominiumId) {
      const condominium = await this.adminCreateCondominium({
        name: request.condominiumName,
        slug: request.slug || this.slugify(request.condominiumName),
        description: request.description,
        address: request.address,
        city: request.city,
        state: request.state,
        zipCode: request.zipCode,
        logoUrl: request.logoUrl,
        bannerUrl: request.bannerUrl,
        active: true,
      });
      createdCondominiumId = condominium.id;
    }

    const saved = await this.condominiumRepository.saveAccessRequest({
      ...request,
      status,
      reviewNote: payload?.reviewNote || null,
      reviewedBy: status === 'pending' ? null : reviewedBy || null,
      reviewedAt: status === 'pending' ? null : new Date(),
      createdCondominiumId,
    });
    const refreshed = await this.condominiumRepository.findAccessRequestById(saved.id);
    return this.toPublicAccessRequest(refreshed || saved);
  }

  async organizerOverview(condominiumId?: string) {
    const safeCondominiumId = String(condominiumId || '').trim();
    if (!safeCondominiumId) throw new AppError('AUTH-003', 403);

    const condominium = await this.condominiumRepository.findById(safeCondominiumId);
    if (!condominium || condominium.active === false) {
      throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    }

    const [events, approvedStores, requests, stores] = await Promise.all([
      this.condominiumRepository.listEventsByCondominiumId(safeCondominiumId, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      this.condominiumRepository.listStoreLinksByCondominiumId(safeCondominiumId),
      this.condominiumRepository.listRequests(undefined, undefined, safeCondominiumId),
      this.condominiumRepository.listAllStoresForAdmin(),
    ]);

    const approvedStoreIds = new Set(approvedStores.map((link: any) => String(link.storeId || '')));
    const invitedStoreIds = new Set(
      events.flatMap((event: any) =>
        (Array.isArray(event?.storeLinks) ? event.storeLinks : [])
          .filter((link: any) => String(link?.status || '').toLowerCase() === 'invited')
          .map((link: any) => String(link.storeId || link.store?.id || ''))
      )
    );

    return {
      condominium: this.toPublicCondominium(condominium, this.pickCurrentOrNextEvent(events) || null),
      events: events.map((event) => this.toPublicEvent(event)),
      approvedStores: approvedStores.map((link: any) => this.toPublicStoreLink(link)),
      requests: requests.map((request) => this.toPublicRequest(request)),
      stores: stores.map((store: any) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        logoUrl: store.settings?.logoUrl || null,
        bannerUrl: store.settings?.bannerUrl || null,
        segment: store.settings?.segment || 'outros',
        city: store.settings?.city || null,
        state: store.settings?.state || null,
        condominiumStatus: approvedStoreIds.has(String(store.id))
          ? 'approved'
          : invitedStoreIds.has(String(store.id))
            ? 'invited'
            : 'available',
      })),
    };
  }

  async organizerUpdateCondominium(condominiumId: string | undefined, payload: any) {
    const safeCondominiumId = String(condominiumId || '').trim();
    if (!safeCondominiumId) throw new AppError('AUTH-003', 403);
    return this.adminUpdateCondominium(safeCondominiumId, payload);
  }

  async organizerCreateEvent(condominiumId: string | undefined, payload: any) {
    const safeCondominiumId = String(condominiumId || '').trim();
    if (!safeCondominiumId) throw new AppError('AUTH-003', 403);
    return this.adminCreateEvent(safeCondominiumId, payload);
  }

  async organizerUpdateEvent(condominiumId: string | undefined, eventId: string, payload: any) {
    await this.assertEventBelongsToCondominium(eventId, condominiumId);
    return this.adminUpdateEvent(eventId, payload);
  }

  async organizerDeactivateEvent(condominiumId: string | undefined, eventId: string) {
    await this.assertEventBelongsToCondominium(eventId, condominiumId);
    return this.adminDeactivateEvent(eventId);
  }

  async organizerInviteStoreToEvent(condominiumId: string | undefined, eventId: string, storeId: string, invitedBy?: string, inviteNote?: string) {
    await this.assertEventBelongsToCondominium(eventId, condominiumId);
    const safeStoreId = String(storeId || '').trim();
    if (!safeStoreId) throw new AppError('CONDO-006', 400, { message: 'Loja obrigatoria.' });

    await this.condominiumRepository.upsertEventStore(eventId, safeStoreId, {
      status: 'invited',
      active: false,
      invitedBy: invitedBy || null,
      inviteNote: inviteNote || null,
    });

    return { ok: true };
  }

  async organizerConfirmStoreInEvent(condominiumId: string | undefined, eventId: string, storeId: string) {
    const event = await this.assertEventBelongsToCondominium(eventId, condominiumId);
    const safeStoreId = String(storeId || '').trim();
    if (!safeStoreId) throw new AppError('CONDO-006', 400, { message: 'Loja obrigatoria.' });
    await this.condominiumRepository.upsertStoreCondominium(event.condominiumId, safeStoreId, true);
    await this.condominiumRepository.upsertEventStore(eventId, safeStoreId, {
      status: 'confirmed',
      active: true,
    });
    return { ok: true };
  }

  async organizerUpdateStoreSettings(condominiumId: string | undefined, storeId: string, payload: any) {
    const safeCondominiumId = String(condominiumId || '').trim();
    if (!safeCondominiumId) throw new AppError('AUTH-003', 403);
    return this.adminUpdateStoreSettings(safeCondominiumId, storeId, payload);
  }

  async organizerRemoveStore(condominiumId: string | undefined, storeId: string) {
    const safeCondominiumId = String(condominiumId || '').trim();
    const safeStoreId = String(storeId || '').trim();
    if (!safeCondominiumId) throw new AppError('AUTH-003', 403);
    if (!safeStoreId) throw new AppError('CONDO-006', 400, { message: 'Loja obrigatoria.' });

    await this.condominiumRepository.deactivateStoreCondominium(safeCondominiumId, safeStoreId);

    const request = await this.condominiumRepository.findRequestByStoreAndCondominium(safeStoreId, safeCondominiumId);
    if (request && [ 'pending', 'approved' ].includes(String(request.status || '').toLowerCase())) {
      request.status = 'cancelled';
      request.reviewNote = 'Removido pelo condominio.';
      request.reviewedAt = new Date();
      await this.condominiumRepository.saveRequest(request);
    }

    return { ok: true };
  }

  async organizerReviewRequest(condominiumId: string | undefined, requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.condominiumRepository.findRequestById(requestId);
    if (!request) throw new AppError('CONDO-004', 404, { message: 'Solicitacao nao encontrada.' });
    if (String(request.condominiumId || '') !== String(condominiumId || '')) {
      throw new AppError('AUTH-003', 403);
    }
    return this.adminReviewRequest(requestId, payload, reviewedBy);
  }

  private async assertEventBelongsToCondominium(eventId: string, condominiumId?: string) {
    const safeCondominiumId = String(condominiumId || '').trim();
    if (!safeCondominiumId) throw new AppError('AUTH-003', 403);
    const event = await this.condominiumRepository.findEventById(String(eventId || ''));
    if (!event) throw new AppError('CONDO-007', 404, { message: 'Feira nao encontrada.' });
    if (String(event.condominiumId || '') !== safeCondominiumId) {
      throw new AppError('AUTH-003', 403);
    }
    return event;
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-04-12
   */
  async listPublic() {
    const rows = await this.condominiumRepository.listActive();
    const summaries = await this.condominiumRepository.getEventSummaryByCondominiumIds(rows.map((condominium) => condominium.id));
    this.log.info('Listing public condominiums for hub', {
      count: rows.length,
      liveOrUpcomingWithBanner: rows.filter((condominium) => {
        const event = summaries.get(condominium.id);
        return Boolean(event?.bannerUrl);
      }).length,
    });
    return rows.map((condominium) => this.toPublicCondominium(condominium, summaries.get(condominium.id) || null));
  }

  /**
   * Gets one public condominium by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-04-12
   */
  async getPublicBySlug(slug: string) {
    const condominium = await this.condominiumRepository.findActiveBySlug(slug);
    if (!condominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    const events = await this.condominiumRepository.listActiveEventsBySlug(slug);
    const selectedEvent = this.pickCurrentOrNextEvent(events) || null;
    this.log.info('Loaded public condominium detail', {
      slug,
      condominiumId: condominium.id,
      eventId: selectedEvent?.id || null,
      eventState: selectedEvent ? this.getEventState(selectedEvent) : 'none',
      hasAgendaBanner: Boolean(selectedEvent?.bannerUrl),
    });
    return this.toPublicCondominium(condominium, selectedEvent);
  }

  /**
   * Lists public stores linked to one active condominium.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-04-12
   */
  async listPublicStoresBySlug(slug: string) {
    const events = await this.condominiumRepository.listActiveEventsBySlug(slug);
    const selectedEvent = this.pickCurrentOrNextEvent(events);
    const eventLinks = selectedEvent ? await this.condominiumRepository.listActiveStoreLinksByEventId(selectedEvent.id) : [];
    const condominiumLinks = await this.condominiumRepository.listActiveStoreLinksBySlug(slug);
    const condominiumLinkByStoreId = new Map(
      condominiumLinks.map((link: any) => [ String(link?.storeId || link?.store?.id || ''), link ])
    );
    const links = eventLinks.length > 0 ? eventLinks : condominiumLinks;
    const firstCondominium = (links[0] as any)?.condominium || selectedEvent?.condominium || await this.condominiumRepository.findActiveBySlug(slug);
    if (!firstCondominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });
    const eventState = selectedEvent ? this.getEventState(selectedEvent) : 'none';
    const canOrderInCondominium = eventState === 'live';
    const storeIds = Array.from(new Set(
      links
        .map((link: any) => String(link?.store?.id || ''))
        .filter(Boolean)
    ));
    const [subscriptionsByStoreId, reviewSummariesByStoreId] = await Promise.all([
      this.subscriptionService.getCurrentByStoreIds(storeIds),
      this.orderReviewService.publicSummariesByStoreIds(storeIds),
    ]);
    const publicSelectedEvent = selectedEvent
      ? {
          ...this.toPublicEvent(selectedEvent),
          canOrderInCondominium,
        }
      : null;
    this.log.info('Loaded public condominium stores by slug', {
      slug,
      eventId: selectedEvent?.id || null,
      eventState: selectedEvent ? this.getEventState(selectedEvent) : 'none',
      hasAgendaBanner: Boolean(selectedEvent?.bannerUrl),
      eventStoreCount: eventLinks.length,
      condominiumStoreCount: condominiumLinks.length,
    });

    const stores = await Promise.all(
      links.map(async (link) => {
        const store = link.store;
        if (!store) return null;

        const subscription = subscriptionsByStoreId.get(String(store.id || '')) || null;
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
        const supportsStoreDelivery = orderTypes.some((type) => String(type || '').toLowerCase() === 'delivery');
        const baseCondominiumLink = condominiumLinkByStoreId.get(String(store.id || '')) || null;
        const ruleLink = baseCondominiumLink || link;
        const allowPickupAtStall = (ruleLink as any)?.allowPickupAtStall !== false;
        const allowApartmentDelivery =
          (link as any).allowApartmentDelivery === true ||
          (baseCondominiumLink as any)?.allowApartmentDelivery === true ||
          (Boolean(selectedEvent) && supportsStoreDelivery);
        const apartmentDeliveryFee =
          (link as any).apartmentDeliveryFee != null
            ? Number((link as any).apartmentDeliveryFee)
            : (baseCondominiumLink as any)?.apartmentDeliveryFee != null
              ? Number((baseCondominiumLink as any).apartmentDeliveryFee)
              : null;

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
            schedule: Array.isArray((ruleLink as any)?.schedule) ? (ruleLink as any).schedule : [],
            pickupInstructions: (ruleLink as any)?.pickupInstructions || null,
            allowPickupAtStall,
            allowApartmentDelivery,
            apartmentDeliveryFee,
            notes: (ruleLink as any)?.notes || null,
          },
          condominiumEvent: publicSelectedEvent,
          reviewSummary: reviewSummariesByStoreId.get(String(store.id || '')) || {
            totalReviews: 0,
            avgStoreRating: 0,
            totalDeliveryReviews: 0,
            avgDeliveryRating: 0,
          },
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
      event: publicSelectedEvent,
      stores: stores.filter(Boolean),
    };
  }

  /**
   * Serializes condominium public payload.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
    const sorted = [...events].sort((left, right) => {
      const stateRank = (event: any) => {
        const state = this.getEventState(event);
        const hasStores = this.getActiveStoreCount(event) > 0;
        if (state === 'live' && hasStores) return 0;
        if (state === 'live') return 1;
        if (state === 'upcoming' && hasStores) return 2;
        if (state === 'upcoming') return 3;
        if (hasStores) return 4;
        return 5;
      };

      const rankDelta = stateRank(left) - stateRank(right);
      if (rankDelta !== 0) return rankDelta;
      return new Date(left?.startsAt || 0).getTime() - new Date(right?.startsAt || 0).getTime();
    });
    return sorted[0] || null;
  }

  private getActiveStoreCount(event: any) {
    const storeLinks = Array.isArray(event?.storeLinks) ? event.storeLinks : [];
    return storeLinks.filter((link: any) => link?.active !== false && link?.store).length;
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
      bannerUrl: event.bannerUrl || null,
      bannerTitle: event.bannerTitle || null,
      bannerDescription: event.bannerDescription || null,
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
          status: link.status || 'confirmed',
        })),
      storeInvitations: storeLinks
        .filter((link: any) => link?.store && String(link?.status || '').toLowerCase() === 'invited')
        .map((link: any) => ({
          id: link.id,
          storeId: link.storeId || link.store.id,
          storeName: link.store.name,
          storeSlug: link.store.slug,
          logoUrl: link.store.settings?.logoUrl || null,
          inviteNote: link.inviteNote || null,
          status: link.status || 'invited',
          createdAt: link.createdAt instanceof Date ? link.createdAt.toISOString() : link.createdAt,
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

  private toPublicAccessRequest(request: any) {
    return {
      id: request.id,
      condominiumName: request.condominiumName,
      slug: request.slug || null,
      description: request.description || null,
      address: request.address || null,
      city: request.city || null,
      state: request.state || null,
      zipCode: request.zipCode || null,
      logoUrl: request.logoUrl || null,
      bannerUrl: request.bannerUrl || null,
      responsibleName: request.responsibleName,
      responsibleRole: request.responsibleRole || null,
      responsibleEmail: request.responsibleEmail,
      responsiblePhone: request.responsiblePhone || null,
      message: request.message || null,
      status: request.status || 'pending',
      reviewNote: request.reviewNote || null,
      createdCondominiumId: request.createdCondominiumId || null,
      createdCondominium: request.createdCondominium ? this.toPublicCondominium(request.createdCondominium, null) : null,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt,
      reviewedAt: request.reviewedAt instanceof Date ? request.reviewedAt.toISOString() : request.reviewedAt || null,
    };
  }

  private toPublicCondominiumUser(user: any) {
    return {
      id: user.id,
      condominiumId: user.condominiumId,
      name: user.name,
      email: user.email,
      role: user.role || 'CONDOMINIUM_ADMIN',
      active: user.active !== false,
      lastLoginAt: user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt || null,
      condominium: user.condominium ? this.toPublicCondominium(user.condominium, null) : null,
    };
  }

  private toPublicStoreLink(link: any) {
    return {
      id: link.id,
      storeId: link.storeId,
      condominiumId: link.condominiumId,
      active: link.active !== false,
      allowPickupAtStall: link.allowPickupAtStall !== false,
      allowApartmentDelivery: link.allowApartmentDelivery === true,
      apartmentDeliveryFee: link.apartmentDeliveryFee != null ? Number(link.apartmentDeliveryFee) : null,
      store: link.store
        ? {
            id: link.store.id,
            name: link.store.name,
            slug: link.store.slug,
            logoUrl: link.store.settings?.logoUrl || null,
            bannerUrl: link.store.settings?.bannerUrl || null,
          }
        : null,
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

  private normalizeOptionalText(value: unknown) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized || null;
  }

  private buildEventBannerKey(condominiumSlugOrName: string, startsAt: Date, eventId?: string) {
    const safeCondominium = this.slugify(condominiumSlugOrName) || 'condominio';
    const safeStart = startsAt.toISOString().replace(/[^0-9]/g, '').slice(0, 12) || Date.now().toString();
    const safeEvent = this.slugify(eventId || '') || 'agenda';
    return `condominium-event-banner-${safeCondominium}-${safeEvent}-${safeStart}`;
  }

  private isAgendaStartConstraintError(error: any) {
    const constraint = String(error?.constraint || '');
    return String(error?.code || '') === '23505' && constraint === 'uq_condominium_events_condominium_start';
  }
}
