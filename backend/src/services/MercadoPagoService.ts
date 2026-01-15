/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MercadoPagoService.ts
 * @Date: 2026-01-06
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MercadoPagoPaymentResponse = {
  id: number | string;
  status?: string;
  status_detail?: string;
  date_of_expiration?: string;
  transaction_details?: {
    external_resource_url?: string;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
    };
  };
  external_reference?: string;
};

type CreatePaymentInput = {
  amount: number;
  method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  description: string;
  externalReference: string;
  payer: {
    email: string;
    name: string;
  };
};

/**
 * Executes has credentials logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-06
 */
const hasCredentials = () =>
  Boolean(env.mercadoPago.accessToken && env.mercadoPago.publicKey);

/**
 * Builds headers.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-06
 */
const buildHeaders = () => ({
  Authorization: `Bearer ${env.mercadoPago.accessToken}`,
  'Content-Type': 'application/json',
  'X-Idempotency-Key': crypto.randomUUID(),
});

/**
 * Represents MercadoPagoService.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-06
 */
export class MercadoPagoService {
  private log = logger.child({ scope: 'MercadoPagoService' });
  /**
   * Executes debug log logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  private debugLog(message: string, data?: Record<string, any>) {
    if (!env.mercadoPago.debug) return;
    this.log.info(message, data || {});
  }

  /**
   * Creates payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async createPayment(input: CreatePaymentInput) {
    if (!hasCredentials()) return null;

    if (input.method === 'PIX') {
      return this.createPixPayment(input);
    }

    if (input.method === 'BOLETO') {
      return this.createBoletoPreference(input);
    }

    return this.createCardPreference(input);
  }

  /**
   * Gets payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async getPayment(paymentId: string) {
    if (!hasCredentials()) return null;
    const url = `${env.mercadoPago.apiBaseUrl}/v1/payments/${paymentId}`;
    this.debugLog('GET payment', { url, paymentId });
    const response = await fetch(url, { headers: buildHeaders() });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.log.error('GET payment failed', { status: response.status, body });
      throw new AppError('PAY-004', 400);
    }
    this.debugLog('GET payment ok', { status: response.status });
    /**
     * Executes return logic.
     *
     * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
     * @date 2026-01-06
     */
    return (await response.json()) as MercadoPagoPaymentResponse;
  }

  /**
   * Creates card preference.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  private async createCardPreference(input: CreatePaymentInput) {
    const url = `${env.mercadoPago.apiBaseUrl}/checkout/preferences`;
    const body = {
      items: [
        {
          title: input.description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: input.amount,
        },
      ],
      payer: {
        email: input.payer.email,
        name: input.payer.name,
      },
      external_reference: input.externalReference,
      notification_url: env.mercadoPago.webhookUrl || undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST preference failed', { status: response.status, body: bodyText });
      throw new AppError('PAY-004', 400);
    }

    const data = (await response.json()) as MercadoPagoPreferenceResponse;
    this.debugLog('POST preference ok', { id: data.id });
    return {
      paymentLink: data.init_point || data.sandbox_init_point || null,
      qrCodeBase64: null,
      qrCodeText: null,
      providerId: data.id,
    };
  }

  /**
   * Creates boleto preference.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  private async createBoletoPreference(input: CreatePaymentInput) {
    const url = `${env.mercadoPago.apiBaseUrl}/checkout/preferences`;
    const body = {
      items: [
        {
          title: input.description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: input.amount,
        },
      ],
      payer: {
        email: input.payer.email,
        name: input.payer.name,
      },
      external_reference: input.externalReference,
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'atm' },
        ],
      },
      notification_url: env.mercadoPago.webhookUrl || undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST boleto preference failed', { status: response.status, body: bodyText });
      throw new AppError('PAY-004', 400);
    }

    const data = (await response.json()) as MercadoPagoPreferenceResponse;
    this.debugLog('POST boleto preference ok', { id: data.id });
    return {
      paymentLink: data.init_point || data.sandbox_init_point || null,
      qrCodeBase64: null,
      qrCodeText: null,
      providerId: data.id,
    };
  }

  /**
   * Creates pix payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  private async createPixPayment(input: CreatePaymentInput) {
    const url = `${env.mercadoPago.apiBaseUrl}/v1/payments`;
    const body = {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      external_reference: input.externalReference,
      payer: {
        email: input.payer.email,
        first_name: input.payer.name.split(' ')[0] || input.payer.name,
        last_name: input.payer.name.split(' ').slice(1).join(' ') || 'Cliente',
      },
      notification_url: env.mercadoPago.webhookUrl || undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST pix failed', { status: response.status, body: bodyText });
      throw new AppError('PAY-004', 400);
    }

    const data = (await response.json()) as MercadoPagoPaymentResponse;
    this.debugLog('POST pix ok', { id: data.id });
    return {
      paymentLink: data.transaction_details?.external_resource_url || null,
      qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      qrCodeText: data.point_of_interaction?.transaction_data?.qr_code || null,
      providerId: data.id?.toString() || null,
      expiresAt: data.date_of_expiration || null,
    };
  }
}
