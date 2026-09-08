/**
 * Didit KYC gates tests — KYC_DIDIT APPROVED counts as the FULL
 * verification (MOTO-030/MOTO-031 pass without CNH/SELFIE/CRLV), PENDING
 * mirrors "docs submetidos", REJECTED blocks; NONE keeps the legacy manual
 * flow. platformReviewDocument on KYC_DIDIT APPROVED activates the motoboy
 * (manual docs still do NOT).
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-09-08
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDataSource } from '../config/database';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyDocument } from '../entities/MotoboyDocument';
import { PlatformAdmin } from '../entities/PlatformAdmin';
import { MotoboyService } from './MotoboyService';

function doc(docType: string, status: string) {
  return { docType, status, uploadedAt: new Date() };
}

function motoboyWith(vehicleType = 'MOTO') {
  return {
    id: 'motoboy-1',
    vehicleType,
    status: 'PENDING_VERIFICATION',
    user: { email: 'motoboy@teste.com' }, // independente — exige KYC
  } as unknown as Motoboy;
}

describe('MotoboyService — Didit KYC gates', () => {
  let service: any;
  let docsByType: Map<string, any>;
  let motoboyUpdates: any[];
  let savedDocs: any[];

  beforeEach(() => {
    motoboyUpdates = [];
    savedDocs = [];

    // O override precisa cobrir TODAS as entidades — o construtor do
    // MotoboyService instancia repos (MotoboyStore, Store, User…) e o
    // override do teste anterior persiste entre testes (mutação no módulo).
    const permissive = {
      find: async () => [] as any[],
      findOne: async () => null,
      create: (data: any) => data,
      save: async (data: any) => data,
      update: async () => undefined,
    };
    (AppDataSource as any).getRepository = (entity: any) => {
      if (entity === MotoboyDocument) {
        return {
          ...permissive,
          find: async () =>
            [...docsByType.values()].map((d, i) => ({ id: `doc-${i}`, motoboyId: 'motoboy-1', fileKey: 'x', ...d })),
          findOne: async () => savedDocs[0] || null,
          save: async (d: any) => {
            savedDocs[0] = d;
            return d;
          },
        };
      }
      if (entity === Motoboy) {
        return {
          ...permissive,
          update: async (criteria: any, patch: any) => motoboyUpdates.push({ criteria, patch }),
        };
      }
      if (entity === PlatformAdmin) {
        return { findOne: async () => null };
      }
      // Construtores de repo do service batem aqui — stub permissivo.
      return permissive;
    };

    service = new MotoboyService();
    service.logAudit = async () => undefined;
    service.ensureMotoboyProfileIsComplete = async () => undefined;
    service.userRepository = { findById: async () => null };
  });

  describe('ensureMotoboyCanRequestStoreLinks (MOTO-030)', () => {
    it('didit APPROVED passes without any manual doc', async () => {
      docsByType = new Map([['KYC_DIDIT', doc('KYC_DIDIT', 'APPROVED')]]);
      await expect(
        service.ensureMotoboyCanRequestStoreLinks(motoboyWith()),
      ).resolves.toBeUndefined();
    });

    it('didit PENDING passes (docs submetidos)', async () => {
      docsByType = new Map([['KYC_DIDIT', doc('KYC_DIDIT', 'PENDING')]]);
      await expect(
        service.ensureMotoboyCanRequestStoreLinks(motoboyWith()),
      ).resolves.toBeUndefined();
    });

    it('didit REJECTED blocks (MOTO-030)', async () => {
      docsByType = new Map([['KYC_DIDIT', doc('KYC_DIDIT', 'REJECTED')]]);
      await expect(
        service.ensureMotoboyCanRequestStoreLinks(motoboyWith()),
      ).rejects.toMatchObject({ code: 'MOTO-030', details: { pending: ['KYC_DIDIT'] } });
    });

    it('NONE keeps legacy behavior — missing manual docs still block', async () => {
      docsByType = new Map();
      await expect(
        service.ensureMotoboyCanRequestStoreLinks(motoboyWith()),
      ).rejects.toMatchObject({ code: 'MOTO-030' });
    });

    it('NONE with manual docs submitted passes (legacy regression)', async () => {
      docsByType = new Map([
        ['CNH', doc('CNH', 'PENDING')],
        ['SELFIE', doc('SELFIE', 'PENDING')],
        ['CRLV', doc('CRLV', 'PENDING')],
      ]);
      await expect(
        service.ensureMotoboyCanRequestStoreLinks(motoboyWith()),
      ).resolves.toBeUndefined();
    });
  });

  describe('ensureMotoboyKycApproved (MOTO-031)', () => {
    it('didit APPROVED passes without CRLV (verificação completa)', async () => {
      docsByType = new Map([['KYC_DIDIT', doc('KYC_DIDIT', 'APPROVED')]]);
      await expect(
        service.ensureMotoboyKycApproved(motoboyWith()),
      ).resolves.toBeUndefined();
    });

    it('didit PENDING blocks with pending KYC_DIDIT', async () => {
      docsByType = new Map([['KYC_DIDIT', doc('KYC_DIDIT', 'PENDING')]]);
      await expect(
        service.ensureMotoboyKycApproved(motoboyWith()),
      ).rejects.toMatchObject({ code: 'MOTO-031', details: { pending: ['KYC_DIDIT'] } });
    });

    it('didit REJECTED blocks', async () => {
      docsByType = new Map([['KYC_DIDIT', doc('KYC_DIDIT', 'REJECTED')]]);
      await expect(
        service.ensureMotoboyKycApproved(motoboyWith()),
      ).rejects.toMatchObject({ code: 'MOTO-031' });
    });

    it('NONE keeps legacy — only manual APPROVED docs pass', async () => {
      docsByType = new Map([
        ['CNH', doc('CNH', 'APPROVED')],
        ['SELFIE', doc('SELFIE', 'APPROVED')],
        ['CRLV', doc('CRLV', 'APPROVED')],
      ]);
      await expect(
        service.ensureMotoboyKycApproved(motoboyWith()),
      ).resolves.toBeUndefined();

      docsByType = new Map([['CNH', doc('CNH', 'APPROVED')], ['SELFIE', doc('SELFIE', 'APPROVED')]]);
      await expect(
        service.ensureMotoboyKycApproved(motoboyWith()),
      ).rejects.toMatchObject({ code: 'MOTO-031' });
    });
  });

  describe('platformReviewDocument — KYC_DIDIT manual approval', () => {
    it('activates the motoboy when a KYC_DIDIT doc is approved', async () => {
      savedDocs[0] = {
        id: 'doc-1',
        motoboyId: 'motoboy-1',
        docType: 'KYC_DIDIT',
        status: 'PENDING',
        metadata: {},
      };
      await service.platformReviewDocument('motoboy-1', 'doc-1', 'admin-1', 'APPROVED');
      expect(savedDocs[0].status).toBe('APPROVED');
      expect(motoboyUpdates).toHaveLength(1);
      expect(motoboyUpdates[0].patch).toMatchObject({ status: 'ACTIVE' });
    });

    it('does NOT activate for a manual CNH doc (regression preservada)', async () => {
      savedDocs[0] = {
        id: 'doc-2',
        motoboyId: 'motoboy-1',
        docType: 'CNH',
        status: 'PENDING',
        metadata: {},
      };
      await service.platformReviewDocument('motoboy-1', 'doc-2', 'admin-1', 'APPROVED');
      expect(savedDocs[0].status).toBe('APPROVED');
      expect(motoboyUpdates).toHaveLength(0);
    });
  });
});
