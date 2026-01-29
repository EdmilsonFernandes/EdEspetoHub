/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MotoboyService.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
/**
 * Provides MotoboyService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class MotoboyService {
  private motoboyRepository = new MotoboyRepository();
  private motoboyStoreRepository = new MotoboyStoreRepository();
  private storeRepository = new StoreRepository();
  private userRepository = new UserRepository();
  private emailService = new EmailService();

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
   * Gets active motoboy by user id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async getMotoboyByUserId(userId: string) {
    const motoboy = await this.motoboyRepository.findByUserId(userId);
    if (!motoboy) throw new AppError('MOTO-001', 403);
    return motoboy;
  }

  /**
   * Updates motoboy profile data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async updateProfile(
    motoboy: Motoboy,
    input: {
      vehicleType?: string | null;
      vehiclePlate?: string | null;
      vehicleModel?: string | null;
      vehicleColor?: string | null;
      city?: string | null;
      state?: string | null;
      address?: string | null;
    }
  ) {
    motoboy.vehicleType = input.vehicleType ?? motoboy.vehicleType ?? null;
    motoboy.vehiclePlate = input.vehiclePlate ?? motoboy.vehiclePlate ?? null;
    motoboy.vehicleModel = input.vehicleModel ?? motoboy.vehicleModel ?? null;
    motoboy.vehicleColor = input.vehicleColor ?? motoboy.vehicleColor ?? null;
    motoboy.city = input.city ?? motoboy.city ?? null;
    motoboy.state = input.state ?? motoboy.state ?? null;
    motoboy.address = input.address ?? motoboy.address ?? null;
    return this.motoboyRepository.save(motoboy);
  }

  /**
   * Gets or creates motoboy profile for a user.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Creates or returns motoboy profile.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Approves motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Lists store ids for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listStoreIds(motoboyId: string) {
    return this.motoboyStoreRepository.listStoreIds(motoboyId);
  }

  /**
   * Lists motoboys linked to a store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async uploadDocument(motoboy: Motoboy, input: { docType?: string; fileBase64?: string }) {
    const docType = (input?.docType || '').toUpperCase();
    if (!docType) throw new AppError('MOTO-020', 400);
    if (!input?.fileBase64) throw new AppError('MOTO-021', 400);

    const fileKey = await saveBase64Image(input.fileBase64, `motoboy-${motoboy.id}`, 'motoboys');
    if (!fileKey) throw new AppError('MOTO-022', 400);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const document = repo.create({
      motoboyId: motoboy.id,
      docType,
      fileKey,
      status: 'PENDING',
    });
    await repo.save(document);
    return document;
  }

  /**
   * Lists documents for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Lists documents for motoboy itself.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listOwnDocuments(motoboy: Motoboy) {
    const repo = AppDataSource.getRepository(MotoboyDocument);
    return repo.find({ where: { motoboyId: motoboy.id }, order: { uploadedAt: 'DESC' } });
  }

  /**
   * Reviews a motoboy document.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async reviewDocument(storeId: string, motoboyId: string, documentId: string, ownerId: string, status: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const document = await repo.findOne({ where: { id: documentId, motoboyId } });
    if (!document) throw new AppError('MOTO-023', 404);

    document.status = status;
    document.reviewedAt = new Date();
    document.reviewedByUserId = ownerId;
    await repo.save(document);
    return document;
  }

  /**
   * Creates store requests for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async createStoreRequests(motoboy: Motoboy, storeIds: string[]) {
    if (!Array.isArray(storeIds) || storeIds.length === 0) throw new AppError('MOTO-024', 400);
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
   * Lists store requests for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * Lists pending store requests for a store owner.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async reviewStoreRequest(storeId: string, requestId: string, ownerId: string, status: string) {
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (store.owner?.id !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyStoreRequest);
    const request = await repo.findOne({ where: { id: requestId, storeId }, relations: [ 'motoboy' ] });
    if (!request) throw new AppError('MOTO-025', 404);

    request.status = status;
    request.decidedAt = new Date();
    request.decidedByUserId = ownerId;
    await repo.save(request);

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
        'Sua solicitação para entregar nesta loja foi rejeitada.'
      );
      await this.notifyMotoboyByWhatsapp(
        request.motoboyId,
        'Sua solicitação para entregar nesta loja foi rejeitada.'
      );
    }

    return request;
  }
}
