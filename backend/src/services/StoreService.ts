/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: StoreService.ts
 */

import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { StoreDao } from '../database/dao/StoreDao';
import { StoreResponse } from '../models/response/StoreResponse';
import { Store } from '../entities/Store';

@Provide(Tokens.Common.Service.StoreService)
export class StoreService {
  constructor(
    @Inject(Tokens.Common.DataLayer.StoreDao) private storeDao: StoreDao
  ) {}

  private mapToResponse(store: Store): StoreResponse {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      open: store.open,
      owner: store.owner ? {
        id: store.owner.id,
        fullName: store.owner.fullName,
        email: store.owner.email,
        role: store.owner.userRole,
        emailVerified: store.owner.emailVerified,
        createdAt: store.owner.createdAt,
      } : undefined,
      settings: store.settings,
      createdAt: store.createdAt,
    };
  }

  public async getAllStores(): Promise<StoreResponse[]> {
    const stores = await this.storeDao.readAll();
    return stores.map(s => this.mapToResponse(s));
  }

  public async getStoreById(id: string): Promise<StoreResponse | null> {
    const store = await this.storeDao.getById(id);
    return store ? this.mapToResponse(store) : null;
  }
}
