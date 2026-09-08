/**
 * Didit KYC integration service (integração direta — sem intermediários).
 *
 * Cria a sessão de verificação hospedada no Didit (verification.didit.me:
 * documento + selfie + liveness) e processa o webhook `status.updated`,
 * aplicando a decisão no documento/motoboy. O botão "já concluí" do app
 * chama check() que busca a decisão via GET /decision — webhook e check
 * compartilham applyDecision (fonte única, nunca divergem).
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

export interface StartDiditKycInput {
  cpf: string;
  birthDate: string; // DDMMAAAA — validação de vínculo no hub; NÃO vai ao provedor
  fullName?: string;
}

export interface DiditWebhookResult {
  applied: boolean;
  eventId?: string;
  documentId?: string;
  motoboyActivated?: boolean;
  reason?: string;
}

/** Statuses exatos (case-sensitive) da session API v3 do Didit. */
type DiditSessionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Awaiting User'
  | 'Approved'
  | 'Declined'
  | 'In Review'
  | 'Abandoned'
  | 'Expired'
  | 'Kyc Expired'
  | 'Resubmitted';

interface DiditWebhookEnvelope {
  event_id?: string;
  webhook_type?: string;
  timestamp?: number;
  status?: string;
  session_id?: string;
  vendor_data?: string;
  metadata?: unknown;
  decision?: unknown;
}

const DOC_TYPE = 'KYC_DIDIT';

/**
 * Strips non-digit characters.
 */
function digits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

/**
 * Maps a 0–1 score to the labels already used by the face UI
 * (alto/medio/baixo — same thresholds as FaceVerifyService).
 */
function scoreToLabel(score: number): string {
  if (score >= 0.75) return 'alto';
  if (score >= 0.55) return 'medio';
  return 'baixo';
}

/**
 * Extracts a conservative face score from the Didit decision object.
 * Walks liveness_checks[]/face_matches[] looking for a numeric
 * confidence/score; normalizes 0–1 / 0–100 to 0–1. Returns null when
 * nothing numeric is exposed (we never invent a score).
 */
function faceScoreFromDecision(decision: unknown): number | null {
  if (!decision || typeof decision !== 'object') return null;
  const arrays = ['liveness_checks', 'face_matches', 'id_verifications'];
  let best: number | null = null;
  for (const key of arrays) {
    const list = (decision as Record<string, unknown>)[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      for (const field of ['confidence', 'score', 'similarity']) {
        const raw = rec[field];
        if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
        const normalized = raw > 1 ? raw / 100 : raw;
        if (best === null || normalized > best) best = normalized;
      }
    }
  }
  return best;
}

class DiditKycService {
  private get config() {
    return env.didit;
  }

  /**
   * Guards configuration (explicit opt-in via DIDIT_KYC_ENABLED).
   */
  private assertEnabled() {
    if (!this.config.enabled || !this.config.apiKey || !this.config.workflowId) {
      throw new AppError('DID-001', 503);
    }
  }

  /**
   * Creates a hosted verification session on Didit and persists/refreshes
   * the pending KYC_DIDIT document holding the capture URL.
   *
   * vendor_data = motoboy id: the Didit returns an unfinished session for
   * the same vendor_data instead of duplicating (idempotency + duplicate
   * detection). On our side, a PENDING doc is REUSED (metadata refreshed)
   * so the SUPER_ADMIN queue stays clean.
   */
  async start(motoboy: Motoboy, input: StartDiditKycInput) {
    this.assertEnabled();
    // Identidade VINCULADA: se o motoboy já fez KYC, usa sempre o CPF/nascimento
    // gravados — o campo aberto só existe na primeira vez (e já fica salvo).
    let cpf = digits(motoboy.kycCpf || '');
    let birthDate = digits(motoboy.kycBirthDate || '');
    if (!cpf || birthDate.length !== 8) {
      cpf = digits(input.cpf);
      birthDate = digits(input.birthDate);
    }
    if (cpf.length !== 11) throw new AppError('DID-002', 400);
    if (birthDate.length !== 8) throw new AppError('DID-003', 400);

    // Primeiro KYC: grava o vínculo (motoboy ↔ identidade verificada)
    if (!motoboy.kycCpf || digits(motoboy.kycBirthDate || '').length !== 8) {
      await AppDataSource.getRepository(Motoboy).update(
        { id: motoboy.id },
        { kycCpf: cpf, kycBirthDate: birthDate },
      );
    }

    const resp = await fetch(`${this.config.apiBaseUrl}/v3/session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        workflow_id: this.config.workflowId,
        vendor_data: motoboy.id,
        language: 'pt',
        callback: `${env.appUrl}/motoboy/profile?kyc=didit`,
        // NUNCA expected_details — no piloto Jano mandava usuário legítimo
        // pra revisão (decisão documentada em docs/KYC_DIDIT.md).
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as {
      session_id?: string;
      url?: string;
      detail?: string;
    };
    if (!resp.ok || !data?.session_id || !data?.url) {
      logger.warn('Didit KYC start failed', { status: resp.status, detail: data?.detail });
      throw new AppError('DID-004', 502);
    }

    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    // Reusa o doc PENDING existente (o provedor devolve a mesma sessão via
    // vendor_data; criar outro doc aqui enchia a fila SuperAdmin de órfãos).
    const existing = await docRepo
      .createQueryBuilder('doc')
      .where('doc.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere('doc.doc_type = :docType', { docType: DOC_TYPE })
      .andWhere("doc.status = 'PENDING'")
      .orderBy('doc.uploaded_at', 'DESC')
      .getOne();

    const diditMeta = { sessionId: data.session_id, url: data.url, status: 'Not Started' };
    if (existing) {
      const previous = (existing.metadata || {}) as Record<string, unknown> & {
        didit?: Record<string, unknown>;
      };
      const previousDidit = { ...(previous.didit || {}) };
      delete previousDidit.reopenSuggested;
      existing.metadata = { ...previous, didit: { ...previousDidit, ...diditMeta } };
      await docRepo.save(existing);
      return { documentId: existing.id, captureUrl: data.url };
    }

    const document = docRepo.create({
      motoboyId: motoboy.id,
      docType: DOC_TYPE,
      fileKey: 'didit:hosted',
      status: 'PENDING',
      metadata: { didit: diditMeta },
    } as Partial<MotoboyDocument>);
    await docRepo.save(document);

    return { documentId: document.id, captureUrl: data.url };
  }

  /**
   * Fetches the latest pending session decision for the motoboy (the
   * "já concluí a captura" button). Applies the decision through the SAME
   * applyDecision used by the webhook, so results can never diverge.
   */
  async check(motoboy: Motoboy) {
    this.assertEnabled();
    const document = await this.findPendingDocument(motoboy.id);
    if (!document) return { status: 'none' as const };
    const sessionId = ((document.metadata as any)?.didit?.sessionId) as string | undefined;
    if (!sessionId) return { status: 'none' as const };

    const resp = await fetch(`${this.config.apiBaseUrl}/v3/session/${sessionId}/decision/`, {
      headers: { 'x-api-key': this.config.apiKey },
    });
    const data = (await resp.json().catch(() => ({}))) as {
      status?: string;
      decision?: unknown;
      detail?: string;
    };
    if (!resp.ok) {
      logger.warn('Didit KYC decision fetch failed', { status: resp.status, detail: data?.detail });
      throw new AppError('DID-008', 502);
    }
    const status = String(data.status || '');
    if (!status) return { status: 'in_progress' as const };

    await this.applyDecision(document, status, data.decision);
    return { status: this.internalStatusFor(status) };
  }

  /**
   * Validates the X-Signature HMAC-SHA256 (over the raw request bytes) and
   * applies the session decision: Approved activates the motoboy, Declined
   * rejects the document, In Review stays pending for the SUPER_ADMIN panel
   * (human fallback). Always answers 2xx for valid-signature events the
   * service chooses to ignore (Didit retries 2× on 5xx/404 only).
   */
  async handleWebhook(
    rawBody: string,
    signature: string | undefined,
    timestampHeader: string | undefined,
    payload: DiditWebhookEnvelope,
    isTestWebhook = false,
  ): Promise<DiditWebhookResult> {
    const secret = this.config.webhookSecret;
    if (!secret) throw new AppError('DID-005', 401);
    if (!signature || !timestampHeader) throw new AppError('DID-006', 401);

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestampHeader));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      throw new AppError('DID-007', 401);
    }
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest();
    if (!this.signatureMatches(expected, signature)) {
      throw new AppError('DID-006', 401);
    }

    if (isTestWebhook) {
      logger.info('Didit test webhook skipped', { eventId: payload?.event_id });
      return { applied: false, reason: 'test_webhook' };
    }
    if (payload?.webhook_type !== 'status.updated') {
      return { applied: false, eventId: payload?.event_id, reason: 'ignored_type' };
    }
    const sessionId = String(payload?.session_id || '');
    if (!sessionId) return { applied: false, eventId: payload?.event_id, reason: 'no_session' };

    const docRepo = AppDataSource.getRepository(MotoboyDocument);
    const document = await docRepo
      .createQueryBuilder('doc')
      .where("doc.metadata->'didit'->>'sessionId' = :sessionId", { sessionId })
      .getOne();
    if (!document) {
      logger.warn('Didit webhook: document not found', { sessionId });
      return { applied: false, eventId: payload?.event_id, reason: 'document_not_found' };
    }

    // Idempotência: Didit reenvia o mesmo evento (retry 2×) — o último
    // event_id aplicado fica gravado no metadata do doc.
    const eventId = String(payload?.event_id || '');
    const meta = (document.metadata || {}) as Record<string, unknown> & {
      didit?: Record<string, unknown>;
    };
    if (eventId && meta.didit?.lastEventId === eventId) {
      return { applied: false, eventId, documentId: document.id, reason: 'duplicate' };
    }

    const status = String(payload?.status || '');
    const { motoboyActivated } = await this.applyDecision(document, status, payload?.decision, eventId);
    return { applied: true, eventId: eventId || undefined, documentId: document.id, motoboyActivated };
  }

  /**
   * Constant-time comparison accepting the HMAC hex or base64 encoding.
   */
  private signatureMatches(expected: Buffer, signature: string): boolean {
    for (const encoded of [expected.toString('hex'), expected.toString('base64')]) {
      const received = Buffer.from(signature);
      const candidate = Buffer.from(encoded);
      if (received.length === candidate.length && crypto.timingSafeEqual(received, candidate)) {
        return true;
      }
    }
    return false;
  }

  private async findPendingDocument(motoboyId: string): Promise<MotoboyDocument | null> {
    return AppDataSource.getRepository(MotoboyDocument)
      .createQueryBuilder('doc')
      .where('doc.motoboy_id = :motoboyId', { motoboyId })
      .andWhere('doc.doc_type = :docType', { docType: DOC_TYPE })
      .andWhere("doc.status = 'PENDING'")
      .orderBy('doc.uploaded_at', 'DESC')
      .getOne();
  }

  private internalStatusFor(status: string) {
    switch (status) {
      case 'Approved':
        return 'approved' as const;
      case 'Declined':
        return 'declined' as const;
      case 'In Review':
        return 'in_review' as const;
      case 'Abandoned':
      case 'Expired':
      case 'Kyc Expired':
        return 'reopened_suggested' as const;
      default:
        return 'in_progress' as const;
    }
  }

  /**
   * Single source of decision mapping — used by BOTH the webhook and check().
   */
  private async applyDecision(
    document: MotoboyDocument,
    status: string,
    decision: unknown,
    eventId?: string,
  ): Promise<{ motoboyActivated: boolean }> {
    const meta = (document.metadata || {}) as Record<string, unknown> & {
      didit?: Record<string, unknown>;
      face?: Record<string, unknown>;
    };
    meta.didit = {
      ...(meta.didit || {}),
      status,
      updatedAt: new Date().toISOString(),
      ...(eventId ? { lastEventId: eventId } : {}),
    };

    // Score face no shape que a UI já renderiza — só quando o provedor
    // expõe número (nunca inventamos score).
    const score = faceScoreFromDecision(decision);
    if (score !== null) {
      meta.face = {
        status: status === 'Approved' ? 'done' : status === 'Declined' ? 'failed' : 'pending',
        scoreLabel: scoreToLabel(score),
        score,
      };
    }

    document.metadata = meta;
    let motoboyActivated = false;

    switch (status) {
      case 'Approved':
        document.status = 'APPROVED';
        document.reviewedAt = new Date();
        break;
      case 'Declined':
        document.status = 'REJECTED';
        document.reviewedAt = new Date();
        break;
      case 'In Review':
        // Fallback humano: segue PENDING na fila do Super Admin.
        document.status = 'PENDING';
        document.reviewedAt = null;
        break;
      case 'Abandoned':
      case 'Expired':
      case 'Kyc Expired':
        document.status = 'PENDING';
        meta.didit.reopenSuggested = true;
        break;
      default:
        // In Progress / Not Started / Awaiting User / Resubmitted — só status.
        break;
    }
    await AppDataSource.getRepository(MotoboyDocument).save(document);

    if (status === 'Approved') {
      await AppDataSource.getRepository(Motoboy).update(
        { id: document.motoboyId },
        { status: 'ACTIVE', approvedAt: new Date() },
      );
      motoboyActivated = true;
      logger.info('Didit KYC approved — motoboy activated', {
        motoboyId: document.motoboyId,
        sessionId: meta.didit.sessionId,
        score,
      });
    }
    return { motoboyActivated };
  }
}

export const diditKycService = new DiditKycService();
