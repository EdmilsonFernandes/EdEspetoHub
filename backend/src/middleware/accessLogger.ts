/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: accessLogger.ts
 * @Date: 2026-01-15
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { NextFunction, Request, Response } from 'express';
import { AccessLogRepository } from '../repositories/AccessLogRepository';
import { logger } from '../utils/logger';

const accessLogRepository = new AccessLogRepository();
const log = logger.child({ scope: 'AccessLogger' });
/**
 * Handles access logger.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-15
 */
export const accessLogger = (req: Request, res: Response, next: NextFunction) =>
{
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }

  res.on('finish', () => {
    const auth = req.auth;
    if (!auth?.sub || !auth?.role) return;
    if (req.originalUrl.startsWith('/api/docs')) return;

    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip;

    accessLogRepository
      .save({
        userId: auth.sub,
        storeId: auth.storeId,
        role: auth.role,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ipAddress,
        userAgent: req.headers['user-agent'],
      })
      .catch((error) => log.warn('Failed to persist access log', { error }));
  });

  return next();
};