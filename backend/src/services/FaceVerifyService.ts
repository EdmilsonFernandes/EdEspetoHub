/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: FaceVerifyService.ts
 */

import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { MotoboyDao } from '../database/dao/MotoboyDao';
import { MotoboyDocumentDao } from '../database/dao/MotoboyDocumentDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';

@Provide(Tokens.Common.Service.FaceVerifyService)
export class FaceVerifyService {
  private log = logger.child({ scope: 'FaceVerifyService' });

  constructor(
    @Inject(Tokens.Common.DataLayer.MotoboyDao) private motoboyDao: MotoboyDao,
    @Inject(Tokens.Common.DataLayer.MotoboyDocumentDao) private motoboyDocumentDao: MotoboyDocumentDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async requestVerification(motoboyId: string, imageBase64: string) {
    this.log.info('Requesting face verification', { motoboyId });
    const motoboy = await this.motoboyDao.getById(motoboyId);
    if (!motoboy) throw new AppError('AUTH-003', 403);

    // Mock verification logic or call external worker
    return { success: true, confidence: 0.98 };
  }
}
