/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OpenPixService.ts
 * @Date: 2026-10-02
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

/**
 * WAVE 1 OpenPix (padrão validado no Dr. Exame, 02/10):
 * - POST {base}/api/v1/charge com { correlationID, value(CENTAVOS), expiresIn(sec), comment }.
 * - correlationID = external reference do fluxo (ex.: featured_request:{uuid}) — ASCII.
 * - OpenPix rejeita QUALQUER não-ASCII no comment (até travessão — "Emoji não é
 *   permitido", provado ao vivo). Régua: NFD + strip diacríticos + só \x20-\x7E.
 * - QR em IMAGEM vem NO CORPO da charge (paymentMethods.pix.qrCodeImage — URL de
 *   PNG público). NÃO usar /api/image/qrcode/base64 (devolve not found p/ DYNAMIC).
 *   Download é best-effort: copia-e-cola (brCode) basta pro front.
 * - getCharge(correlationID) para polling: GET /api/v1/charge?correlationID=...
 *   Status: GENERATED | COMPLETED | EXPIRED ...
 */

export type OpenPixChargeStatus = 'GENERATED' | 'COMPLETED' | 'EXPIRED' | string;

export interface CreateOpenPixChargeInput {
  /** correlação única (= external reference do fluxo). ASCII obrigatório. */
  correlationID: string;
  /** valor EM CENTAVOS (OpenPix não aceita decimal) */
  valueBrlCents: number;
  /** validade do QR em segundos (default 1800 = 30min, igual ao checkout MP) */
  expiresInSec?: number;
  /** descrição livre — será sanitizada p/ ASCII (não-ASCII quebra a charge) */
  comment?: string;
}

export interface OpenPixChargeResult {
  /** correlationID (é também o provider id persistido) */
  providerId: string;
  /** copia-e-cola (payload EMV) */
  brCode: string;
  /** data URI da imagem do QR (null = sem imagem; front exibe só copia-e-cola) */
  qrCodeImageBase64: string | null;
  paymentLink: null;
  expiresAt: Date | null;
}

/** Sanitiza p/ ASCII imprimível: NFD separa diacríticos, regex remove acento + não-ASCII. */
export const sanitizeToOpenPixAscii = (raw: string): string =>
  String(raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacríticos (pós-NFD o acento vira combining mark)
    .replace(/[^\x20-\x7E]/g, '') // só ASCII imprimível (mata travessão, emoji, ç, etc.)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

/** Converte BRL (ex.: 29.9) para centavos inteiros (2990). */
export const toOpenPixCents = (amountBrl: number): number =>
  Math.round(Number(amountBrl || 0) * 100);

/**
 * Provides OpenPixService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-10-02
 */
export class OpenPixService {
  private log = logger.child({ scope: 'OpenPixService' });

  static isConfigured(): boolean {
    return env.openpix.appId.trim().length > 0;
  }

  private buildHeaders() {
    return {
      Authorization: env.openpix.appId,
      'Content-Type': 'application/json',
    };
  }

  async createCharge(input: CreateOpenPixChargeInput): Promise<OpenPixChargeResult> {
    if (!OpenPixService.isConfigured()) {
      throw new AppError('PAY-015', 400, {
        message: 'OpenPix selecionado mas OPENPIX_APP_ID está ausente.',
        provider: 'OPENPIX',
      });
    }
    const correlationID = sanitizeToOpenPixAscii(input.correlationID);
    const value = Math.round(Number(input.valueBrlCents || 0));
    if (!correlationID) {
      throw new AppError('PAY-015', 400, { message: 'correlationID inválido para OpenPix.' });
    }
    if (!(value > 0)) {
      throw new AppError('PAY-015', 400, { message: 'Valor da cobrança OpenPix deve ser > 0.' });
    }
    const expiresIn = Number(input.expiresInSec) > 0 ? Math.round(Number(input.expiresInSec)) : 1800;
    const comment = sanitizeToOpenPixAscii(input.comment || '');
    const url = `${env.openpix.apiBaseUrl}/api/v1/charge`;
    const body = {
      correlationID,
      value,
      expiresIn,
      ...(comment ? { comment } : {}),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.error('POST charge failed', { status: response.status, correlationID, body: bodyText.slice(0, 500) });
      throw new AppError('PAY-015', 400, {
        message: 'Não foi possível gerar o QR Pix (OpenPix). Tente novamente em instantes.',
        providerStatus: response.status,
        provider: 'OPENPIX',
        details: { body: bodyText.slice(0, 300) },
      });
    }

    const data: any = await response.json();
    const charge = data?.charge;
    const brCode = String(charge?.brCode || data?.brCode || '');
    if (!brCode) {
      this.log.error('OpenPix charge sem brCode', { correlationID });
      throw new AppError('PAY-016', 400, {
        message: 'OpenPix não retornou o código Pix (brCode) da cobrança.',
        provider: 'OPENPIX',
      });
    }

    // QR imagem: BEST-EFFORT — vem no CORPO (paymentMethods.pix.qrCodeImage).
    // Falha no download não derruba a cobrança (copia-e-cola basta).
    let qrCodeImageBase64: string | null = null;
    try {
      const imageUrl: string | undefined =
        charge?.paymentMethods?.pix?.qrCodeImage ?? charge?.qrCodeImage ?? data?.paymentMethods?.pix?.qrCodeImage;
      if (imageUrl) {
        const img = await fetch(imageUrl);
        if (img.ok) {
          const buf = Buffer.from(await img.arrayBuffer());
          qrCodeImageBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        } else {
          this.log.warn('OpenPix QR image download failed (best-effort)', { correlationID, status: img.status });
        }
      }
    } catch (error) {
      this.log.warn('OpenPix QR image download error (best-effort)', { correlationID, error });
    }

    const rawExpires = data?.expiresAt || charge?.expiresAt || null;
    let expiresAt: Date | null = null;
    if (rawExpires) {
      const parsed = new Date(rawExpires);
      if (!Number.isNaN(parsed.getTime())) expiresAt = parsed;
    }
    if (!expiresAt) {
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    return {
      providerId: String(charge?.correlationID || correlationID),
      brCode,
      qrCodeImageBase64,
      paymentLink: null,
      expiresAt,
    };
  }

  /** Polling de cobrança por correlationID. Retorna body.charge ou null (404/ausente). */
  async getCharge(correlationID: string): Promise<any | null> {
    if (!OpenPixService.isConfigured()) return null;
    const id = sanitizeToOpenPixAscii(correlationID);
    if (!id) return null;
    const url = `${env.openpix.apiBaseUrl}/api/v1/charge?correlationID=${encodeURIComponent(id)}`;
    const response = await fetch(url, { headers: this.buildHeaders() });
    if (!response.ok) {
      if (response.status === 404) return null;
      const bodyText = await response.text().catch(() => '');
      this.log.warn('GET charge failed', { status: response.status, correlationID: id, body: bodyText.slice(0, 300) });
      return null;
    }
    const data: any = await response.json();
    return data?.charge ?? null;
  }
}

/**
 * WAVE 1 (02/10): PIX de plataforma (assinatura, destaques, promoções, push,
 * taxa de entrega, gorjeta de plataforma) usa OpenPix quando
 * PAYMENT_PROVIDER_DEFAULT=openpix E OPENPIX_APP_ID configurado.
 *
 * WAVE 2 (03/10, autorizado pelo dono): estende para o dinheiro que antes caía
 * DIRETO na conta MP de loja/motoboy via OAuth — checkout PIX do pedido
 * (order_payment:*), PIX do balcão (mesma external reference) e gorjeta em
 * TODOS os escopos. O dinheiro passa a cair na conta OpenPix da PLATAFORMA e a
 * loja/motoboy recebe por repasse posterior (modelo delivery_billing).
 * Erro no OpenPix → fallback pro fluxo MP OAuth existente (intacto).
 * PERMANECE MP: cartão, boleto e MAQUININHA POINT (decisão do dono — "depois").
 */
export const isOpenPixPlatformPixEnabled = (): boolean =>
  env.payments.providerDefault === 'openpix' && OpenPixService.isConfigured();
