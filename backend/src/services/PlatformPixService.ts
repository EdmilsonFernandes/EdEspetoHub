/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: PlatformPixService.ts
 * @Date: 2026-10-30
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { AsaasService, isMercadoPagoEnabled, resolvePlatformPixChain } from './AsaasService';
import { OpenPixService, toOpenPixCents } from './OpenPixService';
import { MercadoPagoService } from './MercadoPagoService';
import { PAYMENT_AUDIT_STAGE } from '../utils/paymentAudit';

/**
 * Fachada única do PIX de plataforma (30/10, pós-gate MP). Antes, cada fluxo
 * "Wave 1" (destaques hub/destino, push promo, taxa de entrega, gorjeta)
 * decidia provedor com `isOpenPixPlatformPixEnabled()` — gate que SÓ reconhece
 * PAYMENT_PROVIDER_DEFAULT=openpix e ignora o Asaas. Com =asaas esses fluxos
 * caíam direto no Mercado Pago; com o MP desativado ficariam sem PIX. Aqui a
 * regra é UMA: resolvePlatformPixChain (Asaas ≥R$5+CPF → OpenPix → MP só com
 * gate administrativo) com fallback em runtime e NUNCA um QR fake.
 */
const log = logger.child({ scope: 'PlatformPixService' });

export interface PlatformPixChargeRequest {
  /** correlationID/externalReference do fluxo — ASCII (ex.: `promo_push:{id}`). */
  externalReference: string;
  /** valor EM REAIS */
  amountBrl: number;
  /** descrição livre (sanitizada p/ OpenPix; truncada p/ Asaas) */
  comment: string;
  /** pagador — Asaas exige nome (e CPF/CNPJ p/ PIX); email usado pelo MP */
  payer?: { name?: string; email?: string; cpfCnpj?: string };
  /** janela do QR em segundos (OpenPix; default 1800). Asaas não aceita <24h — a
   *  janela LOCAL andou sempre pelo fluxo (countdown/auto-cancel), então o
   *  expiresAt retornado é o MENOR entre provedor e now+expiresIn. */
  expiresInSec?: number;
  /** contexto de audit do provedor MP (quando ele for o último recurso) */
  mpAuditContext?: {
    flowType: string;
    entityType: string;
    entityId: string;
    storeId?: string | null;
  };
}

export interface PlatformPixChargeResult {
  provider: 'ASAAS' | 'OPENPIX' | 'MERCADO_PAGO';
  providerId: string;
  brCode: string;
  qrCodeImageBase64: string | null;
  paymentLink: string | null;
  expiresAt: Date | null;
  /** tentativas por provedor (transparência p/ log/audit) */
  attempts: Array<{ provider: string; ok: boolean; error?: string }>;
}

/** PIX de plataforma disponível para este valor/pagador? (sem I/O — p/ UI/gates) */
export const isPlatformPixAvailable = (amountBrl: number, payerHasCpf = true): boolean =>
  resolvePlatformPixChain(amountBrl).some(
    (p) => p === 'openpix' || p === 'mp' || (p === 'asaas' && payerHasCpf)
  );

/**
 * Cria a cobrança PIX da plataforma percorrendo a cadeia. Falha de um provedor
 * → próximo. Nenhum provedor disponível/funcionando → AppError PAY-016 (o
 * chamador NUNCA deve gerar artefato de pagamento fake por conta própria).
 */
export async function createPlatformPixCharge(request: PlatformPixChargeRequest): Promise<PlatformPixChargeResult> {
  const amountBrl = Number(request.amountBrl || 0);
  if (!(amountBrl > 0)) {
    throw new AppError('PAY-016', 400, { message: 'Valor da cobrança deve ser maior que zero.' });
  }
  const externalReference = String(request.externalReference || '').trim();
  if (!externalReference) {
    throw new AppError('PAY-016', 400, { message: 'externalReference ausente para cobrança de plataforma.' });
  }

  const chain = resolvePlatformPixChain(amountBrl);
  const attempts: PlatformPixChargeResult['attempts'] = [];
  const payerCpf = String(request.payer?.cpfCnpj || '').replace(/\D/g, '');
  const payerName = String(request.payer?.name || '').trim();

  for (const provider of chain) {
    // Asaas exige CPF/CNPJ no customer p/ PIX (400 invalid_object — comprovado
    // em prod no Dr. Exame). Sem CPF, pula sem round-trip (fail-fast).
    if (provider === 'asaas' && !payerCpf) {
      attempts.push({ provider, ok: false, error: 'pagador sem CPF — pulado' });
      continue;
    }
    if (provider === 'asaas' && !payerName) {
      attempts.push({ provider, ok: false, error: 'pagador sem nome — pulado' });
      continue;
    }
    try {
      if (provider === 'asaas') {
        const asaas = new AsaasService();
        const charge = await asaas.createPixCharge({
          externalReference,
          valueBrl: amountBrl,
          customer: {
            name: payerName,
            ...(request.payer?.email ? { email: request.payer.email } : {}),
            cpfCnpj: payerCpf,
          },
          description: request.comment,
        });
        return {
          provider: 'ASAAS',
          providerId: charge.providerId,
          brCode: charge.brCode || '',
          qrCodeImageBase64: charge.qrCodeImageBase64,
          paymentLink: null,
          expiresAt: charge.expiresAt,
          attempts,
        };
      }
      if (provider === 'openpix') {
        const openPix = new OpenPixService();
        const charge = await openPix.createCharge({
          correlationID: externalReference,
          valueBrlCents: toOpenPixCents(amountBrl),
          expiresInSec: request.expiresInSec,
          comment: request.comment,
        });
        return {
          provider: 'OPENPIX',
          providerId: charge.providerId,
          brCode: charge.brCode,
          qrCodeImageBase64: charge.qrCodeImageBase64,
          paymentLink: null,
          expiresAt: charge.expiresAt,
          attempts,
        };
      }
      if (provider === 'mp') {
        const mercadoPago = new MercadoPagoService();
        const payerEmail = String(request.payer?.email || '').trim();
        if (!payerEmail) {
          attempts.push({ provider, ok: false, error: 'pagador sem email — MP exige' });
          continue;
        }
        const mp: any = await mercadoPago.createPayment({
          amount: amountBrl,
          method: 'PIX',
          description: request.comment,
          externalReference,
          payer: { email: payerEmail, name: payerName || 'Cliente' },
          ...(request.mpAuditContext
            ? {
                auditContext: {
                  ...request.mpAuditContext,
                  externalReference,
                  eventStage: PAYMENT_AUDIT_STAGE.PROVIDER_REQUEST,
                },
              }
            : {}),
        });
        if (!mp?.qrCodeText) {
          attempts.push({ provider, ok: false, error: 'MP não retornou QR' });
          continue;
        }
        return {
          provider: 'MERCADO_PAGO',
          providerId: String(mp?.providerId || externalReference),
          brCode: String(mp.qrCodeText),
          qrCodeImageBase64: mp.qrCodeBase64
            ? String(mp.qrCodeBase64).startsWith('data:image')
              ? String(mp.qrCodeBase64)
              : `data:image/png;base64,${mp.qrCodeBase64}`
            : null,
          paymentLink: mp?.paymentLink || null,
          expiresAt: mp?.expiresAt ? new Date(mp.expiresAt) : null,
          attempts,
        };
      }
    } catch (error: any) {
      attempts.push({ provider, ok: false, error: error?.message || String(error) });
      log.warn('Platform PIX charge failed, trying next provider', {
        externalReference,
        provider,
        error: error?.message || String(error),
      });
    }
  }

  throw new AppError('PAY-016', 400, {
    message: isMercadoPagoEnabled()
      ? 'Não foi possível gerar o QR Pix agora. Nenhum provedor respondeu — tente novamente em instantes.'
      : 'Pagamento online indisponível no momento (nenhum provedor PIX ativo). Tente novamente mais tarde.',
    details: { externalReference, attempts },
  });
}

/** Provedor PIX que a vitrine deve anunciar (sem I/O) — p/ payment summary público. */
export const resolvePublicPixProviderLabel = (): 'ASAAS' | 'OPENPIX' | 'MERCADO_PAGO' | null => {
  // Valor de referência ≥ R$5: revela o topo da cadeia (Asaas pode ser pulado
  // por valor/CPF em cobranças específicas, mas o anúncio segue o topo).
  const first = resolvePlatformPixChain(100)[0];
  if (first === 'asaas') return 'ASAAS';
  if (first === 'openpix') return 'OPENPIX';
  if (first === 'mp') return 'MERCADO_PAGO';
  return null;
};
