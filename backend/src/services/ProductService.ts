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
import { AppDataSource } from '../config/database';
import { EntityManager } from 'typeorm';
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

  private resolveInventoryStatus(product: any) {
    const manageStock = Boolean(product?.manageStock);
    if (!manageStock) return 'not_managed';
    const qty = Math.max(0, Number(product?.stockQuantity || 0));
    const alert = Math.max(1, Number(product?.lowStockAlert || 3));
    if (qty <= 0) return 'out';
    if (qty <= alert) return 'low';
    return 'ok';
  }

  private async appendInventoryMovement(payload: {
    storeId: string;
    productId: string;
    orderId?: string | null;
    movementType: string;
    quantity: number;
    beforeQuantity: number;
    afterQuantity: number;
    reason?: string | null;
    actorUserId?: string | null;
  }) {
    try {
      await AppDataSource.query(
        `
          INSERT INTO inventory_movements
            (store_id, product_id, order_id, movement_type, quantity, before_quantity, after_quantity, reason, actor_user_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          payload.storeId,
          payload.productId,
          payload.orderId || null,
          payload.movementType,
          payload.quantity,
          payload.beforeQuantity,
          payload.afterQuantity,
          payload.reason || null,
          payload.actorUserId || null,
        ]
      );
    } catch (error) {
      console.error('[inventory] failed to append movement', error);
    }
  }

  private async appendInventoryMovementTx(
    manager: EntityManager,
    payload: {
      storeId: string;
      productId: string;
      orderId?: string | null;
      movementType: string;
      quantity: number;
      beforeQuantity: number;
      afterQuantity: number;
      reason?: string | null;
      actorUserId?: string | null;
    }
  ) {
    try {
      await manager.query(
        `
          INSERT INTO inventory_movements
            (store_id, product_id, order_id, movement_type, quantity, before_quantity, after_quantity, reason, actor_user_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          payload.storeId,
          payload.productId,
          payload.orderId || null,
          payload.movementType,
          payload.quantity,
          payload.beforeQuantity,
          payload.afterQuantity,
          payload.reason || null,
          payload.actorUserId || null,
        ]
      );
    } catch (error) {
      console.error('[inventory] failed to append movement (tx)', error);
      throw error;
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
    const manageStock = Boolean((input as any).manageStock);
    const stockQuantityRaw = Number((input as any).stockQuantity ?? 0);
    const stockQuantity = Number.isFinite(stockQuantityRaw) ? Math.max(0, Math.floor(stockQuantityRaw)) : 0;
    const lowStockAlertRaw = Number((input as any).lowStockAlert ?? 3);
    const lowStockAlert = Number.isFinite(lowStockAlertRaw) ? Math.max(1, Math.floor(lowStockAlertRaw)) : 3;

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
      manageStock,
      stockQuantity: manageStock ? stockQuantity : 0,
      lowStockAlert,
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

  async listInventoryByStoreId(
    storeId: string,
    options?: { status?: string; query?: string; includeNotManaged?: boolean; limit?: number; offset?: number },
    authStoreId?: string
  ) {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const products = await this.productRepository.findByStoreId(store!.id);
    const normalizedQuery = String(options?.query || '').trim().toLowerCase();
    const statusFilter = String(options?.status || 'all').toLowerCase();
    const includeNotManaged = options?.includeNotManaged !== false;
    const limit = Math.max(1, Math.min(500, Number(options?.limit || 250)));
    const offset = Math.max(0, Number(options?.offset || 0));

    const rows = (products || [])
      .map((product: any) => {
        const stockQuantity = Math.max(0, Number(product?.stockQuantity || 0));
        const lowStockAlert = Math.max(1, Number(product?.lowStockAlert || 3));
        const status = this.resolveInventoryStatus(product);
        return {
          id: product.id,
          name: product.name,
          category: product.category || '',
          active: product.active !== false,
          imageUrl: product.imageUrl || null,
          manageStock: Boolean(product.manageStock),
          stockQuantity,
          lowStockAlert,
          inventoryStatus: status,
          updatedAt: product.updatedAt || product.createdAt || null,
        };
      })
      .filter((item) => (includeNotManaged ? true : item.manageStock))
      .filter((item) => {
        if (!normalizedQuery) return true;
        const haystack = `${item.name} ${item.category}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .filter((item) => (statusFilter === 'all' ? true : item.inventoryStatus === statusFilter))
      .sort((a, b) => {
        const rank = (status: string) => {
          if (status === 'out') return 0;
          if (status === 'low') return 1;
          if (status === 'ok') return 2;
          return 3;
        };
        const ra = rank(a.inventoryStatus);
        const rb = rank(b.inventoryStatus);
        if (ra !== rb) return ra - rb;
        return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
      });

    const paged = rows.slice(offset, offset + limit);
    return {
      items: paged,
      total: rows.length,
      offset,
      limit,
    };
  }

  async getInventoryAlertsByStoreId(storeId: string, authStoreId?: string) {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const products = await this.productRepository.findByStoreId(store!.id);
    const managed = (products || []).filter((p: any) => Boolean(p.manageStock));
    const out = managed.filter((p: any) => Math.max(0, Number(p.stockQuantity || 0)) <= 0);
    const low = managed.filter((p: any) => {
      const qty = Math.max(0, Number(p.stockQuantity || 0));
      const alert = Math.max(1, Number(p.lowStockAlert || 3));
      return qty > 0 && qty <= alert;
    });
    return {
      managedCount: managed.length,
      lowCount: low.length,
      outCount: out.length,
      criticalCount: low.length + out.length,
      lowItems: low
        .map((p: any) => ({ id: p.id, name: p.name, stockQuantity: Number(p.stockQuantity || 0), lowStockAlert: Number(p.lowStockAlert || 3) }))
        .sort((a: any, b: any) => a.stockQuantity - b.stockQuantity)
        .slice(0, 10),
      outItems: out
        .map((p: any) => ({ id: p.id, name: p.name, stockQuantity: 0 }))
        .slice(0, 10),
    };
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
    if ((data as any).manageStock !== undefined) {
      product.manageStock = Boolean((data as any).manageStock);
      if (!product.manageStock) {
        product.stockQuantity = 0;
      }
    }
    if ((data as any).stockQuantity !== undefined) {
      const stockQuantityRaw = Number((data as any).stockQuantity);
      if (Number.isFinite(stockQuantityRaw)) {
        product.stockQuantity = Math.max(0, Math.floor(stockQuantityRaw));
      }
    }
    if ((data as any).lowStockAlert !== undefined) {
      const lowStockAlertRaw = Number((data as any).lowStockAlert);
      if (Number.isFinite(lowStockAlertRaw)) {
        product.lowStockAlert = Math.max(1, Math.floor(lowStockAlertRaw));
      }
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

  async adjustStock(
    storeId: string,
    productId: string,
    input: { mode: 'in' | 'out' | 'set'; quantity: number; reason?: string; lowStockAlert?: number; manageStock?: boolean },
    authStoreId?: string,
    actorUserId?: string
  ) {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const mode = String(input?.mode || '').toLowerCase();
    const qty = Math.max(0, Math.floor(Number(input?.quantity || 0)));
    if (!['in', 'out', 'set'].includes(mode)) {
      throw new AppError('PROD-002', 400, { message: 'Modo de ajuste inválido.' });
    }
    if (!Number.isFinite(qty)) {
      throw new AppError('PROD-002', 400, { message: 'Quantidade inválida.' });
    }

    const runTx = async () =>
      AppDataSource.transaction(async (manager) => {
        await manager.query(`SET LOCAL lock_timeout = '8s'`);
        const rows = await manager.query(
        `
          SELECT id, name, store_id, manage_stock, stock_quantity, low_stock_alert, category, active, image_url
          FROM products
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [productId]
      );
      const product = rows?.[0];
      if (!product || String(product.store_id) !== String(store!.id)) {
        throw new AppError('PROD-001', 404);
      }

      const beforeQuantity = Math.max(0, Number(product.stock_quantity || 0));
      const nextManageStock = input?.manageStock !== undefined ? Boolean(input.manageStock) : Boolean(product.manage_stock);
      const lowStockAlert = input?.lowStockAlert !== undefined
        ? Math.max(1, Math.floor(Number(input.lowStockAlert)))
        : Math.max(1, Number(product.low_stock_alert || 3));

      let afterQuantity = beforeQuantity;
      if (!nextManageStock) {
        afterQuantity = 0;
      } else if (mode === 'set') {
        afterQuantity = qty;
      } else if (mode === 'in') {
        afterQuantity = beforeQuantity + qty;
      } else if (mode === 'out') {
        if (qty > beforeQuantity) {
          throw new AppError('ORDER-005', 400, { message: `Estoque insuficiente para "${product.name}".` });
        }
        afterQuantity = beforeQuantity - qty;
      }

      await manager.query(
        `
          UPDATE products
          SET manage_stock = $2,
              stock_quantity = $3,
              low_stock_alert = $4
          WHERE id = $1
        `,
        [product.id, nextManageStock, Math.max(0, Math.floor(afterQuantity)), lowStockAlert]
      );

      const movementQty =
        mode === 'set' ? Math.abs(afterQuantity - beforeQuantity) : qty;
      const movementType =
        mode === 'set'
          ? afterQuantity >= beforeQuantity
            ? 'manual_set_increase'
            : 'manual_set_decrease'
          : mode === 'in'
          ? 'manual_in'
          : 'manual_out';
      if (nextManageStock && movementQty > 0) {
        await this.appendInventoryMovementTx(manager, {
          storeId: store!.id,
          productId: product.id,
          movementType,
          quantity: movementQty,
          beforeQuantity,
          afterQuantity,
          reason: input?.reason || null,
          actorUserId: actorUserId || null,
        });
      }

      return {
        id: product.id,
        name: product.name,
        category: product.category || '',
        active: product.active !== false,
        imageUrl: product.image_url || null,
        manageStock: nextManageStock,
        stockQuantity: Math.max(0, Math.floor(afterQuantity)),
        lowStockAlert,
        inventoryStatus: this.resolveInventoryStatus({
          manageStock: nextManageStock,
          stockQuantity: afterQuantity,
          lowStockAlert,
        }),
      };
    });

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await runTx();
      } catch (error: any) {
        const code = String(error?.code || '').toUpperCase();
        const isLockConflict = code === '55P03';
        if (!isLockConflict) throw error;
        if (attempt >= maxAttempts) {
          throw new AppError('PROD-002', 409, {
            message: 'Produto em atualização no momento. Tente novamente em alguns segundos.',
          });
        }
        await wait(180 * attempt);
      }
    }
  }

  async listInventoryMovementsByStoreId(
    storeId: string,
    options?: { productId?: string; limit?: number; offset?: number },
    authStoreId?: string
  ) {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    const limit = Math.max(1, Math.min(500, Number(options?.limit || 100)));
    const offset = Math.max(0, Number(options?.offset || 0));
    const productFilterRaw = String(options?.productId || '').trim();
    const productFilter = /^[0-9a-fA-F-]{36}$/.test(productFilterRaw) ? productFilterRaw : '';

    const rows = await AppDataSource.query(
      `
        SELECT
          im.id,
          im.product_id AS "productId",
          im.order_id AS "orderId",
          p.name AS "productName",
          im.movement_type AS "movementType",
          im.quantity,
          im.before_quantity AS "beforeQuantity",
          im.after_quantity AS "afterQuantity",
          im.reason,
          im.actor_user_id AS "actorUserId",
          u.full_name AS "actorName",
          u.user_role AS "actorRole",
          im.created_at AS "createdAt"
        FROM inventory_movements im
        INNER JOIN products p ON p.id = im.product_id
        LEFT JOIN users u ON u.id = im.actor_user_id
        WHERE im.store_id = $1
          AND ($2::uuid IS NULL OR im.product_id = $2::uuid)
        ORDER BY im.created_at DESC
        LIMIT $3 OFFSET $4
      `,
      [store!.id, productFilter || null, limit, offset]
    );

    return {
      items: rows || [],
      limit,
      offset,
    };
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
