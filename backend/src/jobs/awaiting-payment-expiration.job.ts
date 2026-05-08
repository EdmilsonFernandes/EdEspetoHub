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
import { buildOrderTimelineJson } from '../utils/orderTimeline';

const log = logger.child({ scope: 'AwaitingPaymentExpirationJob' });

// PIX expires in 5 min, credit/debit MP preference in ~30 min.
// 40-minute threshold gives enough grace for late webhooks before we force-cancel.
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
      const result = await AppDataSource.query(`
        WITH cancelled AS (
          UPDATE orders
          SET status = 'cancelled',
              payment_status = 'FAILED',
              status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $2::jsonb,
              updated_at = NOW()
          WHERE status = 'awaiting_payment'
            AND created_at < NOW() - ($1 || ' minutes')::INTERVAL
          RETURNING id
        )
        UPDATE order_payments
        SET payment_status = 'FAILED',
            failed_at = NOW()
        WHERE order_id IN (SELECT id FROM cancelled)
          AND payment_status NOT IN ('PAID', 'FAILED')
      `, [thresholdMinutes, buildOrderTimelineJson('cancelled')]);

      const count = result?.[1]?.rowCount ?? 0;
      if (count > 0) {
        log.info('Cancelled stale awaiting_payment orders', { count, thresholdMinutes });
      }
    } catch (error: any) {
      log.warn('Awaiting payment expiration tick failed', { error: error?.message || String(error) });
    }
  };

  setInterval(tick, intervalMs);
  tick();
  log.info('Awaiting payment expiration job scheduled', { intervalMs, thresholdMinutes });
}
