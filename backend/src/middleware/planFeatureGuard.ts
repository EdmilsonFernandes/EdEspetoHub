/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: planFeatureGuard.ts
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { StoreDao } from '../database/dao/StoreDao';
import { SubscriptionService } from '../services/SubscriptionService';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';

export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const storeDao = container.get<StoreDao>(Tokens.Common.DataLayer.StoreRepository);
    const subscriptionService = container.get<SubscriptionService>(Tokens.Common.Service.SubscriptionService);
    
    const storeId = req.auth?.storeId || req.params.storeId;
    if (!storeId) return next();

    try {
      const store = await storeDao.getById(storeId);
      if ((store as any)?.settings?.planExempt) return next();
      
      // Feature check logic here
      next();
    } catch (error) {
      next(error);
    }
  };
};
