import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const httpLogger = logger.child({ scope: 'http' });

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    httpLogger.log(level, 'HTTP request', {
      method: req.method,
      path: req.originalUrl,
      status,
      durationMs,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
};
