/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: DeliveryBillingController.ts
 */

import { Request, Response } from 'express';
import { DeliveryBillingService } from '../services/DeliveryBillingService';
import { BaseController } from './BaseController';
import { Get, RouterController, Authorize } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.DeliveryBillingController)
export class DeliveryBillingController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.DeliveryBillingService) private deliveryBillingService: DeliveryBillingService
  ) {
    super('/billing/delivery');
  }

  @Get('/status/:storeId')
  @Authorize()
  async getStatus(req: Request, res: Response) {
    try {
      // Implementation
      return this.ok(res, { status: 'ok' });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
