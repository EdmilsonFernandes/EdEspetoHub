/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: authGuard.ts
 * @Date: 2025-12-22
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

export type UserRole =
  | 'ADMIN'
  | 'OPERATOR'
  | 'LOJISTA'
  | 'CHURRASQUEIRO'   // legacy alias — kept for existing JWTs/DB rows
  | 'SUPER_ADMIN'
  | 'CONDOMINIUM_ADMIN'
  | 'DESTINATION_PARTNER'
  | 'MOTOBOY'
  | 'STORE_OWNER'
  | 'CUSTOMER';

type JwtPayload = {
  sub: string;        // userId
  storeId?: string;   // storeId do dono (opcional para super admin)
  condominiumId?: string;
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
 * Handles require auth.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
 * Handles require role.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-22
 */
export const requireRole = (...roles: UserRole[]) =>
{
  return async (req: Request, res: Response, next: NextFunction) =>
  {
    try {
      const normalizeRole = (value?: UserRole) => {
        if (!value) return '';
        if (value === 'CHURRASQUEIRO') return 'OPERATOR'; // legacy
        if (value === 'LOJISTA') return 'OPERATOR';
        return value;
      };
      const role = normalizeRole(req.auth?.role);
      const allowed = roles.map(normalizeRole);
      if (!role || !allowed.includes(role))
      {
        return respondWithError(req, res, new AppError('AUTH-003', 403), 403);
      }

      const protectsStoreAdmin = allowed.some((allowedRole) => [ 'ADMIN', 'OPERATOR', 'STORE_OWNER' ].includes(allowedRole));
      if (protectsStoreAdmin && req.auth?.storeId) {
        const pendingClaims = await AppDataSource.query(
          `
            SELECT id, status
            FROM destination_partner_requests
            WHERE store_id = $1
              AND claimed_listing_id IS NOT NULL
              AND request_source = 'store_signup_destination_claim'
              AND status <> 'approved'
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [ req.auth.storeId ]
        );
        const pendingClaim = pendingClaims?.[0];
        if (pendingClaim) {
          return respondWithError(req, res, new AppError('AUTH-029', 409, {
            requestId: pendingClaim.id,
            status: pendingClaim.status,
          }), 409);
        }
      }

      return next();
    } catch (error) {
      return respondWithError(req, res, error, 403);
    }
  };
};

export const hydrateAuthOptional = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.auth = payload;
  } catch {
    // Intencional: para rotas públicas, token inválido não deve bloquear o request.
  }

  return next();
};
