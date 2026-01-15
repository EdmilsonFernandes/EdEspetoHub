/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CreateSubscriptionDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { SubscriptionStatus } from '../entities/Subscription';

export interface CreateSubscriptionDto {
  storeId: string;
  planId: string;
  autoRenew?: boolean;
  status?: SubscriptionStatus;
  startDate?: Date;
  endDate?: Date;
}
