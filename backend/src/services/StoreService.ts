/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: StoreService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { AppDataSource } from '../config/database';
import { CreateStoreDto } from '../dto/CreateStoreDto';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { SubscriptionService } from './SubscriptionService';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { StoreLinkHit } from '../entities/StoreLinkHit';
import { EntityManager } from 'typeorm';
import { saveBase64Image } from '../utils/imageStorage';
import { sanitizeSocialLinks } from '../utils/socialLinks';
import { AppError } from '../errors/AppError';
import { getStoreSegmentPreset, sanitizeStoreSegment } from '../utils/storeSegment';
import { resolvePlanFeatures } from '../config/planFeatures';
import { env } from '../config/env';
import { logger } from '../utils/logger';
/**
 * Provides StoreService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class StoreService
{
  private subscriptionService = new SubscriptionService();
  private storeRepository = AppDataSource.getRepository(Store);
  private log = logger.child({ scope: 'StoreService' });
    /**
   * Executes parse number business logic.
   *
   * @author Edmilson Lopes
   */
private parseNumber(value?: any): number | null | undefined
  {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const raw = value.toString().trim();
    if (!raw) return null;
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }
    /**
   * Executes normalize pix key business logic.
   *
   * @author Edmilson Lopes
   */
private normalizePixKey(value?: string)
  {
    if (!value) return undefined;
    const trimmed = value.toString().trim();
    if (!trimmed) return undefined;
    if (/[@\\/]/.test(trimmed)) return trimmed;
    if (trimmed.startsWith('+')) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return trimmed;
    if (digits.length === 11 || digits.length === 14) return digits;
    if (digits.startsWith('55')) return `+${digits}`;
    if (digits.startsWith('0'))
    {
      const stripped = digits.replace(/^0+/, '');
      if (!stripped) return trimmed;
      return `+55${stripped}`;
    }
    if (digits.length > 11) return `+${digits}`;
    return trimmed;
  }
    /**
   * Executes normalize banner position business logic.
   *
   * @author Edmilson Lopes
   */
private normalizeBannerPosition(value?: string | null): 'center' | 'top' {
    return String(value || '').toLowerCase() === 'top' ? 'top' : 'center';
  }

    /**
   * Executes normalize postal zip business logic.
   *
   * @author Edmilson Lopes
   */
private normalizePostalZip(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const digits = String(value).replace(/\D/g, '').slice(0, 8);
    return digits || null;
  }

  private normalizeCity(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  private normalizeState(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = String(value).trim().toUpperCase();
    if (!trimmed) return null;
    return trimmed.slice(0, 2);
  }

  private parseCoordinate(value?: any): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const parsed = Number(String(value).replace(',', '.').trim());
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

private normalizeDeliveryRadiusKm(value: any, acceptsDelivery: boolean, fallbackValue?: number | null): number | null {
    if (!acceptsDelivery) return null;
    const defaultRadiusKm = Number(env.delivery.defaultRadiusKm || 5);
    const minRadiusKm = Number(env.delivery.minRadiusKm || 1);
    const maxRadiusKm = Number(env.delivery.maxRadiusKm || 30);
    const parsed = this.parseNumber(value);
    const resolved =
      parsed === undefined
        ? (fallbackValue ?? defaultRadiusKm)
        : (parsed === null ? defaultRadiusKm : parsed);
    if (!Number.isFinite(Number(resolved))) {
      return defaultRadiusKm;
    }
    const numeric = Number(resolved);
    if (numeric < minRadiusKm || numeric > maxRadiusKm) {
      throw new AppError('GEN-002', 400, {
        message: `O raio de entrega deve estar entre ${minRadiusKm} km e ${maxRadiusKm} km.`,
      });
    }
    return numeric;
  }

  private normalizeAddressForGeocode(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parts = raw
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !/^cep\b/i.test(part))
      .filter((part) => !/^[A-Za-zÀ-ÿ\s.'-]+\s*-\s*[A-Z]{2}$/i.test(part));
    return (parts.length ? parts : [ raw ]).join(', ').replace(/\s+/g, ' ').trim();
  }

  private assertLocationFields(payload: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
  }) {
    const address = this.normalizeAddressForGeocode(payload.address);
    const city = this.normalizeCity(payload.city);
    const state = this.normalizeState(payload.state);
    if (!address || !city || !state || state.length !== 2) {
      throw new AppError('STORE-003', 400, {
        required: [ 'address', 'city', 'state' ],
      });
    }
  }

  private assertResolvedCoordinates(lat?: number | null, lng?: number | null) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      throw new AppError('STORE-004', 400);
    }
  }

  private buildGeocodeAddress(payload: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    fallbackAddress?: string | null;
  }) {
    const address =
      this.normalizeAddressForGeocode(payload.address) ||
      this.normalizeAddressForGeocode(payload.fallbackAddress);
    const city = this.normalizeCity(payload.city) || '';
    const state = this.normalizeState(payload.state) || '';
    const parts = [address, city, state].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const normalizedAddress = String(address || '').trim();
    if (!normalizedAddress) return null;
    try {
      const response = await fetch(`${env.etaV2.mapsBaseUrl}/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: normalizedAddress }),
      });
      if (!response.ok) {
        this.log.warn('Store geocode failed', { address: normalizedAddress, status: response.status });
        return null;
      }
      const payload = (await response.json()) as { lat?: number; lng?: number };
      const lat = Number(payload?.lat);
      const lng = Number(payload?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch (error) {
      this.log.warn('Store geocode exception', { address: normalizedAddress, error });
      return null;
    }
  }

  public async ensureStoreCoordinates(store: Store) {
    if (!store?.id || !store?.settings) return store;
    const currentLat = this.parseCoordinate(store.settings.lat);
    const currentLng = this.parseCoordinate(store.settings.lng);
    if (Number.isFinite(Number(currentLat)) && Number.isFinite(Number(currentLng))) {
      return store;
    }
    const address = this.buildGeocodeAddress({
      address: store.settings.address,
      city: store.settings.city,
      state: store.settings.state,
      fallbackAddress: store.owner?.address,
    });
    if (!address) return store;
    const geo = await this.geocodeAddress(address);
    if (!geo) return store;
    store.settings.lat = geo.lat;
    store.settings.lng = geo.lng;
    await this.storeRepository.save(store);
    return store;
  }

  public async backfillMissingStoreCoordinates(limit = 50) {
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(200, Number(limit))) : 50;
    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.settings', 'settings')
      .leftJoinAndSelect('store.owner', 'owner')
      .where('settings.lat IS NULL OR settings.lng IS NULL')
      .orderBy('store.createdAt', 'ASC')
      .limit(safeLimit)
      .getMany();

    let updated = 0;
    let failed = 0;
    for (const store of stores) {
      try {
        const next = await this.ensureStoreCoordinates(store);
        const lat = this.parseCoordinate(next?.settings?.lat);
        const lng = this.parseCoordinate(next?.settings?.lng);
        if (lat !== null && lng !== null) {
          updated += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        this.log.warn('Store coordinate backfill failed', { storeId: store.id, slug: store.slug, error });
      }
    }

    return {
      total: stores.length,
      updated,
      failed,
    };
  }

  /* =========================
   * CREATE STORE
   * ========================= */
  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async create(input: CreateStoreDto)
  {
    return AppDataSource.transaction(async (manager) =>
    {
      const userRepo = manager.getRepository(User);
      const storeRepo = manager.getRepository(Store);

      // 1️⃣ Owner
      const owner = await userRepo.findOne({ where: { id: input.ownerId } });
      if (!owner)
      {
        throw new AppError('STORE-002', 404);
      }

      // 2️⃣ Slug único
      const slug = await this.generateUniqueSlug(
        input.slug ?? input.name,
        manager
      );

      const logoUrl = await saveBase64Image(input.logoFile, `store-${input.ownerId}`);
      const bannerUrl = await saveBase64Image(input.bannerFile, `store-banner-${input.ownerId}`);
      const trimmedBannerUrl = input.bannerUrl?.toString().trim();

      const socialLinks = sanitizeSocialLinks(input.socialLinks);
      const segment = sanitizeStoreSegment(input.segment);
      const segmentPreset = getStoreSegmentPreset(segment);
      const requestedOrderTypes = Array.isArray(input.orderTypes) && input.orderTypes.length
        ? input.orderTypes
        : segmentPreset.orderTypes;
      const supportsDelivery = requestedOrderTypes.some((type) => String(type || '').toLowerCase() === 'delivery');
      const deliveryRadiusKm = this.normalizeDeliveryRadiusKm(input.deliveryRadiusKm, supportsDelivery);
      const deliveryFee = this.parseNumber(input.deliveryFee);
      const orderNotificationSound = input.orderNotificationSound?.toString().trim() || null;
      const trimmedAddress = input.address?.toString().trim();
      const trimmedCity = this.normalizeCity(input.city) || null;
      const trimmedState = this.normalizeState(input.state) || null;
      const bannerPosition = this.normalizeBannerPosition(input.bannerPosition);
      const postalOriginZip = this.normalizePostalZip(input.postalOriginZip);
      const postalEnabled = Boolean(input.postalEnabled) && Boolean(postalOriginZip);
      this.assertLocationFields({
        address: trimmedAddress || owner.address || null,
        city: trimmedCity,
        state: trimmedState,
      });
      const requestedLat = this.parseCoordinate(input.lat);
      const requestedLng = this.parseCoordinate(input.lng);
      let resolvedLat = Number.isFinite(Number(requestedLat)) ? Number(requestedLat) : null;
      let resolvedLng = Number.isFinite(Number(requestedLng)) ? Number(requestedLng) : null;
      if (resolvedLat === null || resolvedLng === null) {
        const geocoded = await this.geocodeAddress(
          this.buildGeocodeAddress({
            address: trimmedAddress,
            city: trimmedCity,
            state: trimmedState,
            fallbackAddress: owner.address,
          })
        );
        if (geocoded) {
          resolvedLat = geocoded.lat;
          resolvedLng = geocoded.lng;
        }
      }
      this.assertResolvedCoordinates(resolvedLat, resolvedLng);

      // 3️⃣ Settings
      const normalizedPix = this.normalizePixKey(input.pixKey);
      const trimmedEmail = input.contactEmail?.toString().trim();
      const settings = manager.create(StoreSettings, {
        logoUrl: logoUrl || input.logoUrl,
        bannerUrl: bannerUrl || trimmedBannerUrl || null,
        bannerPosition,
        description: input.description,
        address: trimmedAddress || owner.address || null,
        city: trimmedCity || null,
        state: trimmedState || null,
        lat: resolvedLat,
        lng: resolvedLng,
        primaryColor: input.primaryColor || segmentPreset.primaryColor,
        secondaryColor: input.secondaryColor || segmentPreset.secondaryColor,
        pixKey: normalizedPix ?? null,
        contactEmail: trimmedEmail || null,
        promoMessage: input.promoMessage?.toString().trim() || null,
        isOrderingEnabled: input.isOrderingEnabled !== false,
        segment,
        deliveryRadiusKm: deliveryRadiusKm ?? null,
        deliveryFee: deliveryFee ?? null,
        orderNotificationSound,
        postalEnabled,
        postalOriginZip: postalOriginZip ?? null,
        socialLinks,
        openingHours: input.openingHours ?? [],
        orderTypes: requestedOrderTypes,
      });

      // 4️⃣ Store
      const store = storeRepo.create({
        name: input.name,
        slug,
        owner,
        settings,
      });

      if (trimmedAddress && owner.address !== trimmedAddress) {
        owner.address = trimmedAddress;
        await userRepo.save(owner);
      }

      return storeRepo.save(store);
    });
  }

  /**
   * Lists all.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async listAll() {
    return this.storeRepository.find({ relations: [ 'settings', 'owner' ] });
  }

  /* =========================
   * UPDATE STORE
   * ========================= */
  /**
   * Executes update logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async update(storeId: string, data: Partial<CreateStoreDto>)
  {
    return AppDataSource.transaction(async (manager) =>
    {
      const storeRepo = manager.getRepository(Store);

      const store = await storeRepo.findOne({
        where: { id: storeId },
        relations: [ 'settings', 'owner' ],
      });

      if (!store)
      {
        throw new AppError('STORE-001', 404);
      }

      // 🧠 REGRA DE NOME / SLUG
      // Slug nao deve ser alterado fora da criacao da loja.
      if (data.name)
      {
        store.name = data.name;
      }

      // 🧠 SETTINGS (garantia)
      if (!store.settings)
      {
        store.settings = manager.create(StoreSettings);
      }

      const nextSegment = data.segment !== undefined
        ? sanitizeStoreSegment(data.segment)
        : sanitizeStoreSegment(store.settings.segment);
      const segmentPreset = getStoreSegmentPreset(nextSegment);

      const uploadedLogo = await saveBase64Image(data.logoFile, `store-${store.id}`);
      const uploadedBanner = await saveBase64Image(data.bannerFile, `store-banner-${store.id}`);

      store.settings.logoUrl =
        uploadedLogo ?? data.logoUrl ?? store.settings.logoUrl;

      if (data.bannerFile !== undefined || data.bannerUrl !== undefined) {
        const trimmedBannerUrl = data.bannerUrl?.toString().trim();
        store.settings.bannerUrl = uploadedBanner ?? trimmedBannerUrl ?? null;
      }
      if (data.bannerPosition !== undefined)
      {
        store.settings.bannerPosition = this.normalizeBannerPosition(data.bannerPosition);
      }

      store.settings.description =
        data.description ?? store.settings.description;

      store.settings.primaryColor =
        data.primaryColor ?? store.settings.primaryColor ?? segmentPreset.primaryColor;

      store.settings.secondaryColor =
        data.secondaryColor ?? store.settings.secondaryColor ?? segmentPreset.secondaryColor;

      store.settings.segment = nextSegment;

      if (data.pixKey !== undefined)
      {
        const normalizedPix = this.normalizePixKey(data.pixKey);
        store.settings.pixKey = normalizedPix ?? null;
      }
      if (data.contactEmail !== undefined)
      {
        const trimmedEmail = data.contactEmail?.toString().trim();
        store.settings.contactEmail = trimmedEmail || null;
      }
      if (data.promoMessage !== undefined)
      {
        const trimmedMessage = data.promoMessage?.toString().trim();
        store.settings.promoMessage = trimmedMessage || null;
      }
      if (data.isOrderingEnabled !== undefined)
      {
        store.settings.isOrderingEnabled = Boolean(data.isOrderingEnabled);
      }
      if (data.deliveryFee !== undefined)
      {
        store.settings.deliveryFee = this.parseNumber(data.deliveryFee) ?? null;
      }
      if (data.orderNotificationSound !== undefined)
      {
        const trimmedSound = data.orderNotificationSound?.toString().trim();
        store.settings.orderNotificationSound = trimmedSound || null;
      }
      if (data.postalOriginZip !== undefined)
      {
        store.settings.postalOriginZip = this.normalizePostalZip(data.postalOriginZip) ?? null;
      }
      if (data.postalEnabled !== undefined)
      {
        const nextPostalEnabled = Boolean(data.postalEnabled);
        store.settings.postalEnabled = nextPostalEnabled && Boolean(store.settings.postalOriginZip);
      } else if (store.settings.postalEnabled && !store.settings.postalOriginZip) {
        store.settings.postalEnabled = false;
      }
      if (data.prepBaseMinutes !== undefined)
      {
        const parsed = Number(data.prepBaseMinutes);
        store.settings.prepBaseMinutes = Number.isFinite(parsed) ? Math.max(5, Math.round(parsed)) : null;
      }
      if (data.prepAttentionMinutes !== undefined)
      {
        const parsed = Number(data.prepAttentionMinutes);
        store.settings.prepAttentionMinutes = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : null;
      }

      if (data.socialLinks)
      {
        store.settings.socialLinks = sanitizeSocialLinks(data.socialLinks);
      }

      if (data.openingHours)
      {
        store.settings.openingHours = data.openingHours;
      }

      if (data.orderTypes)
      {
        const subscription = await this.subscriptionService.getCurrentByStore(store.id);
        const features = resolvePlanFeatures({
          planName: subscription?.plan?.name,
          planExempt: Boolean(store.settings?.planExempt),
          subscriptionStatus: subscription?.status,
        });
        const nextTypes = Array.isArray(data.orderTypes) ? data.orderTypes : [];
        if (!features.deliveryMode && nextTypes.includes('delivery')) {
          throw new AppError('AUTH-003', 403, { requiredFeature: 'deliveryMode' });
        }
        store.settings.orderTypes = nextTypes;
      } else if (!Array.isArray(store.settings.orderTypes) || !store.settings.orderTypes.length) {
        store.settings.orderTypes = segmentPreset.orderTypes;
      }

      const effectiveOrderTypes = Array.isArray(store.settings.orderTypes) ? store.settings.orderTypes : [];
      const supportsDelivery = effectiveOrderTypes.some((type: string) => String(type || '').toLowerCase() === 'delivery');
      store.settings.deliveryRadiusKm = this.normalizeDeliveryRadiusKm(
        data.deliveryRadiusKm,
        supportsDelivery,
        this.parseNumber(store.settings.deliveryRadiusKm) ?? null
      );

      let ownerNeedsSave = false;
      if (store.owner && data.storePhone !== undefined) {
        const trimmedPhone = data.storePhone?.toString().trim();
        store.owner.phone = trimmedPhone || undefined;
        ownerNeedsSave = true;
      }
      if (data.address !== undefined && store.owner)
      {
        const trimmedAddress = data.address?.toString().trim();
        store.settings.address = trimmedAddress || null;
        store.owner.address = trimmedAddress || undefined;
        ownerNeedsSave = true;
      }
      if (ownerNeedsSave && store.owner) {
        const userRepo = manager.getRepository(User);
        await userRepo.save(store.owner);
      }
      if (data.city !== undefined)
      {
        const trimmedCity = this.normalizeCity(data.city);
        store.settings.city = trimmedCity || null;
      }
      if (data.state !== undefined)
      {
        const trimmedState = this.normalizeState(data.state);
        store.settings.state = trimmedState || null;
      }

      this.assertLocationFields({
        address: store.settings.address || store.owner?.address || null,
        city: store.settings.city,
        state: store.settings.state,
      });

      const nextLat = this.parseCoordinate(data.lat);
      const nextLng = this.parseCoordinate(data.lng);
      const shouldRefreshCoordinates =
        data.address !== undefined ||
        data.city !== undefined ||
        data.state !== undefined ||
        data.lat !== undefined ||
        data.lng !== undefined;

      if (data.lat !== undefined) {
        store.settings.lat = Number.isFinite(Number(nextLat)) ? Number(nextLat) : null;
      }
      if (data.lng !== undefined) {
        store.settings.lng = Number.isFinite(Number(nextLng)) ? Number(nextLng) : null;
      }
      if (shouldRefreshCoordinates) {
        if (data.lat === undefined || data.lng === undefined) {
          const geocoded = await this.geocodeAddress(
            this.buildGeocodeAddress({
              address: store.settings.address,
              city: store.settings.city,
              state: store.settings.state,
              fallbackAddress: store.owner?.address,
            })
          );
          if (geocoded) {
            if (data.lat === undefined) store.settings.lat = geocoded.lat;
            if (data.lng === undefined) store.settings.lng = geocoded.lng;
          }
        }
        this.assertResolvedCoordinates(store.settings.lat as number | null, store.settings.lng as number | null);
      }

      return storeRepo.save(store);
    });
  }

  /* =========================
   * OPEN / CLOSE STORE
   * ========================= */
  /**
   * Executes set status logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async setStatus(storeId: string, open: boolean)
  {
    return AppDataSource.transaction(async (manager) =>
    {
      const storeRepo = manager.getRepository(Store);

      const store = await storeRepo.findOne({ where: { id: storeId } });
      if (!store)
      {
        throw new AppError('STORE-001', 404);
      }

      if (open)
      {
        await this.subscriptionService.assertStoreIsActive(store.id);
      }

      store.open = open;
      return storeRepo.save(store);
    });
  }

  /* =========================
   * GET BY SLUG
   * ========================= */
  /**
   * Gets by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async getBySlug(slug: string)
  {
    const repo = AppDataSource.getRepository(Store);

    return repo.findOne({
      where: { slug },
      relations: [ 'settings' ],
    });
  }

  /* =========================
   * SLUG UNIQUE (PRIVATE)
   * ========================= */
  /**
   * Generates unique slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async generateUniqueSlug(
    value: string,
    manager: EntityManager
  ): Promise<string>
  {
    const base = slugify(value);
    let candidate = base;
    let counter = 1;

    const repo = manager.getRepository(Store);

    while (await repo.findOne({ where: { slug: candidate } }))
    {
      candidate = `${base}-${counter++}`;
    }

    return candidate;
  }

  /**
   * Tracks store link hit.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-22
   */
  async trackLinkHit(storeId: string, payload: { source?: string; medium?: string; campaign?: string; referrer?: string })
  {
    const repo = AppDataSource.getRepository(StoreLinkHit);
    const entry = repo.create({
      storeId,
      utmSource: payload.source || null,
      utmMedium: payload.medium || null,
      utmCampaign: payload.campaign || null,
      referrer: payload.referrer || null,
    });
    await repo.save(entry);
    return entry;
  }

  /**
   * Gets link stats.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-22
   */
  async getLinkStats(storeId: string, days: number)
  {
    const safeDays = Math.max(1, Math.min(90, Number(days) || 7));
    const rows = await AppDataSource.query(
      `
      SELECT
        COALESCE(NULLIF(utm_source, ''), 'direto') AS source,
        COUNT(*)::int AS total
      FROM store_link_hits
      WHERE store_id = $1
        AND created_at >= NOW() - $2::interval
      GROUP BY source
      ORDER BY total DESC
      `,
      [ storeId, `${safeDays} days` ]
    );
    const total = rows.reduce((sum: number, row: any) => sum + Number(row.total || 0), 0);
    return {
      total,
      days: safeDays,
      sources: rows,
      topSource: rows[0]?.source || 'direto',
    };
  }
}
