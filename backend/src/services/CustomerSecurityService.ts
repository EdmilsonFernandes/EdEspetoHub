import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { CustomerRiskEvent } from '../entities/CustomerRiskEvent';
import { CustomerSecurityBlock } from '../entities/CustomerSecurityBlock';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { EmailService } from './EmailService';

type RecordRiskEventInput = {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  eventType: string;
  score?: number;
  ipAddress?: string | null;
  storeId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
};

type CreateBlockInput = {
  userId: string;
  blockType: string;
  severity?: 'soft' | 'hard';
  reason: string;
  durationHours?: number | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
};

export class CustomerSecurityService {
  private readonly log = logger.child({ scope: 'CustomerSecurityService' });
  private readonly emailService = new EmailService();

  private normalizeTrimmedText(value?: string | null) {
    return String(value || '').trim();
  }

  private normalizePhone(value?: string | null) {
    return String(value || '').replace(/\D/g, '').slice(0, 20);
  }

  private normalizeIp(value?: string | null) {
    return String(value || '').trim().slice(0, 120);
  }

  private async getUserSnapshot(userId: string) {
    const [row] = await AppDataSource.query(
      `
        SELECT email, phone, full_name
          FROM users
         WHERE id = $1
         LIMIT 1
      `,
      [userId]
    );

    return {
      email: this.normalizeTrimmedText(row?.email).toLowerCase() || null,
      phone: this.normalizePhone(row?.phone) || null,
      fullName: this.normalizeTrimmedText(row?.full_name) || null,
    };
  }

  private async expireBlock(block: CustomerSecurityBlock) {
    if (!block?.id || block.status !== 'active') return;
    block.status = 'expired';
    await AppDataSource.getRepository(CustomerSecurityBlock).save(block);
  }

  async expireElapsedBlocks() {
    await AppDataSource
      .createQueryBuilder()
      .update(CustomerSecurityBlock)
      .set({ status: 'expired' })
      .where('status = :status', { status: 'active' })
      .andWhere('blocked_until IS NOT NULL')
      .andWhere('blocked_until <= NOW()')
      .execute();
  }

  async recordRiskEvent(input: RecordRiskEventInput) {
    const repo = AppDataSource.getRepository(CustomerRiskEvent);
    const event = repo.create({
      userId: this.normalizeTrimmedText(input.userId) || null,
      emailSnapshot: this.normalizeTrimmedText(input.email).toLowerCase() || null,
      phoneSnapshot: this.normalizePhone(input.phone) || null,
      eventType: this.normalizeTrimmedText(input.eventType),
      score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
      ipAddress: this.normalizeIp(input.ipAddress) || null,
      storeId: this.normalizeTrimmedText(input.storeId) || null,
      orderId: this.normalizeTrimmedText(input.orderId) || null,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    });
    return repo.save(event);
  }

  async getActiveBlockForUser(userId: string) {
    const normalizedUserId = this.normalizeTrimmedText(userId);
    if (!normalizedUserId) return null;

    const repo = AppDataSource.getRepository(CustomerSecurityBlock);
    const block = await repo.findOne({
      where: { userId: normalizedUserId, status: 'active' },
      order: { blockedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!block) return null;

    if (block.blockedUntil && block.blockedUntil.getTime() <= Date.now()) {
      await this.expireBlock(block);
      return null;
    }

    return block;
  }

  async assertCustomerAllowed(userId?: string | null, context: 'login' | 'order' | 'session' = 'login') {
    const normalizedUserId = this.normalizeTrimmedText(userId);
    if (!normalizedUserId) return null;

    const block = await this.getActiveBlockForUser(normalizedUserId);
    if (!block) return null;

    throw new AppError('AUTH-024', 403, {
      message:
        block.reason ||
        'Sua conta foi temporariamente bloqueada por segurança. Entre em contato com o suporte.',
      blockId: block.id,
      blockType: block.blockType,
      severity: block.severity,
      blockedUntil: block.blockedUntil || null,
      context,
    });
  }

  async createBlock(input: CreateBlockInput) {
    const normalizedUserId = this.normalizeTrimmedText(input.userId);
    if (!normalizedUserId) {
      throw new AppError('GEN-002', 400, { message: 'Usuário inválido para bloqueio de segurança.' });
    }

    const existing = await this.getActiveBlockForUser(normalizedUserId);
    if (existing) return existing;

    const snapshot = await this.getUserSnapshot(normalizedUserId);
    const durationHours = Number.isFinite(Number(input.durationHours)) ? Number(input.durationHours) : null;
    const blockedAt = new Date();
    const blockedUntil =
      durationHours && durationHours > 0
        ? new Date(blockedAt.getTime() + durationHours * 60 * 60 * 1000)
        : null;

    const repo = AppDataSource.getRepository(CustomerSecurityBlock);
    const block = repo.create({
      userId: normalizedUserId,
      emailSnapshot: snapshot.email,
      phoneSnapshot: snapshot.phone,
      blockType: this.normalizeTrimmedText(input.blockType),
      status: 'active',
      severity: input.severity || 'soft',
      reason: this.normalizeTrimmedText(input.reason) || 'Conta bloqueada por segurança.',
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
      blockedAt,
      blockedUntil,
      createdBy: this.normalizeTrimmedText(input.createdBy) || 'system',
      reviewedBy: null,
    });
    const saved = await repo.save(block);

    void this.emailService
      .sendCustomerSecurityBlockAlert({
        email: snapshot.email || '',
        fullName: snapshot.fullName || 'Cliente',
        phone: snapshot.phone,
        reason: saved.reason || 'Conta bloqueada por segurança.',
        blockType: saved.blockType,
        severity: saved.severity,
        blockedAt: saved.blockedAt,
        blockedUntil: saved.blockedUntil || null,
        metadata: saved.metadata || {},
      })
      .catch((error) => {
        this.log.warn('Customer security alert email failed', { userId: normalizedUserId, error });
      });

    return saved;
  }

  async revokeBlock(input: {
    blockId: string;
    reviewedBy?: string | null;
    revocationReason?: string | null;
  }) {
    const blockId = this.normalizeTrimmedText(input.blockId);
    if (!blockId) {
      throw new AppError('GEN-002', 400, { message: 'Bloqueio inválido para revogação.' });
    }

    const repo = AppDataSource.getRepository(CustomerSecurityBlock);
    const block = await repo.findOne({ where: { id: blockId } });
    if (!block) {
      throw new AppError('GEN-002', 404, { message: 'Bloqueio de segurança não encontrado.' });
    }

    if (block.status === 'revoked') {
      return block;
    }

    const reviewedBy = this.normalizeTrimmedText(input.reviewedBy) || 'super_admin';
    const revocationReason = this.normalizeTrimmedText(input.revocationReason) || null;
    const nextMetadata =
      block.metadata && typeof block.metadata === 'object' ? { ...block.metadata } : {};

    nextMetadata.revokedAt = new Date().toISOString();
    nextMetadata.revokedBy = reviewedBy;
    if (revocationReason) {
      nextMetadata.revocationReason = revocationReason;
    }

    block.status = 'revoked';
    block.reviewedBy = reviewedBy;
    block.metadata = nextMetadata;

    return repo.save(block);
  }

  async registerRapidFarPickupMultiStoreRisk(input: {
    userId: string;
    phone?: string | null;
    ipAddress?: string | null;
    storeId: string;
    pickupDistanceKm: number;
    paymentMethod?: string | null;
    recentOtherStoreIds?: string[];
  }) {
    const normalizedUserId = this.normalizeTrimmedText(input.userId);
    if (!normalizedUserId) return { event: null, block: null, total: 0 };

    const snapshot = await this.getUserSnapshot(normalizedUserId);
    const event = await this.recordRiskEvent({
      userId: normalizedUserId,
      email: snapshot.email,
      phone: input.phone || snapshot.phone,
      ipAddress: input.ipAddress,
      storeId: input.storeId,
      eventType: 'rapid_far_pickup_multi_store',
      score: 85,
      metadata: {
        pickupDistanceKm: Number(input.pickupDistanceKm.toFixed(1)),
        paymentMethod: this.normalizeTrimmedText(input.paymentMethod).toLowerCase() || null,
        recentOtherStoreIds: Array.from(new Set((input.recentOtherStoreIds || []).filter(Boolean))),
      },
    });

    const autoBlockWindowHours = Math.max(1, Number(env.security.customerRapidPickupAutoBlockWindowHours || 24));
    const autoBlockAfterEvents = Math.max(2, Number(env.security.customerRapidPickupAutoBlockAfterEvents || 2));
    const [row] = await AppDataSource.query(
      `
        SELECT COUNT(*)::int AS total
          FROM customer_risk_events
         WHERE user_id = $1
           AND event_type = 'rapid_far_pickup_multi_store'
           AND created_at >= NOW() - ($2::text || ' hours')::interval
      `,
      [normalizedUserId, String(autoBlockWindowHours)]
    );
    const total = Number(row?.total || 0);
    if (total < autoBlockAfterEvents) {
      return { event, block: null, total };
    }

    const block = await this.createBlock({
      userId: normalizedUserId,
      blockType: 'far_pickup_abuse',
      severity: 'soft',
      reason:
        'Sua conta foi temporariamente bloqueada por segurança após múltiplos pedidos de retirada distante em lojas diferentes em um intervalo curto. Entre em contato com o suporte.',
      durationHours: Math.max(1, Number(env.security.customerRapidPickupBlockDurationHours || 12)),
      createdBy: 'system',
      metadata: {
        triggerEventId: event.id,
        totalRecentEvents: total,
        pickupDistanceKm: Number(input.pickupDistanceKm.toFixed(1)),
        recentOtherStoreIds: Array.from(new Set((input.recentOtherStoreIds || []).filter(Boolean))),
      },
    });

    return { event, block, total };
  }
}
