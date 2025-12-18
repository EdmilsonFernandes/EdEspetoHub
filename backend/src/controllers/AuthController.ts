import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

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
}
