import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderPayment } from '../entities/OrderPayment';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import {
  PAYMENT_AUDIT_ENTITY,
  PAYMENT_AUDIT_FLOW,
  PAYMENT_AUDIT_STAGE,
} from '../utils/paymentAudit';
import { MercadoPagoService } from './MercadoPagoService';
import { MercadoPagoPointService } from './MercadoPagoPointService';
import { OrderPaymentService } from './OrderPaymentService';
import { PaymentAuditService } from './PaymentAuditService';
import { StorePaymentAccountService } from './StorePaymentAccountService';

/** Minutos de validade da cobrança do balcão — REQ-5/REQ-11 (PO 28/08). */
export const BALCAO_EXPIRY_MINUTES = 5;

/** Método presencial escolhido no checkout pré-seleciona o sheet — design D7. */
export const BALCAO_PRESELECT_MAP: Record<string, string> = {
  pix_loja: 'pix',
  pix: 'pix',
  dinheiro: 'cash',
  debito_presencial: 'point',
  credito_presencial: 'point',
};

/** REQ-16: número, > 0, no máximo 2 casas decimais (tolera vírgula). */
export const normalizeChargeAmount = (raw: unknown): number | null => {
  const value = typeof raw === 'string' ? Number(raw.replace(',', '.')) : Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (Math.round(value * 100) !== value * 100) return null;
  return Math.round(value * 100) / 100;
};

export class BalcaoChargeService {
  private repo = AppDataSource.getRepository(OrderPayment);
  private orders = AppDataSource.getRepository(Order);
  private accounts = new StorePaymentAccountService();
  private mercadoPago = new MercadoPagoService();
  private point = new MercadoPagoPointService();
  private orderPayments = new OrderPaymentService();
  private audit = new PaymentAuditService();
  private log = logger.child({ scope: 'BalcaoChargeService' });

  private assertStoreAccess(storeId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
  }

  /** REQ-16: número, > 0, no máximo 2 casas decimais. */
  private normalizeAmount(raw: unknown): number | null {
    return normalizeChargeAmount(raw);
  }

  private isChargeActive(row?: OrderPayment | null): boolean {
    if (!row) return false;
    if (String(row.paymentStatus).toUpperCase() !== 'PENDING') return false;
    if (!row.expiresAt) return false;
    return new Date(row.expiresAt).getTime() > Date.now();
  }

  private async loadOrder(storeId: string, orderId: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ['store', 'store.owner', 'customerUser'],
    });
    if (!order || order.store?.id !== storeId) throw new AppError('ORDER-001', 404);
    return order;
  }

  private serialize(row: OrderPayment | null) {
    if (!row) return null;
    return {
      id: row.id,
      method: row.paymentMethod,
      status: String(row.paymentStatus).toUpperCase(),
      amount: Number(row.amount),
      terminalId: row.terminalId || null,
      qrCodeText: row.qrCodeText || null,
      qrCodeBase64: row.qrCodeBase64 || null,
      expiresAt: row.expiresAt || null,
    };
  }

  /**
   * Estado do momento do pagamento (REQ-14/21/4): total sugerido, cobrança
   * vigente reconciliada com o MP, métodos disponíveis e pré-seleção.
   */
  async getStatus(storeId: string, orderId: string, authStoreId?: string) {
    this.assertStoreAccess(storeId, authStoreId);
    const order = await this.loadOrder(storeId, orderId);
    const row = await this.repo.findOne({ where: { orderId: order.id } });

    // REQ-21: reconciliar com o MP antes de responder (webhook pode ter caído)
    if (row?.providerOrderId && this.isChargeActive(row)) {
      try {
        const accessToken = await this.accounts.getActiveAccessToken(storeId);
        if (accessToken) await this.reconcilePointCharge(row, accessToken);
      } catch (error: any) {
        this.log.warn('Balcão charge reconcile failed', { orderId, error: error?.message });
      }
    }

    const accessToken = await this.accounts.getActiveAccessToken(storeId).catch(() => null);
    const mpEnabled = Boolean(accessToken);

    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: String(order.paymentStatus).toUpperCase(),
      suggestedAmount: Number(order.total || 0),
      preselectedMethod: BALCAO_PRESELECT_MAP[String(order.paymentMethod || '').toLowerCase()] || null,
      charge: this.serialize(row ? await this.repo.findOne({ where: { id: row.id } }) : row),
      capabilities: {
        pix: mpEnabled,
        point: mpEnabled,
        cash: true,
        reason: mpEnabled ? null : 'Conecte a conta Mercado Pago da loja para Pix e maquininha.',
      },
    };
  }

  /** REQ-1/2/6/12/15: cria a cobrança (uma linha por pedido — uq_order_payments_order). */
  async createCharge(input: {
    storeId: string;
    orderId: string;
    method: 'pix' | 'point' | 'cash';
    amount?: unknown;
    terminalId?: string | null;
    actorUserId?: string | null;
    authStoreId?: string;
  }) {
    this.assertStoreAccess(input.storeId, input.authStoreId);
    const order = await this.loadOrder(input.storeId, input.orderId);

    if (String(order.paymentStatus).toUpperCase() === 'PAID') {
      throw new AppError('PAY-021', 409, { message: 'Este pedido já está pago.' });
    }

    const originalAmount = this.normalizeAmount(order.total);
    const rawAmount = input.amount === undefined || input.amount === null || input.amount === ''
      ? originalAmount
      : this.normalizeAmount(input.amount);
    if (!rawAmount) {
      throw new AppError('PAY-019', 400, {
        message: 'Valor inválido — use um número maior que zero com até 2 casas decimais.',
      });
    }

    let row = await this.repo.findOne({ where: { orderId: order.id } });
    if (this.isChargeActive(row)) {
      throw new AppError('PAY-021', 409, {
        message: 'Já existe uma cobrança em andamento para este pedido — cancele-a antes de cobrar de novo.',
      });
    }

    // Renovação: cobrança anterior morreu (expirada/falha) — point pendurado no MP
    // é cancelado best-effort; o QR pix expira sozinho no MP (5 min).
    if (row?.providerOrderId) {
      const token = await this.accounts.getActiveAccessToken(input.storeId).catch(() => null);
      if (token) await this.point.cancelPointCharge(token, row.providerOrderId);
    }

    if (!row) {
      row = this.repo.create({
        order,
        orderId: order.id,
        store: order.store,
        storeId: input.storeId,
        amount: rawAmount,
        paymentMethod: input.method,
        paymentStatus: 'PENDING',
        provider: input.method === 'cash' ? 'MANUAL' : 'MERCADO_PAGO',
      });
    }

    const adjusted = originalAmount !== null && rawAmount !== originalAmount;
    const metadata: Record<string, any> = {
      chargeSource: 'balcao',
      originalAmount,
      ...(adjusted
        ? {
            adjustedBy: input.actorUserId || null,
            adjustedAt: new Date().toISOString(),
            adjustmentDelta: Math.round((rawAmount - originalAmount) * 100) / 100,
          }
        : {}),
    };

    // RESET do estado da linha p/ nova tentativa (uq order_id impõe uma por pedido)
    row.amount = rawAmount;
    row.paymentMethod = input.method;
    row.paymentStatus = 'PENDING';
    row.provider = input.method === 'cash' ? 'MANUAL' : 'MERCADO_PAGO';
    row.paidAt = null;
    row.failedAt = null;
    row.providerOrderId = null;
    row.terminalId = null;
    row.qrCodeBase64 = null;
    row.qrCodeText = null;
    row.paymentLink = null;
    row.expiresAt = new Date(Date.now() + BALCAO_EXPIRY_MINUTES * 60 * 1000);
    row.metadata = { ...(row.metadata || {}), ...metadata };
    row = await this.repo.save(row);

    const description = `Pedido ${String(order.id).slice(0, 8)} - ${order.store?.name || 'Loja'}`;
    const externalReference = `order_payment:${row.id}`;

    if (input.method === 'pix') {
      const accessToken = await this.accounts.getActiveAccessToken(input.storeId);
      if (!accessToken) {
        throw new AppError('PAY-017', 400, {
          message: 'Conecte a conta Mercado Pago da loja antes de gerar Pix no balcão.',
        });
      }
      const payerEmail = String(
        (order as any)?.customerUser?.email || order.store?.owner?.email || ''
      ).trim();
      const payerName = String(order.customerName || order.store?.name || 'Cliente').trim();
      if (!payerEmail) {
        throw new AppError('PAY-018', 400, {
          message: 'Não há e-mail de pagador para gerar o Pix — cadastre um responsável pela loja.',
        });
      }
      const mpPayment: any = await this.mercadoPago.createPayment({
        amount: rawAmount,
        method: 'PIX',
        description, // REQ-26: sem PII do cliente
        externalReference,
        expiresInMinutes: BALCAO_EXPIRY_MINUTES,
        payer: { email: payerEmail, name: payerName },
        accessToken,
        auditContext: {
          flowType: PAYMENT_AUDIT_FLOW.ORDER,
          entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
          entityId: row.id,
          storeId: input.storeId,
          externalReference,
          eventStage: PAYMENT_AUDIT_STAGE.PROVIDER_REQUEST,
        },
      });
      row.providerId = mpPayment?.providerId ? String(mpPayment.providerId) : null;
      row.qrCodeBase64 = mpPayment?.qrCodeBase64 || null;
      row.qrCodeText = mpPayment?.qrCodeText || null;
      row.paymentLink = mpPayment?.paymentLink || null;
      row = await this.repo.save(row);
    }

    if (input.method === 'point') {
      const accessToken = await this.accounts.getActiveAccessToken(input.storeId);
      if (!accessToken) {
        throw new AppError('PAY-017', 400, {
          message: 'Conecte a conta Mercado Pago da loja antes de cobrar na maquininha.',
        });
      }
      // REQ-7: sem terminal informado, resolve sozinho quando há exatamente 1
      let terminalId = String(input.terminalId || '').trim();
      if (!terminalId) {
        const list = await this.point.listTerminals(input.storeId);
        const ready = (list.terminals || []).filter((t: any) => t.integrationReady);
        if (ready.length === 0) {
          throw new AppError('PAY-020', 400, {
            message:
              'Nenhuma maquininha pronta encontrada — verifique se o terminal está ligado e no modo PDV.',
          });
        }
        if (ready.length > 1) {
          throw new AppError('PAY-020', 409, {
            message: 'Escolha a maquininha para enviar a cobrança.',
            terminals: ready,
          });
        }
        terminalId = ready[0].id;
      }
      const charge = await this.point.createPointCharge({
        storeId: input.storeId,
        accessToken,
        amount: rawAmount,
        terminalId,
        externalReference,
        description,
      });
      row.providerOrderId = charge.orderId;
      row.terminalId = terminalId;
      row = await this.repo.save(row);
    }

    if (input.method === 'cash') {
      // REQ-12/13: registro manual imediato com trilha de auditoria.
      // Reusa a transição completa do webhook (idempotente): order.payment_status,
      // promoção awaiting_payment → pending (entra na fila), timeline e audit.
      row.metadata = { ...(row.metadata || {}), cashReceivedBy: input.actorUserId || null };
      row = await this.repo.save(row);
      await this.orderPayments.markPaidFromWebhook(row.id, {
        status: 'approved',
        status_detail: 'balcao_cash',
      });
      row = (await this.repo.findOne({ where: { id: row.id } }))!;
    }

    await this.audit.record({
      provider: input.method === 'cash' ? 'MANUAL' : 'MERCADO_PAGO',
      flowType: PAYMENT_AUDIT_FLOW.ORDER,
      eventStage: PAYMENT_AUDIT_STAGE.PROVIDER_REQUEST,
      entityType: PAYMENT_AUDIT_ENTITY.ORDER_PAYMENT,
      entityId: row.id,
      storeId: input.storeId,
      externalReference,
      providerPaymentId: row.providerId || null,
      providerStatus: row.paymentStatus || null,
      requestPayload: { method: input.method, amount: rawAmount, source: 'balcao' },
      responsePayload: { status: row.paymentStatus, terminalId: row.terminalId },
      success: true,
    }).catch((error: any) => this.log.warn('Balcão audit record failed', { error: error?.message }));

    this.log.info('Balcão charge created', {
      orderId: order.id,
      method: input.method,
      amount: rawAmount,
      storeId: input.storeId,
    });

    return { charge: this.serialize(row) };
  }

  /** REQ-18: encerra a cobrança pendente (MP best-effort) e libera nova tentativa. */
  async cancelCharge(storeId: string, orderId: string, authStoreId?: string) {
    this.assertStoreAccess(storeId, authStoreId);
    const order = await this.loadOrder(storeId, orderId);
    const row = await this.repo.findOne({ where: { orderId: order.id } });
    if (!row) throw new AppError('PAY-014', 404);
    if (String(row.paymentStatus).toUpperCase() === 'PAID') {
      throw new AppError('PAY-022', 409, { message: 'Cobrança já paga não pode ser cancelada.' });
    }
    if (String(row.paymentStatus).toUpperCase() === 'CANCELED') {
      return { status: 'CANCELED' };
    }
    if (row.providerOrderId) {
      const token = await this.accounts.getActiveAccessToken(storeId).catch(() => null);
      if (token) await this.point.cancelPointCharge(token, row.providerOrderId);
    }
    row.paymentStatus = 'CANCELED';
    await this.repo.save(row);
    this.log.info('Balcão charge canceled', { orderId: order.id, storeId });
    return { status: 'CANCELED' };
  }

  /** REQ-8: webhook do tópico `order` (Point) — resolve pela order do MP. */
  async handleProviderWebhookOrder(mpOrderId: string) {
    const row = await this.repo.findOne({
      where: { providerOrderId: String(mpOrderId) },
      relations: ['store'],
    });
    if (!row?.id) return null;
    const accessToken = await this.accounts.getActiveAccessToken(row.storeId).catch(() => null);
    if (!accessToken) return { status: 'no_token', orderPaymentId: row.id };
    const mpOrder: any = await this.point.getPointOrder(accessToken, String(mpOrderId));
    if (!mpOrder) return { status: 'lookup_failed', orderPaymentId: row.id };
    await this.reconcilePointCharge(row, accessToken, mpOrder);
    return { status: 'processed', orderPaymentId: row.id };
  }

  /** Sincroniza a order Point do MP com a linha local (REQ-8/11/21). */
  private async reconcilePointCharge(row: OrderPayment, accessToken: string, mpOrder?: any) {
    const order: any = mpOrder || (await this.point.getPointOrder(accessToken, String(row.providerOrderId)));
    if (!order) return;
    const payment = order?.transactions?.payments?.[0];
    const status = String(payment?.status || '').toLowerCase();
    if (status === 'approved') {
      await this.orderPayments.markPaidFromWebhook(row.id, payment);
    } else if (['rejected', 'cancelled', 'canceled', 'failed'].includes(status)) {
      await this.orderPayments.markFailedFromWebhook(row.id, payment);
    } else if (String(order.status || '').toLowerCase() === 'expired' && this.isChargeActive(row)) {
      row.paymentStatus = 'EXPIRED';
      await this.repo.save(row);
    }
  }
}
