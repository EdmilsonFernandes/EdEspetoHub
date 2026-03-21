import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Provide } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { UserRole, JwtPayload } from '../models/Auth';

@Provide(Tokens.Middleware.AuthGuard)
export class AuthGuardMiddleware {
  
  public requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      respondWithError(req, res, new AppError('AUTH-001', 401), 401);
      return;
    }

    try {
      const token = header.slice('Bearer '.length);
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      req.auth = payload;
      return next();
    } catch {
      respondWithError(req, res, new AppError('AUTH-002', 401), 401);
      return;
    }
  }

  public requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const normalizeRole = (value?: UserRole): string => {
        if (!value) return '';
        if (value === 'CHURRASQUEIRO') return 'OPERATOR';
        return value;
      };
      
      const role = normalizeRole(req.auth?.role);
      const allowed = roles.map(normalizeRole);
      
      if (!role || !allowed.includes(role)) {
        respondWithError(req, res, new AppError('AUTH-003', 403), 403);
        return;
      }
      return next();
    };
  }
}
