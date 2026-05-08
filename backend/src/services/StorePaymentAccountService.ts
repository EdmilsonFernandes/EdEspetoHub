import { AppDataSource } from '../config/database';
import { env } from "../config/env";
import { StorePaymentAccount } from '../entities/StorePaymentAccount';
import { Store } from '../entities/Store';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { MercadoPagoConnectedAccountService } from './MercadoPagoConnectedAccountService';

export class StorePaymentAccountService {
  private repo = AppDataSource.getRepository(StorePaymentAccount);
  private shared = new MercadoPagoConnectedAccountService();
  private log = logger.child({ scope: 'StorePaymentAccountService' });

  async getStatus(storeId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const account = await this.repo.findOne({
      where: { storeId, provider: 'MERCADO_PAGO' as any },
    });
    let validation: any = null;
    if (account?.status === 'CONNECTED') {
      const accessToken = this.shared.decryptToken(account.accessTokenEncrypted);
      if (accessToken) {
        try {
          validation = await this.shared.validateCapabilities(accessToken);
        } catch (error: any) {
          validation = {
            checkedAt: new Date().toISOString(),
            tokenValid: false,
            credentialMode: this.shared.detectCredentialMode(accessToken),
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
    return this.shared.createConnectUrl({
      ownerType: 'STORE',
      ownerId: storeId,
      returnTo: String(returnTo || '').trim() || null,
    });
  }

  async handleCallback(code: string, state: string) {
    this.log.info('MP OAuth callback received', { code: code.slice(0, 12) + '...', stateLength: state?.length });

    const parsedState = this.shared.parseState(state);
    if (parsedState.ownerType !== 'STORE') {
      throw new AppError('PAY-010', 400, { message: 'Estado OAuth inválido.' });
    }
    this.log.info('MP OAuth state verified', { storeId: parsedState.ownerId, returnTo: parsedState.returnTo });

    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: parsedState.ownerId } });
    if (!store) throw new AppError('STORE-001', 404);
    this.log.info('MP OAuth store identified', { storeId: store.id, storeName: store.name });

    const token = await this.shared.exchangeCode(code);
    this.log.info('MP OAuth token received', { userId: token.providerUserId, expiresAt: token.expiresAt });

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
    account.providerUserId = token.providerUserId || account.providerUserId || null;
    account.accessTokenEncrypted = this.shared.encryptToken(token.accessToken);
    account.refreshTokenEncrypted = token.refreshToken
      ? this.shared.encryptToken(token.refreshToken)
      : account.refreshTokenEncrypted || null;
    account.expiresAt = token.expiresAt;
    await this.repo.save(account);

    this.log.info('MP OAuth token saved successfully', { storeId: store.id, providerUserId: account.providerUserId });

    try {
      await this.shared.validateCapabilities(token.accessToken);
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
    return this.shared.decryptToken(account.accessTokenEncrypted) || null;
  }

  async listActiveAccessTokens() {
    const accounts = await this.repo.find({
      where: { provider: 'MERCADO_PAGO' as any, status: 'CONNECTED' as any },
    });
    return accounts
      .map((account) => ({
        storeId: account.storeId,
        accessToken: this.shared.decryptToken(account.accessTokenEncrypted),
      }))
      .filter((entry) => Boolean(entry.accessToken));
  }
}
