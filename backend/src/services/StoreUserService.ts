/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: StoreUserService.ts
 */

import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError';
import { StoreDao } from '../database/dao/StoreDao';
import { StoreUserDao } from '../database/dao/StoreUserDao';
import { UserDao } from '../database/dao/UserDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Common.Service.StoreUserService)
export class StoreUserService {
  constructor(
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.DataLayer.StoreUserRepository) private storeUserDao: StoreUserDao,
    @Inject(Tokens.Common.DataLayer.UserRepository) private userDao: UserDao
  ) {}

  async listByStore(storeId: string, authStoreId?: string) {
    // Implementation
    return [];
  }
}
