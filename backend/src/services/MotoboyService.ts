/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: MotoboyService.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { AppError } from '../errors/AppError';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyRepository } from '../repositories/MotoboyRepository';
import { MotoboyStoreRepository } from '../repositories/MotoboyStoreRepository';
import { MotoboyDocument } from '../entities/MotoboyDocument';
import { MotoboyStoreRequest } from '../entities/MotoboyStoreRequest';
import { saveBase64Image } from '../utils/imageStorage';
import { StoreRepository } from '../repositories/StoreRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppDataSource } from '../config/database';
import { MotoboyAuditLog } from '../entities/MotoboyAuditLog';
import { EmailService } from './EmailService';
import { env } from '../config/env';
import { faceVerifyService } from './FaceVerifyService';
import { PlatformAdmin } from '../entities/PlatformAdmin';
import { In } from 'typeorm';
import { normalizeDocument, validateDocument } from '../utils/documents';
/**
 * Provides MotoboyService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class MotoboyService {
  private motoboyRepository = new MotoboyRepository();
  private motoboyStoreRepository = new MotoboyStoreRepository();
  private storeRepository = new StoreRepository();
  private userRepository = new UserRepository();
  private emailService = new EmailService();

    /**
   * Normalizes vehicle plate input to canonical alphanumeric format.
   *
   * @author Edmilson Lopes
   */
private normalizePlate(value?: string | null) {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

    /**
   * Validates Brazilian old and Mercosul plate formats.
   *
   * @author Edmilson Lopes
   */
private isValidBrazilPlate(value?: string | null) {
    const plate = this.normalizePlate(value);
    // Old format: ABC1234. Mercosul: ABC1D23.
    return /^(?:[A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})$/.test(plate);
  }

    /**
   * Normalizes CNH category string to uppercase letters only.
   *
   * @author Edmilson Lopes
   */
private normalizeCnhCategory(value?: string | null) {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
  }

    /**
   * Checks whether CNH category includes motorcycle permission (A).
   *
   * @author Edmilson Lopes
   */
private hasCategoryA(value?: string | null) {
    const normalized = this.normalizeCnhCategory(value);
    return normalized.includes('A');
  }

    /**
   * Validates and normalizes courier PIX key with CPF consistency rules.
   *
   * @author Edmilson Lopes
   */
private normalizeMotoboyPixKey(
    value?: string | null,
    cpfDocument?: string | null,
    documentType?: string | null
  ) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const keyDigits = normalizeDocument(raw);
    const userCpf = normalizeDocument(String(cpfDocument || ''));
    const userDocType = String(documentType || '').toUpperCase();
    if (!validateDocument(keyDigits, 'CPF')) {
      throw new AppError('MOTO-033', 400);
    }
    if (userCpf && userDocType && userDocType !== 'CPF') {
      throw new AppError('MOTO-034', 400);
    }
    if (userCpf && validateDocument(userCpf, 'CPF') && keyDigits !== userCpf) {
      throw new AppError('MOTO-034', 400);
    }
    return keyDigits;
  }

    /**
   * Validates mandatory courier profile fields required for operations.
   *
   * @author Edmilson Lopes
   */
private async ensureMotoboyProfileIsComplete(motoboy: Motoboy) {
    const vehicleType = String(motoboy.vehicleType || '').toUpperCase();
    const plate = this.normalizePlate(motoboy.vehiclePlate);
    const cnhCategory = this.normalizeCnhCategory(motoboy.cnhCategory);
    const city = String(motoboy.city || '').trim();
    const state = String(motoboy.state || '').trim().toUpperCase();
    const address = String(motoboy.address || '').trim();

    if (!vehicleType) throw new AppError('MOTO-027', 400);
    if ((vehicleType === 'MOTO' || vehicleType === 'CARRO' || vehicleType === 'OUTRO') && !this.isValidBrazilPlate(plate)) {
      throw new AppError('MOTO-028', 400);
    }
    if (vehicleType === 'MOTO' && !this.hasCategoryA(cnhCategory)) {
      throw new AppError('MOTO-032', 400);
    }
    if (!city || !state || state.length !== 2 || !address) throw new AppError('MOTO-029', 400);
  }

    /**
   * Determines required KYC document types based on vehicle type.
   *
   * @author Edmilson Lopes
   */
private getRequiredDocTypesForMotoboy(motoboy: Motoboy) {
    const vehicleType = String(motoboy.vehicleType || '').toUpperCase();
    const mustHave = [ 'CNH', 'SELFIE' ];
    if (vehicleType === 'MOTO' || vehicleType === 'CARRO' || vehicleType === 'OUTRO') mustHave.push('CRLV');
    return mustHave;
  }

    /**
   * Loads latest courier document per type for KYC decisions.
   *
   * @author Edmilson Lopes
   */
private async listLatestDocsByType(motoboyId: string) {
    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    const docs = await docRepo.find({ where: { motoboyId }, order: { uploadedAt: 'DESC' } });
    const byType = new Map<string, MotoboyDocument>();
    for (const d of docs) {
      const key = String(d.docType || '').toUpperCase();
      if (!byType.has(key)) byType.set(key, d);
    }
    return byType;
  }

  /**
   * Gate for creating store link requests.
   * - Requires profile completeness
   * - Requires required docs to be submitted (PENDING or APPROVED)
   * - Blocks if any required doc is missing or REJECTED
   *
   * Store owners need to see the request + docs while platform review is pending.
    *
 * @author Edmilson Lopes
 */
  private async ensureMotoboyCanRequestStoreLinks(motoboy: Motoboy) {
    await this.ensureMotoboyProfileIsComplete(motoboy);

    const byType = await this.listLatestDocsByType(motoboy.id);
    const mustHave = this.getRequiredDocTypesForMotoboy(motoboy);

    const missingOrRejected: Array<{ type: string; status: string }> = [];
    for (const t of mustHave) {
      const d = byType.get(t);
      const status = String(d?.status || '').toUpperCase();
      if (!d) {
        missingOrRejected.push({ type: t, status: 'MISSING' });
        continue;
      }
      if (status === 'REJECTED') missingOrRejected.push({ type: t, status });
    }
    if (missingOrRejected.length > 0) {
      throw new AppError('MOTO-030', 400, { pending: missingOrRejected.map((x) => x.type), documents: missingOrRejected });
    }
  }

  /**
   * Gate for approving store link requests:
   * required docs must be globally APPROVED by platform (SUPER_ADMIN).
    *
 * @author Edmilson Lopes
 */
  private async ensureMotoboyKycApproved(motoboy: Motoboy) {
    const byType = await this.listLatestDocsByType(motoboy.id);
    const mustHave = this.getRequiredDocTypesForMotoboy(motoboy);

    const notApproved: Array<{ type: string; status: string }> = [];
    for (const t of mustHave) {
      const d = byType.get(t);
      const status = String(d?.status || '').toUpperCase();
      if (!d) {
        notApproved.push({ type: t, status: 'MISSING' });
        continue;
      }
      if (status !== 'APPROVED') notApproved.push({ type: t, status });
    }
    if (notApproved.length > 0) {
      throw new AppError('MOTO-031', 409, { pending: notApproved.map((x) => x.type), documents: notApproved });
    }
  }

    /**
   * Persists structured audit event for courier/store workflow actions.
   *
   * @author Edmilson Lopes
   */
private async logAudit(input: {
    storeId?: string | null;
    motoboyId?: string | null;
    action: string;
    performedByUserId?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const repo = AppDataSource.getRepository(MotoboyAuditLog);
    const log = repo.create({
      storeId: input.storeId || null,
      motoboyId: input.motoboyId || null,
      action: input.action,
      performedByUserId: input.performedByUserId || null,
      metadata: input.metadata || null,
    });
    await repo.save(log);
  }

    /**
   * Sends courier email notifications for status and review updates.
   *
   * @author Edmilson Lopes
   */
private async notifyMotoboyByEmail(motoboyId: string, subject: string, message: string) {
    const motoboy = await this.motoboyRepository.findById(motoboyId);
    if (!motoboy?.user?.email) return;
    await this.emailService.send({
      to: motoboy.user.email,
      subject,
      text: message,
      html: `<p>${message}</p>`,
    });
  }

    /**
   * Sends courier WhatsApp notifications when configured.
   *
   * @author Edmilson Lopes
   */
private async notifyMotoboyByWhatsapp(motoboyId: string, message: string) {
    const notifyUrl = env.whatsapp.notifyUrl;
    if (!notifyUrl) return;
    const motoboy = await this.motoboyRepository.findById(motoboyId);
    const phone = motoboy?.user?.phone;
    if (!phone) return;
    await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message }),
    });
  }

    /**
   * Executes apply store reupload request metadata workflow for MotoboyService.
   *
   * @author Edmilson Lopes
   */
private applyStoreReuploadRequestMetadata(input: {
    metadata: any;
    storeId: string;
    reason?: string | null;
    requestedByUserId?: string | null;
    via: string;
    requestId?: string | null;
  }) {
    const cleanReason = String(input.reason || '').trim() || null;
    const nowIso = new Date().toISOString();
    const base = input.metadata || {};
    const review = base.review || {};
    const storeReuploadRequests = review.storeReuploadRequests || {};
    return {
      ...base,
      review: {
        ...review,
        storeReuploadRequests: {
          ...storeReuploadRequests,
          [input.storeId]: {
            storeId: input.storeId,
            requestId: input.requestId || null,
            reason: cleanReason,
            requestedAt: nowIso,
            requestedByUserId: input.requestedByUserId || null,
            via: input.via,
          },
        },
      },
    };
  }

    /**
   * Requests document reupload and records audit trail for compliance.
   *
   * @author Edmilson Lopes
   */
async requestDocumentReupload(storeId: string, motoboyId: string, documentId: string, ownerId: string, reason?: string | null) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const doc = await repo.findOne({ where: { id: documentId, motoboyId } });
    if (!doc) throw new AppError('MOTO-023', 404);

    doc.metadata = this.applyStoreReuploadRequestMetadata({
      metadata: doc.metadata,
      storeId,
      reason,
      requestedByUserId: ownerId,
      via: 'STORE_REUPLOAD_REQUEST',
      requestId: null,
    });
    await repo.save(doc);
    return doc;
  }

    /**
   * Lists pending KYC items waiting for platform review.
   *
   * @author Edmilson Lopes
   */
async listPendingKycQueue() {
    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    const rows = await docRepo.find({
      where: { status: 'PENDING' as any },
      relations: [ 'motoboy', 'motoboy.user' ],
      order: { uploadedAt: 'DESC' },
    });

    const byMotoboy = new Map<string, { motoboy: any; documents: any[]; latestAt: Date }>();
    for (const d of rows) {
      const motoboyId = String(d.motoboyId || '');
      if (!motoboyId) continue;
      if (!byMotoboy.has(motoboyId)) {
        byMotoboy.set(motoboyId, { motoboy: d.motoboy, documents: [], latestAt: d.uploadedAt });
      }
      const entry = byMotoboy.get(motoboyId)!;
      const t = String(d.docType || '').toUpperCase();
      if (!entry.documents.some((x) => String(x.docType || '').toUpperCase() === t)) {
        entry.documents.push(d);
      }
      if (d.uploadedAt && d.uploadedAt > entry.latestAt) entry.latestAt = d.uploadedAt;
    }

    return Array.from(byMotoboy.values())
      .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
      .map((x) => ({ ...x, latestAt: x.latestAt.toISOString() }));
  }

    /**
   * Lists all KYC documents for one courier with metadata.
   *
   * @author Edmilson Lopes
   */
async listAllDocumentsForMotoboy(motoboyId: string) {
    if (!motoboyId) throw new AppError('MOTO-023', 404);
    const repo = AppDataSource.getRepository(MotoboyDocument);
    const docs = await repo.find({
      where: { motoboyId },
      relations: [ 'reviewedBy' ],
      order: { uploadedAt: 'DESC' },
    });
    await this.attachPlatformReviewerInfo(docs);
    return docs;
  }

    /**
   * Appends reviewer profile data to reviewed documents.
   *
   * @author Edmilson Lopes
   */
private async attachPlatformReviewerInfo(docs: MotoboyDocument[]) {
    if (!Array.isArray(docs) || docs.length === 0) return;
    const platformAdminIds = Array.from(
      new Set(
        docs
          .map((doc) => String(doc?.metadata?.review?.reviewedByPlatformAdminId || '').trim())
          .filter(Boolean)
      )
    );
    if (platformAdminIds.length === 0) return;

    const platformRepo = AppDataSource.getRepository(PlatformAdmin);
    const admins = await platformRepo.find({
      where: { id: In(platformAdminIds) },
    });
    const byId = new Map(admins.map((a) => [ a.id, a ]));

    for (const doc of docs) {
      const review = doc?.metadata?.review || {};
      const platformId = String(review?.reviewedByPlatformAdminId || '').trim();
      if (!platformId) continue;
      const admin = byId.get(platformId);
      doc.metadata = {
        ...(doc.metadata || {}),
        review: {
          ...review,
          reviewedByPlatformAdminUsername:
            review?.reviewedByPlatformAdminUsername || admin?.username || null,
        },
      };
    }
  }

    /**
   * Lists recent KYC review decisions for audit visibility.
   *
   * @author Edmilson Lopes
   */
async listRecentKycReviews(limit = 30) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 30;
    const repo = AppDataSource.getRepository(MotoboyDocument);
    const docs = await repo.find({
      where: [ { status: 'APPROVED' as any }, { status: 'REJECTED' as any } ],
      relations: [ 'motoboy', 'motoboy.user', 'reviewedBy' ],
      order: { reviewedAt: 'DESC', uploadedAt: 'DESC' },
      take: safeLimit,
    });
    await this.attachPlatformReviewerInfo(docs);
    return docs;
  }

    /**
   * Builds KYC review metrics and rejection reasons summary.
   *
   * @author Edmilson Lopes
   */
async getKycAuditSummary(days = 30) {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 365) : 30;

    const rows: Array<{ status: string; face_label: string; face_reason: string; auto_rejected: boolean }> =
      await AppDataSource.query(
        `
        SELECT
          COALESCE(status, 'PENDING') AS status,
          COALESCE(metadata->'face'->>'scoreLabel', 'indisponivel') AS face_label,
          COALESCE(metadata->'face'->>'reason', 'none') AS face_reason,
          COALESCE((metadata->'face'->>'autoRejected')::boolean, false) AS auto_rejected
        FROM motoboy_documents
        WHERE uploaded_at >= NOW() - ($1::int * interval '1 day')
        `,
        [safeDays]
      );

    const totals = {
      periodDays: safeDays,
      totalDocs: rows.length,
      approvedDocs: 0,
      rejectedDocs: 0,
      pendingDocs: 0,
      autoRejectedDocs: 0,
    };

    const scoreLabels: Record<string, number> = { alto: 0, medio: 0, baixo: 0, indisponivel: 0 };
    const reasons = new Map<string, number>();

    for (const row of rows) {
      const status = String(row?.status || '').toUpperCase();
      if (status === 'APPROVED') totals.approvedDocs += 1;
      else if (status === 'REJECTED') totals.rejectedDocs += 1;
      else totals.pendingDocs += 1;

      if (row?.auto_rejected) totals.autoRejectedDocs += 1;

      const label = String(row?.face_label || 'indisponivel').toLowerCase();
      if (scoreLabels[label] !== undefined) scoreLabels[label] += 1;
      else scoreLabels.indisponivel += 1;

      const reason = String(row?.face_reason || 'none').toLowerCase();
      reasons.set(reason, (reasons.get(reason) || 0) + 1);
    }

    const approvalRate = totals.totalDocs > 0 ? Number(((totals.approvedDocs / totals.totalDocs) * 100).toFixed(2)) : 0;
    const autoRejectRate = totals.totalDocs > 0 ? Number(((totals.autoRejectedDocs / totals.totalDocs) * 100).toFixed(2)) : 0;

    const topReasons = Array.from(reasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totals: {
        ...totals,
        approvalRate,
        autoRejectRate,
      },
      scoreLabels,
      topReasons,
    };
  }

    /**
   * Approves or rejects a courier document from platform governance flow.
   *
   * @author Edmilson Lopes
   */
async platformReviewDocument(motoboyId: string, documentId: string, reviewerId: string, status: string, reason?: string | null) {
    if (!motoboyId || !documentId) throw new AppError('MOTO-023', 404);
    const repo = AppDataSource.getRepository(MotoboyDocument);
    const document = await repo.findOne({ where: { id: documentId, motoboyId } });
    if (!document) throw new AppError('MOTO-023', 404);

    // SUPER_ADMIN token `sub` comes from platform_admins.
    // `reviewed_by_user_id` FK points to users(id), so only persist when it is a real user id.
    const reviewerUser = reviewerId ? await this.userRepository.findById(reviewerId).catch(() => null) : null;
    const platformRepo = AppDataSource.getRepository(PlatformAdmin);
    const platformReviewer = reviewerId ? await platformRepo.findOne({ where: { id: reviewerId } }).catch(() => null) : null;
    const reviewedByUserId = reviewerUser?.id || null;

    document.status = status;
    document.reviewedAt = new Date();
    document.reviewedByUserId = reviewedByUserId;
    const cleanReason = String(reason || '').trim() || null;
    const awaitingReupload = String(status || '').toUpperCase() === 'REJECTED';
    document.metadata = {
      ...(document.metadata || {}),
      review: {
        ...(document.metadata?.review || {}),
        status,
        reason: cleanReason,
        reviewedAt: document.reviewedAt.toISOString(),
        reviewedByUserId: reviewedByUserId,
        reviewedByPlatformAdminId: reviewerId || null,
        reviewedByPlatformAdminUsername: platformReviewer?.username || null,
        scope: 'PLATFORM',
        awaitingReupload,
        requiredAction: awaitingReupload ? 'Reenviar documento com foto mais nitida' : null,
      },
    };
    await repo.save(document);
    return document;
  }

  /**
   * Gets active motoboy by user id.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async getActiveMotoboyByUserId(userId: string) {
    const motoboy = await this.motoboyRepository.findByUserId(userId);
    if (!motoboy) throw new AppError('MOTO-001', 403);
    if (motoboy.status !== 'ACTIVE') throw new AppError('MOTO-002', 403);
    return motoboy;
  }

  /**
   * Gets motoboy profile by user id (any status).
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async getMotoboyByUserId(userId: string) {
    const motoboy = await this.motoboyRepository.findByUserId(userId);
    if (!motoboy) throw new AppError('MOTO-001', 403);
    return motoboy;
  }

  /**
   * Updates courier profile, vehicle, and compliance-sensitive attributes.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async updateProfile(
    motoboy: Motoboy,
    input: {
      vehicleType?: string | null;
      vehiclePlate?: string | null;
      vehicleModel?: string | null;
      vehicleColor?: string | null;
      cnhNumber?: string | null;
      cnhCategory?: string | null;
      cnhExpiresAt?: string | null;
      city?: string | null;
      state?: string | null;
      address?: string | null;
      pixKey?: string | null;
      profileImageFile?: string | null;
    }
  ) {
    const nextVehicleType = input.vehicleType ?? motoboy.vehicleType ?? null;
    const nextPlateRaw = input.vehiclePlate ?? motoboy.vehiclePlate ?? null;
    const nextPlate = nextPlateRaw ? this.normalizePlate(nextPlateRaw) : null;
    const nextCnhCategoryRaw = input.cnhCategory ?? motoboy.cnhCategory ?? null;
    const nextCnhCategory = nextCnhCategoryRaw ? this.normalizeCnhCategory(nextCnhCategoryRaw) : null;

    if (nextPlate && !this.isValidBrazilPlate(nextPlate)) {
      throw new AppError('MOTO-028', 400);
    }
    if (String(nextVehicleType || '').toUpperCase() === 'MOTO' && !this.hasCategoryA(nextCnhCategory)) {
      throw new AppError('MOTO-032', 400);
    }

    motoboy.vehicleType = nextVehicleType;
    motoboy.vehiclePlate = nextPlate;
    motoboy.vehicleModel = input.vehicleModel ?? motoboy.vehicleModel ?? null;
    motoboy.vehicleColor = input.vehicleColor ?? motoboy.vehicleColor ?? null;
    motoboy.cnhNumber = String(input.cnhNumber ?? motoboy.cnhNumber ?? '').trim() || null;
    motoboy.cnhCategory = nextCnhCategory;
    motoboy.cnhExpiresAt = String(input.cnhExpiresAt ?? motoboy.cnhExpiresAt ?? '').trim() || null;
    motoboy.city = input.city ?? motoboy.city ?? null;
    motoboy.state = (input.state ?? motoboy.state ?? null)?.toString().toUpperCase() || null;
    motoboy.address = input.address ?? motoboy.address ?? null;
    if (input.pixKey !== undefined) {
      const normalizedPixKey = this.normalizeMotoboyPixKey(
        input.pixKey,
        motoboy.user?.document || null,
        motoboy.user?.documentType || null
      );
      motoboy.pixKey = normalizedPixKey;
      if (normalizedPixKey && motoboy.user) {
        const userDoc = normalizeDocument(String(motoboy.user.document || ''));
        const userDocType = String(motoboy.user.documentType || '').toUpperCase();
        if (!userDoc || !userDocType) {
          try {
            motoboy.user.document = normalizedPixKey;
            motoboy.user.documentType = 'CPF';
            await this.userRepository.save(motoboy.user);
          } catch (error: any) {
            const code = String(error?.code || error?.driverError?.code || '');
            // Legacy accounts can already have this CPF on another user.
            // Keep PIX saved on motoboy profile and avoid blocking the update.
            if (code !== '23505') {
              throw error;
            }
          }
        }
      }
    }
    const profileImageFile = String(input.profileImageFile || '').trim();
    if (profileImageFile) {
      const fileKey = await saveBase64Image(profileImageFile, `motoboy-${motoboy.id}`, 'motoboys');
      if (!fileKey) throw new AppError('MOTO-022', 400);
      if (motoboy.user) {
        motoboy.user.profileImageUrl = fileKey;
        await this.userRepository.save(motoboy.user);
      }
    }
    return this.motoboyRepository.save(motoboy);
  }

  /**
   * Gets or creates motoboy profile for a user.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async getOrCreateMotoboyByUserId(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('USER-001', 404);
    if ((user as any).userRole && (user as any).userRole !== 'MOTOBOY') {
      throw new AppError('AUTH-003', 403);
    }

    let motoboy = await this.motoboyRepository.findByUserId(userId);
    if (!motoboy) {
      motoboy = this.motoboyRepository.create({
        userId,
        status: 'PENDING_VERIFICATION',
        createdByUserId: userId,
      } as Motoboy);
      motoboy = await this.motoboyRepository.save(motoboy);
    }

    return motoboy;
  }

  /**
   * Creates courier profile under store-owner initiated onboarding flow.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async createProfile(storeId: string, createdByUserId: string, payload: { userId?: string; email?: string }) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== createdByUserId) throw new AppError('AUTH-003', 403);

    const { userId, email } = payload || {};
    if (!userId && !email) throw new AppError('MOTO-003', 400);

    const user = userId ? await this.userRepository.findById(userId) : await this.userRepository.findByEmail(email || '');
    if (!user) throw new AppError('USER-001', 404);

    let motoboy = await this.motoboyRepository.findByUserId(user.id);
    if (!motoboy) {
      motoboy = this.motoboyRepository.create({
        userId: user.id,
        status: 'PENDING_VERIFICATION',
        createdByUserId,
      } as Motoboy);
      motoboy = await this.motoboyRepository.save(motoboy);
    }

    await this.logAudit({
      storeId,
      motoboyId: motoboy.id,
      action: 'MOTOBOY_PROFILE_CREATED',
      performedByUserId: createdByUserId,
      metadata: { userId: motoboy.userId },
    });
    return motoboy;
  }

  /**
   * Links motoboy to store.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async linkStore(storeId: string, motoboyId: string, userId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== userId) throw new AppError('AUTH-003', 403);

    const existing = await this.motoboyStoreRepository.findLink(motoboyId, storeId);
    if (existing) {
      existing.active = true;
      const saved = await this.motoboyStoreRepository.save(existing);
      await this.logAudit({
        storeId,
        motoboyId,
        action: 'MOTOBOY_LINK_REACTIVATED',
        performedByUserId: userId,
      });
      return saved;
    }

    const link = this.motoboyStoreRepository.create({
      motoboyId,
      storeId,
      active: true,
    });
    const saved = await this.motoboyStoreRepository.save(link);
    await this.logAudit({
      storeId,
      motoboyId,
      action: 'MOTOBOY_LINK_CREATED',
      performedByUserId: userId,
    });
    return saved;
  }

  /**
   * Unlinks motoboy from store.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async unlinkStore(storeId: string, motoboyId: string, userId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== userId) throw new AppError('AUTH-003', 403);

    const existing = await this.motoboyStoreRepository.findLink(motoboyId, storeId);
    if (!existing) throw new AppError('MOTO-004', 404);
    existing.active = false;
    const saved = await this.motoboyStoreRepository.save(existing);
    await this.logAudit({
      storeId,
      motoboyId,
      action: 'MOTOBOY_LINK_DISABLED',
      performedByUserId: userId,
    });
    return saved;
  }

  /**
   * Motoboy leaves a store (disables an active link).
   * This is motoboy-initiated, does not require store owner.
    *
 * @author Edmilson Lopes
 */
  async leaveStore(motoboy: Motoboy, storeId: string) {
    if (!storeId) throw new AppError('STORE-001', 404);

    const existing = await this.motoboyStoreRepository.findActiveLink(motoboy.id, storeId);
    if (!existing) throw new AppError('MOTO-004', 404);

    existing.active = false;
    const saved = await this.motoboyStoreRepository.save(existing);
    await this.logAudit({
      storeId,
      motoboyId: motoboy.id,
      action: 'MOTOBOY_LEFT_STORE',
      performedByUserId: motoboy.userId,
    });
    return saved;
  }

  /**
   * Approves motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async approveMotoboy(storeId: string, motoboyId: string, userId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== userId) throw new AppError('AUTH-003', 403);

    const motoboy = await this.motoboyRepository.findById(motoboyId);
    if (!motoboy) throw new AppError('MOTO-005', 404);
    motoboy.status = 'ACTIVE';
    motoboy.approvedByUserId = userId;
    motoboy.approvedAt = new Date();
    const saved = await this.motoboyRepository.save(motoboy);
    await this.logAudit({
      storeId,
      motoboyId,
      action: 'MOTOBOY_APPROVED',
      performedByUserId: userId,
    });
    await this.notifyMotoboyByEmail(
      motoboyId,
      'Cadastro aprovado',
      `Seu cadastro de entregador foi aprovado. Você já pode aceitar pedidos.`
    );
    await this.notifyMotoboyByWhatsapp(motoboyId, 'Seu cadastro de entregador foi aprovado. Você já pode aceitar pedidos.');
    return saved;
  }

  /**
   * Suspends motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async suspendMotoboy(storeId: string, motoboyId: string, userId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== userId) throw new AppError('AUTH-003', 403);

    const motoboy = await this.motoboyRepository.findById(motoboyId);
    if (!motoboy) throw new AppError('MOTO-005', 404);
    motoboy.status = 'SUSPENDED';
    const saved = await this.motoboyRepository.save(motoboy);
    await this.logAudit({
      storeId,
      motoboyId,
      action: 'MOTOBOY_SUSPENDED',
      performedByUserId: userId,
    });
    await this.notifyMotoboyByEmail(
      motoboyId,
      'Cadastro suspenso',
      'Seu cadastro de entregador foi suspenso. Entre em contato com a loja responsável.'
    );
    await this.notifyMotoboyByWhatsapp(
      motoboyId,
      'Seu cadastro de entregador foi suspenso. Entre em contato com a loja responsável.'
    );
    return saved;
  }

  /**
   * Lists store IDs currently linked to the courier.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async listStoreIds(motoboyId: string) {
    return this.motoboyStoreRepository.listStoreIds(motoboyId);
  }

  /**
   * Lists couriers linked to a store for admin management.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async listByStore(storeId: string, ownerId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    return this.motoboyStoreRepository.listByStoreId(storeId);
  }

  /**
   * Uploads a motoboy document.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async uploadDocument(motoboy: Motoboy, input: { docType?: string; fileBase64?: string }) {
    const docType = (input?.docType || '').toUpperCase();
    if (!docType) throw new AppError('MOTO-020', 400);
    if (!input?.fileBase64) throw new AppError('MOTO-021', 400);

    // Rate limit selfie uploads when automated verification fails too many times.
    if (docType === 'SELFIE') {
      const cooldown = await faceVerifyService.getSelfieCooldown(motoboy.id);
      if (cooldown.blocked && cooldown.nextAllowedAt && cooldown.nextAllowedAt.getTime() > Date.now()) {
        throw new AppError('MOTO-026', 429, { nextAllowedAt: cooldown.nextAllowedAt.toISOString() });
      }
    }

    const fileKey = await saveBase64Image(input.fileBase64, `motoboy-${motoboy.id}`, 'motoboys');
    if (!fileKey) throw new AppError('MOTO-022', 400);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const document = repo.create({
      motoboyId: motoboy.id,
      docType,
      fileKey,
      status: 'PENDING',
      metadata: {},
    });
    await repo.save(document);

    // If CNH+SELFIE exist, queue assisted verification.
    if (docType === 'CNH' || docType === 'SELFIE') {
      // Fire and forget; job will also pick it up.
      faceVerifyService
        .markPendingIfReady(motoboy.id)
        .catch(() => null);
    }

    return document;
  }

  /**
   * Lists courier documents for store-admin review screens.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async listDocuments(storeId: string, motoboyId: string, ownerId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    return repo.find({ where: { motoboyId }, order: { uploadedAt: 'DESC' } });
  }

  /**
   * Lists courier own uploaded documents with statuses.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async listOwnDocuments(motoboy: Motoboy) {
    const repo = AppDataSource.getRepository(MotoboyDocument);
    return repo.find({ where: { motoboyId: motoboy.id }, order: { uploadedAt: 'DESC' } });
  }

  /**
   * Reviews a motoboy document.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async reviewDocument(
    storeId: string,
    motoboyId: string,
    documentId: string,
    ownerId: string,
    status: string,
    reason?: string | null
  ) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const document = await repo.findOne({ where: { id: documentId, motoboyId } });
    if (!document) throw new AppError('MOTO-023', 404);

    document.status = status;
    document.reviewedAt = new Date();
    document.reviewedByUserId = ownerId;
    const cleanReason = String(reason || '').trim();
    document.metadata = {
      ...(document.metadata || {}),
      review: {
        ...(document.metadata?.review || {}),
        status,
        reason: cleanReason || null,
        reviewedAt: document.reviewedAt.toISOString(),
        reviewedByUserId: ownerId,
      },
    };
    await repo.save(document);
    return document;
  }

  /**
   * Creates courier requests to join one or more stores.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async createStoreRequests(motoboy: Motoboy, storeIds: string[]) {
    if (!Array.isArray(storeIds) || storeIds.length === 0) throw new AppError('MOTO-024', 400);

    await this.ensureMotoboyCanRequestStoreLinks(motoboy);

    const repo = AppDataSource.getRepository(MotoboyStoreRequest);
    const created: MotoboyStoreRequest[] = [];

    for (const storeId of storeIds) {
      const store = await this.storeRepository.findById(storeId);
      if (!store) continue;

      const existing = await repo.findOne({ where: { motoboyId: motoboy.id, storeId } });
      if (existing) {
        if (existing.status === 'REJECTED') {
          existing.status = 'PENDING';
          existing.decidedAt = null;
          existing.decidedByUserId = null;
          existing.reason = null;
          await repo.save(existing);
        }
        continue;
      }

      const request = repo.create({
        motoboyId: motoboy.id,
        storeId,
        status: 'PENDING',
      });
      const saved = await repo.save(request);
      created.push(saved);
      await this.logAudit({
        storeId,
        motoboyId: motoboy.id,
        action: 'MOTOBOY_REQUEST_CREATED',
        performedByUserId: motoboy.userId,
      });
    }

    return created;
  }

  /**
   * Lists courier own store-link requests.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async listStoreRequests(motoboy: Motoboy) {
    const repo = AppDataSource.getRepository(MotoboyStoreRequest);
    return repo.find({
      where: { motoboyId: motoboy.id },
      relations: [ 'store' ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lists store incoming courier requests for decision.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async listRequestsForStore(storeId: string, ownerId: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyStoreRequest);
    return repo.find({
      where: { storeId },
      relations: [ 'motoboy', 'motoboy.user' ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Reviews a store request (approve/reject).
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async reviewStoreRequest(
    storeId: string,
    requestId: string,
    ownerId: string,
    status: string,
    reason?: string | null,
    options?: { rejectDocs?: string[] | null }
  ) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyStoreRequest);
    const request = await repo.findOne({ where: { id: requestId, storeId }, relations: [ 'motoboy' ] });
    if (!request) throw new AppError('MOTO-025', 404);

    const cleanReason = String(reason || '').trim() || null;

    // Store owners can only approve links if platform KYC is ready (docs globally APPROVED).
    if (status === 'APPROVED' && request.motoboy) {
      await this.ensureMotoboyKycApproved(request.motoboy);
    }

    // Keep store request + possible document rejection consistent.
    await AppDataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(MotoboyStoreRequest);
      const docRepo = manager.getRepository(MotoboyDocument);

      request.status = status;
      request.decidedAt = new Date();
      request.decidedByUserId = ownerId;
      request.reason = status === 'REJECTED' ? cleanReason : null;
      await requestRepo.save(request);

      if (status === 'REJECTED' && request.motoboyId && Array.isArray(options?.rejectDocs) && options!.rejectDocs!.length > 0) {
        const normalizedTypes = Array.from(
          new Set(
            options!.rejectDocs!
              .map((x) => String(x || '').trim().toUpperCase())
              .filter(Boolean)
              .filter((x) => x === 'CNH' || x === 'SELFIE' || x === 'CRLV')
          )
        );

        for (const t of normalizedTypes) {
          const doc = await docRepo.findOne({
            where: { motoboyId: request.motoboyId, docType: t },
            order: { uploadedAt: 'DESC' },
          });
          if (!doc) continue;

          // Store owners do not review platform KYC status.
          // They can request a clearer file for this store only.
          doc.metadata = this.applyStoreReuploadRequestMetadata({
            metadata: doc.metadata,
            storeId,
            reason: cleanReason,
            requestedByUserId: ownerId,
            via: 'STORE_REQUEST_REJECT',
            requestId,
          });
          await docRepo.save(doc);
        }
      }
    });

    await this.logAudit({
      storeId,
      motoboyId: request.motoboyId,
      action: status === 'APPROVED' ? 'MOTOBOY_REQUEST_APPROVED' : 'MOTOBOY_REQUEST_REJECTED',
      performedByUserId: ownerId,
      metadata: { requestId },
    });

    if (status === 'APPROVED' && request.motoboyId) {
      const existingLink = await this.motoboyStoreRepository.findLink(request.motoboyId, storeId);
      if (existingLink) {
        existingLink.active = true;
        await this.motoboyStoreRepository.save(existingLink);
      } else {
        const link = this.motoboyStoreRepository.create({
          motoboyId: request.motoboyId,
          storeId,
          active: true,
        });
        await this.motoboyStoreRepository.save(link);
      }

      const motoboy = await this.motoboyRepository.findById(request.motoboyId);
      if (motoboy && motoboy.status !== 'ACTIVE') {
        motoboy.status = 'ACTIVE';
        motoboy.approvedByUserId = ownerId;
        motoboy.approvedAt = new Date();
        await this.motoboyRepository.save(motoboy);
      }

      await this.notifyMotoboyByEmail(
        request.motoboyId,
        'Vínculo aprovado',
        `Sua solicitação para entregar nesta loja foi aprovada. Você já pode aceitar pedidos.`
      );
      await this.notifyMotoboyByWhatsapp(
        request.motoboyId,
        'Sua solicitação para entregar nesta loja foi aprovada. Você já pode aceitar pedidos.'
      );
    } else if (status === 'REJECTED' && request.motoboyId) {
      await this.notifyMotoboyByEmail(
        request.motoboyId,
        'Solicitação rejeitada',
        `Sua solicitação para entregar nesta loja foi rejeitada.${cleanReason ? ` Motivo: ${cleanReason}` : ''}`
      );
      await this.notifyMotoboyByWhatsapp(
        request.motoboyId,
        `Sua solicitação para entregar nesta loja foi rejeitada.${cleanReason ? ` Motivo: ${cleanReason}` : ''}`
      );
    }

    return request;
  }
}
