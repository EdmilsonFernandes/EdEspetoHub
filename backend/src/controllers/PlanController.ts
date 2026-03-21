/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: PlanController.ts
 */

import { Request, Response } from 'express';
import { PlanService } from '../services/PlanService';
import { BaseController } from './BaseController';
import { Get, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Consulta de planos
 */
@RouterController(Tokens.Common.Controller.PlanController, 'v1')
export class PlanController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.PlanService) private planService: PlanService
  ) {
    super('/plans', 'v1');
  }

  /**
   * @swagger
   * /plans/public:
   *   get:
   *     summary: Lista todos os planos ativos
   *     tags: [Plans]
   *     responses:
   *       200:
   *         description: Lista de planos
   */
  @Get('/public')
  async listPublic(req: Request, res: Response) {
    try {
      const plans = await this.planService.listPublic();
      return this.ok(res, plans);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
