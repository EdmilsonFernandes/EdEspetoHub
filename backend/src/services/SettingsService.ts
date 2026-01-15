/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: SettingsService.ts
 * @Date: 2026-01-08
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppDataSource } from '../config/database';
import { SiteSetting } from '../entities/SiteSetting';

/**
 * Represents SettingsService.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
export class SettingsService {
  private repository = AppDataSource.getRepository(SiteSetting);

  /**
   * Gets value.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-08
   */
  async getValue(key: string) {
    const setting = await this.repository.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  /**
   * Gets number.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-08
   */
  async getNumber(key: string, fallback: number) {
    const raw = await this.getValue(key);
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  /**
   * Executes set value logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-08
   */
  async setValue(key: string, value: string) {
    const existing = await this.repository.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      return this.repository.save(existing);
    }
    const next = this.repository.create({ key, value });
    return this.repository.save(next);
  }
}
