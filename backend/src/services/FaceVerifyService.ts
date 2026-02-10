/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Chama no espeto - All Rights Reserved.
 *
 * Assisted verification: compares selfie vs CNH face and returns a score.
 */

import path from 'path';
import fs from 'fs/promises';
import { AppDataSource } from '../config/database';
import { MotoboyDocument } from '../entities/MotoboyDocument';
import { logger } from '../utils/logger';

type FaceStatus = 'pending' | 'processing' | 'done' | 'failed' | 'manual_required';
type ScoreLabel = 'alto' | 'medio' | 'baixo' | 'indisponivel';

const log = logger.child({ scope: 'FaceVerifyService' });

const uploadsRoot = path.join(process.cwd(), 'uploads');

function fileKeyToPath(fileKey: string) {
  // fileKey looks like "/uploads/motoboys/xxx.jpg"
  const normalized = String(fileKey || '').trim();
  if (!normalized.startsWith('/uploads/')) return null;
  const rel = normalized.replace(/^\/uploads\//, '');
  return path.join(uploadsRoot, rel);
}

async function readFileKeyAsDataUrl(fileKey: string): Promise<string> {
  const p = fileKeyToPath(fileKey);
  if (!p) throw new Error('invalid_file_key');
  const buf = await fs.readFile(p);
  const ext = path.extname(p).replace('.', '').toLowerCase() || 'jpeg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function labelFromScore(score: number | null): ScoreLabel {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'indisponivel';
  if (score >= 0.75) return 'alto';
  if (score >= 0.55) return 'medio';
  return 'baixo';
}

export class FaceVerifyService {
  private enabled = process.env.FACE_VERIFY_ENABLED !== 'false';
  private workerUrl = process.env.FACE_VERIFY_WORKER_URL || 'http://face-worker:8000';
  private timeoutMs =
    process.env.FACE_VERIFY_TIMEOUT_MS && Number(process.env.FACE_VERIFY_TIMEOUT_MS) > 0
      ? Number(process.env.FACE_VERIFY_TIMEOUT_MS)
      : 15_000;

  async markPendingIfReady(motoboyId: string) {
    if (!this.enabled) return;

    const repo = AppDataSource.getRepository(MotoboyDocument);
    const selfie = await repo.findOne({ where: { motoboyId, docType: 'SELFIE' } as any, order: { uploadedAt: 'DESC' } });
    const cnh = await repo.findOne({ where: { motoboyId, docType: 'CNH' } as any, order: { uploadedAt: 'DESC' } });
    if (!selfie || !cnh) return;

    selfie.metadata = selfie.metadata || {};
    selfie.metadata.face = {
      ...(selfie.metadata.face || {}),
      status: 'pending' as FaceStatus,
      checkedAt: null,
      provider: 'deepface',
    };
    await repo.save(selfie);
  }

  async processNextBatch(limit = 3) {
    if (!this.enabled) return;

    // Find selfies that are pending/failed/manual_required and have a CNH available.
    const rows: Array<{ selfie_id: string; motoboy_id: string; selfie_key: string; cnh_key: string }> =
      await AppDataSource.query(
        `
        SELECT s.id AS selfie_id,
               s.motoboy_id,
               s.file_key AS selfie_key,
               c.file_key AS cnh_key
        FROM motoboy_documents s
        JOIN LATERAL (
          SELECT file_key
          FROM motoboy_documents c
          WHERE c.motoboy_id = s.motoboy_id
            AND c.doc_type = 'CNH'
          ORDER BY c.uploaded_at DESC
          LIMIT 1
        ) c ON true
        WHERE s.doc_type = 'SELFIE'
          AND s.status IN ('PENDING','REJECTED','APPROVED')
          AND COALESCE(s.metadata->'face'->>'status','pending') IN ('pending','failed','manual_required')
        ORDER BY s.uploaded_at ASC
        LIMIT $1
        `,
        [limit]
      );

    for (const row of rows) {
      await this.processOne(row.selfie_id, row.cnh_key, row.selfie_key);
    }
  }

  private async processOne(selfieId: string, cnhKey: string, selfieKey: string) {
    const repo = AppDataSource.getRepository(MotoboyDocument);
    const selfie = await repo.findOne({ where: { id: selfieId } });
    if (!selfie) return;

    // Best-effort "claim" so we don't process the same selfie twice.
    const claimed = await AppDataSource.query(
      `
      UPDATE motoboy_documents
      SET metadata = jsonb_set(
        COALESCE(metadata,'{}'::jsonb),
        '{face}',
        COALESCE(metadata->'face','{}'::jsonb) || jsonb_build_object('status','processing','checkedAt', to_jsonb(NOW()))
      )
      WHERE id = $1
        AND COALESCE(metadata->'face'->>'status','pending') IN ('pending','failed','manual_required')
      RETURNING id
      `,
      [selfieId]
    );
    if (!Array.isArray(claimed) || claimed.length === 0) return;

    const startedAt = Date.now();
    const faceMetaBase: any = {
      status: 'processing' as FaceStatus,
      checkedAt: new Date().toISOString(),
      provider: 'deepface',
      providerVersion: null,
      latencyMs: null,
    };

    try {
      const docImageBase64 = await readFileKeyAsDataUrl(cnhKey);
      const selfieImageBase64 = await readFileKeyAsDataUrl(selfieKey);

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), this.timeoutMs);
      let json: any;
      try {
        const res = await fetch(`${this.workerUrl.replace(/\/+$/, '')}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docImageBase64,
            selfieImageBase64,
          }),
          signal: controller.signal,
        });
        json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.reason || `worker_http_${res.status}`);
        }
      } finally {
        clearTimeout(t);
      }

      const latencyMs = Date.now() - startedAt;
      const selfieFaceCount = Number(json?.selfieFaceCount ?? 0);
      const docFaceCount = Number(json?.docFaceCount ?? 0);
      const faceDetectedSelfie = Boolean(json?.faceDetectedSelfie);
      const faceDetectedDoc = Boolean(json?.faceDetectedDoc);
      const faceMatchScore = typeof json?.faceMatchScore === 'number' ? json.faceMatchScore : null;

      let status: FaceStatus = 'done';
      let reason: string | null = null;

      if (!faceDetectedSelfie || selfieFaceCount === 0) {
        status = 'manual_required';
        reason = 'no_face_selfie';
      } else if (selfieFaceCount !== 1) {
        status = 'manual_required';
        reason = 'multi_face_selfie';
      } else if (!faceDetectedDoc || docFaceCount === 0) {
        status = 'manual_required';
        reason = 'no_face_doc';
      }

      const scoreLabel = labelFromScore(faceMatchScore);

      selfie.metadata = selfie.metadata || {};
      selfie.metadata.face = {
        ...faceMetaBase,
        status,
        checkedAt: new Date().toISOString(),
        faceDetectedSelfie,
        faceDetectedDoc,
        selfieFaceCount,
        docFaceCount,
        faceMatchScore,
        scoreLabel,
        reason,
        provider: json?.provider || 'deepface',
        providerVersion: json?.providerVersion || null,
        latencyMs,
      };
      await repo.save(selfie);
    } catch (error: any) {
      const latencyMs = Date.now() - startedAt;
      selfie.metadata = selfie.metadata || {};
      selfie.metadata.face = {
        ...faceMetaBase,
        status: 'failed' as FaceStatus,
        checkedAt: new Date().toISOString(),
        scoreLabel: 'indisponivel' as ScoreLabel,
        reason: error?.name === 'AbortError' ? 'timeout' : (error?.message || 'compare_error'),
        latencyMs,
      };
      await repo.save(selfie);
      log.warn('Face verify failed', { selfieId, error: error?.message || String(error) });
    }
  }
}

export const faceVerifyService = new FaceVerifyService();

