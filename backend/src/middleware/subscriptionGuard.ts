import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { SubscriptionService } from '../services/SubscriptionService';

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
    return res.status(400).json({ message: 'Loja não informada' });
  }

  try
  {
    const subscription = storeId
      ? await subscriptionService.getCurrentByStore(storeId)
      : await subscriptionService.getCurrentByStoreSlug(slug!);

    if (!subscription)
    {
      return res.status(403).json({
        message: 'Assinatura inativa. Renove para continuar.',
        subscription: null,
      });
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
      return res.status(403).json({
        message: 'Assinatura inativa. Renove para continuar.',
        subscription,
      });
    }

    return next();
  } catch (error: any)
  {
    return res.status(500).json({ message: error.message });
  }
};
