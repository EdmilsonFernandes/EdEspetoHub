/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: MotoboyController.ts
 */

import { Request, Response } from 'express';
import { MotoboyService } from '../services/MotoboyService';
import { MotoboyOrderService } from '../services/MotoboyOrderService';
import { BaseController } from './BaseController';
import { Get, RouterController, Authorize, Roles } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.MotoboyController)
export class MotoboyController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.MotoboyService) private motoboyService: MotoboyService,
    @Inject(Tokens.Common.Service.MotoboyOrderService) private motoboyOrderService: MotoboyOrderService
  ) {
    super('/motoboys');
  }

  @Get('/me')
  @Authorize()
  @Roles('MOTOBOY')
  async getMe(req: Request, res: Response) {
    try {
      const motoboy = await this.motoboyService.findByUserId(req.auth!.sub);
      return this.ok(res, motoboy);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/active-orders')
  @Authorize()
  @Roles('MOTOBOY')
  async getActiveOrders(req: Request, res: Response) {
    try {
      const motoboy = await this.motoboyService.findByUserId(req.auth!.sub);
      if (!motoboy) return this.unauthorized(res);
      const orders = await this.motoboyOrderService.listActiveByMotoboy(motoboy.id);
      return this.ok(res, orders);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
