import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) { res.status(err.statusCode).json({ data: null, error: { code: err.code, message: err.message } }); return; }
    console.error('[unhandled error]', err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
