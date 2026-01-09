import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const authService = new AuthService();
const log = logger.child({ scope: 'AuthController' });

export class AuthController
{
  static async register(req: Request, res: Response)
  {
    try
    {
      log.info('Register request', {
        email: req.body?.email || req.body?.user?.email,
        storeName: req.body?.storeName || req.body?.store?.name,
        planId: req.body?.planId,
      });
      const result = await authService.register(req.body);
      log.info('Register success', { userId: result.user?.id, storeId: result.store?.id });
      return res.status(201).json(result);
    } catch (error: any)
    {
      log.warn('Register failed', { error, email: req.body?.email || req.body?.user?.email });
      return res.status(400).json({ message: error.message });
    }
  }

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
      return res.status(401).json({ message: error.message });
    }
  }

  static async adminLogin(req: Request, res: Response)
  {
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
      const status = error.message === 'Loja não encontrada' ? 404 : 401;
      return res.status(status).json({ message: error.message });
    }
  }

  static async superAdminLogin(req: Request, res: Response)
  {
    const { email, password } = req.body;
    if (!env.superAdminEmail || !env.superAdminPassword)
    {
      return res.status(500).json({ message: 'SUPER_ADMIN_* não configurado' });
    }

    if (email !== env.superAdminEmail || password !== env.superAdminPassword)
    {
      log.warn('Super admin login failed', { email });
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { sub: 'super-admin', role: 'SUPER_ADMIN' },
      env.jwtSecret,
      { expiresIn: '12h' }
    );

    log.info('Super admin login success', { email });
    return res.json({ token });
  }

  static async forgotPassword(req: Request, res: Response)
  {
    const { email } = req.body || {};
    try
    {
      log.info('Forgot password request', { email });
      const result = await authService.requestPasswordReset(email);
      log.info('Forgot password dispatched', { email });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Forgot password failed', { email, error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response)
  {
    const { token, newPassword } = req.body || {};
    try
    {
      log.info('Reset password request');
      const result = await authService.resetPassword(token, newPassword);
      log.info('Reset password success');
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Reset password failed', { error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async verifyEmail(req: Request, res: Response)
  {
    const { token } = req.body || {};
    try
    {
      log.info('Verify email request');
      const result = await authService.verifyEmail(token);
      log.info('Verify email success', { redirectUrl: result.redirectUrl });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Verify email failed', { error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async resendVerification(req: Request, res: Response)
  {
    const { email } = req.body || {};
    try
    {
      log.info('Resend verification request', { email });
      const result = await authService.resendVerificationEmail(email);
      log.info('Resend verification dispatched', { email });
      return res.json(result);
    } catch (error: any)
    {
      log.warn('Resend verification failed', { email, error });
      return res.status(400).json({ message: error.message });
    }
  }
}
