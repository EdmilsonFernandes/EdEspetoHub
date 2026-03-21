/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: delivery-expiration.job.ts
 * @Date: 2026-02-09
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';

const log = logger.child({ scope: 'DeliveryExpirationJob' });

export function scheduleDeliveryExpirationJob() {
  const enabled = process.env.DELIVERY_EXPIRATION_JOB_ENABLED !== 'false';
  const intervalMs =
    process.env.DELIVERY_EXPIRATION_INTERVAL_MS && Number(process.env.DELIVERY_EXPIRATION_INTERVAL_MS) > 0
      ? Number(process.env.DELIVERY_EXPIRATION_INTERVAL_MS)
      : 2 * 60 * 1000;

  if (!enabled) {
    log.info('Delivery expiration job disabled');
    return;
  }

  const tick = async () => {
    try {
      // Expire AVAILABLE deliveries that crossed expires_at.
      await AppDataSource.query(`
        WITH expired AS (
          UPDATE order_deliveries
          SET status = 'EXPIRED'
          WHERE COALESCE(NULLIF(UPPER(status), ''), 'AVAILABLE') = 'AVAILABLE'
            AND motoboy_id IS NULL
            AND expires_at IS NOT NULL
            AND expires_at < NOW()
          RETURNING order_id
        )
        INSERT INTO delivery_events (delivery_id, actor_type, actor_id, from_status, to_status, metadata)
        SELECT order_id, 'SYSTEM', NULL, 'AVAILABLE', 'EXPIRED', jsonb_build_object('reason','expires_at')
        FROM expired
      `);
    } catch (error: any) {
      log.warn('Delivery expiration tick failed', { error: error?.message || String(error) });
    }
  };

  setInterval(tick, intervalMs);
  // Fire once on boot.
  tick();
  log.info('Delivery expiration job scheduled', { intervalMs });
}
