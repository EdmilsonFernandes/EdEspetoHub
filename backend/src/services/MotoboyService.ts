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
import { StoreRepository } from '../repositories/StoreRepository';
import { UserRepository } from '../repositories/UserRepository';
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
}
