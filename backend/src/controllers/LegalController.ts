/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: LegalController.ts
 */

import { Request, Response } from 'express';
import { SettingsService } from '../services/SettingsService';
import { BaseController } from './BaseController';
import { Get, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

@RouterController(Tokens.Common.Controller.LegalController)
export class LegalController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.SettingsService) private settingsService: SettingsService
  ) {
    super('/legal');
  }

  @Get('/terms')
  async getTerms(req: Request, res: Response) {
    try {
      const terms = await this.settingsService.getValue('legal.terms');
      return this.ok(res, { content: terms });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/privacy')
  async getPrivacy(req: Request, res: Response) {
    try {
      const privacy = await this.settingsService.getValue('legal.privacy');
      return this.ok(res, { content: privacy });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
