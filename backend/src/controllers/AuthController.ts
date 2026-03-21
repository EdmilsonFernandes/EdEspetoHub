/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: AuthController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Authorize, Get, Post, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { respondWithSuccess } from '../errors/respondWithSuccess';

const log = logger.child({ scope: 'AuthController' });

/**
 * Provides AuthController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
@RouterController(Tokens.Common.Controller.AuthController)
export class AuthController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.AuthService) private authService: AuthService
  ) {
    super('/auth');
  }

  /**
   * Executes register logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/register')
  @Post('/signup')
  public async register(req: Request, res: Response) {
    try {
      log.info('Register request', {
        email: req.body?.email || req.body?.user?.email,
        storeName: req.body?.storeName || req.body?.store?.name,
        planId: req.body?.planId,
      });
      const result = await this.authService.register(req.body, { ipAddress: req.ip });
      log.info('Register success', { userId: result.user?.id, storeId: result.store?.id });
      return this.created(res, result);
    } catch (error: any) {
      log.warn('Register failed', { error, email: req.body?.email || req.body?.user?.email });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/login')
  public async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      log.info('Login request', { email });
      const result = await this.authService.login(email, password);
      log.info('Login success', { userId: result.user?.id, storeId: result.store?.id });
      return this.ok(res, result);
    } catch (error: any) {
      log.warn('Login failed', { email, error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/admin-login')
  public async adminLogin(req: Request, res: Response) {
    const password = req.body?.password;
    const identifier = String(req.body?.identifier || req.body?.slug || req.body?.email || '').trim();

    try {
      log.info('Admin login request', { identifier });
      const result = await this.authService.adminLogin(identifier, password);
      log.info('Admin login success', { storeId: result.store?.id, identifier });
      return this.ok(res, result);
    } catch (error: any) {
      log.warn('Admin login failed', { identifier, error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes super admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/super-login')
  public async superAdminLogin(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      log.info('Super admin login request', { email });
      const result = await this.authService.superAdminLogin(email, password);
      log.info('Super admin login success', { email });
      return this.ok(res, result);
    } catch (error: any) {
      log.warn('Super admin login failed', { email, error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes forgot password logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/forgot-password')
  public async forgotPassword(req: Request, res: Response) {
    const { email } = req.body || {};
    try {
      log.info('Forgot password request', { email });
      const result = await this.authService.requestPasswordReset(email);
      log.info('Forgot password dispatched', { email });
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any) {
      log.warn('Forgot password failed', { email, error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes reset password logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/reset-password')
  public async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body || {};
    try {
      log.info('Reset password request');
      const result = await this.authService.resetPassword(token, newPassword);
      log.info('Reset password success');
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any) {
      log.warn('Reset password failed', { error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Verifies email.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Get('/verify-email')
  @Post('/verify-email')
  public async verifyEmail(req: Request, res: Response) {
    const token = String(req.body?.token || req.query?.token || '');
    const email = String(req.body?.email || req.query?.email || '').trim();
    try {
      log.info('Verify email request');
      const result = await this.authService.verifyEmail({ token, email });
      log.info('Verify email success', { redirectUrl: result.redirectUrl });
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any) {
      log.warn('Verify email failed', { error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes resend verification logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  @Post('/resend-verification')
  public async resendVerification(req: Request, res: Response) {
    const { email } = req.body || {};
    try {
      log.info('Resend verification request', { email });
      const result = await this.authService.resendVerificationEmail(email, { ipAddress: req.ip });
      log.info('Resend verification dispatched', { email });
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any) {
      log.warn('Resend verification failed', { email, error });
      return this.fail(res, error, req);
    }
  }

  /**
   * Executes change password logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  @Post('/change-password')
  @Authorize()
  public async changePassword(req: Request, res: Response) {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    try {
      log.info('Change password request', { userId: req.auth?.sub });
      const result = await this.authService.changePassword(req.auth?.sub || '', currentPassword, newPassword);
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any) {
      log.warn('Change password failed', { userId: req.auth?.sub, error });
      return this.fail(res, error, req);
    }
  }
}
