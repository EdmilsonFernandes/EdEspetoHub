/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: DeliveryController.ts
 */

import { Request, Response } from 'express';
import { DeliveryService } from '../services/DeliveryService';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Post, Get, RouterController, Authorize, SubscriptionActive, RequireFeature } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { DatabaseService } from '../database/data-base.service';

const log = logger.child({ scope: 'DeliveryController' });

@RouterController(Tokens.Common.Controller.DeliveryController)
export class DeliveryController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.DeliveryService) private deliveryService: DeliveryService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {
    super('/delivery');
  }

  @Post('/:orderId/accept')
  @Authorize()
  @SubscriptionActive()
  @RequireFeature('delivery')
  async accept(req: Request, res: Response): Promise<Response> {
    try {
      // Implementation
      return this.ok(res, { status: 'accepted' });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
