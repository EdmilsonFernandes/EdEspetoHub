import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { StorePaymentAccount } from '../entities/StorePaymentAccount';
import { Store } from '../entities/Store';
import { AppError } from '../errors/AppError';

type MercadoPagoTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: string | number;
};

export class StorePaymentAccountService {
  private repo = AppDataSource.getRepository(StorePaymentAccount);

  private encryptionKey() {
    return crypto
      .createHash('sha256')
      .update(env.mercadoPago.encryptionKey || env.jwtSecret)
      .digest();
  }

  private encrypt(value: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decrypt(value?: string | null) {
    if (!value) return '';
    const [ivRaw, tagRaw, encryptedRaw] = value.split(':');
    if (!ivRaw || !tagRaw || !encryptedRaw) return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(ivRaw, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private redirectUrl() {
    return env.mercadoPago.oauthRedirectUrl || `${env.appUrl.replace(/\/$/, '')}/api/payment-accounts/mercadopago/callback`;
  }

  private signState(payload: Record<string, any>) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', env.jwtSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyState(state: string) {
    const [encoded, signature] = String(state || '').split('.');
    if (!encoded || !signature) throw new AppError('PAY-010', 400, { message: 'Estado OAuth inválido.' });
    const expected = crypto
      .createHmac('sha256', env.jwtSecret)
      .update(encoded)
      .digest('base64url');
    if (
      Buffer.byteLength(signature) !== Buffer.byteLength(expected) ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      throw new AppError('PAY-010', 400, { message: 'Estado OAuth inválido.' });
    }
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed?.storeId) throw new AppError('PAY-010', 400, { message: 'Estado OAuth inválido.' });
    return parsed as { storeId: string; returnTo?: string; createdAt?: number };
  }

  async getStatus(storeId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const account = await this.repo.findOne({
      where: { storeId, provider: 'MERCADO_PAGO' as any },
    });
    return {
      connected: Boolean(account && account.status === 'CONNECTED'),
      status: account?.status || 'DISCONNECTED',
      provider: 'MERCADO_PAGO',
      providerUserId: account?.providerUserId || null,
      expiresAt: account?.expiresAt || null,
      updatedAt: account?.updatedAt || null,
      oauthConfigured: Boolean(env.mercadoPago.clientId && env.mercadoPago.clientSecret),
    };
  }

  async createConnectUrl(storeId: string, authStoreId?: string, returnTo?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    if (!env.mercadoPago.clientId || !env.mercadoPago.clientSecret) {
      throw new AppError('PAY-011', 400, { message: 'OAuth do Mercado Pago não está configurado no servidor.' });
    }

    const state = this.signState({
      storeId,
      returnTo: String(returnTo || '').trim() || null,
      createdAt: Date.now(),
    });
    const url = new URL('https://auth.mercadopago.com.br/authorization');
    url.searchParams.set('client_id', env.mercadoPago.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('platform_id', 'mp');
    url.searchParams.set('redirect_uri', this.redirectUrl());
    url.searchParams.set('state', state);
    return { authUrl: url.toString() };
  }

  async handleCallback(code: string, state: string) {
    if (!code) throw new AppError('PAY-012', 400, { message: 'Código OAuth ausente.' });
    const parsedState = this.verifyState(state);
    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: parsedState.storeId } });
    if (!store) throw new AppError('STORE-001', 404);

    const response = await fetch(`${env.mercadoPago.apiBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: env.mercadoPago.clientSecret,
        client_id: env.mercadoPago.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUrl(),
      }),
    });

    if (!response.ok) {
      throw new AppError('PAY-013', 400, { message: 'Mercado Pago recusou a autorização.' });
    }

    const data = (await response.json()) as MercadoPagoTokenResponse;
    if (!data.access_token) throw new AppError('PAY-013', 400);

    const expiresAt = data.expires_in
      ? new Date(Date.now() + Math.max(60, Number(data.expires_in)) * 1000)
      : null;

    let account = await this.repo.findOne({
      where: { storeId: store.id, provider: 'MERCADO_PAGO' as any },
    });
    if (!account) {
      account = this.repo.create({
        store,
        storeId: store.id,
        provider: 'MERCADO_PAGO',
      });
    }

    account.status = 'CONNECTED';
    account.providerUserId = data.user_id ? String(data.user_id) : account.providerUserId || null;
    account.accessTokenEncrypted = this.encrypt(data.access_token);
    account.refreshTokenEncrypted = data.refresh_token ? this.encrypt(data.refresh_token) : account.refreshTokenEncrypted || null;
    account.expiresAt = expiresAt;
    await this.repo.save(account);

    return {
      storeId: store.id,
      returnTo: parsedState.returnTo || null,
    };
  }

  async disconnect(storeId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    await this.repo.update(
      { storeId, provider: 'MERCADO_PAGO' as any },
      { status: 'DISCONNECTED' as any }
    );
    return this.getStatus(storeId, authStoreId);
  }

  async getActiveAccessToken(storeId: string) {
    const account = await this.repo.findOne({
      where: { storeId, provider: 'MERCADO_PAGO' as any, status: 'CONNECTED' as any },
    });
    if (!account) return null;
    return this.decrypt(account.accessTokenEncrypted) || null;
  }

  async listActiveAccessTokens() {
    const accounts = await this.repo.find({
      where: { provider: 'MERCADO_PAGO' as any, status: 'CONNECTED' as any },
    });
    return accounts
      .map((account) => ({
        storeId: account.storeId,
        accessToken: this.decrypt(account.accessTokenEncrypted),
      }))
      .filter((entry) => Boolean(entry.accessToken));
  }
}
