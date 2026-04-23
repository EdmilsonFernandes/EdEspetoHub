/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: apiSecurity.ts
 * @Date: 2026-04-23
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { NextFunction, Request, Response } from 'express';

/**
 * Applies conservative security headers without CSP so the current frontend flow keeps working.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-04-23
 */
export const applyApiSecurityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  const forwardedProto = String(res.req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (res.req.secure || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  return next();
};
