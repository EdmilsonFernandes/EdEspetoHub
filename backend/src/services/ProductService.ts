/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: ProductService.ts
 */

import { CreateProductDto } from '../dto/CreateProductDto';
import { ProductDao } from '../database/dao/ProductDao';
import { StoreDao } from '../database/dao/StoreDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { ProductResponse } from '../models/response/ProductResponse';
import { Product } from '../entities/Product';
import { FileUtil } from '../utils/FileUtil';
import { BusinessUtil } from '../utils/BusinessUtil';

@Provide(Tokens.Common.Service.ProductService)
export class ProductService {
  constructor(
    @Inject(Tokens.Common.DataLayer.ProductRepository) private productDao: ProductDao,
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Utils.FileUtil) private fileUtil: FileUtil,
    @Inject(Tokens.Utils.BusinessUtil) private businessUtil: BusinessUtil
  ) {}

  private mapToResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
      promoActive: product.promoActive,
      category: product.category,
      imageUrl: product.imageUrl,
      isFeatured: product.isFeatured,
      manageStock: product.manageStock,
      stockQuantity: product.stockQuantity,
      lowStockAlert: product.lowStockAlert,
      active: product.active,
      createdAt: product.createdAt,
    };
  }

  async create(input: CreateProductDto, authStoreId?: string): Promise<ProductResponse> {
    const uploadedImage = await this.fileUtil.saveBase64Image(input.imageFile, `product-${input.storeId}`, 'products');
    
    const product = await this.productDao.create({
      ...input,
      imageUrl: uploadedImage || input.imageUrl,
      store: { id: input.storeId } as any,
    } as any);
    const saved = await this.productDao.save(product);
    return this.mapToResponse(saved);
  }

  async listByStoreId(storeId: string, authStoreId?: string): Promise<ProductResponse[]> {
    const products = await this.productDao.findByStoreId(storeId);
    return products.map(p => this.mapToResponse(p));
  }

  async listByStoreSlug(slug: string, authStoreId?: string): Promise<ProductResponse[]> {
    const products = await this.productDao.findByStoreId(slug); 
    return products.map(p => this.mapToResponse(p));
  }

  async listActiveByStoreSlug(slug: string): Promise<ProductResponse[]> {
    const products = await this.productDao.findActiveByStoreId(slug);
    return products
      .filter(p => this.businessUtil.isProductAvailableToday(p))
      .map(p => this.mapToResponse(p));
  }

  async update(storeId: string, productId: string, data: Partial<CreateProductDto>, authStoreId?: string): Promise<ProductResponse | null> {
    const product = await this.productDao.getById(productId);
    if (!product) return null;
    
    if (data.imageFile) {
      data.imageUrl = await this.fileUtil.saveBase64Image(data.imageFile, `product-${storeId}`, 'products');
    }

    Object.assign(product, data);
    const saved = await this.productDao.save(product);
    return this.mapToResponse(saved);
  }

  async remove(storeId: string, productId: string, authStoreId?: string): Promise<boolean> {
    return this.productDao.delete(productId);
  }

  async listCategoriesByStoreId(storeId: string, authStoreId?: string): Promise<any[]> {
    return [];
  }

  async listCategoriesByStoreSlug(slug: string): Promise<any[]> {
    return [];
  }

  async setCategoryPriority(storeId: string, input: any, authStoreId?: string): Promise<void> {
    return;
  }
}
