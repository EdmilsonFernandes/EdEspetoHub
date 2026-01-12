import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { SubscriptionService } from '../services/SubscriptionService';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

const subscriptionService = new SubscriptionService();

const GRACE_HOURS = 24;
const GRACE_MS = GRACE_HOURS * 60 * 60 * 1000;

const resolveStoreParams = (req: Request) =>
{
  const storeId =
    (req.params.storeId as string) ||
    (req.body?.storeId as string) ||
    (req.query.storeId as string) ||
    null;

  const slug =
    (req.params.slug as string) ||
    (req.body?.storeSlug as string) ||
    null;

  return { storeId, slug };
};

// 🔐 extrai role se houver token
const getRoleFromAuthHeader = (req: Request): string | null =>
{
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  try
  {
    const payload = jwt.verify(auth.slice(7), env.jwtSecret) as any;
    return payload?.role ?? null;
  } catch
  {
    return null;
  }
};

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) =>
{
  const role = getRoleFromAuthHeader(req);

  // ✅ ADMIN / CHURRASQUEIRO nunca bloqueia
  if (role === 'ADMIN' || role === 'CHURRASQUEIRO')
  {
    return next();
  }

  const { storeId, slug } = resolveStoreParams(req);
  if (!storeId && !slug)
  {
    return respondWithError(req, res, new AppError('GEN-002', 400), 400);
  }

  try
  {
    const subscription = storeId
      ? await subscriptionService.getCurrentByStore(storeId)
      : await subscriptionService.getCurrentByStoreSlug(slug!);

    if (!subscription)
    {
      return respondWithError(
        req,
        res,
        new AppError('SUB-002', 403, { subscription: null }),
        403
      );
    }

    const now = Date.now();
    const end = new Date(subscription.endDate).getTime();

    // ✅ carência de 24h após expiração
    const withinGrace = now <= end + GRACE_MS;

    const blocked =
      subscription.status === 'CANCELLED' ||
      subscription.status === 'SUSPENDED' ||
      !withinGrace;

    if (blocked)
    {
      return respondWithError(
        req,
        res,
        new AppError('SUB-002', 403, { subscription }),
        403
      );
    }

    return next();
  } catch (error: any)
  {
    return respondWithError(req, res, error, 500);
  }
};
