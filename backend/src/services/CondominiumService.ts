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
    return rows.map((condominium) => this.toPublicCondominium(condominium));
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
    return this.toPublicCondominium(condominium);
  }

  /**
   * Lists public stores linked to one active condominium.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  async listPublicStoresBySlug(slug: string) {
    const links = await this.condominiumRepository.listActiveStoreLinksBySlug(slug);
    const firstCondominium = links[0]?.condominium || await this.condominiumRepository.findActiveBySlug(slug);
    if (!firstCondominium) throw new AppError('CONDO-001', 404, { message: 'Condominio nao encontrado.' });

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
            schedule: Array.isArray(link.schedule) ? link.schedule : [],
            pickupInstructions: link.pickupInstructions || null,
            allowPickupAtStall: link.allowPickupAtStall !== false,
            allowApartmentDelivery: Boolean(link.allowApartmentDelivery),
            apartmentDeliveryFee: link.apartmentDeliveryFee != null ? Number(link.apartmentDeliveryFee) : null,
            notes: link.notes || null,
          },
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
      condominium: this.toPublicCondominium(firstCondominium),
      stores: stores.filter(Boolean),
    };
  }

  /**
   * Serializes condominium public payload.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  private toPublicCondominium(condominium: any) {
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
    };
  }
}
