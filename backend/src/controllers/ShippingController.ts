/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: ShippingController.ts
 * @Date: 2026-04-01
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { ShippingService } from '../services/ShippingService';
import { logger } from '../utils/logger';

const shippingService = new ShippingService();
const log = logger.child({ scope: 'ShippingController' });

export class ShippingController {
  static async quotePostalPublicBySlug(req: Request, res: Response) {
    try {
      const payload = await shippingService.quoteByStoreSlug(req.params.slug, {
        destinationZip: req.body?.destinationZip,
        items: Array.isArray(req.body?.items) ? req.body.items : [],
      });
      return res.json(payload);
    } catch (error: any) {
      log.warn('Postal quote by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async quotePostalByStore(req: Request, res: Response) {
    try {
      const payload = await shippingService.quoteByStoreId(
        req.params.storeId,
        {
          destinationZip: req.body?.destinationZip,
          items: Array.isArray(req.body?.items) ? req.body.items : [],
        },
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Postal quote by store failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}

