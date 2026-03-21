import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'CHURRASQUEIRO' | 'SUPER_ADMIN' | 'MOTOBOY' | 'STORE_OWNER';

export type JwtPayload = {
  sub: string;        // userId
  storeId?: string;   // storeId do dono (opcional para super admin)
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return respondWithError(req, res, new AppError('AUTH-001', 401), 401);
  }

  try {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.auth = payload;
    return next();
  } catch {
    return respondWithError(req, res, new AppError('AUTH-002', 401), 401);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const normalizeRole = (value?: UserRole): string => {
      if (!value) return '';
      if (value === 'CHURRASQUEIRO') return 'OPERATOR';
      return value;
    };
    
    const role = normalizeRole(req.auth?.role);
    const allowed = roles.map(normalizeRole);
    
    if (!role || !allowed.includes(role)) {
      return respondWithError(req, res, new AppError('AUTH-003', 403), 403);
    }
    return next();
  };
};
