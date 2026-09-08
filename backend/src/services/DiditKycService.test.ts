/**
 * DiditKycService unit tests — webhook signature/freshness/idempotency,
 * decision mapping (Approved/Declined/In Review/Abandoned), start payload
 * (vendor_data, language, never expected_details) and check() parity with
 * the webhook (both go through applyDecision).
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-09-08
 */
import crypto from 'crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyDocument } from '../entities/MotoboyDocument';
import { AppError } from '../errors/AppError';
import { diditKycService } from './DiditKycService';

const ORIGINAL_FETCH = globalThis.fetch;
const originalDidit = { ...env.didit };

function chainable(result: unknown) {
  const chain: any = {};
  for (const method of ['where', 'andWhere', 'orderBy']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.getOne = vi.fn().mockResolvedValue(result);
  return chain;
}

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    event_id: 'evt-1',
    webhook_type: 'status.updated',
    timestamp: Math.floor(Date.now() / 1000),
    status: 'Approved',
    session_id: 'sess-1',
    vendor_data: 'motoboy-1',
    decision: {},
    ...overrides,
  };
}

function signedHeaders(rawBody: string, secret: string, encoding: 'hex' | 'base64' = 'hex', ts?: string) {
  const timestamp = ts || String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest(encoding);
  return { signature, timestamp };
}

describe('DiditKycService', () => {
  let savedDocuments: any[];
  let motoboyUpdates: any[];
  let pendingDoc: any;

  beforeEach(() => {
    env.didit.enabled = true;
    env.didit.apiKey = 'test-api-key';
    env.didit.workflowId = 'workflow-uuid';
    env.didit.webhookSecret = 'whsec_test';
    env.didit.apiBaseUrl = 'https://verification.didit.test';

    savedDocuments = [];
    motoboyUpdates = [];
    pendingDoc = {
      id: 'doc-1',
      motoboyId: 'motoboy-1',
      docType: 'KYC_DIDIT',
      fileKey: 'didit:hosted',
      status: 'PENDING',
      uploadedAt: new Date(),
      metadata: { didit: { sessionId: 'sess-1', url: 'https://verify.didit.test/pt/session/tok', status: 'In Progress' } },
    };

    (AppDataSource as any).getRepository = (entity: any) => {
      if (entity === MotoboyDocument) {
        return {
          create: (data: any) => ({ id: 'doc-new', ...data }),
          save: async (doc: any) => {
            const existing = savedDocuments.findIndex((d) => d.id === doc.id);
            if (existing >= 0) savedDocuments[existing] = doc;
            else savedDocuments.push(doc);
            return doc;
          },
          createQueryBuilder: () => chainable(pendingDoc),
        };
      }
      if (entity === Motoboy) {
        return {
          update: async (criteria: any, patch: any) => {
            motoboyUpdates.push({ criteria, patch });
          },
        };
      }
      throw new Error(`Unexpected repository: ${String(entity?.name || entity)}`);
    };
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  afterAll(() => {
    Object.assign(env.didit, originalDidit);
  });

  describe('handleWebhook — signature', () => {
    it('processes a valid hex signature', async () => {
      const rawBody = JSON.stringify(envelope());
      const { signature, timestamp } = signedHeaders(rawBody, 'whsec_test');
      const result = await diditKycService.handleWebhook(rawBody, signature, timestamp, JSON.parse(rawBody));
      expect(result.applied).toBe(true);
      expect(result.motoboyActivated).toBe(true);
    });

    it('processes a valid base64 signature', async () => {
      const rawBody = JSON.stringify(envelope());
      const { signature, timestamp } = signedHeaders(rawBody, 'whsec_test', 'base64');
      const result = await diditKycService.handleWebhook(rawBody, signature, timestamp, JSON.parse(rawBody));
      expect(result.applied).toBe(true);
    });

    it('rejects a wrong signature (DID-006)', async () => {
      const rawBody = JSON.stringify(envelope());
      await expect(
        diditKycService.handleWebhook(rawBody, 'deadbeef', String(Math.floor(Date.now() / 1000)), JSON.parse(rawBody)),
      ).rejects.toMatchObject({ code: 'DID-006' });
    });

    it('rejects a missing signature (DID-006)', async () => {
      const rawBody = JSON.stringify(envelope());
      await expect(
        diditKycService.handleWebhook(rawBody, undefined, String(Math.floor(Date.now() / 1000)), JSON.parse(rawBody)),
      ).rejects.toMatchObject({ code: 'DID-006' });
    });

    it('rejects a stale timestamp (DID-007)', async () => {
      const rawBody = JSON.stringify(envelope());
      const { signature, timestamp } = signedHeaders(rawBody, 'whsec_test', 'hex', String(Math.floor(Date.now() / 1000) - 400));
      await expect(diditKycService.handleWebhook(rawBody, signature, timestamp, JSON.parse(rawBody)))
        .rejects.toMatchObject({ code: 'DID-007' });
    });
  });

  describe('handleWebhook — routing', () => {
    const sign = (payload: unknown) => signedHeaders(JSON.stringify(payload), 'whsec_test');

    it('skips test webhooks (X-Didit-Test-Webhook)', async () => {
      const payload = envelope();
      const { signature, timestamp } = sign(payload);
      const result = await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload, true);
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('test_webhook');
      expect(savedDocuments).toHaveLength(0);
    });

    it('ignores non status.updated webhook types', async () => {
      const payload = envelope({ webhook_type: 'data.updated' });
      const { signature, timestamp } = sign(payload);
      const result = await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload);
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('ignored_type');
    });

    it('is idempotent on event retries (lastEventId)', async () => {
      const payload = envelope({ event_id: 'evt-replay' });
      const rawBody = JSON.stringify(payload);
      const { signature, timestamp } = sign(payload);
      const first = await diditKycService.handleWebhook(rawBody, signature, timestamp, payload);
      expect(first.applied).toBe(true);
      const second = await diditKycService.handleWebhook(rawBody, signature, timestamp, payload);
      expect(second.applied).toBe(false);
      expect(second.reason).toBe('duplicate');
    });
  });

  describe('handleWebhook — decisions', () => {
    const sign = (payload: unknown) => signedHeaders(JSON.stringify(payload), 'whsec_test');

    it('Approved → doc APPROVED + motoboy ACTIVE', async () => {
      const payload = envelope({ status: 'Approved' });
      const { signature, timestamp } = sign(payload);
      const result = await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload);
      expect(savedDocuments[0].status).toBe('APPROVED');
      expect(savedDocuments[0].reviewedAt).toBeInstanceOf(Date);
      expect(motoboyUpdates).toHaveLength(1);
      expect(motoboyUpdates[0].patch).toMatchObject({ status: 'ACTIVE' });
      expect(result.motoboyActivated).toBe(true);
    });

    it('Declined → doc REJECTED, motoboy untouched', async () => {
      const payload = envelope({ status: 'Declined' });
      const { signature, timestamp } = sign(payload);
      await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload);
      expect(savedDocuments[0].status).toBe('REJECTED');
      expect(motoboyUpdates).toHaveLength(0);
    });

    it('In Review → doc stays PENDING for the SUPER_ADMIN queue', async () => {
      const payload = envelope({ status: 'In Review' });
      const { signature, timestamp } = sign(payload);
      await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload);
      expect(savedDocuments[0].status).toBe('PENDING');
      expect(savedDocuments[0].reviewedAt).toBeNull();
      expect(motoboyUpdates).toHaveLength(0);
    });

    it('Abandoned/Expired → PENDING + reopenSuggested', async () => {
      let seq = 0;
      for (const status of ['Abandoned', 'Expired', 'Kyc Expired']) {
        savedDocuments = [];
        // event_id único por iteração — a idempotência (lastEventId) é
        // intencional e trataria o mesmo id como replay.
        const payload = envelope({ status, event_id: `evt-reopen-${seq++}` });
        const { signature, timestamp } = sign(payload);
        await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload);
        expect(savedDocuments[0].status).toBe('PENDING');
        expect(savedDocuments[0].metadata.didit.reopenSuggested).toBe(true);
        expect(motoboyUpdates).toHaveLength(0);
      }
    });

    it('In Progress → metadata status only, doc PENDING', async () => {
      const payload = envelope({ status: 'In Progress' });
      const { signature, timestamp } = sign(payload);
      await diditKycService.handleWebhook(JSON.stringify(payload), signature, timestamp, payload);
      expect(savedDocuments[0].status).toBe('PENDING');
      expect(savedDocuments[0].metadata.didit.status).toBe('In Progress');
    });
  });

  describe('start', () => {
    const motoboy = { id: 'motoboy-1', kycCpf: null, kycBirthDate: null, user: { fullName: 'Entregador Teste' } } as unknown as Motoboy;

    it('creates session with vendor_data/language/workflow_id and NO expected_details', async () => {
      pendingDoc = null; // sem doc PENDING → exerce o caminho CREATE
      const bodies: any[] = [];
      globalThis.fetch = (async (_url: any, init: any) => {
        bodies.push(JSON.parse(init.body));
        return new Response(JSON.stringify({ session_id: 'sess-9', url: 'https://verify.didit.test/pt/session/tok9' }), { status: 201 });
      }) as any;

      await diditKycService.start(motoboy, { cpf: '12345678901', birthDate: '01011990' });

      expect(bodies[0]).toMatchObject({
        workflow_id: 'workflow-uuid',
        vendor_data: 'motoboy-1',
        language: 'pt',
      });
      expect(bodies[0]).not.toHaveProperty('expected_details');
      const created = savedDocuments.find((d) => d.docType === 'KYC_DIDIT');
      expect(created).toMatchObject({ id: 'doc-new', fileKey: 'didit:hosted', status: 'PENDING' });
      expect(created.metadata.didit).toMatchObject({ sessionId: 'sess-9' });
    });

    it('uses the bound identity when kycCpf is already saved (ignores input)', async () => {
      const bound = { ...motoboy, kycCpf: '11122233344', kycBirthDate: '02021995' } as Motoboy;
      const bodies: any[] = [];
      globalThis.fetch = (async (_url: any, init: any) => {
        bodies.push(JSON.parse(init.body));
        return new Response(JSON.stringify({ session_id: 'sess-10', url: 'https://x.test/10' }), { status: 201 });
      }) as any;

      await diditKycService.start(bound, { cpf: '99999999999', birthDate: '31319999' });

      // O CPF nunca vai ao provedor — o vínculo fica só no hub.
      expect(bodies[0]).not.toHaveProperty('cpf');
      expect(motoboyUpdates).toHaveLength(0); // não regrava o vínculo
    });

    it('reuses the PENDING doc instead of creating a second one', async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ session_id: 'sess-11', url: 'https://x.test/11' }), { status: 201 })) as any;

      const result = await diditKycService.start(motoboy, { cpf: '12345678901', birthDate: '01011990' });

      // pendingDoc (doc-1, PENDING) é reusado — nenhum doc novo criado.
      expect(result.documentId).toBe('doc-1');
      expect(savedDocuments.every((d) => d.id === 'doc-1')).toBe(true);
    });

    it('fails with DID-002 on invalid CPF', async () => {
      await expect(
        diditKycService.start(motoboy, { cpf: '123', birthDate: '01011990' }),
      ).rejects.toMatchObject({ code: 'DID-002' });
    });
  });

  describe('check', () => {
    it('applies the fetched decision exactly like the webhook (applyDecision shared)', async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ status: 'Approved', decision: { liveness_checks: [{ confidence: 92 }] } }), { status: 200 })) as any;

      const result = await diditKycService.check({ id: 'motoboy-1' } as Motoboy);

      expect(result.status).toBe('approved');
      expect(savedDocuments[0].status).toBe('APPROVED');
      expect(motoboyUpdates).toHaveLength(1);
      expect(motoboyUpdates[0].patch.status).toBe('ACTIVE');
      // Score 92 → normalizado 0.92 → label alto, no shape da UI de face.
      expect(savedDocuments[0].metadata.face).toMatchObject({ score: 0.92, scoreLabel: 'alto' });
    });

    it('returns none when there is no pending doc', async () => {
      pendingDoc = null;
      const result = await diditKycService.check({ id: 'motoboy-1' } as Motoboy);
      expect(result.status).toBe('none');
    });
  });

  describe('assertEnabled', () => {
    it('DID-001 when disabled', async () => {
      env.didit.enabled = false;
      await expect(
        diditKycService.start({ id: 'm' } as Motoboy, { cpf: '12345678901', birthDate: '01011990' }),
      ).rejects.toMatchObject({ code: 'DID-001' });
    });
  });
});
