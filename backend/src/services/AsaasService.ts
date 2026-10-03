/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: AsaasService.ts
 * @Date: 2026-10-03
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { OpenPixService } from './OpenPixService';

/**
 * Asaas (03/10, contrato validado ao vivo na API de produção):
 * - Base: https://api.asaas.com/v3 — auth via header `access_token` (SEM Bearer).
 * - Customer: POST /v3/customers { name, cpfCnpj } → { id: "cus_..." }.
 *   Cache por usuário (1 customer, não 1 por charge).
 * - PIX: POST /v3/payments { customer, billingType: "PIX", value: REAIS FLOAT,
 *   dueDate: "YYYY-MM-DD" (+1d), externalReference } → { id: "pay_..." }.
 *   ⚠️ value EM REAIS (float) — NÃO centavos (diferente do OpenPix).
 * - QR: GET /v3/payments/{id}/pixQrCode → { payload, encodedImage } — demora
 *   ~3s p/ ficar pronto → retry 1x após delay.
 * - Cartão: billingType "CREDIT_CARD" (mesma rota /v3/payments).
 * - MÍNIMO PIX: R$5,00 — abaixo disso o Asaas recusa (fallback OpenPix/MP).
 * - Status: PENDING | RECEIVED | CONFIRMED | RECEIVED_IN_CASH | OVERDUE | REFUNDED...
 */

/** Mínimo de PIX aceito pelo Asaas (abaixo → cai pro próximo da cadeia). */
export const ASAAS_MIN_PIX_BRL = 5;

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj?: string | null;
  email?: string | null;
}

export interface CreateAsaasChargeInput {
  /** external reference do fluxo (ex.: payment.id, "order_payment:{uuid}") */
  externalReference: string;
  /** valor EM REAIS (float) — Asaas NÃO trabalha em centavos */
  valueBrl: number;
  customer: AsaasCustomerInput;
  description?: string;
  /** delay antes do retry do QR (default 3000ms — QR demora ~3s p/ ficar pronto) */
  qrRetryDelayMs?: number;
}

export interface AsaasChargeResult {
  /** id do pagamento no Asaas ("pay_...") */
  providerId: string;
  /** id do customer no Asaas ("cus_...") */
  customerId: string;
  /** copia-e-cola (payload EMV) — null se o QR ainda não ficou pronto */
  brCode: string | null;
  /** data URI da imagem do QR (encodedImage base64) */
  qrCodeImageBase64: string | null;
  expiresAt: Date | null;
}

/** dueDate = amanhã em "YYYY-MM-DD" (Asaas exige data futura p/ PIX). */
export const toAsaasDueDate = (from: Date = new Date()): string =>
  new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Provides AsaasService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-10-03
 */
export class AsaasService {
  private log = logger.child({ scope: 'AsaasService' });
  /** cache de customerId por chave do pagador (evita customer novo a cada charge) */
  private customerCache = new Map<string, string>();

  static isConfigured(): boolean {
    return env.asaas.apiKey.trim().length > 0;
  }

  private buildHeaders() {
    // Asaas: header access_token CRU — SEM "Bearer".
    return {
      access_token: env.asaas.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private customerCacheKey(customer: AsaasCustomerInput): string {
    return [
      String(customer.cpfCnpj || '').trim().toLowerCase(),
      String(customer.email || '').trim().toLowerCase(),
      String(customer.name || '').trim().toLowerCase(),
    ].join('|');
  }

  /** Cria (ou reusa do cache) o customer do pagador → id "cus_...". */
  async ensureCustomer(customer: AsaasCustomerInput): Promise<string> {
    const key = this.customerCacheKey(customer);
    const cached = this.customerCache.get(key);
    if (cached) return cached;

    const name = String(customer.name || '').trim();
    if (!name) {
      throw new AppError('PAY-023', 400, { message: 'Asaas exige nome do customer.', provider: 'ASAAS' });
    }
    const response = await fetch(`${env.asaas.apiBaseUrl}/customers`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        name,
        ...(customer.cpfCnpj ? { cpfCnpj: String(customer.cpfCnpj).replace(/\D/g, '') } : {}),
        ...(customer.email ? { email: customer.email } : {}),
      }),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST customers failed', { status: response.status, body: bodyText.slice(0, 500) });
      throw new AppError('PAY-023', 400, {
        message: 'Não foi possível criar o cliente no Asaas.',
        providerStatus: response.status,
        provider: 'ASAAS',
        details: { body: bodyText.slice(0, 300) },
      });
    }
    const data: any = await response.json();
    const id = String(data?.id || '');
    if (!id) {
      throw new AppError('PAY-023', 400, {
        message: 'Asaas não retornou o id do customer.',
        provider: 'ASAAS',
      });
    }
    this.customerCache.set(key, id);
    return id;
  }

  /** QR do PIX: GET /pixQrCode com retry 1x após delay (~3s p/ ficar pronto). */
  private async fetchPixQrCode(
    paymentId: string,
    retryDelayMs: number
  ): Promise<{ payload: string; encodedImage: string | null } | null> {
    const attempt = async () => {
      const response = await fetch(`${env.asaas.apiBaseUrl}/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
        headers: this.buildHeaders(),
      });
      if (!response.ok) return null;
      const data: any = await response.json().catch(() => null);
      const payload = String(data?.payload || '');
      if (!payload) return null;
      return { payload, encodedImage: data?.encodedImage ? String(data.encodedImage) : null };
    };

    const first = await attempt();
    if (first) return first;
    // QR demora ~3s p/ ficar pronto depois que o pagamento é criado (provado ao vivo).
    await sleep(Math.max(0, retryDelayMs));
    return attempt();
  }

  async createPixCharge(input: CreateAsaasChargeInput): Promise<AsaasChargeResult> {
    if (!AsaasService.isConfigured()) {
      throw new AppError('PAY-023', 400, {
        message: 'Asaas selecionado mas ASAAS_API_KEY está ausente.',
        provider: 'ASAAS',
      });
    }
    const valueBrl = Number(input.valueBrl || 0);
    const externalReference = String(input.externalReference || '').trim();
    if (!externalReference) {
      throw new AppError('PAY-023', 400, { message: 'externalReference inválida para Asaas.', provider: 'ASAAS' });
    }
    if (!(valueBrl > 0)) {
      throw new AppError('PAY-023', 400, {
        message: 'Valor da cobrança Asaas deve ser > 0.',
        provider: 'ASAAS',
      });
    }

    const customerId = await this.ensureCustomer(input.customer);
    const dueDate = toAsaasDueDate();
    const response = await fetch(`${env.asaas.apiBaseUrl}/payments`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: valueBrl, // REAIS FLOAT — NÃO centavos
        dueDate,
        externalReference,
        ...(input.description ? { description: String(input.description).slice(0, 300) } : {}),
      }),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST payments (PIX) failed', {
        status: response.status,
        externalReference,
        body: bodyText.slice(0, 500),
      });
      throw new AppError('PAY-023', 400, {
        message: 'Não foi possível gerar o QR Pix (Asaas). Tente novamente em instantes.',
        providerStatus: response.status,
        provider: 'ASAAS',
        details: { body: bodyText.slice(0, 300) },
      });
    }
    const data: any = await response.json();
    const paymentId = String(data?.id || '');
    if (!paymentId) {
      throw new AppError('PAY-023', 400, {
        message: 'Asaas não retornou o id do pagamento.',
        provider: 'ASAAS',
      });
    }

    const qr = await this.fetchPixQrCode(paymentId, input.qrRetryDelayMs ?? 3000);
    if (!qr) {
      this.log.error('Asaas QR indisponível após retry', { paymentId, externalReference });
      throw new AppError('PAY-024', 400, {
        message: 'QR Pix do Asaas indisponível (provável delay do provedor).',
        provider: 'ASAAS',
        details: { paymentId },
      });
    }

    return {
      providerId: paymentId,
      customerId,
      brCode: qr.payload,
      qrCodeImageBase64: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
      expiresAt: new Date(`${dueDate}T23:59:59-03:00`),
    };
  }

  /** Cartão: mesma rota /v3/payments com billingType CREDIT_CARD (validado ao vivo). */
  async createCardCharge(input: CreateAsaasChargeInput): Promise<AsaasChargeResult> {
    if (!AsaasService.isConfigured()) {
      throw new AppError('PAY-023', 400, {
        message: 'Asaas selecionado mas ASAAS_API_KEY está ausente.',
        provider: 'ASAAS',
      });
    }
    const valueBrl = Number(input.valueBrl || 0);
    const externalReference = String(input.externalReference || '').trim();
    if (!externalReference) {
      throw new AppError('PAY-023', 400, { message: 'externalReference inválida para Asaas.', provider: 'ASAAS' });
    }
    if (!(valueBrl > 0)) {
      throw new AppError('PAY-023', 400, { message: 'Valor da cobrança Asaas deve ser > 0.', provider: 'ASAAS' });
    }

    const customerId = await this.ensureCustomer(input.customer);
    const dueDate = toAsaasDueDate();
    const response = await fetch(`${env.asaas.apiBaseUrl}/payments`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value: valueBrl,
        dueDate,
        externalReference,
        ...(input.description ? { description: String(input.description).slice(0, 300) } : {}),
      }),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST payments (CREDIT_CARD) failed', {
        status: response.status,
        externalReference,
        body: bodyText.slice(0, 500),
      });
      throw new AppError('PAY-023', 400, {
        message: 'Não foi possível criar a cobrança de cartão (Asaas).',
        providerStatus: response.status,
        provider: 'ASAAS',
        details: { body: bodyText.slice(0, 300) },
      });
    }
    const data: any = await response.json();
    const paymentId = String(data?.id || '');
    if (!paymentId) {
      throw new AppError('PAY-023', 400, {
        message: 'Asaas não retornou o id do pagamento.',
        provider: 'ASAAS',
      });
    }
    return {
      providerId: paymentId,
      customerId,
      brCode: null,
      qrCodeImageBase64: null,
      expiresAt: new Date(`${dueDate}T23:59:59-03:00`),
    };
  }

  /** Consulta pagamento por id ("pay_..."). Retorna o body ou null (404/erro). */
  async getCharge(paymentId: string): Promise<any | null> {
    if (!AsaasService.isConfigured()) return null;
    const id = String(paymentId || '').trim();
    if (!id) return null;
    const response = await fetch(`${env.asaas.apiBaseUrl}/payments/${encodeURIComponent(id)}`, {
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      const bodyText = await response.text().catch(() => '');
      this.log.warn('GET payments failed', { status: response.status, paymentId: id, body: bodyText.slice(0, 300) });
      return null;
    }
    return response.json().catch(() => null);
  }
}

export type PlatformPixProvider = 'asaas' | 'openpix' | 'mp';

/**
 * Cadeia de provedores do PIX de plataforma (03/10 Wave Asaas):
 * - PAYMENT_PROVIDER_DEFAULT=asaas → Asaas (se configurado E valor ≥ R$5)
 *   → OpenPix (se configurado) → Mercado Pago (sempre o último).
 * - PAYMENT_PROVIDER_DEFAULT=openpix → OpenPix → MP (Waves 1/2, inalterado).
 * - PAYMENT_PROVIDER_DEFAULT=mp → só MP (default histórico).
 * Cada provedor que falha em runtime cai pro próximo (MP intacto no fim).
 */
export const resolvePlatformPixChain = (amountBrl: number): PlatformPixProvider[] => {
  if (env.payments.providerDefault === 'asaas') {
    const chain: PlatformPixProvider[] = [];
    if (AsaasService.isConfigured() && Number(amountBrl) >= ASAAS_MIN_PIX_BRL) {
      chain.push('asaas');
    }
    if (OpenPixService.isConfigured()) {
      chain.push('openpix');
    }
    chain.push('mp');
    return chain;
  }
  if (env.payments.providerDefault === 'openpix') {
    return OpenPixService.isConfigured() ? ['openpix', 'mp'] : ['mp'];
  }
  return ['mp'];
};
