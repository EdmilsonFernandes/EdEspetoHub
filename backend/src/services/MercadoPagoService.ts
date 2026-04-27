/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: MercadoPagoService.ts
 * @Date: 2026-01-06
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { PaymentAuditService } from './PaymentAuditService';

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
  accessToken?: string;
  auditContext?: {
    flowType: string;
    entityType: string;
    entityId: string;
    storeId?: string | null;
    externalReference?: string | null;
    eventStage?: string | null;
  };
};
/**
 * Handles has credentials.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-06
 */
const hasCredentials = (accessToken?: string) =>
  // Server-side payment creation only needs the private access token.
  Boolean(accessToken || env.mercadoPago.accessToken);
/**
 * Builds headers.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-06
 */
const buildHeaders = (accessToken?: string) => ({
  Authorization: `Bearer ${accessToken || env.mercadoPago.accessToken}`,
  'Content-Type': 'application/json',
  'X-Idempotency-Key': crypto.randomUUID(),
});
/**
 * Provides MercadoPagoService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-06
 */
export class MercadoPagoService {
  private log = logger.child({ scope: 'MercadoPagoService' });
  private paymentAuditService = new PaymentAuditService();
  private buildCreatePaymentError(method: CreatePaymentInput['method'], status: number, bodyText: string) {
    const normalizedBody = String(bodyText || '').toLowerCase();
    const isPixQrKeyError =
      method === 'PIX' &&
      (normalizedBody.includes('collector user without key enabled for qr render') ||
        normalizedBody.includes('"code":13253'));

    const message = isPixQrKeyError
      ? 'A conta Mercado Pago desta loja ainda não está habilitada para gerar QR Pix. Peça para a loja revisar a conta conectada.'
      : 'Não foi possível gerar a cobrança online da loja agora. Tente novamente em instantes.';

    return new AppError('PAY-015', 400, {
      message,
      providerStatus: status,
      provider: 'MERCADO_PAGO',
      method,
    });
  }
  /**
   * Handles debug log.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-06
   */
  private debugLog(message: string, data?: Record<string, any>) {
    if (!env.mercadoPago.debug) return;
    this.log.info(message, data || {});
  }

  private async recordAudit(
    input: CreatePaymentInput['auditContext'] | { flowType: string; entityType: string; entityId: string; storeId?: string | null; externalReference?: string | null; eventStage?: string | null } | undefined,
    payload: {
      providerPaymentId?: string | number | null;
      providerStatus?: string | null;
      providerStatusDetail?: string | null;
      requestPayload?: Record<string, any> | null;
      responsePayload?: Record<string, any> | null;
      errorPayload?: Record<string, any> | null;
      httpStatus?: number | null;
      success?: boolean | null;
    }
  ) {
    if (!input?.entityId || !input?.entityType || !input?.flowType) return;
    await this.paymentAuditService.record({
      provider: 'MERCADO_PAGO',
      flowType: input.flowType,
      eventStage: String(input.eventStage || 'PROVIDER_REQUEST'),
      entityType: input.entityType,
      entityId: input.entityId,
      storeId: input.storeId || null,
      externalReference: input.externalReference || null,
      providerPaymentId: payload.providerPaymentId,
      providerStatus: payload.providerStatus || null,
      providerStatusDetail: payload.providerStatusDetail || null,
      requestPayload: payload.requestPayload || null,
      responsePayload: payload.responsePayload || null,
      errorPayload: payload.errorPayload || null,
      httpStatus: payload.httpStatus ?? null,
      success: typeof payload.success === 'boolean' ? payload.success : null,
    });
  }

  /**
   * Creates payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-06
   */
  async createPayment(input: CreatePaymentInput) {
    if (!hasCredentials(input.accessToken)) return null;

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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-06
   */
  async getPayment(
    paymentId: string,
    accessToken?: string,
    auditContext?: {
      flowType: string;
      entityType: string;
      entityId: string;
      storeId?: string | null;
      externalReference?: string | null;
      eventStage?: string | null;
    }
  ) {
    if (!hasCredentials(accessToken)) return null;
    const url = `${env.mercadoPago.apiBaseUrl}/v1/payments/${paymentId}`;
    this.debugLog('GET payment', { url, paymentId });
    const response = await fetch(url, { headers: buildHeaders(accessToken) });
    if (!response.ok) {
      /**
       * Handles body.
       *
       * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
       * @date 2026-01-06
       */
      const body = await response.text().catch(() => '');
      this.log.error('GET payment failed', { status: response.status, body });
      await this.recordAudit(auditContext, {
        requestPayload: { method: 'GET', url, paymentId },
        errorPayload: { body },
        httpStatus: response.status,
        success: false,
      });
      throw new AppError('PAY-004', 400);
    }
    this.debugLog('GET payment ok', { status: response.status });
    const data = (await response.json()) as MercadoPagoPaymentResponse;
    await this.recordAudit(auditContext, {
      providerPaymentId: data?.id || paymentId,
      providerStatus: data?.status || null,
      providerStatusDetail: data?.status_detail || null,
      requestPayload: { method: 'GET', url, paymentId },
      responsePayload: data as any,
      httpStatus: response.status,
      success: true,
    });
    return data;
  }




  /**
   * Creates card preference.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
      headers: buildHeaders(input.accessToken),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      /**
       * Handles body text.
       *
       * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
       * @date 2026-01-06
       */
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST preference failed', { status: response.status, body: bodyText });
      await this.recordAudit(input.auditContext, {
        requestPayload: { method: 'POST', url, body },
        errorPayload: { body: bodyText },
        httpStatus: response.status,
        success: false,
      });
      throw this.buildCreatePaymentError('CREDIT_CARD', response.status, bodyText);
    }

    const data = (await response.json()) as MercadoPagoPreferenceResponse;
    const paymentLink = data.init_point || data.sandbox_init_point || null;
    this.debugLog('POST preference ok', { id: data.id, paymentLink });
    await this.recordAudit(input.auditContext, {
      providerPaymentId: data.id,
      requestPayload: { method: 'POST', url, body },
      responsePayload: data as any,
      httpStatus: response.status,
      success: true,
    });
    return {
      paymentLink,
      qrCodeBase64: null,
      qrCodeText: null,
      providerId: data.id,
    };
  }




  /**
   * Creates boleto preference.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
      headers: buildHeaders(input.accessToken),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      /**
       * Handles body text.
       *
       * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
       * @date 2026-01-06
       */
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST boleto preference failed', { status: response.status, body: bodyText });
      await this.recordAudit(input.auditContext, {
        requestPayload: { method: 'POST', url, body },
        errorPayload: { body: bodyText },
        httpStatus: response.status,
        success: false,
      });
      throw this.buildCreatePaymentError('BOLETO', response.status, bodyText);
    }

    const data = (await response.json()) as MercadoPagoPreferenceResponse;
    this.debugLog('POST boleto preference ok', { id: data.id });
    await this.recordAudit(input.auditContext, {
      providerPaymentId: data.id,
      requestPayload: { method: 'POST', url, body },
      responsePayload: data as any,
      httpStatus: response.status,
      success: true,
    });
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-06
   */
  private async createPixPayment(input: CreatePaymentInput) {
    const url = `${env.mercadoPago.apiBaseUrl}/v1/payments`;
    const pixExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // MP requires at least 30 min for date_of_expiration — send 30 min to MP but track 5 min internally
    const mpExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const body = {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      date_of_expiration: mpExpiresAt,
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
      headers: buildHeaders(input.accessToken),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      /**
       * Handles body text.
       *
       * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
       * @date 2026-01-06
       */
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST pix failed', { status: response.status, body: bodyText });
      await this.recordAudit(input.auditContext, {
        requestPayload: { method: 'POST', url, body },
        errorPayload: { body: bodyText },
        httpStatus: response.status,
        success: false,
      });
      throw this.buildCreatePaymentError('PIX', response.status, bodyText);
    }

    const data = (await response.json()) as MercadoPagoPaymentResponse;
    this.debugLog('POST pix ok', { id: data.id });
    await this.recordAudit(input.auditContext, {
      providerPaymentId: data?.id || null,
      providerStatus: data?.status || null,
      providerStatusDetail: data?.status_detail || null,
      requestPayload: { method: 'POST', url, body },
      responsePayload: data as any,
      httpStatus: response.status,
      success: true,
    });
    return {
      paymentLink: data.transaction_details?.external_resource_url || null,
      qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      qrCodeText: data.point_of_interaction?.transaction_data?.qr_code || null,
      providerId: data.id?.toString() || null,
      expiresAt: pixExpiresAt,
    };
  }
}
