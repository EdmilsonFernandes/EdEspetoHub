/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: respondWithError.ts
 * @Date: 2026-01-12
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Response, Request } from 'express';
import { getMessage, resolveLang } from '../i18n';
import { AppError } from './AppError';

type ErrorPayload = {
  code: string;
  message: string;
  details?: Record<string, any> | null;
};

export const respondWithError = (
  req: Request,
  res: Response,
  error: any,
  fallbackStatus = 400
) => {
  let code = 'GEN-001';
  let status = fallbackStatus;
  let details: Record<string, any> | null = null;

  if (error instanceof AppError) {
    code = error.code;
    status = error.status;
    details = error.details ?? null;
  } else if (error?.code && typeof error.code === 'string') {
    code = error.code;
    status = error.status || fallbackStatus;
    details = error.details ?? null;
  }

  const lang = resolveLang(req);
  const payload: ErrorPayload = {
    code,
    message: getMessage(code, lang),
    details,
  };

  return res.status(status).json(payload);
};