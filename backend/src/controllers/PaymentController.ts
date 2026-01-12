import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from '../services/PaymentService';
import { env } from '../config/env';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

const paymentService = new PaymentService();
const paymentEventRepository = new PaymentEventRepository();
const log = logger.child({ scope: 'PaymentController' });

export class PaymentController {
  static async confirm(req: Request, res: Response) {
    const { paymentId } = req.body;
    if (!paymentId) return respondWithError(req, res, new AppError('PAY-006', 400), 400);

    try {
      log.info('Payment confirm request', { paymentId });
      const payment = await paymentService.confirmPayment(paymentId);
      log.info('Payment confirmed', { paymentId, status: payment.status });
      return res.json({
        payment: {
          id: payment.id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
        },
        subscriptionStatus: payment.subscription.status,
        storeStatus: payment.store.open ? 'ACTIVE' : 'PENDING_PAYMENT',
      });
    } catch (error: any) {
      log.warn('Payment confirm failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async mercadoPagoWebhook(req: Request, res: Response) {
    if (env.mercadoPago.webhookSecret) {
      const signature = req.headers['x-signature'] as string | undefined;
      const requestId = req.headers['x-request-id'] as string | undefined;
      const dataId = req.body?.data?.id;

      if (!signature || !requestId || !dataId) {
        return respondWithError(req, res, new AppError('PAY-007', 401), 401);
      }

      const parts = signature.split(',').reduce((acc, chunk) => {
        const [key, value] = chunk.split('=');
        acc[key?.trim()] = value?.trim();
        return acc;
      }, {} as Record<string, string>);

      const ts = parts.ts;
      const hash = parts.v1;

      if (!ts || !hash) {
        return respondWithError(req, res, new AppError('PAY-008', 401), 401);
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const expected = crypto
        .createHmac('sha256', env.mercadoPago.webhookSecret)
        .update(manifest)
        .digest('hex');

      if (expected !== hash) {
        return respondWithError(req, res, new AppError('PAY-008', 401), 401);
      }
    }

    const payload = req.body || {};
    const paymentId = payload?.data?.id;
    if (!paymentId) {
      return respondWithError(req, res, new AppError('PAY-009', 200), 200);
    }

    try {
      log.info('Mercado Pago webhook received', { paymentId });
      const result = await paymentService.confirmMercadoPagoPayment(String(paymentId));
      log.info('Mercado Pago webhook processed', { paymentId });
      return res.json({ status: 'ok', result });
    } catch (error: any) {
      log.warn('Mercado Pago webhook failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async getById(req: Request, res: Response) {
    const { paymentId } = req.params;

    try {
      log.debug('Payment get request', { paymentId });
      const payment = await paymentService.findById(paymentId);
      if (!payment) return respondWithError(req, res, new AppError('PAY-001', 404), 404);

      return res.json({
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: Number(payment.amount),
        qrCodeBase64: payment.qrCodeBase64,
        qrCodeText: payment.qrCodeText,
        paymentLink: payment.paymentLink,
        provider: payment.provider,
        providerId: payment.providerId,
        expiresAt: payment.expiresAt,
        storeSlug: payment.store?.slug || null,
        storeName: payment.store?.name || null,
        emailVerified: payment.user?.emailVerified ?? false,
      });
    } catch (error: any) {
      log.warn('Payment get failed', { paymentId, error });
      return respondWithError(req, res, error, 500);
    }
  }

  static async getEvents(req: Request, res: Response) {
    const { paymentId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    try {
      log.debug('Payment events request', { paymentId, limit, offset });
      const events = await paymentEventRepository.findByPaymentId(paymentId, limit, offset);
      const payload = events.map((event) => ({
        id: event.id,
        status: event.status,
        provider: event.provider,
        createdAt: event.createdAt,
        payload: event.payload || null,
      }));
      return res.json(payload);
    } catch (error: any) {
      log.warn('Payment events failed', { paymentId, error });
      return respondWithError(req, res, error, 500);
    }
  }

  static async reprocess(req: Request, res: Response) {
    const { paymentId } = req.params;
    const { providerId } = req.body || {};

    try {
      log.info('Payment reprocess request', { paymentId, providerId });
      const result = await paymentService.reprocessByPaymentId(paymentId, providerId);
      log.info('Payment reprocess success', { paymentId });
      return res.json({ status: 'ok', result });
    } catch (error: any) {
      log.warn('Payment reprocess failed', { paymentId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
