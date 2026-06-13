import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { DestinationPromotion } from '../entities/DestinationPromotion';
import { AppError } from '../errors/AppError';
import { MercadoPagoService } from './MercadoPagoService';
import { PaymentAuditService } from './PaymentAuditService';
import {
  PAYMENT_AUDIT_ENTITY,
  PAYMENT_AUDIT_FLOW,
  PAYMENT_AUDIT_STAGE,
} from '../utils/paymentAudit';
import {
  isMercadoPagoApprovedStatus,
  isMercadoPagoFailedStatus,
  isMercadoPagoPendingStatus,
} from '../utils/mercadoPagoStatus';

const normalizeStatus = (value?: string) => String(value || '').trim().toUpperCase();
const DURATION_OPTIONS = { DAY: 1, WEEK: 7, MONTH: 30 } as const;
type DurationUnit = keyof typeof DURATION_OPTIONS;
type PromotionPaymentMethod = 'PIX' | 'CREDIT_CARD';
type ResourceType = 'HOSPITALITY_PLACE' | 'DESTINATION_LISTING' | 'DESTINATION';

type PricingConfig = {
  dayPrice: number;
  weekPrice: number;
  monthPrice: number;
  maxActiveSlots: number;
};

const PROMO_PREFIX = 'destination_promo';

export class DestinationPromotionService {
  private repo = AppDataSource.getRepository(DestinationPromotion);
  private mercadoPago = new MercadoPagoService();
  private paymentAuditService = new PaymentAuditService();

  private normalizeDurationUnit(input?: string): DurationUnit {
    const value = String(input || '').trim().toUpperCase();
    if (value === 'DAY' || value === 'WEEK' || value === 'MONTH') return value as DurationUnit;
    return 'MONTH';
  }

  private normalizePaymentMethod(input?: string): PromotionPaymentMethod {
    const value = String(input || '').trim().toUpperCase();
    if (value === 'CREDIT_CARD' || value === 'CARD' || value === 'CARTAO' || value === 'CARTÃO') {
      return 'CREDIT_CARD';
    }
    return 'PIX';
  }

  private async loadPricingConfig(): Promise<PricingConfig> {
    const rows = await AppDataSource.query(
      `
        SELECT key, value
        FROM site_settings
        WHERE key IN (
          'destination_promo_daily_price',
          'destination_promo_weekly_price',
          'destination_promo_monthly_price',
          'destination_promo_max_active_slots'
        )
      `
    );
    const map = new Map<string, string>();
    (rows || []).forEach((row: any) => map.set(String(row?.key || ''), String(row?.value || '')));
    const toMoney = (raw: string | undefined, fallback: number) => {
      const n = Number(raw || fallback);
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return Number(n.toFixed(2));
    };
    const toInt = (raw: string | undefined, fallback: number) => {
      const n = Number(raw || fallback);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(1, Math.min(500, Math.trunc(n)));
    };
    return {
      dayPrice: toMoney(map.get('destination_promo_daily_price'), 19.9),
      weekPrice: toMoney(map.get('destination_promo_weekly_price'), 89.9),
      monthPrice: toMoney(map.get('destination_promo_monthly_price'), 199.9),
      maxActiveSlots: toInt(map.get('destination_promo_max_active_slots'), 50),
    };
  }

  private priceByDuration(config: PricingConfig, durationUnit: DurationUnit) {
    if (durationUnit === 'WEEK') return config.weekPrice;
    if (durationUnit === 'MONTH') return config.monthPrice;
    return config.dayPrice;
  }

  /** Valida o recurso e retorna nome/destino para o registro. */
  private async resolveResource(resourceType: ResourceType, resourceId: string) {
    const id = String(resourceId || '').trim();
    if (!id) throw new AppError('GEN-001', 400, { message: 'Recurso inválido.' });
    if (resourceType === 'DESTINATION_LISTING') {
      const rows = await AppDataSource.query(
        `SELECT id, title, destination_id FROM destination_listings WHERE id = $1`,
        [id]
      );
      if (!rows?.length) throw new AppError('GEN-001', 404, { message: 'Serviço/lugar não encontrado.' });
      return { name: String(rows[0].title || 'Serviço'), destinationId: rows[0].destination_id || null };
    }
    if (resourceType === 'HOSPITALITY_PLACE') {
      const rows = await AppDataSource.query(
        `SELECT id, name, destination_id FROM hospitality_places WHERE id = $1`,
        [id]
      );
      if (!rows?.length) throw new AppError('GEN-001', 404, { message: 'Hospedagem não encontrada.' });
      return { name: String(rows[0].name || 'Hospedagem'), destinationId: rows[0].destination_id || null };
    }
    const rows = await AppDataSource.query(
      `SELECT id, name FROM travel_destinations WHERE id = $1`,
      [id]
    );
    if (!rows?.length) throw new AppError('GEN-001', 404, { message: 'Destino não encontrado.' });
    return { name: String(rows[0].name || 'Destino'), destinationId: id };
  }

  /** Ativa (active=true) ou reverte (active=false) o destaque no recurso vinculado. */
  private async applyFeatured(manager: any, promo: DestinationPromotion, active: boolean) {
    const { resourceType, resourceId } = promo;
    const table =
      resourceType === 'DESTINATION_LISTING'
        ? 'destination_listings'
        : resourceType === 'HOSPITALITY_PLACE'
        ? 'hospitality_places'
        : 'travel_destinations';

    if (active) {
      if (promo.originalSortOrder == null) {
        const r = await manager.query(`SELECT sort_order FROM ${table} WHERE id = $1`, [resourceId]);
        promo.originalSortOrder = Number(r?.[0]?.sort_order ?? 100);
      }
      if (resourceType === 'DESTINATION_LISTING') {
        await manager.query(
          `UPDATE destination_listings SET featured = true, sort_order = 0 WHERE id = $1`,
          [resourceId]
        );
      } else {
        await manager.query(`UPDATE ${table} SET sort_order = 0 WHERE id = $1`, [resourceId]);
      }
      return;
    }

    const restoreOrder = promo.originalSortOrder ?? 100;
    if (resourceType === 'DESTINATION_LISTING') {
      await manager.query(
        `UPDATE destination_listings SET featured = false, sort_order = $2 WHERE id = $1`,
        [resourceId, restoreOrder]
      );
    } else {
      await manager.query(`UPDATE ${table} SET sort_order = $2 WHERE id = $1`, [
        resourceId,
        restoreOrder,
      ]);
    }
  }

  /** Expira promoções aprovadas cuja janela terminou e reverte o destaque. */
  private async reconcileExpired(manager = AppDataSource.manager) {
    const expired = await manager.query(`
      SELECT id FROM destination_promotions
      WHERE status = 'APPROVED' AND payment_status = 'PAID'
        AND ends_at IS NOT NULL AND ends_at < NOW()
    `);
    for (const row of expired || []) {
      const promo = await manager.getRepository(DestinationPromotion).findOne({ where: { id: row.id } });
      if (!promo) continue;
      promo.status = 'EXPIRED';
      await this.applyFeatured(manager, promo, false);
      await manager.save(promo);
    }
  }

  async getPricingSummary() {
    const config = await this.loadPricingConfig();
    await this.reconcileExpired();
    const active = await AppDataSource.query(`
      SELECT COUNT(*)::int AS total FROM destination_promotions
      WHERE status = 'APPROVED' AND payment_status = 'PAID'
        AND starts_at IS NOT NULL AND starts_at <= NOW()
        AND ends_at IS NOT NULL AND ends_at >= NOW()
    `);
    const activeSlots = Number(active?.[0]?.total || 0);
    return {
      prices: { DAY: config.dayPrice, WEEK: config.weekPrice, MONTH: config.monthPrice },
      maxActiveSlots: config.maxActiveSlots,
      activeSlots,
      availableSlots: Math.max(0, config.maxActiveSlots - activeSlots),
    };
  }

  async createPromotion(
    payload: {
      resourceType: ResourceType;
      resourceId: string;
      durationUnit?: string;
      paymentMethod?: string;
      publicNote?: string;
    },
    partnerAccountId?: string | null
  ) {
    const resourceType = String(payload?.resourceType || '').trim().toUpperCase() as ResourceType;
    if (!['HOSPITALITY_PLACE', 'DESTINATION_LISTING', 'DESTINATION'].includes(resourceType)) {
      throw new AppError('GEN-001', 400, { message: 'Tipo de recurso inválido.' });
    }
    const durationUnit = this.normalizeDurationUnit(payload?.durationUnit);
    const paymentMethod = this.normalizePaymentMethod(payload?.paymentMethod);
    const durationDays = DURATION_OPTIONS[durationUnit];
    const resource = await this.resolveResource(resourceType, String(payload?.resourceId || ''));
    const config = await this.loadPricingConfig();
    const amount = this.priceByDuration(config, durationUnit);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const row = this.repo.create({
      resourceType,
      resourceId: String(payload!.resourceId),
      resourceName: resource.name,
      destinationId: resource.destinationId,
      partnerAccountId: partnerAccountId || null,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      durationDays,
      durationUnit,
      priceAmount: amount,
      paymentMethod,
      publicNote: String(payload?.publicNote || '').trim() || null,
      paymentExpiresAt: expiresAt,
    });
    const created = (await this.repo.save(row)) as DestinationPromotion;

    const mpEnabled = Boolean(env.mercadoPago.accessToken);
    let providerId: string | null = null;
    let paymentLink: string | null = null;
    let qrCodeBase64: string | null = null;
    let qrCodeText: string | null = null;

    if (mpEnabled) {
      const mp: any = await this.mercadoPago.createPayment({
        amount,
        method: paymentMethod,
        description: `Destaque Destino ${durationUnit} - ${resource.name}`,
        externalReference: `${PROMO_PREFIX}:${created.id}`,
        // Email determinístico, nunca o dono da conta MP (evita 4390 payer email forbidden).
        payer: {
          email: `destaque.destino+${created.id}@janocaminho.com.br`,
          name: `Parceiro - ${resource.name}`.slice(0, 80),
        },
        auditContext: {
          flowType: PAYMENT_AUDIT_FLOW.DESTINATION_PROMO,
          entityType: PAYMENT_AUDIT_ENTITY.DESTINATION_PROMO,
          entityId: created.id,
          externalReference: `${PROMO_PREFIX}:${created.id}`,
          eventStage: PAYMENT_AUDIT_STAGE.PROVIDER_REQUEST,
        },
      });
      providerId = String(mp?.providerId || '');
      paymentLink = mp?.paymentLink || null;
      qrCodeBase64 = mp?.qrCodeBase64
        ? String(mp.qrCodeBase64).startsWith('data:image')
          ? mp.qrCodeBase64
          : `data:image/png;base64,${mp.qrCodeBase64}`
        : null;
      qrCodeText = mp?.qrCodeText || null;
    }

    // Nunca gerar QR fake: se não veio payload válido, propagar erro claro.
    if (paymentMethod === 'PIX' && !qrCodeText) {
      throw new AppError('PAY-016', 400, {
        message: mpEnabled
          ? 'Não foi possível gerar o QR Pix do destaque de destino no Mercado Pago. Verifique a configuração de pagamento (webhook/token) e tente novamente.'
          : 'Pagamento online não configurado. Não é possível gerar o QR Pix do destaque agora.',
      });
    }

    created.paymentProvider = mpEnabled ? 'MERCADO_PAGO' : null;
    created.paymentProviderId = providerId;
    created.paymentLink = paymentLink;
    created.paymentQrCodeBase64 = qrCodeBase64;
    created.paymentQrCodeText = qrCodeText;
    await this.repo.save(created);
    return created;
  }

  async listByPartner(partnerAccountId: string) {
    await this.reconcileExpired();
    return this.repo.find({
      where: { partnerAccountId },
      order: { createdAt: 'DESC' },
      take: 120,
    });
  }

  async cancelByPartner(partnerAccountId: string, promotionId: string) {
    const row = await this.repo.findOne({ where: { id: promotionId, partnerAccountId } });
    if (!row) throw new AppError('GEN-001', 404, { message: 'Promoção não encontrada.' });
    const status = normalizeStatus(row.status);
    if (status === 'APPROVED' && row.endsAt && new Date(row.endsAt).getTime() > Date.now()) {
      throw new AppError('GEN-001', 400, { message: 'Destaque ativo não pode ser cancelado.' });
    }
    row.status = 'CANCELLED';
    return this.repo.save(row);
  }

  async refreshPaymentStatusByPartner(partnerAccountId: string, promotionId: string) {
    const current = await this.repo.findOne({ where: { id: promotionId, partnerAccountId } });
    if (!current) throw new AppError('GEN-001', 404, { message: 'Promoção não encontrada.' });
    if (normalizeStatus(current.paymentStatus) === 'PAID') return current;

    const provider = normalizeStatus(current.paymentProvider || undefined);
    const providerId = String(current.paymentProviderId || '').trim();
    if (provider !== 'MERCADO_PAGO' || !providerId || !env.mercadoPago.accessToken) return current;

    try {
      const mpPayment: any = await this.mercadoPago.getPayment(providerId, undefined, {
        flowType: PAYMENT_AUDIT_FLOW.DESTINATION_PROMO,
        entityType: PAYMENT_AUDIT_ENTITY.DESTINATION_PROMO,
        entityId: promotionId,
        externalReference: `${PROMO_PREFIX}:${promotionId}`,
        eventStage: PAYMENT_AUDIT_STAGE.MANUAL_REFRESH,
      });
      const mpStatus = String(mpPayment?.status || '').trim().toLowerCase();
      if (isMercadoPagoApprovedStatus(mpStatus)) await this.markPaidFromWebhook(promotionId, mpPayment);
      else if (isMercadoPagoFailedStatus(mpStatus)) await this.markFailedFromWebhook(promotionId, mpPayment);
      else if (isMercadoPagoPendingStatus(mpStatus)) await this.markPendingFromProvider(promotionId, mpPayment);
    } catch {
      /* mantém estado atual */
    }

    const latest = await this.repo.findOne({ where: { id: promotionId } });
    return latest || current;
  }

  async markPaidFromWebhook(promotionId: string, mpPayment?: any) {
    await AppDataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(DestinationPromotion)
        .createQueryBuilder('promo')
        .setLock('pessimistic_write')
        .where('promo.id = :id', { id: promotionId })
        .getOne();
      if (!locked) throw new AppError('GEN-001', 404, { message: 'Promoção não encontrada.' });
      if (locked.paymentStatus === 'PAID') return;

      locked.paymentStatus = 'PAID';
      locked.paymentPaidAt = new Date();
      locked.paymentProvider = 'MERCADO_PAGO';
      if (mpPayment?.id) locked.paymentProviderId = String(mpPayment.id);

      const durationDays = Math.max(1, Number(locked.durationDays || 1));
      locked.status = 'APPROVED';
      locked.startsAt = new Date();
      locked.endsAt = new Date(locked.startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await this.applyFeatured(manager, locked, true);
      await manager.save(locked);
      await this.paymentAuditService.record(
        {
          provider: 'MERCADO_PAGO',
          flowType: PAYMENT_AUDIT_FLOW.DESTINATION_PROMO,
          eventStage: PAYMENT_AUDIT_STAGE.STATUS_APPLIED,
          entityType: PAYMENT_AUDIT_ENTITY.DESTINATION_PROMO,
          entityId: locked.id,
          externalReference: `${PROMO_PREFIX}:${locked.id}`,
          providerPaymentId: mpPayment?.id ? String(mpPayment.id) : locked.paymentProviderId || null,
          providerStatus: mpPayment?.status || 'approved',
          providerStatusDetail: mpPayment?.status_detail || null,
          responsePayload: { localPaymentStatus: 'PAID', localPromoStatus: locked.status },
          success: true,
        },
        manager
      );
    });
    await this.reconcileExpired();
  }

  async markFailedFromWebhook(promotionId: string, mpPayment?: any) {
    const row = await this.repo.findOne({ where: { id: promotionId } });
    if (!row) return;
    if (normalizeStatus(row.paymentStatus) === 'PAID') return;
    row.paymentStatus = 'FAILED';
    row.status = 'PAYMENT_FAILED';
    row.paymentProvider = 'MERCADO_PAGO';
    if (mpPayment?.id) row.paymentProviderId = String(mpPayment.id);
    const saved = await this.repo.save(row);
    await this.paymentAuditService.record({
      provider: 'MERCADO_PAGO',
      flowType: PAYMENT_AUDIT_FLOW.DESTINATION_PROMO,
      eventStage: PAYMENT_AUDIT_STAGE.STATUS_APPLIED,
      entityType: PAYMENT_AUDIT_ENTITY.DESTINATION_PROMO,
      entityId: saved.id,
      externalReference: `${PROMO_PREFIX}:${saved.id}`,
      providerPaymentId: mpPayment?.id ? String(mpPayment.id) : saved.paymentProviderId || null,
      providerStatus: mpPayment?.status || 'failed',
      providerStatusDetail: mpPayment?.status_detail || null,
      responsePayload: { localPaymentStatus: 'FAILED', localPromoStatus: 'PAYMENT_FAILED' },
      success: false,
    });
  }

  async markPendingFromProvider(promotionId: string, mpPayment?: any) {
    const row = await this.repo.findOne({ where: { id: promotionId } });
    if (!row) return;
    if (normalizeStatus(row.paymentStatus) === 'PAID') return;
    row.paymentStatus = 'PENDING';
    if (normalizeStatus(row.status) === 'PAYMENT_FAILED') row.status = 'PENDING_PAYMENT';
    row.paymentProvider = 'MERCADO_PAGO';
    if (mpPayment?.id) row.paymentProviderId = String(mpPayment.id);
    await this.repo.save(row);
  }

  async listForAdmin(filters: { status?: string; limit?: number }) {
    const qb = this.repo.createQueryBuilder('promo').orderBy('promo.createdAt', 'DESC');
    const status = normalizeStatus(filters?.status);
    if (status && status !== 'ALL') qb.andWhere('UPPER(promo.status) = :status', { status });
    const limit = Math.max(1, Math.min(300, Number(filters?.limit || 100)));
    qb.take(limit);
    return qb.getMany();
  }

  async reviewByAdmin(
    promotionId: string,
    adminId: string | undefined,
    payload: { status?: 'APPROVED' | 'REJECTED'; adminNote?: string }
  ) {
    const row = await this.repo.findOne({ where: { id: promotionId } });
    if (!row) throw new AppError('GEN-001', 404, { message: 'Promoção não encontrada.' });
    const status = normalizeStatus(payload?.status);
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('GEN-001', 400, { message: 'Status inválido para revisão.' });
    }
    row.approvedByAdminId = adminId || null;
    row.adminNote = String(payload?.adminNote || '').trim() || null;
    if (status === 'REJECTED') {
      row.status = 'REJECTED';
      if (normalizeStatus(row.paymentStatus) === 'PAID') {
        await this.applyFeatured(AppDataSource.manager, row, false);
      }
    }
    return this.repo.save(row);
  }
}
