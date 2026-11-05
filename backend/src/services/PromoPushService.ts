import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { PromoPush } from '../entities/PromoPush';
import { Store } from '../entities/Store';
import { AppError } from '../errors/AppError';
import { AsaasService, isMercadoPagoEnabled } from './AsaasService';
import { OpenPixService } from './OpenPixService';
import { createPlatformPixCharge } from './PlatformPixService';
import { PushNotificationService } from './PushNotificationService';
import { logger } from '../utils/logger';

const PROMO_PUSH_PRICE = 4.90;
const log = logger.child({ scope: 'PromoPushService' });

export class PromoPushService {
  private repo = AppDataSource.getRepository(PromoPush);
  private openPix = new OpenPixService();
  private asaas = new AsaasService();
  private pushService = new PushNotificationService();

  async create(storeId: string, authStoreId: string | undefined, body: { title: string; message: string }) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, relations: ['owner'] });
    if (!store) throw new AppError('STORE-001', 404);

    const title = String(body.title || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 160);
    if (!title) throw new AppError('VAL-001', 400, { message: 'Título é obrigatório.' });
    if (!message) throw new AppError('VAL-001', 400, { message: 'Mensagem é obrigatória.' });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const row = this.repo.create({
      store,
      storeId,
      title,
      body: message,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      priceAmount: PROMO_PUSH_PRICE,
      paymentMethod: 'PIX',
      paymentExpiresAt: expiresAt,
    });
    const created = await this.repo.save(row);

    // PIX de plataforma — cadeia única (30/10): Asaas (≥R$5+CPF) → OpenPix →
    // MP apenas com reativação administrativa. Erro de um provedor → próximo;
    // todos indisponíveis → AppError PAY-016 (nunca QR fake).
    const owner = store.owner as any;
    const ownerEmail = String(owner?.email || '').trim();
    const payerName = String(owner?.fullName || store.name || 'Lojista').trim();
    const payerCpf = String(
      String(owner?.documentType || '').toUpperCase() === 'CPF' ? owner?.document || '' : ''
    ).trim();

    const charge = await createPlatformPixCharge({
      externalReference: `promo_push:${created.id}`,
      amountBrl: PROMO_PUSH_PRICE,
      comment: `Push Promocional - ${store.name}`,
      payer: {
        name: payerName,
        email: ownerEmail || undefined,
        ...(payerCpf ? { cpfCnpj: payerCpf } : {}),
      },
      expiresInSec: 30 * 60,
    });

    created.paymentProvider = charge.provider;
    created.paymentProviderId = charge.providerId;
    created.paymentLink = charge.paymentLink;
    created.paymentQrCodeBase64 = charge.qrCodeImageBase64;
    created.paymentQrCodeText = charge.brCode;
    if (charge.expiresAt) created.paymentExpiresAt = charge.expiresAt;
    await this.repo.save(created);

    return this.serialize(created);
  }

  async listByStore(storeId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const rows = await this.repo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async listHistory(limit = 50) {
    const rows = await this.repo.find({
      where: [{ status: 'SENT' }, { status: 'REJECTED' }],
      relations: ['store', 'store.settings'],
      order: { updatedAt: 'DESC' },
      take: limit,
    });
    return rows.map((r) => this.serialize(r));
  }

  async listPending() {
    const rows = await this.repo.find({
      where: { status: 'PENDING_APPROVAL' },
      relations: ['store', 'store.settings'],
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async refreshPayment(pushId: string, storeId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const row = await this.repo.findOne({ where: { id: pushId, storeId } });
    if (!row) throw new AppError('NOT-001', 404);
    if (!row.paymentProviderId) return this.serialize(row);

    // ASAAS (30/10): polling por payment.id — RECEIVED/CONFIRMED/RECEIVED_IN_CASH = pago.
    if (String(row.paymentProvider || '').toUpperCase() === 'ASAAS') {
      try {
        const charge = await this.asaas.getCharge(row.paymentProviderId);
        const providerStatus = String(charge?.status || '').toUpperCase();
        if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(providerStatus)) {
          row.paymentStatus = 'PAID';
          row.paymentPaidAt = new Date();
          row.status = 'PENDING_APPROVAL';
          await this.repo.save(row);
        } else if (providerStatus === 'OVERDUE' || providerStatus === 'REFUNDED') {
          row.paymentStatus = 'FAILED';
          await this.repo.save(row);
        }
      } catch (err) {
        log.warn('PromoPush Asaas refresh payment failed', { pushId, error: err });
      }
      return this.serialize(row);
    }

    // WAVE 1 OpenPix: polling por correlationID.
    if (String(row.paymentProvider || '').toUpperCase() === 'OPENPIX') {
      try {
        const charge = await this.openPix.getCharge(row.paymentProviderId);
        const status = String(charge?.status || '').toUpperCase();
        if (status === 'COMPLETED') {
          row.paymentStatus = 'PAID';
          row.paymentPaidAt = new Date();
          row.status = 'PENDING_APPROVAL';
          await this.repo.save(row);
        } else if (status === 'EXPIRED') {
          row.paymentStatus = 'FAILED';
          await this.repo.save(row);
        }
      } catch (err) {
        log.warn('PromoPush OpenPix refresh payment failed', { pushId, error: err });
      }
      return this.serialize(row);
    }

    // MP é contingência desativada: polling legado só com reativação explícita.
    if (!isMercadoPagoEnabled()) return this.serialize(row);

    try {
      const response = await fetch(`${env.mercadoPago.apiBaseUrl}/v1/payments/${row.paymentProviderId}`, {
        headers: { Authorization: `Bearer ${env.mercadoPago.accessToken}` },
      });
      if (!response.ok) return this.serialize(row);
      const data: any = await response.json();
      const mpStatus = String(data?.status || '').toLowerCase();
      if (mpStatus === 'approved') {
        row.paymentStatus = 'PAID';
        row.paymentPaidAt = new Date();
        row.status = 'PENDING_APPROVAL';
        await this.repo.save(row);
      } else if (mpStatus === 'cancelled' || mpStatus === 'rejected') {
        row.paymentStatus = 'FAILED';
        await this.repo.save(row);
      }
    } catch (err) {
      log.warn('PromoPush refresh payment failed', { pushId, error: err });
    }
    return this.serialize(row);
  }

  /**
   * WAVE 1: webhook compartilhado (PaymentService.applyProviderStatus) marca o
   * push como pago → entra na fila de aprovação do super admin (mesmo estado
   * que o polling de refreshPayment aplica). Idempotente pelo paymentStatus.
   */
  async markPaidFromWebhook(pushId: string, provider: 'MERCADO_PAGO' | 'OPENPIX' | 'ASAAS' = 'MERCADO_PAGO') {
    const row = await this.repo.findOne({ where: { id: pushId } });
    if (!row) return null;
    if (String(row.paymentStatus || '').toUpperCase() === 'PAID') return row;
    row.paymentStatus = 'PAID';
    row.paymentPaidAt = new Date();
    row.paymentProvider = provider;
    row.status = 'PENDING_APPROVAL';
    const saved = await this.repo.save(row);
    log.info('PromoPush marked paid from webhook', { pushId, provider });
    return saved;
  }

  async markFailedFromWebhook(pushId: string, provider: 'MERCADO_PAGO' | 'OPENPIX' | 'ASAAS' = 'MERCADO_PAGO') {
    const row = await this.repo.findOne({ where: { id: pushId } });
    if (!row) return null;
    if (String(row.paymentStatus || '').toUpperCase() === 'PAID') return row;
    row.paymentStatus = 'FAILED';
    row.paymentProvider = provider;
    const saved = await this.repo.save(row);
    log.warn('PromoPush marked failed from webhook', { pushId, provider });
    return saved;
  }

  async approve(pushId: string) {
    const row = await this.repo.findOne({ where: { id: pushId }, relations: ['store', 'store.settings'] });
    if (!row) throw new AppError('NOT-001', 404);
    if (row.status !== 'PENDING_APPROVAL') throw new AppError('VAL-001', 400, { message: 'Push não está aguardando aprovação.' });

    // Enviar push
    const storeName = row.store?.name || 'Loja';
    const result = await this.pushService.broadcastToAllActive({
      title: `${storeName}`,
      body: row.body,
      data: { type: 'promo_push', pushId: row.id, storeId: row.storeId },
    });

    row.status = 'SENT';
    row.sentAt = new Date();
    row.sentCount = result.sent;
    await this.repo.save(row);
    log.info('PromoPush approved and sent', { pushId, sent: result.sent });
    return this.serialize(row);
  }

  async reject(pushId: string, reason: string) {
    const row = await this.repo.findOne({ where: { id: pushId } });
    if (!row) throw new AppError('NOT-001', 404);
    if (row.status !== 'PENDING_APPROVAL') throw new AppError('VAL-001', 400, { message: 'Push não está aguardando aprovação.' });
    row.status = 'REJECTED';
    row.rejectionReason = String(reason || '').trim() || 'Conteúdo não aprovado.';
    await this.repo.save(row);
    return this.serialize(row);
  }

  async cancel(pushId: string, storeId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const row = await this.repo.findOne({ where: { id: pushId, storeId } });
    if (!row) throw new AppError('NOT-001', 404);
    if (!['PENDING_PAYMENT', 'PENDING_APPROVAL'].includes(row.status)) {
      throw new AppError('VAL-001', 400, { message: 'Não é possível cancelar este push.' });
    }
    row.status = 'CANCELLED';
    await this.repo.save(row);
    return this.serialize(row);
  }

  private serialize(row: PromoPush) {
    return {
      id: row.id,
      storeId: row.storeId,
      storeName: (row as any).store?.name || null,
      storeSlug: (row as any).store?.slug || null,
      storeLogoUrl: (row as any).store?.settings?.logoUrl || null,
      storeBannerUrl: (row as any).store?.settings?.bannerUrl || null,
      title: row.title,
      body: row.body,
      status: row.status,
      priceAmount: Number(row.priceAmount),
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      paymentProvider: row.paymentProvider || null,
      paymentProviderId: row.paymentProviderId || null,
      paymentLink: row.paymentLink || null,
      paymentQrCodeBase64: row.paymentQrCodeBase64 || null,
      paymentQrCodeText: row.paymentQrCodeText || null,
      paymentExpiresAt: row.paymentExpiresAt || null,
      paymentPaidAt: row.paymentPaidAt || null,
      rejectionReason: row.rejectionReason || null,
      sentAt: row.sentAt || null,
      sentCount: row.sentCount ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
