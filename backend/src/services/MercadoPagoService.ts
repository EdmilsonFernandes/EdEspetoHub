/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: MercadoPagoService.ts
 */

import { Provide } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Common.Service.MercadoPagoService)
export class MercadoPagoService {
  async createPayment(input: any) {
    return null;
  }

  async getPayment(paymentId: string) {
    return null;
  }
}
