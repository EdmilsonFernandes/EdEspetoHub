/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: ProductService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { CreateProductDto } from '../dto/CreateProductDto';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { saveBase64Image } from '../utils/imageStorage';
import { isProductAvailableToday, normalizeAvailabilityDays } from '../utils/productAvailability';
import { AppError } from '../errors/AppError';
/**
 * Provides ProductService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class ProductService
{
  private productRepository = new ProductRepository();
  private storeRepository = new StoreRepository();
  private normalizeCategoryKey(value: unknown)
  {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' e ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private defaultCategoryPriorityFor(rawCategory: unknown)
  {
    const key = this.normalizeCategoryKey(rawCategory);
    if (!key) return 99;
    if ([ 'refeicao', 'refeicoes' ].includes(key)) return 1;
    if ([ 'porcao', 'porcoes' ].includes(key)) return 2;
    if ([ 'bebida', 'bebidas' ].includes(key)) return 3;
    if ([ 'cerveja', 'cervejas' ].includes(key)) return 4;
    if ([ 'destilado', 'destilados' ].includes(key)) return 5;
    if ([ 'acai', 'acais' ].includes(key)) return 6;
    return 99;
  }

  private buildCategoryPriorityMap(store: Awaited<ReturnType<StoreRepository['findById']>>)
  {
    const map = new Map<string, number>();
    const settingsMap = (store as any)?.settings?.categoryPriorities || {};
    if (settingsMap && typeof settingsMap === 'object') {
      Object.entries(settingsMap).forEach(([key, value]) => {
        const normalized = this.normalizeCategoryKey(key);
        const priority = Number(value);
        if (!normalized || !Number.isFinite(priority)) return;
        map.set(normalized, Math.max(1, Math.floor(priority)));
      });
    }
    return map;
  }

  private getCategoryPriority(store: Awaited<ReturnType<StoreRepository['findById']>>, category: unknown)
  {
    const normalized = this.normalizeCategoryKey(category);
    if (!normalized) return 99;
    const map = this.buildCategoryPriorityMap(store);
    if (map.has(normalized)) return Number(map.get(normalized));
    return this.defaultCategoryPriorityFor(normalized);
  }

  private attachCategoryPriority(
    store: Awaited<ReturnType<StoreRepository['findById']>>,
    products: any[]
  )
  {
    const list = Array.isArray(products) ? products : [];
    const enriched = list.map((product) => {
      const priority = this.getCategoryPriority(store, product?.category);
      return { ...product, categoryPriority: priority };
    });
    return enriched.sort((a, b) => {
      const pa = Number(a?.categoryPriority ?? 99);
      const pb = Number(b?.categoryPriority ?? 99);
      if (pa !== pb) return pa - pb;
      const ca = new Date(a?.createdAt || 0).getTime();
      const cb = new Date(b?.createdAt || 0).getTime();
      return cb - ca;
    });
  }

  private formatCategoryLabel(category: unknown)
  {
    const raw = String(category || '').trim();
    if (!raw) return '';
    return raw
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  private normalizeModifierId(value: unknown)
  {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalizeModifiers(input: unknown)
  {
    if (!Array.isArray(input)) return null;
    const result: Array<{ id: string; name: string; price: number; active?: boolean }> = [];
    const seen = new Set<string>();
    input.forEach((raw: any, index: number) => {
      const name = String(raw?.name || '').trim();
      const price = Number(raw?.price);
      if (!name || !Number.isFinite(price) || price <= 0) return;
      const fallbackId = this.normalizeModifierId(`${name}-${index + 1}`);
      const id = this.normalizeModifierId(raw?.id) || fallbackId;
      if (!id || seen.has(id)) return;
      seen.add(id);
      result.push({
        id,
        name,
        price: Number(price.toFixed(2)),
        active: raw?.active !== false,
      });
    });
    return result.length ? result : null;
  }

  private resolveBundlePromo(input: Partial<CreateProductDto>, baseUnitPrice: number, current?: { qty?: number | null; price?: number | null; active?: boolean })
  {
    const parseOptionalNumber = (value: unknown) => {
      if (value === undefined || value === null || String(value).trim() === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const nextQtyRaw = input.bundlePromoQty !== undefined
      ? parseOptionalNumber(input.bundlePromoQty)
      : parseOptionalNumber(current?.qty);
    const nextPriceRaw = input.bundlePromoPrice !== undefined
      ? parseOptionalNumber(input.bundlePromoPrice)
      : parseOptionalNumber(current?.price);
    const requestedActive = input.bundlePromoActive !== undefined ? Boolean(input.bundlePromoActive) : Boolean(current?.active);

    const qty = nextQtyRaw !== null ? Math.max(2, Math.floor(Number(nextQtyRaw))) : null;
    const price = nextPriceRaw !== null && Number(nextPriceRaw) > 0
      ? Number(Number(nextPriceRaw).toFixed(2))
      : null;

    const canActivate = Boolean(requestedActive) && Boolean(qty && qty >= 2) && Boolean(price && price > 0);
    if (!canActivate) {
      return { qty, price, active: false };
    }

    const regularGroupPrice = Number(baseUnitPrice || 0) * Number(qty);
    if (!(regularGroupPrice > 0) || Number(price) >= regularGroupPrice) {
      return { qty, price, active: false };
    }

    return { qty, price, active: true };
  }

  /**
   * Ensures store access.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private ensureStoreAccess(store: Awaited<ReturnType<StoreRepository[ 'findById' ]>>, authStoreId?: string)
  {
    if (!store) throw new AppError('STORE-001', 404);
    if (authStoreId && store.id !== authStoreId)
    {
      throw new AppError('AUTH-003', 403);
    }
  }




  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async create(input: CreateProductDto, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(input.storeId);
    this.ensureStoreAccess(store, authStoreId);

    const safeStore = store!;
    const uploadedImage = await saveBase64Image(input.imageFile, `product-${safeStore.id}`, 'products');
    if (input.isFeatured) {
      await this.productRepository.clearFeaturedByStoreId(safeStore.id);
    }

    const promoPrice = input.promoPrice !== undefined && input.promoPrice !== null
      ? Number(input.promoPrice)
      : null;
    const promoActive = Boolean(input.promoActive) && !!promoPrice && promoPrice > 0;
    const saleBasePrice = promoActive ? Number(promoPrice) : Number(input.price);
    const bundlePromo = this.resolveBundlePromo(input, saleBasePrice);
    const availabilityDays = normalizeAvailabilityDays(input.availabilityDays);
    const modifiers = this.normalizeModifiers((input as any).modifiers);

    const product = this.productRepository.create({
      name: input.name,
      price: input.price,
      promoPrice,
      promoActive,
      bundlePromoQty: bundlePromo.qty,
      bundlePromoPrice: bundlePromo.price,
      bundlePromoActive: bundlePromo.active,
      category: input.category,
      description: (input as any).description ?? (input as any).desc,
      imageUrl: uploadedImage || input.imageUrl,
      isFeatured: Boolean(input.isFeatured),
      active: input.active === false ? false : true,
      availabilityDays,
      modifiers,
      store: safeStore,
    });

    return this.productRepository.save(product);
  }




  /**
   * Lists by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async listByStoreId(storeId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const products = await this.productRepository.findByStoreId(store!.id);
    return this.attachCategoryPriority(store, products as any[]);
  }




  /**
   * Lists by store slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async listByStoreSlug(slug: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    this.ensureStoreAccess(store, authStoreId);
    const products = await this.productRepository.findByStoreId(store!.id);
    return this.attachCategoryPriority(store, products as any[]);
  }




  /**
   * Lists active by store slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-23
   */
  async listActiveByStoreSlug(slug: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) throw new AppError('STORE-001', 404);
    const products = await this.productRepository.findActiveByStoreId(store.id);
    const activeToday = products.filter((product) => isProductAvailableToday(product));
    return this.attachCategoryPriority(store, activeToday as any[]);
  }

  async listCategoriesByStoreId(storeId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const products = await this.productRepository.findByStoreId(store!.id);
    const unique = new Map<string, { key: string; name: string; priority: number; count: number }>();
    products.forEach((product: any) => {
      const key = this.normalizeCategoryKey(product?.category || '');
      if (!key) return;
      const current = unique.get(key);
      if (current) {
        current.count += 1;
        return;
      }
      unique.set(key, {
        key,
        name: this.formatCategoryLabel(product?.category || key),
        priority: this.getCategoryPriority(store, product?.category),
        count: 1,
      });
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.priority === b.priority ? a.name.localeCompare(b.name) : a.priority - b.priority
    );
  }

  async listCategoriesByStoreSlug(slug: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) throw new AppError('STORE-001', 404);
    const products = await this.productRepository.findActiveByStoreId(store.id);
    const activeToday = products.filter((product) => isProductAvailableToday(product));
    const unique = new Map<string, { key: string; name: string; priority: number; count: number }>();
    activeToday.forEach((product: any) => {
      const key = this.normalizeCategoryKey(product?.category || '');
      if (!key) return;
      const current = unique.get(key);
      if (current) {
        current.count += 1;
        return;
      }
      unique.set(key, {
        key,
        name: this.formatCategoryLabel(product?.category || key),
        priority: this.getCategoryPriority(store, product?.category),
        count: 1,
      });
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.priority === b.priority ? a.name.localeCompare(b.name) : a.priority - b.priority
    );
  }

  async setCategoryPriority(
    storeId: string,
    input: { name: string; priority: number },
    authStoreId?: string
  )
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const name = String(input?.name || '').trim();
    const normalized = this.normalizeCategoryKey(name);
    if (!normalized) throw new AppError('PROD-002', 400, { message: 'Categoria inválida' });
    const parsedPriority = Math.max(1, Math.floor(Number(input?.priority || 99)));
    const settings = (store as any).settings;
    const current = (settings?.categoryPriorities && typeof settings.categoryPriorities === 'object')
      ? settings.categoryPriorities
      : {};
    settings.categoryPriorities = {
      ...current,
      [normalized]: parsedPriority,
    };
    await this.storeRepository.save(store as any);
    return {
      key: normalized,
      name: this.formatCategoryLabel(name),
      priority: parsedPriority,
    };
  }




  /**
   * Executes update logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async update(storeId: string, productId: string, data: Partial<CreateProductDto>, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    const product = await this.productRepository.findById(productId);
    this.ensureStoreAccess(store, authStoreId);
    if (!store || !product || product.store.id !== store.id) throw new AppError('PROD-001', 404);

    const uploadedImage = await saveBase64Image(data.imageFile, `product-${store.id}`, 'products');
    if (data.isFeatured) {
      await this.productRepository.clearFeaturedByStoreId(store.id);
    }

    const promoPrice = data.promoPrice !== undefined && data.promoPrice !== null
      ? Number(data.promoPrice)
      : undefined;

    product.name = data.name ?? product.name;
    product.price = data.price ?? product.price;
    product.category = data.category ?? product.category;
    product.description = (data as any).description ?? (data as any).desc ?? product.description;
    product.imageUrl = uploadedImage ?? data.imageUrl ?? product.imageUrl;
    if (typeof data.isFeatured === 'boolean') {
      product.isFeatured = data.isFeatured;
    }
    if (typeof data.active === 'boolean') {
      product.active = data.active;
    }
    if (data.availabilityDays !== undefined) {
      product.availabilityDays = normalizeAvailabilityDays(data.availabilityDays);
    }
    if ((data as any).modifiers !== undefined) {
      product.modifiers = this.normalizeModifiers((data as any).modifiers);
    }
    if (promoPrice !== undefined) {
      product.promoPrice = promoPrice && promoPrice > 0 ? promoPrice : null;
    }
    if (typeof data.promoActive === 'boolean') {
      product.promoActive = data.promoActive && !!product.promoPrice;
    }
    const saleBasePrice = product.promoActive && product.promoPrice
      ? Number(product.promoPrice)
      : Number(product.price);
    const bundlePromo = this.resolveBundlePromo(data, saleBasePrice, {
      qty: product.bundlePromoQty ?? null,
      price: product.bundlePromoPrice ?? null,
      active: product.bundlePromoActive,
    });
    product.bundlePromoQty = bundlePromo.qty;
    product.bundlePromoPrice = bundlePromo.price;
    product.bundlePromoActive = bundlePromo.active;

    return this.productRepository.save(product);
  }




  /**
   * Executes remove logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async remove(storeId: string, productId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    const product = await this.productRepository.findById(productId);
    this.ensureStoreAccess(store, authStoreId);
    if (!product) return;
    if (!store || product.store.id !== store.id) throw new AppError('PROD-001', 404);

    return this.productRepository.delete(product.id);
  }
}
