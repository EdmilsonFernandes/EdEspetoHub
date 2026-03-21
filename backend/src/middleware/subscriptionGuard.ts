/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: subscriptionGuard.ts
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { SubscriptionDao } from '../database/dao/SubscriptionDao';
import { StoreDao } from '../database/dao/StoreDao';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const subscriptionDao = container.get<SubscriptionDao>(Tokens.Common.DataLayer.SubscriptionRepository);
  const storeDao = container.get<StoreDao>(Tokens.Common.DataLayer.StoreRepository);
  
  const storeId = req.auth?.storeId || req.params.storeId;
  if (!storeId) return next();

  try {
    const subscription = await subscriptionDao.findCurrentByStoreId(storeId);
    const store = await storeDao.getById(storeId);
    
    if ((store as any)?.settings?.planExempt) return next();
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      return respondWithError(req, res, new AppError('SUB-001', 403), 403);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
