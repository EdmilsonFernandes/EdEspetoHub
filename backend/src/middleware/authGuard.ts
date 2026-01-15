/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: authGuard.ts
 * @Date: 2025-12-22
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

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
 * @date 2025-12-22
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

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

/**
 * Executes require auth logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-22
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) =>
{
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
  {
    return respondWithError(req, res, new AppError('AUTH-001', 401), 401);
  }

  try
  {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.auth = payload;
    return next();
  } catch
  {
    return respondWithError(req, res, new AppError('AUTH-002', 401), 401);
  }
};

/**
 * Executes require role logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-22
 */
export const requireRole = (...roles: UserRole[]) =>
{
  return (req: Request, res: Response, next: NextFunction) =>
  {
    const role = req.auth?.role;
    if (!role || !roles.includes(role))
    {
      return respondWithError(req, res, new AppError('AUTH-003', 403), 403);
    }
    return next();
  };
};
