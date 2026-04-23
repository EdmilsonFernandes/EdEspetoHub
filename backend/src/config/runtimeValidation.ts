/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: runtimeValidation.ts
 * @Date: 2026-04-23
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { env } from './env';

/**
 * Validates critical runtime configuration before the API starts serving traffic.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-04-23
 */
export const validateCriticalRuntimeConfig = () => {
  const issues: string[] = [];

  if (!env.jwtSecret || env.jwtSecret === 'super-secret-token') {
    issues.push('JWT_SECRET ausente ou inseguro');
  }

  if (env.security.strictRuntimeValidation) {
    if (!env.appUrl || env.appUrl === 'http://localhost:3000') {
      issues.push('APP_BASE_URL ausente ou usando valor local em ambiente estrito');
    }

    if (!/^https?:\/\//i.test(env.appUrl)) {
      issues.push('APP_BASE_URL inválido');
    }
  }

  if (issues.length > 0) {
    throw new Error(`Invalid runtime configuration: ${issues.join('; ')}`);
  }
};
