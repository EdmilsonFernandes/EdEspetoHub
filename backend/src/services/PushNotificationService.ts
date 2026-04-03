import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

type CustomerPushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

const log = logger.child({ scope: 'PushNotificationService' });

/**
 * Handles customer mobile push token lifecycle and delivery.
 *
 * @author Edmilson Lopes
 */
export class PushNotificationService {
  /**
   * Registers or reactivates a customer push token.
   *
   * @author Edmilson Lopes
   */
  async registerCustomerToken(
    userId: string,
    input: { token: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    const token = String(input?.token || '').trim();
    if (!token || token.length < 24) {
      return { ok: false, reason: 'invalid_token' as const };
    }
    const platform = String(input?.platform || 'android').trim().toLowerCase() || 'android';
    const appVersion = String(input?.appVersion || '').trim() || null;
    const deviceModel = String(input?.deviceModel || '').trim() || null;

    await AppDataSource.query(
      `
        INSERT INTO customer_push_tokens (user_id, token, platform, app_version, device_model, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
        ON CONFLICT (token)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          platform = EXCLUDED.platform,
          app_version = EXCLUDED.app_version,
          device_model = EXCLUDED.device_model,
          is_active = TRUE,
          updated_at = NOW()
      `,
      [userId, token, platform, appVersion, deviceModel]
    );

    return { ok: true };
  }

  /**
   * Deactivates one token or all tokens for a customer.
   *
   * @author Edmilson Lopes
   */
  async unregisterCustomerToken(userId: string, token?: string | null) {
    const normalized = String(token || '').trim();
    if (normalized) {
      await AppDataSource.query(
        `
          UPDATE customer_push_tokens
          SET is_active = FALSE, updated_at = NOW()
          WHERE user_id = $1
            AND token = $2
        `,
        [userId, normalized]
      );
      return { ok: true };
    }

    await AppDataSource.query(
      `
        UPDATE customer_push_tokens
        SET is_active = FALSE, updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId]
    );
    return { ok: true };
  }

  /**
   * Dispatches an order update push to all active tokens from one customer.
   *
   * @author Edmilson Lopes
   */
  async notifyCustomerOrderUpdate(
    userId: string,
    payload: CustomerPushPayload
  ) {
    const serverKey = String(env.push?.fcmServerKey || '').trim();
    if (!serverKey) {
      log.info('Push skipped (missing FCM server key)', { userId });
      return { ok: false, sent: 0, skipped: true };
    }

    const rows: Array<{ token: string }> = await AppDataSource.query(
      `
        SELECT token
        FROM customer_push_tokens
        WHERE user_id = $1
          AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 10
      `,
      [userId]
    );

    const tokens = rows.map((row) => String(row?.token || '').trim()).filter(Boolean);
    if (!tokens.length) return { ok: true, sent: 0 };

    let sent = 0;
    for (const token of tokens) {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            Authorization: `key=${serverKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            priority: 'high',
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data || {},
          }),
        });
        if (response.ok) {
          sent += 1;
          continue;
        }
        if (response.status === 404 || response.status === 410) {
          await this.unregisterCustomerToken(userId, token);
        }
      } catch (error) {
        log.warn('Push send failed', { userId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return { ok: true, sent };
  }
}

