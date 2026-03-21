/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: AuthController.ts
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Post, RouterController, Authorize } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

const log = logger.child({ scope: 'AuthController' });

@RouterController(Tokens.Common.Controller.AuthController)
export class AuthController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.AuthService) private authService: AuthService
  ) {
    super('/auth');
  }

  @Post('/register')
  async register(req: Request, res: Response) {
    try {
      const result = await this.authService.register(req.body);
      return this.created(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/login')
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/admin-login')
  async adminLogin(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;
      const result = await this.authService.adminLogin(identifier, password);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/super-admin-login')
  async superAdminLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.superAdminLogin(email, password);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/verify-email')
  async verifyEmail(req: Request, res: Response) {
    try {
      const result = await this.authService.verifyEmail(req.body);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/request-password-reset')
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const result = await this.authService.requestPasswordReset(req.body.email);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/reset-password')
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      const result = await this.authService.resetPassword(token, newPassword);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Post('/change-password')
  @Authorize()
  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(req.auth?.sub || '', currentPassword, newPassword);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
