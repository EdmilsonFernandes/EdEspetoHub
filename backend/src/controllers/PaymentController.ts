import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from '../services/PaymentService';
import { env } from '../config/env';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();
const paymentEventRepository = new PaymentEventRepository();
const log = logger.child({ scope: 'PaymentController' });

export class PaymentController {
  static async confirm(req: Request, res: Response) {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ message: 'paymentId é obrigatório' });

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
      return res.status(400).json({ message: error.message });
    }
  }

  static async mercadoPagoWebhook(req: Request, res: Response) {
    if (env.mercadoPago.webhookSecret) {
      const signature = req.headers['x-signature'] as string | undefined;
      const requestId = req.headers['x-request-id'] as string | undefined;
      const dataId = req.body?.data?.id;

      if (!signature || !requestId || !dataId) {
        return res.status(401).json({ message: 'Assinatura ausente' });
      }

      const parts = signature.split(',').reduce((acc, chunk) => {
        const [key, value] = chunk.split('=');
        acc[key?.trim()] = value?.trim();
        return acc;
      }, {} as Record<string, string>);

      const ts = parts.ts;
      const hash = parts.v1;

      if (!ts || !hash) {
        return res.status(401).json({ message: 'Assinatura invalida' });
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const expected = crypto
        .createHmac('sha256', env.mercadoPago.webhookSecret)
        .update(manifest)
        .digest('hex');

      if (expected !== hash) {
        return res.status(401).json({ message: 'Assinatura invalida' });
      }
    }

    const payload = req.body || {};
    const paymentId = payload?.data?.id;
    if (!paymentId) {
      return res.status(200).json({ message: 'Evento ignorado' });
    }

    try {
      log.info('Mercado Pago webhook received', { paymentId });
      const result = await paymentService.confirmMercadoPagoPayment(String(paymentId));
      log.info('Mercado Pago webhook processed', { paymentId });
      return res.json({ status: 'ok', result });
    } catch (error: any) {
      log.warn('Mercado Pago webhook failed', { paymentId, error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    const { paymentId } = req.params;

    try {
      log.debug('Payment get request', { paymentId });
      const payment = await paymentService.findById(paymentId);
      if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });

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
      return res.status(500).json({ message: error.message });
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
      return res.status(500).json({ message: error.message });
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
      return res.status(400).json({ message: error.message });
    }
  }
}
