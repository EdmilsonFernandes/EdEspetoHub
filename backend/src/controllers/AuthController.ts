import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { env } from '../config/env';

const authService = new AuthService();

export class AuthController
{
  static async register(req: Request, res: Response)
  {
    try
    {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (error: any)
    {
      console.error('❌ REGISTER ERROR:', error);
      return res.status(400).json({ message: error.message });
    }
  }

  static async login(req: Request, res: Response)
  {
    const { email, password } = req.body;
    try
    {
      const result = await authService.login(email, password);
      return res.json(result);
    } catch (error: any)
    {
      return res.status(401).json({ message: error.message });
    }
  }

  static async adminLogin(req: Request, res: Response)
  {
    const { slug, password } = req.body;

    try
    {
      const result = await authService.adminLogin(slug, password);
      return res.json(result);
    } catch (error: any)
    {
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
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { sub: 'super-admin', role: 'SUPER_ADMIN' },
      env.jwtSecret,
      { expiresIn: '12h' }
    );

    return res.json({ token });
  }

  static async forgotPassword(req: Request, res: Response)
  {
    const { email } = req.body || {};
    try
    {
      const result = await authService.requestPasswordReset(email);
      return res.json(result);
    } catch (error: any)
    {
      return res.status(400).json({ message: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response)
  {
    const { token, newPassword } = req.body || {};
    try
    {
      const result = await authService.resetPassword(token, newPassword);
      return res.json(result);
    } catch (error: any)
    {
      return res.status(400).json({ message: error.message });
    }
  }
}
