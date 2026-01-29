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
import { saveBase64Image } from '../utils/imageStorage';
import { StoreRepository } from '../repositories/StoreRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppDataSource } from '../config/database';
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
      return this.motoboyStoreRepository.save(existing);
    }

    const link = this.motoboyStoreRepository.create({
      motoboyId,
      storeId,
      active: true,
    });
    return this.motoboyStoreRepository.save(link);
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
    return this.motoboyStoreRepository.save(existing);
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
    return this.motoboyRepository.save(motoboy);
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
    return this.motoboyRepository.save(motoboy);
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
    if (store.ownerId !== ownerId) throw new AppError('AUTH-003', 403);

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
    if (store.ownerId !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    return repo.find({ where: { motoboyId }, order: { uploadedAt: 'DESC' } });
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
    if (store.ownerId !== ownerId) throw new AppError('AUTH-003', 403);

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const document = await repo.findOne({ where: { id: documentId, motoboyId } });
    if (!document) throw new AppError('MOTO-023', 404);

    document.status = status;
    document.reviewedAt = new Date();
    document.reviewedByUserId = ownerId;
    await repo.save(document);
    return document;
  }
}
