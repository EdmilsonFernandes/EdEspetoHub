/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: PlanService.ts
 */

import { PlanDao } from '../database/dao/PlanDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Common.Service.PlanService)
export class PlanService {
  constructor(
    @Inject(Tokens.Common.DataLayer.PlanRepository) private planDao: PlanDao
  ) {}

  async listPublic() {
    return this.planDao.findAllActive();
  }

  async findById(id: string) {
    return this.planDao.getById(id);
  }
}
