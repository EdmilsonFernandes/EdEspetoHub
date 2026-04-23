/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: rateLimit.ts
 * @Date: 2026-04-23
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
};

type BucketEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketEntry>();

/**
 * Resolves the best-effort client key for rate limiting.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-04-23
 */
const getClientKey = (req: Request) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return forwarded || req.ip || 'unknown';
};

/**
 * Creates a lightweight in-memory rate limiter for low-traffic auth endpoints.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-04-23
 */
export const createRateLimit = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const now = Date.now();
    const key = `${options.keyPrefix}:${getClientKey(req)}`;
    const current = buckets.get(key);
    const active =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + options.windowMs,
          };

    active.count += 1;
    buckets.set(key, active);

    if (active.count > options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((active.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        code: 'RATE_LIMIT',
        message: options.message,
        retryAfterSeconds,
      });
    }

    if (buckets.size > 5000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    return next();
  };
};

export const authLoginRateLimit = createRateLimit({
  keyPrefix: 'auth-login',
  windowMs: env.security.authRateLimitWindowMs,
  max: env.security.authRateLimitMax,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

export const authRecoveryRateLimit = createRateLimit({
  keyPrefix: 'auth-recovery',
  windowMs: env.security.recoveryRateLimitWindowMs,
  max: env.security.recoveryRateLimitMax,
  message: 'Muitas tentativas nesta ação. Aguarde alguns minutos e tente novamente.',
});
