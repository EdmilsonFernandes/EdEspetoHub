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
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { respondWithSuccess } from '../errors/respondWithSuccess';

const authService = new AuthService();
const log = logger.child({ scope: 'AuthController' });
/**
 * Provides AuthController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class AuthController
{
  /**
   * Executes register logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async register(req: Request, res: Response)
  {
    try
    {
      log.info('Register request', {
        email: req.body?.email || req.body?.user?.email,
        storeName: req.body?.storeName || req.body?.store?.name,
        planId: req.body?.planId,
      });
<<<<<<< HEAD
      const result = await authService.register(req.body);
=======
      const result = await authService.register(req.body, { ipAddress: req.ip });
>>>>>>> main
      log.info('Register success', { userId: result.user?.id, storeId: result.store?.id });
      return res.status(201).json(result);
    } catch (error: any)
    {
      log.warn('Register failed', { error, email: req.body?.email || req.body?.user?.email });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async login(req: Request, res: Response)
  {
    const { email, password } = req.body;
    try
    {
      log.info('Login request', { email });
      const result = await authService.login(email, password);
      log.info('Login success', { userId: result.user?.id, storeId: result.store?.id });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Login failed', { email, error });
      return respondWithError(req, res, error, 401);
    }
  }




  /**
   * Executes admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async adminLogin(req: Request, res: Response)
  {
<<<<<<< HEAD
    const { slug, password } = req.body;

    try
    {
      log.info('Admin login request', { slug });
      const result = await authService.adminLogin(slug, password);
      log.info('Admin login success', { storeId: result.store?.id, slug });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Admin login failed', { slug, error });
=======
    const password = req.body?.password;
    const identifier = String(req.body?.identifier || req.body?.slug || req.body?.email || '').trim();

    try
    {
      log.info('Admin login request', { identifier });
      const result = await authService.adminLogin(identifier, password);
      log.info('Admin login success', { storeId: result.store?.id, identifier });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Admin login failed', { identifier, error });
>>>>>>> main
      return respondWithError(req, res, error, 401);
    }
  }




  /**
   * Executes super admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async superAdminLogin(req: Request, res: Response)
  {
    const { email, password } = req.body;
    try
    {
      log.info('Super admin login request', { email });
      const result = await authService.superAdminLogin(email, password);
      log.info('Super admin login success', { email });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Super admin login failed', { email, error });
      return respondWithError(req, res, error, 401);
    }
  }




  /**
   * Executes forgot password logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async forgotPassword(req: Request, res: Response)
  {
    const { email } = req.body || {};
    try
    {
      log.info('Forgot password request', { email });
      const result = await authService.requestPasswordReset(email);
      log.info('Forgot password dispatched', { email });
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any)
    {
      log.warn('Forgot password failed', { email, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes reset password logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async resetPassword(req: Request, res: Response)
  {
    const { token, newPassword } = req.body || {};
    try
    {
      log.info('Reset password request');
      const result = await authService.resetPassword(token, newPassword);
      log.info('Reset password success');
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any)
    {
      log.warn('Reset password failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Verifies email.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async verifyEmail(req: Request, res: Response)
  {
<<<<<<< HEAD
    const { token } = req.body || {};
    try
    {
      log.info('Verify email request');
      const result = await authService.verifyEmail(token);
=======
    const token = String(req.body?.token || req.query?.token || '');
    const email = String(req.body?.email || req.query?.email || '').trim();
    try
    {
      log.info('Verify email request');
      const result = await authService.verifyEmail({ token, email });
>>>>>>> main
      log.info('Verify email success', { redirectUrl: result.redirectUrl });
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any)
    {
      log.warn('Verify email failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes resend verification logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async resendVerification(req: Request, res: Response)
  {
    const { email } = req.body || {};
    try
    {
      log.info('Resend verification request', { email });
<<<<<<< HEAD
      const result = await authService.resendVerificationEmail(email);
=======
      const result = await authService.resendVerificationEmail(email, { ipAddress: req.ip });
>>>>>>> main
      log.info('Resend verification dispatched', { email });
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any)
    {
      log.warn('Resend verification failed', { email, error });
      return respondWithError(req, res, error, 400);
    }
  }
<<<<<<< HEAD
}
=======

  static async changePassword(req: Request, res: Response) {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    try {
      log.info('Change password request', { userId: req.auth?.sub });
      const result = await authService.changePassword(req.auth?.sub || '', currentPassword, newPassword);
      const { code, ...data } = result;
      return respondWithSuccess(req, res, code, data);
    } catch (error: any) {
      log.warn('Change password failed', { userId: req.auth?.sub, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
>>>>>>> main
