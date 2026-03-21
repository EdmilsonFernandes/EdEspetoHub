/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: StoreUserController.ts
 */

import { Request, Response } from 'express';
import { StoreUserService } from '../services/StoreUserService';
import { BaseController } from './BaseController';
import { Get, Post, Put, Delete, RouterController, Authorize } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.StoreUserController)
export class StoreUserController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.StoreUserService) private storeUserService: StoreUserService
  ) {
    super('/store-users');
  }

  @Get('/:storeId')
  @Authorize()
  async listByStore(req: Request, res: Response) {
    try {
      const users = await this.storeUserService.listByStore(req.params.storeId, req.auth?.storeId);
      return this.ok(res, users);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
