/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: subscription-expiration.job.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { SubscriptionService } from '../services/SubscriptionService';
import { logger } from '../utils/logger';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Executes schedule subscription expiration job logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export const scheduleSubscriptionExpirationJob = () => {
  const service = new SubscriptionService();
  const log = logger.child({ scope: 'SubscriptionJob' });

  /**
   * Executes run logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  const run = async () => {
    await service.updateStatusesForAll();
  };

  run().catch((error) => log.error('Erro ao executar verificação de assinatura', { error }));

  setInterval(() => {
    run().catch((error) => log.error('Erro ao executar verificação de assinatura', { error }));
  }, DAY_IN_MS);
};
