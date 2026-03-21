/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: accessLogger.ts
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { AccessLogDao } from '../database/dao/AccessLogDao';

export const accessLogger = async (req: Request, res: Response, next: NextFunction) => {
  const accessLogDao = container.get<AccessLogDao>(Tokens.Common.DataLayer.AccessLogRepository);
  
  res.on('finish', () => {
    if (req.auth) {
      accessLogDao.save({
        userId: req.auth.sub,
        storeId: req.auth.storeId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
      } as any);
    }
  });

  next();
};
