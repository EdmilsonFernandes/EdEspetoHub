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
    return {
      id: event.id,
      title: event.title,
      status: event.status || 'scheduled',
      state: this.getEventState(event),
      startsAt: event.startsAt instanceof Date ? event.startsAt.toISOString() : event.startsAt,
      endsAt: event.endsAt instanceof Date ? event.endsAt.toISOString() : event.endsAt,
      pickupLocation: event.pickupLocation || null,
      notes: event.notes || null,
    };
  }
}
