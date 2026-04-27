/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CreateSubscriptionDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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