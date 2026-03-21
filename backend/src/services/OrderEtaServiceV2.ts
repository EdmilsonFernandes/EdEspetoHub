/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: OrderEtaServiceV2.ts
 */

import { Order } from '../entities/Order';
import { OrderEtaEstimateDao } from '../database/dao/OrderEtaEstimateDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';
import { logger } from '../utils/logger';

@Provide(Tokens.Common.Service.OrderEtaServiceV2)
export class OrderEtaServiceV2 {
  private log = logger.child({ scope: 'OrderEtaServiceV2' });

  constructor(
    @Inject(Tokens.Common.DataLayer.OrderEtaEstimateRepository) private etaDao: OrderEtaEstimateDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {}

  async calculateEta(order: Order) {
    // Implementation
    return { totalMinutes: 20 };
  }
}
