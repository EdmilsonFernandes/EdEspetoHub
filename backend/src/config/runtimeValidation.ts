/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
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

  if (env.storage.publicUploadsMode !== 'local') {
    if (!env.storage.publicUploadsS3Bucket) {
      issues.push('PUBLIC_UPLOADS_S3_BUCKET ausente para modo de storage publico em S3');
    }

    if (!env.storage.publicUploadsS3Region) {
      issues.push('PUBLIC_UPLOADS_S3_REGION ausente para modo de storage publico em S3');
    }
  }

  if (env.mfa.enabled && String(env.mfa.secretEncryptionKey || '').trim().length < 32) {
    issues.push('MFA_SECRET_ENCRYPTION_KEY ausente ou curta demais para MFA_ENABLED=true');
  }

  if (issues.length > 0) {
    throw new Error(`Invalid runtime configuration: ${issues.join('; ')}`);
  }
};
