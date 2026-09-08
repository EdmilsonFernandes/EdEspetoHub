/**
 * Jano KYC integration service (piloto EdEspetoHub).
 *
 * Cria a verificação na plataforma Jano (fluxo hospedado: documento +
 * selfie + liveness) e processa o webhook de resultado, marcando o
 * documento/motoboy conforme a decisão e o score.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-09-08
 */
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyDocument } from '../entities/MotoboyDocument';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export interface StartJanoKycInput {
  cpf: string;
  birthDate: string; // DDMMAAAA — chave da Consulta CPF v3; não é armazenada
  fullName?: string;
}

export interface JanoWebhookResult {
  event: string;
  documentId?: string;
  motoboyActivated?: boolean;
}

const DOC_TYPE = 'KYC_JANO';

/**
 * Strips non-digit characters.
 */
function digits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

/**
 * Maps Jano score (0–1000) to the labels already used by the face UI
 * (alto/medio/baixo — same thresholds as FaceVerifyService).
 */
function scoreToLabel(score?: number | null): string {
  const normalized = (score ?? 0) / 1000;
  if (normalized >= 0.75) return 'alto';
  if (normalized >= 0.55) return 'medio';
  return 'baixo';
}

class JanoKycService {
  private get config() {
    return env.jano;
  }

  /**
   * Guards pilot configuration (explicit opt-in via JANO_KYC_ENABLED).
   */
  private assertEnabled() {
    if (!this.config.enabled || !this.config.apiKey) {
      throw new AppError('JAN-001', 503);
    }
  }

  /**
   * Creates a hosted verification on Jano and persists a pending
   * KYC_JANO document holding the capture URL.
   */
  async start(motoboy: Motoboy, input: StartJanoKycInput) {
    this.assertEnabled();
    // Identidade VINCULADA: se o motoboy já fez KYC, usa sempre o CPF/nascimento
    // gravados — o campo aberto só existe na primeira vez (e já fica salvo).
    let cpf = digits(motoboy.kycCpf || '');
    let birthDate = digits(motoboy.kycBirthDate || '');
    if (!cpf || birthDate.length !== 8) {
      cpf = digits(input.cpf);
      birthDate = digits(input.birthDate);
    }
    if (cpf.length !== 11) throw new AppError('JAN-002', 400);
    if (birthDate.length !== 8) throw new AppError('JAN-003', 400);
    const fullName = String(
      input.fullName || (motoboy.user as { fullName?: string } | undefined)?.fullName || 'Entregador',
    ).trim();

    // Primeiro KYC: grava o vínculo (motoboy ↔ identidade verificada)
    if (!motoboy.kycCpf || digits(motoboy.kycBirthDate || '').length !== 8) {
      await AppDataSource.getRepository(Motoboy).update(
        { id: motoboy.id },
        { kycCpf: cpf, kycBirthDate: birthDate },
      );
    }

    const http = (globalThis as unknown as { fetch: typeof fetch }).fetch;
    const resp = await fetch(`${this.config.apiBaseUrl}/v1/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ cpf, birth_date: birthDate, full_name: fullName, doc_type: 'cnh' }),
    });
    const data = (await resp.json().catch(() => ({}))) as {
      verification_id?: string;
      provider_url?: string;
      detail?: string;
    };
    if (!resp.ok || !data?.verification_id || !data?.provider_url) {
      logger.warn('Jano KYC start failed', { status: resp.status, detail: data?.detail });
      throw new AppError('JAN-004', 502);
    }

    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    const document = docRepo.create({
      motoboyId: motoboy.id,
      docType: DOC_TYPE,
      fileKey: 'jano:hosted',
      status: 'PENDING',
      metadata: {
        jano: {
          verificationId: data.verification_id,
          captureUrl: data.provider_url,
          status: 'pending',
        },
      },
    } as Partial<MotoboyDocument>);
    await docRepo.save(document);

    return { documentId: document.id, captureUrl: data.provider_url };
  }

  /**
   * Asks Jano to finalize the latest pending verification for the motoboy
   * (fetches the hosted provider decision, runs the score pipeline and
   * fires the result webhook). Called by the app after the user finishes
   * the capture.
   */
  async check(motoboy: Motoboy) {
    this.assertEnabled();
    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    const document = await docRepo
      .createQueryBuilder('doc')
      .where("doc.motoboy_id = :motoboyId", { motoboyId: motoboy.id })
      .andWhere("doc.doc_type = :docType", { docType: DOC_TYPE })
      .andWhere("doc.status = 'PENDING'")
      .orderBy('doc.uploaded_at', 'DESC')
      .getOne();
    if (!document) return { status: 'none' };
    const verificationId = ((document.metadata as any)?.jano?.verificationId) as string | undefined;
    if (!verificationId) return { status: 'none' };

    const http = (globalThis as unknown as { fetch: typeof fetch }).fetch;
    const resp = await fetch(`${this.config.apiBaseUrl}/v1/verifications/${verificationId}/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });
    const data = (await resp.json().catch(() => ({}))) as { status?: string; detail?: string };
    if (!resp.ok) {
      logger.warn('Jano KYC finalize failed', { status: resp.status, detail: data?.detail });
      throw new AppError('JAN-008', 502);
    }
    return { status: data.status || 'processing' };
  }

  /**
   * Validates the X-Jano-Signature HMAC (t=…,v1=… over `${ts}.${rawBody}`)
   * and applies the decision: approved activates the motoboy, rejected
   * rejects the document, manual_review stays pending for the SUPER_ADMIN
   * panel (human fallback).
   */
  async handleWebhook(
    rawBody: string,
    signatureHeader: string | undefined,
    payload: { event?: string; data?: { verification_id?: string; score?: number; reason_code?: string | null } },
  ): Promise<JanoWebhookResult> {
    const secret = this.config.webhookSecret;
    if (!secret) throw new AppError('JAN-005', 401);
    if (!signatureHeader) throw new AppError('JAN-006', 401);

    const parts = signatureHeader.split(',').reduce((acc, chunk) => {
      const [key, value] = chunk.split('=');
      acc[key?.trim()] = value?.trim();
      return acc;
    }, {} as Record<string, string>);
    const ts = parts.t;
    const hash = parts.v1;
    if (!ts || !hash) throw new AppError('JAN-006', 401);

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      throw new AppError('JAN-007', 401);
    }
    const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(hash);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new AppError('JAN-006', 401);
    }

    const event = String(payload?.event || '');
    const verificationId = String(payload?.data?.verification_id || '');
    if (!event.startsWith('verification.') || !verificationId) return { event };

    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    const document = await docRepo
      .createQueryBuilder('doc')
      .where("doc.metadata->'jano'->>'verificationId' = :verificationId", { verificationId })
      .getOne();
    if (!document) {
      logger.warn('Jano webhook: document not found', { verificationId });
      return { event };
    }

    const score = payload?.data?.score;
    const decision = event.split('.')[1]; // approved | rejected | manual_review
    const meta = (document.metadata || {}) as Record<string, unknown> & {
      jano?: Record<string, unknown>;
      face?: Record<string, unknown>;
    };
    meta.jano = {
      ...(meta.jano || {}),
      status: decision,
      score: score ?? null,
      reasonCode: payload?.data?.reason_code ?? null,
      updatedAt: new Date().toISOString(),
    };
    // Same shape the frontend already renders for face results.
    meta.face = {
      status: decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'pending',
      scoreLabel: scoreToLabel(score),
      score: (score ?? 0) / 1000,
    };

    if (decision === 'approved') document.status = 'APPROVED';
    else if (decision === 'rejected') document.status = 'REJECTED';
    document.reviewedAt = decision === 'manual_review' ? null : new Date();
    document.metadata = meta;
    await docRepo.save(document);

    let motoboyActivated = false;
    if (decision === 'approved') {
      const motoboyRepo = AppDataSource.getRepository(Motoboy);
      await motoboyRepo.update(
        { id: document.motoboyId },
        { status: 'ACTIVE', approvedAt: new Date() },
      );
      motoboyActivated = true;
      logger.info('Jano KYC approved — motoboy activated', {
        motoboyId: document.motoboyId,
        verificationId,
        score: score ?? null,
      });
    }
    return { event, documentId: document.id, motoboyActivated };
  }
}

export const janoKycService = new JanoKycService();
