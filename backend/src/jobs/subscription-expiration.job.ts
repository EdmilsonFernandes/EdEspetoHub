/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: subscription-expiration.job.ts
 */

import { container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { SubscriptionService } from '../services/SubscriptionService';

export const checkExpirations = async () => {
  const subscriptionService = container.get<SubscriptionService>(Tokens.Common.Service.SubscriptionService);
  console.log('Running subscription expiration job...');
  // Implementation
};
