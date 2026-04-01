/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: StoreService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
/**
 * Provides StoreService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class StoreService
{
  private subscriptionService = new SubscriptionService();
  private storeRepository = AppDataSource.getRepository(Store);
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
  private normalizeBannerPosition(value?: string | null): 'center' | 'top' {
    return String(value || '').toLowerCase() === 'top' ? 'top' : 'center';
  }

  private normalizePostalZip(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const digits = String(value).replace(/\D/g, '').slice(0, 8);
    return digits || null;
  }

  /* =========================
   * CREATE STORE
   * ========================= */
  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
      const deliveryRadiusKm = this.parseNumber(input.deliveryRadiusKm);
      const deliveryFee = this.parseNumber(input.deliveryFee);
      const trimmedAddress = input.address?.toString().trim();
      const trimmedCity = input.city?.toString().trim();
      const trimmedState = input.state?.toString().trim().toUpperCase();
      const segment = sanitizeStoreSegment(input.segment);
      const segmentPreset = getStoreSegmentPreset(segment);
      const bannerPosition = this.normalizeBannerPosition(input.bannerPosition);
      const postalOriginZip = this.normalizePostalZip(input.postalOriginZip);
      const postalEnabled = Boolean(input.postalEnabled) && Boolean(postalOriginZip);

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
        primaryColor: input.primaryColor || segmentPreset.primaryColor,
        secondaryColor: input.secondaryColor || segmentPreset.secondaryColor,
        pixKey: normalizedPix ?? null,
        contactEmail: trimmedEmail || null,
        promoMessage: input.promoMessage?.toString().trim() || null,
        isOrderingEnabled: input.isOrderingEnabled !== false,
        segment,
        deliveryRadiusKm: deliveryRadiusKm ?? null,
        deliveryFee: deliveryFee ?? null,
        postalEnabled,
        postalOriginZip: postalOriginZip ?? null,
        socialLinks,
        openingHours: input.openingHours ?? [],
        orderTypes: input.orderTypes ?? segmentPreset.orderTypes,
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
      if (data.deliveryRadiusKm !== undefined)
      {
        store.settings.deliveryRadiusKm = this.parseNumber(data.deliveryRadiusKm) ?? null;
      }
      if (data.deliveryFee !== undefined)
      {
        store.settings.deliveryFee = this.parseNumber(data.deliveryFee) ?? null;
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
        const trimmedCity = data.city?.toString().trim();
        store.settings.city = trimmedCity || null;
      }
      if (data.state !== undefined)
      {
        const trimmedState = data.state?.toString().trim().toUpperCase();
        store.settings.state = trimmedState || null;
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
