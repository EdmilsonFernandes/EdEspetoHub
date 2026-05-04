import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
export interface SessionUser { id: string; role: string; storeId?: string; email?: string; }
declare global { namespace Express { interface Request { user?: SessionUser; token?: string; } } }
export function authRequired(req: Request, res: Response, next: NextFunction): void {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) { res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }); return; }
    try { const t = h.slice(7); req.user = jwt.verify(t, env.jwtSecret) as SessionUser; req.token = t; next(); }
    catch { res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }); }
}
export function authOptional(req: Request, _res: Response, next: NextFunction): void {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) { try { const t = h.slice(7); req.user = jwt.verify(t, env.jwtSecret) as SessionUser; req.token = t; } catch {} }
    next();
}
