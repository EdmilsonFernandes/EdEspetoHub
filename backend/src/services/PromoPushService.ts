import QRCode from 'qrcode';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { PromoPush } from '../entities/PromoPush';
import { Store } from '../entities/Store';
import { AppError } from '../errors/AppError';
import { MercadoPagoService } from './MercadoPagoService';
import { PushNotificationService } from './PushNotificationService';
import { logger } from '../utils/logger';

const PROMO_PUSH_PRICE = 4.90;
const log = logger.child({ scope: 'PromoPushService' });

export class PromoPushService {
  private repo = AppDataSource.getRepository(PromoPush);
  private mercadoPago = new MercadoPagoService();
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

    // Criar pagamento MP da plataforma
    const mpEnabled = Boolean(env.mercadoPago.accessToken);
    const payerEmail = String(store.owner?.email || env.email.smtpUser || 'contato@janocaminho.com.br').trim();
    const payerName = String(store.owner?.fullName || store.name || 'Lojista').trim();

    let providerId: string | null = null;
    let paymentLink: string | null = null;
    let qrCodeBase64: string | null = null;
    let qrCodeText: string | null = null;
    let providerExpiresAt: Date | null = expiresAt;

    if (mpEnabled && payerEmail) {
      try {
        const mp: any = await this.mercadoPago.createPayment({
          amount: PROMO_PUSH_PRICE,
          method: 'PIX',
          description: `Push Promocional - ${store.name}`,
          externalReference: `promo_push:${created.id}`,
          payer: { email: payerEmail, name: payerName },
        });
        providerId = String(mp?.providerId || '');
        paymentLink = mp?.paymentLink || null;
        qrCodeBase64 = mp?.qrCodeBase64
          ? (String(mp.qrCodeBase64).startsWith('data:image') ? mp.qrCodeBase64 : `data:image/png;base64,${mp.qrCodeBase64}`)
          : null;
        qrCodeText = mp?.qrCodeText || null;
        if (mp?.expiresAt) {
          const parsed = new Date(mp.expiresAt);
          if (Number.isFinite(parsed.getTime())) providerExpiresAt = parsed;
        }
      } catch (err: any) {
        log.warn('PromoPush MP payment creation failed, using mock QR', { storeId, payerEmail, error: err?.message || err });
      }
    }

    if (!qrCodeText) {
      qrCodeText = `PIX PUSH PROMO | Store:${store.name} | Amount:${PROMO_PUSH_PRICE.toFixed(2)} | Push:${created.id}`;
    }
    if (!qrCodeBase64) {
      qrCodeBase64 = await QRCode.toDataURL(qrCodeText);
    }

    created.paymentProviderId = providerId;
    created.paymentLink = paymentLink;
    created.paymentQrCodeBase64 = qrCodeBase64;
    created.paymentQrCodeText = qrCodeText;
    created.paymentExpiresAt = providerExpiresAt;
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
      relations: ['store'],
      order: { updatedAt: 'DESC' },
      take: limit,
    });
    return rows.map((r) => this.serialize(r));
  }

  async listPending() {
    const rows = await this.repo.find({
      where: { status: 'PENDING_APPROVAL' },
      relations: ['store'],
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async refreshPayment(pushId: string, storeId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const row = await this.repo.findOne({ where: { id: pushId, storeId } });
    if (!row) throw new AppError('NOT-001', 404);
    if (!row.paymentProviderId || !env.mercadoPago.accessToken) return this.serialize(row);

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

  async approve(pushId: string) {
    const row = await this.repo.findOne({ where: { id: pushId }, relations: ['store'] });
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
      title: row.title,
      body: row.body,
      status: row.status,
      priceAmount: Number(row.priceAmount),
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
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
