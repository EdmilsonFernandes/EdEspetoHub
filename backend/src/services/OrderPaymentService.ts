import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { Order } from '../entities/Order';
import { OrderPayment } from '../entities/OrderPayment';
import { AppError } from '../errors/AppError';
import { MercadoPagoService } from './MercadoPagoService';
import { StorePaymentAccountService } from './StorePaymentAccountService';
import { logger } from '../utils/logger';

const ONLINE_METHOD_MAP: Record<string, 'PIX' | 'CREDIT_CARD'> = {
  pix: 'PIX',
  credito: 'CREDIT_CARD',
  crédito: 'CREDIT_CARD',
  credit_card: 'CREDIT_CARD',
  cartao: 'CREDIT_CARD',
  cartão: 'CREDIT_CARD',
  debito: 'CREDIT_CARD',
  débito: 'CREDIT_CARD',
  debit_card: 'CREDIT_CARD',
};

export class OrderPaymentService {
  private mercadoPago = new MercadoPagoService();
  private accountService = new StorePaymentAccountService();
  private log = logger.child({ scope: 'OrderPaymentService' });

  private normalizeQrCode(qrCode?: string | null) {
    if (!qrCode) return null;
    if (qrCode.startsWith('data:image')) return qrCode;
    return `data:image/png;base64,${qrCode}`;
  }

  private resolveProviderMethod(paymentMethod?: string | null) {
    return ONLINE_METHOD_MAP[String(paymentMethod || '').trim().toLowerCase()] || null;
  }

  async createForOrderIfEnabled(order: Order, manager?: EntityManager) {
    const providerMethod = this.resolveProviderMethod(order.paymentMethod);
    if (!providerMethod || !order.store?.id) return null;

    const accessToken = await this.accountService.getActiveAccessToken(order.store.id);
    if (!accessToken) return null;

    const repo = (manager || AppDataSource.manager).getRepository(OrderPayment);
    const amount = Number(order.total || 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    let row = repo.create({
      order,
      orderId: order.id,
      store: order.store,
      storeId: order.store.id,
      amount,
      paymentMethod: String(order.paymentMethod || '').trim(),
      paymentStatus: 'PENDING',
      provider: 'MERCADO_PAGO',
    });
    row = await repo.save(row);

    const payerEmail = String((order as any)?.customerUser?.email || order.store?.owner?.email || '').trim();
    const payerName = String(order.customerName || order.store?.name || 'Cliente').trim();
    if (!payerEmail) return row;

    try {
      const mpPayment: any = await this.mercadoPago.createPayment({
        amount,
        method: providerMethod,
        description: `Pedido ${String(order.id).slice(0, 8)} - ${order.store.name}`,
        externalReference: `order_payment:${row.id}`,
        payer: {
          email: payerEmail,
          name: payerName,
        },
        accessToken,
      });

      row.providerId = mpPayment?.providerId || row.providerId || null;
      row.paymentLink = mpPayment?.paymentLink || null;
      row.qrCodeBase64 = this.normalizeQrCode(mpPayment?.qrCodeBase64);
      row.qrCodeText = mpPayment?.qrCodeText || null;
      if (providerMethod === 'PIX') {
        // Always set a local expiry for PIX — never rely solely on provider value
        const pixExpiry = new Date(Date.now() + 5 * 60 * 1000);
        if (mpPayment?.expiresAt) {
          const parsed = new Date(mpPayment.expiresAt);
          row.expiresAt = (Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now() + 30_000)
            ? parsed
            : pixExpiry;
        } else {
          row.expiresAt = pixExpiry;
        }
      } else if (mpPayment?.expiresAt) {
        const parsed = new Date(mpPayment.expiresAt);
        if (Number.isFinite(parsed.getTime())) row.expiresAt = parsed;
      }
      row = await repo.save(row);
    } catch (error) {
      this.log.warn('Order payment creation failed, keeping conventional order flow', {
        orderId: order.id,
        storeId: order.store.id,
        error,
      });
    }

    return row;
  }

  async markPaidFromWebhook(orderPaymentId: string, mpPayment?: any) {
    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrderPayment);
      const row = await repo
        .createQueryBuilder('orderPayment')
        .setLock('pessimistic_write')
        .where('orderPayment.id = :id', { id: orderPaymentId })
        .getOne();
      if (!row) throw new AppError('PAY-014', 404, { message: 'Pagamento do pedido não encontrado.' });
      if (row.paymentStatus === 'PAID') return;

      row.paymentStatus = 'PAID';
      row.paidAt = new Date();
      row.providerPayload = mpPayment || null;
      if (mpPayment?.id) row.providerId = String(mpPayment.id);
      const mpQr = mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64;
      const mpQrText = mpPayment?.point_of_interaction?.transaction_data?.qr_code;
      const mpLink = mpPayment?.transaction_details?.external_resource_url;
      if (mpQr) row.qrCodeBase64 = this.normalizeQrCode(mpQr);
      if (mpQrText) row.qrCodeText = mpQrText;
      if (mpLink) row.paymentLink = mpLink;
      await repo.save(row);

      // Update paymentStatus; promote awaiting_payment → pending so order enters the queue
      await manager.getRepository(Order).update({ id: row.orderId }, { paymentStatus: 'PAID' });
      await manager.getRepository(Order)
        .createQueryBuilder()
        .update()
        .set({ status: 'pending' })
        .where('id = :id AND status = :s', { id: row.orderId, s: 'awaiting_payment' })
        .execute();
    });
  }

  async markFailedFromWebhook(orderPaymentId: string, mpPayment?: any) {
    const repo = AppDataSource.getRepository(OrderPayment);
    const row = await repo.findOne({ where: { id: orderPaymentId } });
    if (!row || row.paymentStatus === 'PAID') return;
    row.paymentStatus = 'FAILED';
    row.failedAt = new Date();
    row.providerPayload = mpPayment || null;
    if (mpPayment?.id) row.providerId = String(mpPayment.id);
    await repo.save(row);
    // Update paymentStatus; cancel order if it was still awaiting payment
    await AppDataSource.getRepository(Order).update({ id: row.orderId }, { paymentStatus: 'FAILED' });
    await AppDataSource.getRepository(Order)
      .createQueryBuilder()
      .update()
      .set({ status: 'cancelled' })
      .where('id = :id AND status = :s', { id: row.orderId, s: 'awaiting_payment' })
      .execute();
  }

  async refreshFromProvider(orderPaymentId: string) {
    const row = await AppDataSource.getRepository(OrderPayment).findOne({
      where: { id: orderPaymentId },
      relations: [ 'store' ],
    });
    if (!row) throw new AppError('PAY-014', 404);
    if (!row.providerId) return row;
    const accessToken = await this.accountService.getActiveAccessToken(row.storeId);
    if (!accessToken || !env.mercadoPago.apiBaseUrl) return row;
    const mpPayment: any = await this.mercadoPago.getPayment(row.providerId, accessToken);
    const status = String(mpPayment?.status || '').toLowerCase();
    if (status === 'approved') await this.markPaidFromWebhook(row.id, mpPayment);
    if ([ 'rejected', 'cancelled', 'charged_back', 'refunded', 'failed' ].includes(status)) {
      await this.markFailedFromWebhook(row.id, mpPayment);
    }
    return AppDataSource.getRepository(OrderPayment).findOne({ where: { id: orderPaymentId } });
  }

  async handleProviderWebhookPayment(mercadoPagoPaymentId: string) {
    const direct = await AppDataSource.getRepository(OrderPayment).findOne({
      where: { providerId: String(mercadoPagoPaymentId), provider: 'MERCADO_PAGO' as any },
    });
    if (direct?.id) {
      return this.refreshFromProvider(direct.id);
    }

    const accounts = await this.accountService.listActiveAccessTokens();
    for (const account of accounts) {
      try {
        const mpPayment: any = await this.mercadoPago.getPayment(mercadoPagoPaymentId, account.accessToken);
        const reference = String(mpPayment?.external_reference || '');
        if (!reference.startsWith('order_payment:')) continue;
        const orderPaymentId = reference.replace('order_payment:', '');
        const status = String(mpPayment?.status || '').toLowerCase();
        if (status === 'approved') {
          await this.markPaidFromWebhook(orderPaymentId, mpPayment);
        } else if ([ 'rejected', 'cancelled', 'charged_back', 'refunded', 'failed' ].includes(status)) {
          await this.markFailedFromWebhook(orderPaymentId, mpPayment);
        }
        return { status: mpPayment?.status || 'unknown', orderPaymentId };
      } catch {
        // A webhook only contains the provider payment id; try the next connected seller token.
      }
    }
    return null;
  }
}
