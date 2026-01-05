/*
 * EDCORE CONFIDENTIAL
 * -------------------
 * Copyright (C) 2025 EDCORE Tecnologia
 * All Rights Reserved.
 *
 * This source code is the intellectual property of EDCORE.
 * Unauthorized copying, modification or distribution is prohibited.
 *
 * @file authGuard.ts
 * @author Author Name
 * @date 2025-12-22 17:10:41
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'ADMIN' | 'CHURRASQUEIRO' | 'SUPER_ADMIN';

type JwtPayload = {
  sub: string;        // userId
  storeId?: string;   // storeId do dono (opcional para super admin)
  role: UserRole;
};

declare global
{
  namespace Express
  {
    interface Request
    {
      auth?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) =>
{
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
  {
    return res.status(401).json({ message: 'Token ausente' });
  }

  try
  {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.auth = payload;
    return next();
  } catch
  {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireRole = (...roles: UserRole[]) =>
{
  return (req: Request, res: Response, next: NextFunction) =>
  {
    const role = req.auth?.role;
    if (!role || !roles.includes(role))
    {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    return next();
  };
};
