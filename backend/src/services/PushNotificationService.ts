import { createSign } from 'crypto';
import fs from 'fs';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EmailService } from './EmailService';

type CustomerPushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: {
    channelId?: string;
  };
  // true = mensagem DATA-ONLY (sem bloco `notification`). Necessario para pushes que precisam
  // disparar onMessageReceived mesmo em background/Doze (ex.: auto-print de pedido da loja).
  // Mensagens com bloco notification em background sao entregues a bandeja do sistema e NAO
  // chamam onMessageReceived -> o printOrderInline nunca roda -> nao imprime com tela apagada.
  dataOnly?: boolean;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type PushSendResult = {
  ok: boolean;
  deactivateToken?: boolean;
  status?: number;
  errorCode?: string;
  body?: any;
};

const log = logger.child({ scope: 'PushNotificationService' });

/**
 * Handles customer mobile push token lifecycle and delivery.
 *
 * @author Edmilson Lopes
 */
export class PushNotificationService {
  private accessTokenCache: { token: string; expiresAt: number } | null = null;
  private emailService = new EmailService();

  /**
   * Registers or reactivates a customer push token.
   *
   * @author Edmilson Lopes
   */
  async registerCustomerToken(
    userId: string,
    input: { token: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    return this.registerTokenCore({ userId, guestId: null, input });
  }

  /**
   * Registers or reactivates a guest push token.
   *
   * @author Edmilson Lopes
   */
  async registerGuestToken(
    guestId: string,
    input: { token: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    return this.registerTokenCore({ userId: null, guestId, input });
  }

  private async registerTokenCore(params: {
    userId: string | null;
    guestId: string | null;
    input: { token: string; platform?: string; appVersion?: string; deviceModel?: string };
  }) {
    const { userId, guestId, input } = params;
    const token = String(input?.token || '').trim();
    if (!token || token.length < 24) {
      return { ok: false, reason: 'invalid_token' as const };
    }
    if (!userId && !guestId) {
      return { ok: false, reason: 'missing_identity' as const };
    }
    const platform = String(input?.platform || 'android').trim().toLowerCase() || 'android';
    const appVersion = String(input?.appVersion || '').trim() || null;
    const deviceModel = String(input?.deviceModel || '').trim() || null;

    await AppDataSource.query(
      `
        INSERT INTO customer_push_tokens (user_id, guest_id, token, platform, app_version, device_model, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
        ON CONFLICT (token)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          guest_id = EXCLUDED.guest_id,
          platform = EXCLUDED.platform,
          app_version = EXCLUDED.app_version,
          device_model = EXCLUDED.device_model,
          is_active = TRUE,
          updated_at = NOW()
      `,
      [userId, guestId || null, token, platform, appVersion, deviceModel]
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
   * Deactivates one token or all tokens for a guest id.
   *
   * @author Edmilson Lopes
   */
  async unregisterGuestToken(guestId: string, token?: string | null) {
    const normalizedGuest = String(guestId || '').trim();
    if (!normalizedGuest) return { ok: false, reason: 'missing_guest' as const };
    const normalizedToken = String(token || '').trim();
    if (normalizedToken) {
      await AppDataSource.query(
        `
          UPDATE customer_push_tokens
          SET is_active = FALSE, updated_at = NOW()
          WHERE guest_id = $1
            AND token = $2
        `,
        [normalizedGuest, normalizedToken]
      );
      return { ok: true };
    }
    await AppDataSource.query(
      `
        UPDATE customer_push_tokens
        SET is_active = FALSE, updated_at = NOW()
        WHERE guest_id = $1
      `,
      [normalizedGuest]
    );
    return { ok: true };
  }

  /**
   * Registers or reactivates a motoboy push token.
   *
   * @author Edmilson Lopes
   */
  async registerMotoboyToken(
    motoboyId: string,
    userId: string,
    input: { token: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    const token = String(input?.token || '').trim();
    if (!token || token.length < 24) {
      return { ok: false, reason: 'invalid_token' as const };
    }
    const normalizedMotoboyId = String(motoboyId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedMotoboyId || !normalizedUserId) {
      return { ok: false, reason: 'missing_identity' as const };
    }

    const platform = String(input?.platform || 'android').trim().toLowerCase() || 'android';
    const appVersion = String(input?.appVersion || '').trim() || null;
    const deviceModel = String(input?.deviceModel || '').trim() || null;

    await AppDataSource.query(
      `
        INSERT INTO motoboy_push_tokens
          (motoboy_id, user_id, token, platform, app_version, device_model, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
        ON CONFLICT (token)
        DO UPDATE SET
          motoboy_id = EXCLUDED.motoboy_id,
          user_id = EXCLUDED.user_id,
          platform = EXCLUDED.platform,
          app_version = EXCLUDED.app_version,
          device_model = EXCLUDED.device_model,
          is_active = TRUE,
          updated_at = NOW()
      `,
      [normalizedMotoboyId, normalizedUserId, token, platform, appVersion, deviceModel]
    );
    return { ok: true };
  }

  /**
   * Deactivates one token or all tokens for a motoboy.
   *
   * @author Edmilson Lopes
   */
  async unregisterMotoboyToken(motoboyId: string, token?: string | null) {
    const normalizedMotoboyId = String(motoboyId || '').trim();
    if (!normalizedMotoboyId) return { ok: false, reason: 'missing_motoboy' as const };
    const normalizedToken = String(token || '').trim();
    if (normalizedToken) {
      await AppDataSource.query(
        `
          UPDATE motoboy_push_tokens
          SET is_active = FALSE, updated_at = NOW()
          WHERE motoboy_id = $1
            AND token = $2
        `,
        [normalizedMotoboyId, normalizedToken]
      );
      return { ok: true };
    }
    await AppDataSource.query(
      `
        UPDATE motoboy_push_tokens
        SET is_active = FALSE, updated_at = NOW()
        WHERE motoboy_id = $1
      `,
      [normalizedMotoboyId]
    );
    return { ok: true };
  }

  /**
   * Registers or reactivates one store user push token.
   *
   * @author Edmilson Lopes
   */
  async registerStoreUserToken(
    storeId: string,
    userId: string,
    input: { token: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    const token = String(input?.token || '').trim();
    if (!token || token.length < 24) {
      return { ok: false, reason: 'invalid_token' as const };
    }
    const normalizedStoreId = String(storeId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedStoreId || !normalizedUserId) {
      return { ok: false, reason: 'missing_identity' as const };
    }

    const platform = String(input?.platform || 'android').trim().toLowerCase() || 'android';
    const appVersion = String(input?.appVersion || '').trim() || null;
    const deviceModel = String(input?.deviceModel || '').trim() || null;

    await AppDataSource.query(
      `
        INSERT INTO store_user_push_tokens
          (store_id, user_id, token, platform, app_version, device_model, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
        ON CONFLICT (token)
        DO UPDATE SET
          store_id = EXCLUDED.store_id,
          user_id = EXCLUDED.user_id,
          platform = EXCLUDED.platform,
          app_version = EXCLUDED.app_version,
          device_model = EXCLUDED.device_model,
          is_active = TRUE,
          updated_at = NOW()
      `,
      [normalizedStoreId, normalizedUserId, token, platform, appVersion, deviceModel]
    );
    return { ok: true };
  }

  /**
   * Deactivates one token or all tokens for a store user within one store.
   *
   * @author Edmilson Lopes
   */
  async unregisterStoreUserToken(storeId: string, userId: string, token?: string | null) {
    const normalizedStoreId = String(storeId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedStoreId || !normalizedUserId) {
      return { ok: false, reason: 'missing_identity' as const };
    }
    const normalizedToken = String(token || '').trim();
    if (normalizedToken) {
      await AppDataSource.query(
        `
          UPDATE store_user_push_tokens
          SET is_active = FALSE, updated_at = NOW()
          WHERE store_id = $1
            AND user_id = $2
            AND token = $3
        `,
        [normalizedStoreId, normalizedUserId, normalizedToken]
      );
      return { ok: true };
    }

    await AppDataSource.query(
      `
        UPDATE store_user_push_tokens
        SET is_active = FALSE, updated_at = NOW()
        WHERE store_id = $1
          AND user_id = $2
      `,
      [normalizedStoreId, normalizedUserId]
    );
    return { ok: true };
  }

  private base64Url(input: string) {
    return Buffer.from(input).toString('base64url');
  }

  private resolveServiceAccount(): FirebaseServiceAccount | null {
    const inlineJson = String(env.push?.fcmServiceAccountJson || '').trim();
    if (inlineJson) {
      try {
        return JSON.parse(inlineJson) as FirebaseServiceAccount;
      } catch {
        log.warn('FCM v1 service account JSON is invalid');
      }
    }

    const path = String(env.push?.fcmServiceAccountPath || '').trim();
    if (!path) return null;
    if (!fs.existsSync(path)) {
      log.warn('FCM v1 service account file not found', { path });
      return null;
    }
    try {
      const raw = fs.readFileSync(path, 'utf8');
      return JSON.parse(raw) as FirebaseServiceAccount;
    } catch (error) {
      log.warn('FCM v1 service account file is invalid', {
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private resolveFcmV1Config() {
    const serviceAccount = this.resolveServiceAccount();
    if (!serviceAccount) return null;

    const projectId = String(env.push?.fcmProjectId || serviceAccount.project_id || '').trim();
    const clientEmail = String(serviceAccount.client_email || '').trim();
    const privateKey = String(serviceAccount.private_key || '').trim();
    const tokenUri = String(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token').trim();
    if (!projectId || !clientEmail || !privateKey) return null;

    return { projectId, clientEmail, privateKey, tokenUri };
  }

  private async getFcmV1AccessToken(config: {
    clientEmail: string;
    privateKey: string;
    tokenUri: string;
  }) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > nowSeconds + 60) {
      return this.accessTokenCache.token;
    }

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: config.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: config.tokenUri,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    };
    const unsignedJwt = `${this.base64Url(JSON.stringify(header))}.${this.base64Url(JSON.stringify(payload))}`;
    const signature = createSign('RSA-SHA256').update(unsignedJwt).sign(config.privateKey, 'base64url');
    const assertion = `${unsignedJwt}.${signature}`;

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });
    const response = await fetch(config.tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.access_token) {
      throw new Error(`FCM v1 token failed: status=${response.status}`);
    }

    const expiresIn = Number(json.expires_in || 3600);
    this.accessTokenCache = {
      token: String(json.access_token),
      expiresAt: nowSeconds + Math.max(60, expiresIn - 60),
    };
    return this.accessTokenCache.token;
  }

  private normalizeV1ErrorCode(body: any) {
    const detailCode = body?.error?.details?.find?.((item: any) => item?.errorCode)?.errorCode;
    if (detailCode) return String(detailCode);
    return String(body?.error?.status || body?.error?.message || '').trim();
  }

  private async sendViaFcmV1(token: string, payload: CustomerPushPayload): Promise<PushSendResult> {
    const config = this.resolveFcmV1Config();
    if (!config) return { ok: false, errorCode: 'FCM_V1_CONFIG_MISSING' };

    try {
      const accessToken = await this.getFcmV1AccessToken(config);
      const android: Record<string, any> = { priority: 'high' };
      const channelId = String(payload.android?.channelId || '').trim();
      if (channelId) {
        android.notification = {
          channel_id: channelId,
        };
      }

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              // dataOnly: sem bloco notification -> onMessageReceived dispara em background/Doze.
              ...(payload.dataOnly ? {} : {
                notification: {
                  title: payload.title,
                  body: payload.body,
                },
              }),
              data: payload.data || {},
              android,
            },
          }),
        }
      );

      const body = await response.json().catch(() => null);
      if (response.ok) {
        return { ok: true };
      }

      const code = this.normalizeV1ErrorCode(body);
      // INVALID_ARGUMENT (ex.: payload > 4KB) NAO desativa o token — apenas erros de
      // token invalido. Desativar por tamanho quebraria todos os pushes seguintes.
      const deactivateToken =
        code === 'UNREGISTERED' ||
        code === 'NOT_FOUND' ||
        code === 'SENDER_ID_MISMATCH';
      return {
        ok: false,
        status: response.status,
        errorCode: code,
        deactivateToken,
        body,
      };
    } catch (error) {
      return {
        ok: false,
        errorCode: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async sendViaLegacyFcm(token: string, payload: CustomerPushPayload): Promise<PushSendResult> {
    const serverKey = String(env.push?.fcmServerKey || '').trim();
    if (!serverKey) return { ok: false, errorCode: 'FCM_LEGACY_KEY_MISSING' };

    try {
      const notification: Record<string, any> = {
        title: payload.title,
        body: payload.body,
      };
      const channelId = String(payload.android?.channelId || '').trim();
      if (channelId) {
        notification.android_channel_id = channelId;
      }

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          priority: 'high',
          ...(payload.dataOnly ? {} : { notification }),
          data: payload.data || {},
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          body,
          deactivateToken: response.status === 404 || response.status === 410,
        };
      }

      const result = Array.isArray(body?.results) ? body.results[0] : null;
      if (result?.message_id) return { ok: true };
      const code = String(result?.error || '').trim();
      return {
        ok: false,
        errorCode: code || 'LEGACY_RESULT_ERROR',
        body,
        deactivateToken:
          code === 'InvalidRegistration' ||
          code === 'NotRegistered' ||
          code === 'MismatchSenderId',
      };
    } catch (error) {
      return { ok: false, errorCode: error instanceof Error ? error.message : String(error) };
    }
  }

  private async sendToToken(token: string, payload: CustomerPushPayload) {
    const v1Config = this.resolveFcmV1Config();
    if (v1Config) return this.sendViaFcmV1(token, payload);
    return this.sendViaLegacyFcm(token, payload);
  }

  private async dispatchByOwner(params: {
    ownerKey: string;
    ownerValue: string;
    payload: CustomerPushPayload;
    noTokenLogMessage: string;
    dispatchFinishedMessage: string;
  }) {
    const ownerValue = String(params.ownerValue || '').trim();
    if (!ownerValue) return { ok: false, sent: 0, skipped: true };

    const hasV1 = Boolean(this.resolveFcmV1Config());
    const hasLegacy = Boolean(String(env.push?.fcmServerKey || '').trim());
    if (!hasV1 && !hasLegacy) {
      log.info('Push skipped (missing FCM config)', { [params.ownerKey]: ownerValue });
      return { ok: false, sent: 0, skipped: true };
    }

    const rows: Array<{ token: string }> = await AppDataSource.query(
      `
        SELECT token
        FROM customer_push_tokens
        WHERE ${params.ownerKey === 'userId' ? 'user_id' : 'guest_id'} = $1
          AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 10
      `,
      [ownerValue]
    );
    const tokens = rows.map((row) => String(row?.token || '').trim()).filter(Boolean);
    if (!tokens.length) {
      log.info(params.noTokenLogMessage, { [params.ownerKey]: ownerValue });
      return { ok: true, sent: 0, skipped: true };
    }

    let sent = 0;
    for (const token of tokens) {
      const result = await this.sendToToken(token, params.payload);
      if (result.ok) {
        sent += 1;
        continue;
      }

      log.warn('Push send failed', {
        [params.ownerKey]: ownerValue,
        tokenSuffix: token.slice(-8),
        status: result.status,
        errorCode: result.errorCode,
        body: result.body,
      });

      if (result.deactivateToken) {
        if (params.ownerKey === 'userId') {
          await this.unregisterCustomerToken(ownerValue, token);
        } else {
          await this.unregisterGuestToken(ownerValue, token);
        }
      }
    }

    log.info(params.dispatchFinishedMessage, {
      [params.ownerKey]: ownerValue,
      sent,
      attempted: tokens.length,
    });
    return { ok: true, sent };
  }

  private resolveCustomerStatusLabel(status?: string | null) {
    const normalized = String(status || '').trim().toLowerCase();
    const labels: Record<string, string> = {
      pending: 'Pedido recebido',
      awaiting_payment: 'Pagamento pendente',
      preparing: 'Pedido em preparo',
      ready: 'Pedido pronto',
      ready_for_delivery: 'Pedido pronto',
      waiting_for_motoboy: 'Aguardando entregador',
      dispatched: 'Pedido saiu para entrega',
      in_delivery: 'Pedido saiu para entrega',
      delivered: 'Pedido entregue',
      finished: 'Pedido finalizado',
      cancelled: 'Pedido cancelado',
      refunded: 'Reembolso confirmado',
    };
    return labels[normalized] || 'Pedido atualizado';
  }

  private async sendCustomerOrderEmailFallback(userId: string, payload: CustomerPushPayload) {
    const normalizedUserId = String(userId || '').trim();
    const orderId = String(payload.data?.orderId || '').trim();
    if (!normalizedUserId || !orderId) return;

    const rows: Array<{
      email?: string | null;
      full_name?: string | null;
      customer_name?: string | null;
      status?: string | null;
      store_name?: string | null;
    }> = await AppDataSource.query(
      `
        SELECT
          u.email,
          u.full_name,
          o.customer_name,
          o.status,
          s.name AS store_name
        FROM orders o
        INNER JOIN users u
          ON u.id = o.customer_user_id
        LEFT JOIN stores s
          ON s.id = o.store_id
        WHERE o.id = $1
          AND o.customer_user_id = $2
        LIMIT 1
      `,
      [orderId, normalizedUserId]
    );

    const row = rows?.[0];
    const email = String(row?.email || '').trim();
    if (!email) return;

    await this.emailService.sendCustomerOrderStatusUpdate({
      email,
      customerName: row?.full_name || row?.customer_name || 'Cliente',
      storeName: row?.store_name || 'Loja parceira',
      orderId,
      statusLabel: this.resolveCustomerStatusLabel(payload.data?.status || row?.status),
      statusMessage: String((payload.data as any)?.fullBody || payload.body || 'Seu pedido foi atualizado.').trim(),
    });
  }

  /**
   * Dispatches an order update push to all active tokens from one customer.
   *
   * @author Edmilson Lopes
   */
  async notifyCustomerOrderUpdate(userId: string, payload: CustomerPushPayload) {
    // Persist notification in database
    try {
      const { Notification: NotifEntity } = require("../entities/Notification");
      const { AppDataSource: DS } = require("../config/database");
      const repo = DS.getRepository(NotifEntity);
      let imageUrl = (payload.data as any)?.imageUrl || null;
      if (!imageUrl && (payload.data as any)?.orderId) {
        const rows = await DS.query("SELECT ss.logo_url FROM store_settings ss JOIN stores s ON s.id = ss.store_id JOIN orders o ON o.store_id = s.id WHERE o.id = $1 LIMIT 1", [(payload.data as any).orderId]);
        imageUrl = rows?.[0]?.logo_url || null;
      }
      void repo.save(repo.create({
        userId,
        title: String((payload.data as any)?.fullTitle || payload.title || "").trim(),
        body: String((payload.data as any)?.fullBody || payload.body || "").trim(),
        url: (payload.data as any)?.url || null,
        imageUrl
      }));
    } catch { /* non-blocking */ }

    const pushResult = await this.dispatchByOwner({
      ownerKey: 'userId',
      ownerValue: userId,
      payload,
      noTokenLogMessage: 'Push skipped (no active tokens)',
      dispatchFinishedMessage: 'Push dispatch finished',
    });

    if (pushResult.sent === 0) {
      try {
        await this.sendCustomerOrderEmailFallback(userId, payload);
      } catch (error) {
        log.warn('Customer order email fallback failed', {
          userId: String(userId || '').trim(),
          orderId: String(payload?.data?.orderId || '').trim() || null,
          error,
        });
      }
    }

    return pushResult;
  }

  /**
   * Dispatches an order update push to active tokens from one guest session.
   *
   * @author Edmilson Lopes
   */
  async notifyGuestOrderUpdate(guestId: string, payload: CustomerPushPayload) {
    return this.dispatchByOwner({
      ownerKey: 'guestId',
      ownerValue: guestId,
      payload,
      noTokenLogMessage: 'Push skipped (no active guest tokens)',
      dispatchFinishedMessage: 'Guest push dispatch finished',
    });
  }

  /**
   * Dispatches "delivery available" push to active motoboys linked to one store.
   *
   * @author Edmilson Lopes
   */
  async notifyStoreMotoboysAvailableOrder(storeId: string, payload: CustomerPushPayload) {
    const normalizedStoreId = String(storeId || '').trim();
    if (!normalizedStoreId) return { ok: false, sent: 0, skipped: true };

    const hasV1 = Boolean(this.resolveFcmV1Config());
    const hasLegacy = Boolean(String(env.push?.fcmServerKey || '').trim());
    if (!hasV1 && !hasLegacy) {
      log.info('Motoboy push skipped (missing FCM config)', { storeId: normalizedStoreId });
      return { ok: false, sent: 0, skipped: true };
    }

    const rows: Array<{ token: string; motoboy_id: string }> = await AppDataSource.query(
      `
        SELECT DISTINCT mpt.token, mpt.motoboy_id
        FROM motoboy_push_tokens mpt
        INNER JOIN motoboy_stores ms
          ON ms.motoboy_id = mpt.motoboy_id
         AND ms.active = TRUE
        INNER JOIN motoboys m
          ON m.id = mpt.motoboy_id
         AND m.status = 'ACTIVE'
        WHERE ms.store_id = $1
          AND mpt.is_active = TRUE
        ORDER BY mpt.motoboy_id, mpt.updated_at DESC
        LIMIT 200
      `,
      [normalizedStoreId]
    );

    if (!rows.length) {
      log.info('Motoboy push skipped (no active tokens for store)', { storeId: normalizedStoreId });
      return { ok: true, sent: 0, skipped: true };
    }

    let sent = 0;
    for (const row of rows) {
      const token = String(row?.token || '').trim();
      const motoboyId = String(row?.motoboy_id || '').trim();
      if (!token || !motoboyId) continue;

      const result = await this.sendToToken(token, payload);
      if (result.ok) {
        sent += 1;
        continue;
      }

      log.warn('Motoboy push send failed', {
        storeId: normalizedStoreId,
        motoboyId,
        tokenSuffix: token.slice(-8),
        status: result.status,
        errorCode: result.errorCode,
        body: result.body,
      });

      if (result.deactivateToken) {
        await this.unregisterMotoboyToken(motoboyId, token);
      }
    }

    log.info('Motoboy push dispatch finished', {
      storeId: normalizedStoreId,
      sent,
      attempted: rows.length,
    });
    return { ok: true, sent, attempted: rows.length };
  }

  /**
   * Dispatches one push payload to active tokens for a specific motoboy.
   *
   * @author Edmilson Lopes
   */
  async notifyMotoboyById(motoboyId: string, payload: CustomerPushPayload) {
    const normalizedMotoboyId = String(motoboyId || '').trim();
    if (!normalizedMotoboyId) return { ok: false, sent: 0, skipped: true };

    const hasV1 = Boolean(this.resolveFcmV1Config());
    const hasLegacy = Boolean(String(env.push?.fcmServerKey || '').trim());
    if (!hasV1 && !hasLegacy) {
      log.info('Motoboy direct push skipped (missing FCM config)', { motoboyId: normalizedMotoboyId });
      return { ok: false, sent: 0, skipped: true };
    }

    const rows: Array<{ token: string }> = await AppDataSource.query(
      `
        SELECT token
        FROM motoboy_push_tokens
        WHERE motoboy_id = $1
          AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 20
      `,
      [normalizedMotoboyId]
    );

    if (!rows.length) {
      log.info('Motoboy direct push skipped (no active tokens)', { motoboyId: normalizedMotoboyId });
      return { ok: true, sent: 0, skipped: true };
    }

    let sent = 0;
    for (const row of rows) {
      const token = String(row?.token || '').trim();
      if (!token) continue;

      const result = await this.sendToToken(token, payload);
      if (result.ok) {
        sent += 1;
        continue;
      }

      log.warn('Motoboy direct push send failed', {
        motoboyId: normalizedMotoboyId,
        tokenSuffix: token.slice(-8),
        status: result.status,
        errorCode: result.errorCode,
        body: result.body,
      });

      if (result.deactivateToken) {
        await this.unregisterMotoboyToken(normalizedMotoboyId, token);
      }
    }

    return { ok: true, sent, attempted: rows.length };
  }

  /**
   * Dispatches "new online order" push to store owner and active store users.
   *
   * @author Edmilson Lopes
   */
  async notifyStoreUsersNewOnlineOrder(storeId: string, payload: CustomerPushPayload) {
    return this.dispatchStoreUsersPayload(storeId, payload, 'new_online_order');
  }

  /**
   * Dispatches "order delivered/finished" push to store owner and active store users.
   *
   * @author Edmilson Lopes
   */
  async notifyStoreUsersOrderDelivered(storeId: string, payload: CustomerPushPayload) {
    return this.dispatchStoreUsersPayload(storeId, payload, 'order_delivered');
  }

  /**
   * Dispatches operational/security alerts to store owner and active store users.
   *
   * @author Edmilson Lopes
   */
  async notifyStoreUsersSecurityAlert(storeId: string, payload: CustomerPushPayload) {
    return this.dispatchStoreUsersPayload(storeId, payload, 'security_alert');
  }

  /**
   * Sends one payload to all active store-user tokens for a store.
   *
   * @author Edmilson Lopes
   */
  private async dispatchStoreUsersPayload(
    storeId: string,
    payload: CustomerPushPayload,
    topic: 'new_online_order' | 'order_delivered' | 'security_alert'
  ) {
    const normalizedStoreId = String(storeId || '').trim();
    if (!normalizedStoreId) return { ok: false, sent: 0, skipped: true };

    try {
      const hasV1 = Boolean(this.resolveFcmV1Config());
      const hasLegacy = Boolean(String(env.push?.fcmServerKey || '').trim());
      if (!hasV1 && !hasLegacy) {
        log.info('Store user push skipped (missing FCM config)', { storeId: normalizedStoreId, topic });
        return { ok: false, sent: 0, skipped: true };
      }

      const rows: Array<{ token: string; user_id: string }> = await AppDataSource.query(
        `
          SELECT DISTINCT ON (rows.token) rows.token, rows.user_id
          FROM (
            SELECT supt.token, supt.user_id, supt.updated_at
            FROM store_user_push_tokens supt
            INNER JOIN stores s
              ON s.id = supt.store_id
             AND s.owner_id = supt.user_id
            WHERE supt.store_id = $1
              AND supt.is_active = TRUE

            UNION ALL

            SELECT supt.token, supt.user_id, supt.updated_at
            FROM store_user_push_tokens supt
            INNER JOIN store_users su
              ON su.store_id = supt.store_id
             AND su.user_id = supt.user_id
             AND su.is_active = TRUE
            WHERE supt.store_id = $1
              AND supt.is_active = TRUE
          ) rows
          ORDER BY rows.token, rows.updated_at DESC
          LIMIT 100
        `,
        [normalizedStoreId]
      );

      if (!rows.length) {
        log.info('Store user push skipped (no active tokens for store)', { storeId: normalizedStoreId, topic });
        return { ok: true, sent: 0, skipped: true };
      }

      let sent = 0;
      for (const row of rows) {
        const token = String(row?.token || '').trim();
        const userId = String(row?.user_id || '').trim();
        if (!token || !userId) continue;

        const result = await this.sendToToken(token, payload);
        if (result.ok) {
          sent += 1;
          continue;
        }

        log.warn('Store user push send failed', {
          storeId: normalizedStoreId,
          topic,
          userId,
          tokenSuffix: token.slice(-8),
          status: result.status,
          errorCode: result.errorCode,
          body: result.body,
        });

        if (result.deactivateToken) {
          await this.unregisterStoreUserToken(normalizedStoreId, userId, token);
        }
      }

      log.info('Store user push dispatch finished', {
        storeId: normalizedStoreId,
        topic,
        sent,
        attempted: rows.length,
      });
      return { ok: true, sent, attempted: rows.length };
    } catch (error) {
      log.warn('Store user push dispatch crashed', {
        storeId: normalizedStoreId,
        topic,
        error,
      });
      return { ok: false, sent: 0, skipped: false };
    }
  }

  /**
   * Broadcasts one push notification to all active customer/guest tokens.
   *
   * @author Edmilson Lopes
   */
  async broadcastToAllActive(
    payload: CustomerPushPayload,
    options?: { limit?: number; topic?: string | null }
  ) {
    const normalizedTopic = String(options?.topic || 'janocaminho_global').trim().toLowerCase();
    if (normalizedTopic !== 'janocaminho_global') {
      return { ok: false, sent: 0, attempted: 0, skipped: true, reason: 'unsupported_topic' as const };
    }

    const hasV1 = Boolean(this.resolveFcmV1Config());
    const hasLegacy = Boolean(String(env.push?.fcmServerKey || '').trim());
    if (!hasV1 && !hasLegacy) {
      log.info('Push broadcast skipped (missing FCM config)', { topic: normalizedTopic });
      return { ok: false, sent: 0, attempted: 0, skipped: true, reason: 'missing_config' as const };
    }

    const limit = Math.max(1, Math.min(5000, Number(options?.limit || 1500)));
    const rows: Array<{ token: string }> = await AppDataSource.query(
      `
        SELECT DISTINCT token
        FROM customer_push_tokens
        WHERE is_active = TRUE
        ORDER BY token
        LIMIT $1
      `,
      [limit]
    );
    const tokens = rows.map((row) => String(row?.token || '').trim()).filter(Boolean);
    if (!tokens.length) {
      log.info('Push broadcast skipped (no active tokens)', { topic: normalizedTopic });
      return { ok: true, sent: 0, attempted: 0, skipped: true };
    }

    let sent = 0;
    let deactivated = 0;
    for (const token of tokens) {
      const result = await this.sendToToken(token, payload);
      if (result.ok) {
        sent += 1;
        continue;
      }
      log.warn('Push broadcast send failed', {
        topic: normalizedTopic,
        tokenSuffix: token.slice(-8),
        status: result.status,
        errorCode: result.errorCode,
        body: result.body,
      });
      if (result.deactivateToken) {
        await AppDataSource.query(
          `
            UPDATE customer_push_tokens
            SET is_active = FALSE, updated_at = NOW()
            WHERE token = $1
          `,
          [token]
        );
        deactivated += 1;
      }
    }

    // Save notification for all users with active push tokens
    try {
      await AppDataSource.query(
        `INSERT INTO notifications (user_id, title, body, url, image_url)
         SELECT DISTINCT cpt.user_id, $1, $2, $3, $4
         FROM customer_push_tokens cpt
         WHERE cpt.is_active = TRUE AND cpt.user_id IS NOT NULL`,
        [
          String((payload.data as any)?.fullTitle || payload.title || "").trim(),
          String((payload.data as any)?.fullBody || payload.body || "").trim(),
          (payload.data as any)?.url || null,
          (payload.data as any)?.imageUrl || null
        ]
      );
    } catch { /* non-blocking */ }
    log.info('Push broadcast finished', {
      topic: normalizedTopic,
      sent,
      attempted: tokens.length,
      deactivated,
    });
    return { ok: true, sent, attempted: tokens.length, deactivated };
  }
}
