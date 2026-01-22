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
import { EntityManager } from 'typeorm';
import { saveBase64Image } from '../utils/imageStorage';
import { sanitizeSocialLinks } from '../utils/socialLinks';
import { AppError } from '../errors/AppError';
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

      const socialLinks = sanitizeSocialLinks(input.socialLinks);

      // 3️⃣ Settings
      const normalizedPix = this.normalizePixKey(input.pixKey);
      const trimmedEmail = input.contactEmail?.toString().trim();
      const settings = manager.create(StoreSettings, {
        logoUrl: logoUrl || input.logoUrl,
        description: input.description,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        pixKey: normalizedPix ?? null,
        contactEmail: trimmedEmail || null,
        promoMessage: input.promoMessage?.toString().trim() || null,
        socialLinks,
        openingHours: input.openingHours ?? [],
        orderTypes: input.orderTypes ?? [ 'delivery', 'pickup', 'table' ],
      });

      // 4️⃣ Store
      const store = storeRepo.create({
        name: input.name,
        slug,
        owner,
        settings,
      });

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
        relations: [ 'settings' ],
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

      const uploadedLogo = await saveBase64Image(data.logoFile, `store-${store.id}`);

      store.settings.logoUrl =
        uploadedLogo ?? data.logoUrl ?? store.settings.logoUrl;

      store.settings.description =
        data.description ?? store.settings.description;

      store.settings.primaryColor =
        data.primaryColor ?? store.settings.primaryColor;

      store.settings.secondaryColor =
        data.secondaryColor ?? store.settings.secondaryColor;

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
        store.settings.orderTypes = data.orderTypes;
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
}
