import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { StorePaymentAccount } from '../entities/StorePaymentAccount';
import { Store } from '../entities/Store';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

type MercadoPagoTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: string | number;
};

type MercadoPagoPaymentMethod = {
  id?: string;
  name?: string;
  payment_type_id?: string;
  status?: string;
};

export class StorePaymentAccountService {
  private repo = AppDataSource.getRepository(StorePaymentAccount);
  private log = logger.child({ scope: 'StorePaymentAccountService' });

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
    if (env.mercadoPago.oauthRedirectUrl) return env.mercadoPago.oauthRedirectUrl;
    // Sempre usar non-www para garantir match com o cadastro no Mercado Pago
    const base = env.appUrl.replace(/\/$/, '').replace('https://www.', 'https://');
    return `${base}/api/payment-accounts/mercadopago/callback`;
  }

  private buildMpHeaders(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private detectCredentialMode(accessToken: string) {
    const normalized = String(accessToken || '').trim().toUpperCase();
    if (normalized.startsWith('APP_USR-')) return 'production';
    if (normalized.startsWith('TEST-')) return 'test';
    return 'unknown';
  }

  private summarizeMethods(methods: MercadoPagoPaymentMethod[], paymentTypeId: string) {
    return methods
      .filter((entry) => String(entry?.payment_type_id || '').toLowerCase() === paymentTypeId)
      .map((entry) => ({
        id: String(entry?.id || ''),
        name: String(entry?.name || entry?.id || '').trim(),
        status: String(entry?.status || '').toLowerCase(),
      }));
  }

  private normalizeCapability(available: boolean, methods: Array<{ id: string; name: string; status: string }>, detail: string, blockedDetail: string) {
    return {
      available,
      status: available ? 'ready' : 'attention',
      detail: available ? detail : blockedDetail,
      methods: methods.filter((entry) => entry.status === 'active').map((entry) => entry.name || entry.id),
    };
  }

  private async fetchPaymentMethods(accessToken: string) {
    const response = await fetch(`${env.mercadoPago.apiBaseUrl}/v1/payment_methods`, {
      headers: this.buildMpHeaders(accessToken),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.warn('Mercado Pago account validation failed', { status: response.status, body: bodyText });
      throw new AppError('PAY-015', 400, {
        message: 'Não foi possível validar a conta Mercado Pago conectada agora. Tente novamente em instantes.',
        provider: 'MERCADO_PAGO',
        providerStatus: response.status,
      });
    }

    return (await response.json()) as MercadoPagoPaymentMethod[];
  }

  private async validateCapabilities(accessToken: string) {
    const checkedAt = new Date().toISOString();
    const credentialMode = this.detectCredentialMode(accessToken);
    const methods = await this.fetchPaymentMethods(accessToken);

    const creditMethods = this.summarizeMethods(methods, 'credit_card');
    const debitMethods = this.summarizeMethods(methods, 'debit_card');
    const bankTransferMethods = this.summarizeMethods(methods, 'bank_transfer');

    const hasActiveCredit = creditMethods.some((entry) => entry.status === 'active');
    const hasActiveDebit = debitMethods.some((entry) => entry.status === 'active');
    const hasActivePix = bankTransferMethods.some((entry) => entry.status === 'active');

    const notes: string[] = [];
    if (credentialMode !== 'production') {
      notes.push('A conta conectada não está em modo de produção.');
    }
    if (!hasActivePix) {
      notes.push('Pix não apareceu como meio ativo. Verifique se a conta possui chave Pix cadastrada e ativa.');
    }
    if (!hasActiveCredit) {
      notes.push('Crédito não apareceu como meio ativo nesta conta.');
    }
    if (!hasActiveDebit) {
      notes.push('Débito não apareceu como meio ativo nesta conta.');
    }

    const pix = this.normalizeCapability(
      hasActivePix,
      bankTransferMethods,
      'Pix listado como meio ativo nesta conta Mercado Pago.',
      'Pix indisponível. A conta precisa de chave Pix ativa e habilitação no Mercado Pago.'
    );
    const credit = this.normalizeCapability(
      hasActiveCredit,
      creditMethods,
      'Cartão de crédito listado como meio ativo.',
      'Crédito não apareceu como meio ativo para esta conta.'
    );
    const debit = this.normalizeCapability(
      hasActiveDebit,
      debitMethods,
      'Cartão de débito listado como meio ativo.',
      'Débito não apareceu como meio ativo para esta conta.'
    );

    return {
      checkedAt,
      tokenValid: true,
      credentialMode,
      overallStatus:
        credentialMode === 'production' && hasActivePix && hasActiveCredit && hasActiveDebit
          ? 'READY'
          : 'LIMITED',
      pix,
      credit,
      debit,
      notes,
    };
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
    let validation: any = null;
    if (account?.status === 'CONNECTED') {
      const accessToken = this.decrypt(account.accessTokenEncrypted);
      if (accessToken) {
        try {
          validation = await this.validateCapabilities(accessToken);
        } catch (error: any) {
          validation = {
            checkedAt: new Date().toISOString(),
            tokenValid: false,
            credentialMode: this.detectCredentialMode(accessToken),
            overallStatus: 'ERROR',
            pix: null,
            credit: null,
            debit: null,
            notes: [error?.details?.message || 'Não foi possível validar a conta Mercado Pago agora.'],
          };
        }
      }
    }
    return {
      connected: Boolean(account && account.status === 'CONNECTED'),
      status: account?.status || 'DISCONNECTED',
      provider: 'MERCADO_PAGO',
      providerUserId: account?.providerUserId || null,
      expiresAt: account?.expiresAt || null,
      updatedAt: account?.updatedAt || null,
      oauthConfigured: Boolean(env.mercadoPago.clientId && env.mercadoPago.clientSecret),
      validation,
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

    this.log.info('MP OAuth callback received', { code: code.slice(0, 12) + '...', stateLength: state?.length });

    const parsedState = this.verifyState(state);
    this.log.info('MP OAuth state verified', { storeId: parsedState.storeId, returnTo: parsedState.returnTo });

    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: parsedState.storeId } });
    if (!store) throw new AppError('STORE-001', 404);
    this.log.info('MP OAuth store identified', { storeId: store.id, storeName: store.name });

    const redirectUri = this.redirectUrl();
    this.log.info('MP OAuth token exchange', { redirectUri });

    const response = await fetch(`${env.mercadoPago.apiBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: env.mercadoPago.clientSecret,
        client_id: env.mercadoPago.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.log.warn('MP OAuth token exchange failed', { status: response.status, body });
      throw new AppError('PAY-013', 400, { message: 'Mercado Pago recusou a autorização.' });
    }

    const data = (await response.json()) as MercadoPagoTokenResponse;
    if (!data.access_token) throw new AppError('PAY-013', 400);

    this.log.info('MP OAuth token received', { userId: data.user_id, expiresIn: data.expires_in });

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

    this.log.info('MP OAuth token saved successfully', { storeId: store.id, providerUserId: account.providerUserId });

    try {
      await this.validateCapabilities(data.access_token);
    } catch (error) {
      this.log.warn('Mercado Pago capability validation after OAuth failed', { storeId: store.id, error });
    }

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
