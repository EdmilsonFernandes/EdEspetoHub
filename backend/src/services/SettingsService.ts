/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: SettingsService.ts
 */

import { SiteSettingDao } from '../database/dao/SiteSettingDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Common.Service.SettingsService)
export class SettingsService {
  constructor(
    @Inject(Tokens.Common.DataLayer.SiteSettingRepository) private siteSettingDao: SiteSettingDao
  ) {}

  async getValue(key: string) {
    const setting = await this.siteSettingDao.read({ where: { key } } as any);
    return setting?.value ?? null;
  }

  async getNumber(key: string, fallback: number) {
    const raw = await this.getValue(key);
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  async setValue(key: string, value: string) {
    const existing = await this.siteSettingDao.read({ where: { key } } as any);
    if (existing) {
      return this.siteSettingDao.update({ key }, { value } as any);
    }
    return this.siteSettingDao.save({ key, value } as any);
  }
}
