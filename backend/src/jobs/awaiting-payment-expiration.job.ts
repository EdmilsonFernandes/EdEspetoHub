/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * @file: awaiting-payment-expiration.job.ts
 * @Date: 2026-04-21
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
import { OrderPaymentService } from '../services/OrderPaymentService';

const log = logger.child({ scope: 'AwaitingPaymentExpirationJob' });

// PIX expira em 30 min (janela única, decisão 18/08); crédito/débito MP ~30 min.
// O catch-all por created_at cobre pagamentos sem expires_at e dá graça pra
// webhooks atrasados antes do force-cancel.
const DEFAULT_THRESHOLD_MINUTES = 40;

export function scheduleAwaitingPaymentExpirationJob() {
  const enabled = process.env.AWAITING_PAYMENT_EXPIRATION_JOB_ENABLED !== 'false';
  const intervalMs =
    process.env.AWAITING_PAYMENT_EXPIRATION_INTERVAL_MS && Number(process.env.AWAITING_PAYMENT_EXPIRATION_INTERVAL_MS) > 0
      ? Number(process.env.AWAITING_PAYMENT_EXPIRATION_INTERVAL_MS)
      : 2 * 60 * 1000;
  const thresholdMinutes =
    process.env.AWAITING_PAYMENT_EXPIRATION_THRESHOLD_MINUTES && Number(process.env.AWAITING_PAYMENT_EXPIRATION_THRESHOLD_MINUTES) > 0
      ? Number(process.env.AWAITING_PAYMENT_EXPIRATION_THRESHOLD_MINUTES)
      : DEFAULT_THRESHOLD_MINUTES;

  if (!enabled) {
    log.info('Awaiting payment expiration job disabled');
    return;
  }

  const tick = async () => {
    try {
      // Roteia pelo markFailedFromWebhook (choke point): falha o pagamento,
      // cancela o pedido com reason/timeline e DISPARA O PUSH pro cliente —
      // antes o cancelamento era SQL cru silencioso (18/08).
      const rows: { id: string }[] = await AppDataSource.query(
        `
        SELECT op.id
        FROM order_payments op
        INNER JOIN orders o ON o.id = op.order_id
        WHERE o.status = 'awaiting_payment'
          AND op.payment_status = 'PENDING'
          AND (
            (op.expires_at IS NOT NULL AND op.expires_at < NOW() - INTERVAL '2 minutes')
            OR o.created_at < NOW() - ($1 || ' minutes')::INTERVAL
          )
        `,
        [thresholdMinutes]
      );
      if (!rows?.length) return;

      const orderPaymentService = new OrderPaymentService();
      for (const row of rows) {
        await orderPaymentService.markFailedFromWebhook(row.id);
      }
      if (rows.length > 0) {
        log.info('Cancelled stale awaiting_payment orders', { count: rows.length, thresholdMinutes });
      }
    } catch (error: any) {
      log.warn('Awaiting payment expiration tick failed', { error: error?.message || String(error) });
    }
  };

  setInterval(tick, intervalMs);
  tick();
  log.info('Awaiting payment expiration job scheduled', { intervalMs, thresholdMinutes });
}
