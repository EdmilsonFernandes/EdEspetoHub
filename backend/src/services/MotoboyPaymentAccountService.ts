import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyPaymentAccount } from '../entities/MotoboyPaymentAccount';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { MercadoPagoConnectedAccountService } from './MercadoPagoConnectedAccountService';

export class MotoboyPaymentAccountService {
  private repo = AppDataSource.getRepository(MotoboyPaymentAccount);
  private shared = new MercadoPagoConnectedAccountService();
  private log = logger.child({ scope: 'MotoboyPaymentAccountService' });

  async getStatus(motoboyId: string) {
    const account = await this.repo.findOne({
      where: { motoboyId, provider: 'MERCADO_PAGO' as any },
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

  async createConnectUrl(motoboyId: string, returnTo?: string) {
    return this.shared.createConnectUrl({
      ownerType: 'MOTOBOY',
      ownerId: motoboyId,
      returnTo: String(returnTo || '').trim() || null,
    });
  }

  async handleCallback(code: string, state: string) {
    this.log.info('MP OAuth callback received for motoboy', {
      code: code ? `${code.slice(0, 12)}...` : null,
      stateLength: state?.length,
    });

    const parsedState = this.shared.parseState(state);
    if (parsedState.ownerType !== 'MOTOBOY') {
      throw new AppError('PAY-010', 400, { message: 'Estado OAuth inválido.' });
    }

    const motoboy = await AppDataSource.getRepository(Motoboy).findOne({
      where: { id: parsedState.ownerId },
    });
    if (!motoboy) throw new AppError('MOTO-001', 404);

    const token = await this.shared.exchangeCode(code);
    let account = await this.repo.findOne({
      where: { motoboyId: motoboy.id, provider: 'MERCADO_PAGO' as any },
    });

    if (!account) {
      account = this.repo.create({
        motoboy,
        motoboyId: motoboy.id,
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

    try {
      await this.shared.validateCapabilities(token.accessToken);
    } catch (error) {
      this.log.warn('Mercado Pago capability validation after motoboy OAuth failed', {
        motoboyId: motoboy.id,
        error,
      });
    }

    return {
      motoboyId: motoboy.id,
      returnTo: parsedState.returnTo || null,
    };
  }

  async disconnect(motoboyId: string) {
    await this.repo.update(
      { motoboyId, provider: 'MERCADO_PAGO' as any },
      { status: 'DISCONNECTED' as any }
    );
    return this.getStatus(motoboyId);
  }

  async getActiveAccessToken(motoboyId: string) {
    const account = await this.repo.findOne({
      where: { motoboyId, provider: 'MERCADO_PAGO' as any, status: 'CONNECTED' as any },
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
        motoboyId: account.motoboyId,
        accessToken: this.shared.decryptToken(account.accessTokenEncrypted),
      }))
      .filter((entry) => Boolean(entry.accessToken));
  }
}
