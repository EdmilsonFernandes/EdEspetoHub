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

    const product = this.productRepository.create({
      name: input.name,
      price: input.price,
      promoPrice,
      promoActive,
      category: input.category,
      description: (input as any).description ?? (input as any).desc,
      imageUrl: uploadedImage || input.imageUrl,
      isFeatured: Boolean(input.isFeatured),
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
    return this.productRepository.findByStoreId(store!.id);
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
    return this.productRepository.findByStoreId(store!.id);
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
    if (promoPrice !== undefined) {
      product.promoPrice = promoPrice && promoPrice > 0 ? promoPrice : null;
    }
    if (typeof data.promoActive === 'boolean') {
      product.promoActive = data.promoActive && !!product.promoPrice;
    }

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
