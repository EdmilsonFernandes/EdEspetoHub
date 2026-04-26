import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PaymentAuditLog } from '../entities/PaymentAuditLog';
import {
  resolveMercadoPagoStatusDetailLabel,
  resolveMercadoPagoStatusLabel,
  sanitizePaymentAuditPayload,
} from '../utils/paymentAudit';
import { logger } from '../utils/logger';

type RecordAuditInput = {
  provider: string;
  flowType: string;
  eventStage: string;
  entityType: string;
  entityId: string;
  storeId?: string | null;
  externalReference?: string | null;
  providerPaymentId?: string | number | null;
  providerStatus?: string | null;
  providerStatusDetail?: string | null;
  requestPayload?: Record<string, any> | null;
  responsePayload?: Record<string, any> | null;
  errorPayload?: Record<string, any> | null;
  httpStatus?: number | null;
  success?: boolean | null;
};

type BuildAuditOverviewInput = {
  provider?: string | null;
  flowType?: string | null;
  entityType: string;
  entityId: string;
  externalReference?: string | null;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  providerStatusDetail?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  amount?: number | null;
  paidAt?: Date | string | null;
  failedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export class PaymentAuditService {
  private log = logger.child({ scope: 'PaymentAuditService' });

  async record(input: RecordAuditInput, manager?: EntityManager) {
    try {
      const repo = (manager || AppDataSource.manager).getRepository(PaymentAuditLog);
      const row = repo.create({
        provider: String(input.provider || 'MERCADO_PAGO'),
        flowType: String(input.flowType || 'UNKNOWN'),
        eventStage: String(input.eventStage || 'UNKNOWN'),
        entityType: String(input.entityType || 'UNKNOWN'),
        entityId: String(input.entityId || ''),
        storeId: input.storeId || null,
        externalReference: input.externalReference || null,
        providerPaymentId:
          input.providerPaymentId === null || input.providerPaymentId === undefined
            ? null
            : String(input.providerPaymentId),
        providerStatus: input.providerStatus || null,
        providerStatusDetail: input.providerStatusDetail || null,
        requestPayload: sanitizePaymentAuditPayload(input.requestPayload) || null,
        responsePayload: sanitizePaymentAuditPayload(input.responsePayload) || null,
        errorPayload: sanitizePaymentAuditPayload(input.errorPayload) || null,
        httpStatus: Number.isFinite(Number(input.httpStatus)) ? Number(input.httpStatus) : null,
        success: typeof input.success === 'boolean' ? input.success : null,
      });
      await repo.save(row);
      return row;
    } catch (error) {
      this.log.warn('Payment audit record failed', {
        provider: input.provider,
        flowType: input.flowType,
        eventStage: input.eventStage,
        entityType: input.entityType,
        entityId: input.entityId,
        error,
      });
      return null;
    }
  }

  async listByEntity(entityType: string, entityId: string, storeId?: string | null, limit = 20) {
    const qb = AppDataSource.getRepository(PaymentAuditLog)
      .createQueryBuilder('audit')
      .where('audit.entity_type = :entityType', { entityType })
      .andWhere('audit.entity_id = :entityId', { entityId })
      .orderBy('audit.created_at', 'DESC')
      .take(Math.max(1, Math.min(50, Number(limit || 20))));

    if (storeId) {
      qb.andWhere('(audit.store_id = :storeId OR audit.store_id IS NULL)', { storeId });
    }

    return qb.getMany();
  }

  buildOverview(base: BuildAuditOverviewInput, rows: PaymentAuditLog[], includeTechnical = false) {
    const latestRow = rows[0] || null;
    const latestProviderRow =
      rows.find((row) => row.providerStatus || row.providerStatusDetail || row.providerPaymentId) || null;
    const providerStatusDetail =
      latestProviderRow?.providerStatusDetail ||
      base.providerStatusDetail ||
      null;
    const providerStatus =
      latestProviderRow?.providerStatus ||
      base.providerStatus ||
      null;

    const summary = {
      provider: latestProviderRow?.provider || base.provider || 'MERCADO_PAGO',
      flowType: latestProviderRow?.flowType || base.flowType || null,
      entityType: base.entityType,
      entityId: base.entityId,
      externalReference: latestProviderRow?.externalReference || base.externalReference || null,
      providerPaymentId: latestProviderRow?.providerPaymentId || base.providerPaymentId || null,
      paymentMethod: base.paymentMethod || null,
      paymentStatus: base.paymentStatus || null,
      paymentStatusLabel: resolveMercadoPagoStatusLabel(base.paymentStatus || null),
      amount: base.amount ?? null,
      providerStatus,
      providerStatusLabel: resolveMercadoPagoStatusLabel(providerStatus),
      providerStatusDetail,
      providerStatusDetailLabel: resolveMercadoPagoStatusDetailLabel(providerStatusDetail),
      paidAt: base.paidAt || null,
      failedAt: base.failedAt || null,
      expiresAt: base.expiresAt || null,
      updatedAt: base.updatedAt || null,
      lastEventAt: latestRow?.createdAt || base.updatedAt || null,
      latestEventStage: latestRow?.eventStage || null,
    };

    const events = rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      flowType: row.flowType,
      eventStage: row.eventStage,
      externalReference: row.externalReference || null,
      providerPaymentId: row.providerPaymentId || null,
      providerStatus: row.providerStatus || null,
      providerStatusLabel: resolveMercadoPagoStatusLabel(row.providerStatus || null),
      providerStatusDetail: row.providerStatusDetail || null,
      providerStatusDetailLabel: resolveMercadoPagoStatusDetailLabel(row.providerStatusDetail || null),
      httpStatus: row.httpStatus ?? null,
      success: typeof row.success === 'boolean' ? row.success : null,
      createdAt: row.createdAt,
    }));

    const technical = includeTechnical
      ? {
          latestRequestPayload: rows.find((row) => row.requestPayload)?.requestPayload || null,
          latestResponsePayload: rows.find((row) => row.responsePayload)?.responsePayload || null,
          latestErrorPayload: rows.find((row) => row.errorPayload)?.errorPayload || null,
          latestProviderPaymentId: summary.providerPaymentId,
          latestExternalReference: summary.externalReference,
          latestEventAt: summary.lastEventAt,
        }
      : null;

    return { summary, events, technical };
  }
}
