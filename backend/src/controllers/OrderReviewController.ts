/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: OrderReviewController.ts
 */

import { Request, Response } from 'express';
import { OrderReviewService } from '../services/OrderReviewService';
import { MotoboyService } from '../services/MotoboyService';
import { BaseController } from './BaseController';
import { Get, Post, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.OrderReviewController)
export class OrderReviewController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.OrderReviewService) private orderReviewService: OrderReviewService,
    @Inject(Tokens.Common.Service.MotoboyService) private motoboyService: MotoboyService
  ) {
    super('/reviews');
  }

  @Post('/:orderId')
  async createReview(req: Request, res: Response) {
    try {
      const review = await this.orderReviewService.createReview(req.params.orderId, req.body);
      return this.created(res, review);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/:orderId')
  async getByOrder(req: Request, res: Response) {
    try {
      const review = await this.orderReviewService.getReviewByOrderId(req.params.orderId);
      return this.ok(res, review);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
