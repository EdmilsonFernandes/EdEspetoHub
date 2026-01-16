/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: respondWithSuccess.ts
 * @Date: 2026-01-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Response, Request } from 'express';
import { getMessage, resolveLang } from '../i18n';

export const respondWithSuccess = (
  req: Request,
  res: Response,
  code: string,
  data: Record<string, any> = {},
  status = 200
) => {
  const lang = resolveLang(req);
  const payload = {
    ...data,
    code,
    message: getMessage(code, lang),
  };

  return res.status(status).json(payload);
};