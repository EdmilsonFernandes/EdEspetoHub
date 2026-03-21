/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: MotoboyService.ts
 */

import { AppError } from '../errors/AppError';
import { MotoboyDao } from '../database/dao/MotoboyDao';
import { MotoboyStoreDao } from '../database/dao/MotoboyStoreDao';
import { StoreDao } from '../database/dao/StoreDao';
import { UserDao } from '../database/dao/UserDao';
import { EmailService } from './EmailService';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.MotoboyService)
export class MotoboyService {
  constructor(
    @Inject(Tokens.Common.DataLayer.MotoboyRepository) private motoboyDao: MotoboyDao,
    @Inject(Tokens.Common.DataLayer.MotoboyStoreRepository) private motoboyStoreDao: MotoboyStoreDao,
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.DataLayer.UserRepository) private userDao: UserDao,
    @Inject(Tokens.Common.Service.EmailService) private emailService: EmailService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async findByUserId(userId: string) {
    return this.motoboyDao.findByUserId(userId);
  }

  async listAvailableForStore(storeId: string) {
    return this.motoboyDao.findAvailableByStoreId(storeId);
  }
}
