import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { Order } from '../entities/Order';
import { OrderPayment } from '../entities/OrderPayment';
import { AppError } from '../errors/AppError';
import { MercadoPagoService } from './MercadoPagoService';
import { StorePaymentAccountService } from './StorePaymentAccountService';
import { logger } from '../utils/logger';
import { PaymentAuditService } from './PaymentAuditService';
import { PushNotificationService } from './PushNotificationService';
import { PAYMENT_AUDIT_ENTITY, PAYMENT_AUDIT_FLOW, PAYMENT_AUDIT_STAGE, resolveMercadoPagoStatusDetailLabel, resolveMercadoPagoStatusLabel } from '../utils/paymentAudit';
import { buildOrderTimelineJson } from '../utils/orderTimeline';

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
  private paymentAuditService = new PaymentAuditService();
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
        auditContext: {
          flowType: PAYMENT_AUDIT_FLOW.ORDER,
          entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
          entityId: row.id,
          storeId: order.store.id,
          externalReference: `order_payment:${row.id}`,
          eventStage: PAYMENT_AUDIT_STAGE.PROVIDER_REQUEST,
        },
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
      this.log.warn('Order payment creation failed', {
        orderId: order.id,
        storeId: order.store.id,
        error,
      });
      if (error instanceof AppError) {
        throw error;
      }
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
      await this.paymentAuditService.record({
        provider: 'MERCADO_PAGO',
        flowType: PAYMENT_AUDIT_FLOW.ORDER,
        eventStage: PAYMENT_AUDIT_STAGE.STATUS_APPLIED,
        entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
        entityId: row.id,
        storeId: row.storeId,
        externalReference: `order_payment:${row.id}`,
        providerPaymentId: mpPayment?.id ? String(mpPayment.id) : row.providerId || null,
        providerStatus: mpPayment?.status || 'approved',
        providerStatusDetail: mpPayment?.status_detail || null,
        responsePayload: {
          localPaymentStatus: 'PAID',
          localOrderStatus: 'PAID',
          providerStatus: mpPayment?.status || 'approved',
        },
        success: true,
      }, manager);

      // Update paymentStatus; promote awaiting_payment → pending so order enters the queue
      await manager.getRepository(Order).update({ id: row.orderId }, { paymentStatus: 'PAID' });
      await manager.getRepository(Order)
        .createQueryBuilder()
        .update()
        .set({ status: 'pending' })
        .where('id = :id AND status = :s', { id: row.orderId, s: 'awaiting_payment' })
        .execute();
      try {
        await manager.query(
          "UPDATE orders SET status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $1::jsonb WHERE id = $2",
          [buildOrderTimelineJson('payment', row.paidAt), row.orderId]
        );
        await manager.query(
          "UPDATE orders SET status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $1::jsonb WHERE id = $2 AND status = 'pending'",
          [buildOrderTimelineJson('pending', row.paidAt), row.orderId]
        );
      } catch {}
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
    await this.paymentAuditService.record({
      provider: 'MERCADO_PAGO',
      flowType: PAYMENT_AUDIT_FLOW.ORDER,
      eventStage: PAYMENT_AUDIT_STAGE.STATUS_APPLIED,
      entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
      entityId: row.id,
      storeId: row.storeId,
      externalReference: `order_payment:${row.id}`,
      providerPaymentId: mpPayment?.id ? String(mpPayment.id) : row.providerId || null,
      providerStatus: mpPayment?.status || 'failed',
      providerStatusDetail: mpPayment?.status_detail || null,
      responsePayload: {
        localPaymentStatus: 'FAILED',
        localOrderStatus: 'FAILED',
        providerStatus: mpPayment?.status || 'failed',
      },
      success: false,
    });
    // Update paymentStatus; cancel order if it was still awaiting payment
    await AppDataSource.getRepository(Order).update({ id: row.orderId }, { paymentStatus: 'FAILED' });
    await AppDataSource.getRepository(Order)
      .createQueryBuilder()
      .update()
      .set({ status: 'cancelled' })
      .where('id = :id AND status = :s', { id: row.orderId, s: 'awaiting_payment' })
      .execute();
    try {
      await AppDataSource.query(
        "UPDATE orders SET status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $1::jsonb WHERE id = $2 AND status = 'cancelled'",
        [buildOrderTimelineJson('cancelled', row.failedAt), row.orderId]
      );
    } catch {}
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
    const mpPayment: any = await this.mercadoPago.getPayment(row.providerId, accessToken, {
      flowType: PAYMENT_AUDIT_FLOW.ORDER,
      entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
      entityId: row.id,
      storeId: row.storeId,
      externalReference: `order_payment:${row.id}`,
      eventStage: PAYMENT_AUDIT_STAGE.MANUAL_REFRESH,
    });
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
      const accessToken = await this.accountService.getActiveAccessToken(direct.storeId);
      if (!accessToken) return direct;
      const mpPayment: any = await this.mercadoPago.getPayment(mercadoPagoPaymentId, accessToken, {
        flowType: PAYMENT_AUDIT_FLOW.ORDER,
        entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
        entityId: direct.id,
        storeId: direct.storeId,
        externalReference: `order_payment:${direct.id}`,
        eventStage: PAYMENT_AUDIT_STAGE.WEBHOOK_LOOKUP,
      });
      const status = String(mpPayment?.status || '').toLowerCase();
      if (status === 'approved') {
        await this.markPaidFromWebhook(direct.id, mpPayment);
      } else if ([ 'rejected', 'cancelled', 'charged_back', 'refunded', 'failed' ].includes(status)) {
        await this.markFailedFromWebhook(direct.id, mpPayment);
      }
      return { status: mpPayment?.status || 'unknown', orderPaymentId: direct.id };
    }

    const accounts = await this.accountService.listActiveAccessTokens();
    for (const account of accounts) {
      try {
        const mpPayment: any = await this.mercadoPago.getPayment(mercadoPagoPaymentId, account.accessToken);
        const reference = String(mpPayment?.external_reference || '');
        if (!reference.startsWith('order_payment:')) continue;
        const orderPaymentId = reference.replace('order_payment:', '');
        await this.paymentAuditService.record({
          provider: 'MERCADO_PAGO',
          flowType: PAYMENT_AUDIT_FLOW.ORDER,
          eventStage: PAYMENT_AUDIT_STAGE.WEBHOOK_LOOKUP,
          entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
          entityId: orderPaymentId,
          storeId: account.storeId,
          externalReference: reference,
          providerPaymentId: mpPayment?.id ? String(mpPayment.id) : mercadoPagoPaymentId,
          providerStatus: mpPayment?.status || null,
          providerStatusDetail: mpPayment?.status_detail || null,
          requestPayload: { method: 'GET', paymentId: mercadoPagoPaymentId },
          responsePayload: mpPayment || null,
          success: true,
        });
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

  async getAuditByOrderForStore(orderId: string, storeId: string, authStoreId?: string, includeTechnical = false) {
    if (authStoreId && authStoreId !== storeId) {
      throw new AppError('AUTH-003', 403, { message: 'Acesso negado para esta loja.' });
    }
    const row = await AppDataSource.getRepository(OrderPayment).findOne({
      where: { orderId, storeId },
    });
    if (!row) {
      return { summary: null, events: [], technical: includeTechnical ? null : undefined };
    }
    const rows = await this.paymentAuditService.listByEntity(PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT, row.id, storeId, 20);
    const payload = this.paymentAuditService.buildOverview(
      {
        provider: row.provider,
        flowType: PAYMENT_AUDIT_FLOW.ORDER,
        entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
        entityId: row.id,
        externalReference: `order_payment:${row.id}`,
        providerPaymentId: row.providerId || null,
        providerStatus: row.providerPayload?.status || null,
        providerStatusDetail: row.providerPayload?.status_detail || null,
        paymentMethod: row.paymentMethod,
        paymentStatus: row.paymentStatus,
        amount: Number(row.amount || 0),
        paidAt: row.paidAt || null,
        failedAt: row.failedAt || null,
        expiresAt: row.expiresAt || null,
        updatedAt: row.updatedAt || null,
      },
      rows,
      includeTechnical
    );
    if (payload.summary) {
      payload.summary.providerStatusLabel =
        payload.summary.providerStatusLabel || resolveMercadoPagoStatusLabel(payload.summary.providerStatus || null);
      payload.summary.providerStatusDetailLabel =
        payload.summary.providerStatusDetailLabel ||
        resolveMercadoPagoStatusDetailLabel(payload.summary.providerStatusDetail || null);
    }
    return payload;
  }

  /**
   * Processes a refund for a cancelled order's online payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-05-05
   */
  async refundOrder(
    orderId: string,
    storeId: string,
    reason: string,
    amount?: number,
  ): Promise<{ refundStatus: string; refundAmount: number; refundProviderId: string }> {
    const repo = AppDataSource.getRepository(OrderPayment);
    const orderPayment = await repo.findOne({ where: { orderId } });
    if (!orderPayment) throw new AppError('REFUND-010', 404, { message: 'Pagamento não encontrado para este pedido.' });
    if (orderPayment.storeId !== storeId) throw new AppError('REFUND-011', 403, { message: 'Acesso negado.' });
    if (orderPayment.paymentStatus !== 'PAID') {
      throw new AppError('REFUND-012', 400, { message: 'Só é possível reembolsar pagamentos confirmados.' });
    }
    if (orderPayment.refundStatus === 'REFUNDED' || orderPayment.refundStatus === 'PARTIALLY_REFUNDED') {
      throw new AppError('REFUND-013', 400, { message: 'Este pagamento já foi reembolsado.' });
    }
    if (!orderPayment.providerId) {
      throw new AppError('REFUND-014', 400, { message: 'ID do pagamento no provedor não encontrado.' });
    }

    const accessToken = await this.accountService.getActiveAccessToken(storeId);
    if (!accessToken) {
      throw new AppError('REFUND-015', 400, { message: 'Conta Mercado Pago não conectada ou token indisponível.' });
    }

    const refundAmount = amount && amount < Number(orderPayment.amount) ? amount : undefined;
    const result = await this.mercadoPago.refundPayment(orderPayment.providerId, accessToken, refundAmount);

    const finalAmount = refundAmount || Number(orderPayment.amount);
    const refundStatus = refundAmount ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    await repo.update(orderPayment.id, {
      refundStatus,
      refundAmount: finalAmount,
      refundReason: reason,
      refundedAt: new Date(),
      refundProviderId: result.id,
    });

    // Push notification to customer
    try {
      const order = await AppDataSource.getRepository(Order).findOne({ where: { id: orderId }, relations: ['store'] });
      const userId = order?.customerUserId;
      const guestId = order?.guestPushId;
      if (userId || guestId) {
        const pushService = new PushNotificationService();
        const storeName = String(order?.store?.name || '').trim();
        const amountLabel = `R$ ${finalAmount.toFixed(2).replace('.', ',')}`;
        const body = storeName
          ? `${storeName}: reembolso de ${amountLabel} processado. O valor será devolvido à sua conta.`
          : `Reembolso de ${amountLabel} processado. O valor será devolvido à sua conta.`;
        const payload = {
          title: 'Reembolso confirmado',
          body,
          data: { url: `https://janocaminho.com.br/pedido/${orderId}`, orderId, status: 'refunded' },
        };
        if (userId) void pushService.notifyCustomerOrderUpdate(userId, payload);
        if (guestId) void pushService.notifyGuestOrderUpdate(guestId, payload);
      }
    } catch { /* push failure should not block refund response */ }

    return { refundStatus, refundAmount: finalAmount, refundProviderId: result.id };
  }

  /**
   * Denies a refund for a cancelled order.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-05-05
   */
  async denyRefund(orderId: string, storeId: string, reason: string): Promise<{ refundStatus: string }> {
    const repo = AppDataSource.getRepository(OrderPayment);
    const orderPayment = await repo.findOne({ where: { orderId } });
    if (!orderPayment) throw new AppError('REFUND-020', 404, { message: 'Pagamento não encontrado para este pedido.' });
    if (orderPayment.storeId !== storeId) throw new AppError('REFUND-021', 403, { message: 'Acesso negado.' });
    if (orderPayment.refundStatus === 'REFUNDED' || orderPayment.refundStatus === 'PARTIALLY_REFUNDED') {
      throw new AppError('REFUND-022', 400, { message: 'Este pagamento já foi reembolsado.' });
    }
    if (orderPayment.refundStatus === 'DENIED') {
      throw new AppError('REFUND-023', 400, { message: 'Reembolso já foi recusado anteriormente.' });
    }
    await repo.update(orderPayment.id, {
      refundStatus: 'DENIED',
      refundReason: reason,
      refundedAt: new Date(),
    });
    return { refundStatus: 'DENIED' };
  }
}
