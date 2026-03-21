/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: MotoboyKycController.ts
 */

import { Request, Response } from 'express';
import { MotoboyService } from '../services/MotoboyService';
import { BaseController } from './BaseController';
import { Post, RouterController, Authorize, Roles } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.MotoboyKycController)
export class MotoboyKycController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.MotoboyService) private motoboyService: MotoboyService
  ) {
    super('/motoboys/kyc');
  }

  @Post('/submit')
  @Authorize()
  @Roles('MOTOBOY')
  async submit(req: Request, res: Response) {
    try {
      // Implementation
      return this.ok(res, { status: 'submitted' });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
