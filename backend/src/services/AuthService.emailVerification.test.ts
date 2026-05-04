import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { AuthService } from './AuthService';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';

const originalQuery = AppDataSource.query.bind(AppDataSource);
const originalGetRepository = AppDataSource.getRepository.bind(AppDataSource);
const originalTransaction = AppDataSource.transaction.bind(AppDataSource);

afterAll(() => {
  (AppDataSource as any).query = originalQuery;
  (AppDataSource as any).getRepository = originalGetRepository;
  (AppDataSource as any).transaction = originalTransaction;
});

describe('AuthService — email verification', () => {
  describe('resendVerificationEmail', () => {
    let service: any;
    let sentStore: number;
    let sentMotoboy: number;

    beforeEach(() => {
      service = new AuthService();
      sentStore = 0;
      sentMotoboy = 0;

      service.userRepository = {
        findByEmail: async (email: string) => {
          if (email === 'none@example.com') return null;
          if (email === 'verified@example.com') return { id: 'u2', email, emailVerified: true, userRole: 'STORE_OWNER' };
          if (email === 'motoboy@example.com') return { id: 'u3', email, emailVerified: false, userRole: 'MOTOBOY' };
          return { id: 'u1', email, emailVerified: false, userRole: 'STORE_OWNER' };
        },
      };
      service.sendVerificationEmail = async () => { sentStore += 1; };
      service.sendMotoboyVerificationEmail = async () => { sentMotoboy += 1; };

      (AppDataSource as any).query = async (sql: string) => {
        if (sql.includes('count(*)::int')) return [{ count: 0 }];
        if (sql.includes('LIMIT 1')) return [];
        return [];
      };
    });

    it('generic response when email not found', async () => {
      const r = await service.resendVerificationEmail('none@example.com', { ipAddress: '127.0.0.1' });
      expect(r.code).toBe('AUTH-S002');
    });

    it('generic response when already verified', async () => {
      const r = await service.resendVerificationEmail('verified@example.com', { ipAddress: '127.0.0.1' });
      expect(r.code).toBe('AUTH-S002');
    });

    it('sends store verification email', async () => {
      const r = await service.resendVerificationEmail('store@example.com', { ipAddress: '127.0.0.1' });
      expect(r.code).toBe('AUTH-S002');
      expect(sentStore).toBe(1);
    });

    it('sends motoboy verification email', async () => {
      const r = await service.resendVerificationEmail('motoboy@example.com', { ipAddress: '127.0.0.1' });
      expect(r.code).toBe('AUTH-S002');
      expect(sentMotoboy).toBe(1);
    });

    it('cooldown blocks new email', async () => {
      (AppDataSource as any).query = async (sql: string) => {
        if (sql.includes('count(*)::int')) return [{ count: 0 }];
        if (sql.includes('LIMIT 1')) return [{ created_at: new Date() }];
        return [];
      };
      const r = await service.resendVerificationEmail('store@example.com', { ipAddress: '127.0.0.1' });
      expect(r.code).toBe('AUTH-S002');
      expect(sentStore).toBe(0);
    });
  });

  describe('verifyEmail', () => {
    let service: any;
    let customerWelcomeSent: number;

    const verification = {
      id: 'v1',
      tokenHash: crypto.createHash('sha256').update('valid-token').digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null as Date | null,
      user: { id: 'u1', email: 'verify@example.com', emailVerified: false },
    };

    beforeEach(() => {
      service = new AuthService();
      customerWelcomeSent = 0;
      service.storeRepository = { findByOwnerId: async () => null };
      service.emailService = { sendCustomerWelcome: async () => { customerWelcomeSent += 1; } };

      verification.usedAt = null;
      verification.user.emailVerified = false;

      (AppDataSource as any).getRepository = () => ({
        findOne: async ({ where }: any) => {
          if (where?.tokenHash === verification.tokenHash) return verification;
          return null;
        },
        createQueryBuilder: () => {
          const state: any = {};
          const builder: any = {
            leftJoinAndSelect: () => builder,
            where: (_q: string, params: any) => { state.tokenHash = params?.tokenHash; return builder; },
            andWhere: (_q: string, params: any) => { state.email = params?.email; return builder; },
            getOne: async () => {
              if (state.tokenHash === verification.tokenHash && String(state.email || '').toLowerCase() === String(verification.user.email || '').toLowerCase()) return verification;
              return null;
            },
          };
          return builder;
        },
      });
      (AppDataSource as any).transaction = async (callback: any) => callback({ save: async () => undefined });
    });

    it('verifies email successfully', async () => {
      const ok = await service.verifyEmail({ token: 'valid-token', email: 'verify@example.com' });
      expect(ok.code).toBe('AUTH-S004');
      expect(ok.redirectUrl).toBe('/');
      expect(verification.user.emailVerified).toBe(true);
      expect(verification.usedAt).not.toBeNull();
    });

    it('customer verification redirects to customer login and sends welcome', async () => {
      const customerVerification = {
        id: 'v-customer',
        tokenHash: crypto.createHash('sha256').update('customer-token').digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        user: { id: 'u-customer', email: 'customer@example.com', fullName: 'Cliente Teste', emailVerified: false, userRole: 'CUSTOMER' },
      };

      (AppDataSource as any).getRepository = () => ({
        findOne: async ({ where }: any) => {
          if (where?.tokenHash === customerVerification.tokenHash) return customerVerification;
          return null;
        },
        createQueryBuilder: () => {
          const state: any = {};
          const builder: any = {
            leftJoinAndSelect: () => builder,
            where: (_q: string, params: any) => { state.tokenHash = params?.tokenHash; return builder; },
            andWhere: (_q: string, params: any) => { state.email = params?.email; return builder; },
            getOne: async () => {
              if (state.tokenHash === customerVerification.tokenHash && String(state.email || '').toLowerCase() === String(customerVerification.user.email || '').toLowerCase()) return customerVerification;
              return null;
            },
          };
          return builder;
        },
      });

      const ok = await service.verifyEmail({ token: 'customer-token', email: 'customer@example.com' });
      expect(ok.redirectUrl).toBe('/cliente?mode=login&verified=1');
      expect(customerWelcomeSent).toBe(1);
    });

    it('rejects token with wrong email', async () => {
      await expect(service.verifyEmail({ token: 'valid-token', email: 'other@example.com' })).rejects.toThrow(AppError);
      try {
        await service.verifyEmail({ token: 'valid-token', email: 'other@example.com' });
      } catch (e: any) {
        expect(e.code).toBe('AUTH-007');
      }
    });

    it('rejects expired token', async () => {
      const expired = {
        ...verification,
        usedAt: null,
        user: { id: 'u2', email: 'expired@example.com', emailVerified: false },
        expiresAt: new Date(Date.now() - 1_000),
        tokenHash: crypto.createHash('sha256').update('expired-token').digest('hex'),
      };

      (AppDataSource as any).getRepository = () => ({
        findOne: async ({ where }: any) => {
          if (where?.tokenHash === expired.tokenHash) return expired;
          return null;
        },
        createQueryBuilder: () => {
          const state: any = {};
          const builder: any = {
            leftJoinAndSelect: () => builder,
            where: (_q: string, params: any) => { state.tokenHash = params?.tokenHash; return builder; },
            andWhere: (_q: string, params: any) => { state.email = params?.email; return builder; },
            getOne: async () => {
              if (state.tokenHash === expired.tokenHash && String(state.email || '').toLowerCase() === String(expired.user.email || '').toLowerCase()) return expired;
              return null;
            },
          };
          return builder;
        },
      });

      await expect(service.verifyEmail({ token: 'expired-token', email: 'expired@example.com' })).rejects.toThrow(AppError);
    });
  });
});
