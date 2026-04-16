import crypto from 'crypto';
import { AuthService } from './AuthService';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';

const assert = (condition: any, message: string) => {
  if (!condition) throw new Error(message);
};

const expectAppError = async (fn: () => Promise<any>, code: string) => {
  try {
    await fn();
  } catch (error: any) {
    assert(error instanceof AppError, `Expected AppError for ${code}`);
    assert(error.code === code, `Expected code ${code}, got ${error.code}`);
    return;
  }
  throw new Error(`Expected error ${code}`);
};

(() => {
  const originalQuery = AppDataSource.query.bind(AppDataSource);
  const originalGetRepository = AppDataSource.getRepository.bind(AppDataSource);
  const originalTransaction = AppDataSource.transaction.bind(AppDataSource);

  const restore = () => {
    (AppDataSource as any).query = originalQuery;
    (AppDataSource as any).getRepository = originalGetRepository;
    (AppDataSource as any).transaction = originalTransaction;
  };

  const run = async () => {
    // --- Resend flow ---
    const resendService = new AuthService() as any;
    let sentStore = 0;
    let sentMotoboy = 0;

    resendService.userRepository = {
      findByEmail: async (email: string) => {
        if (email === 'none@example.com') return null;
        if (email === 'verified@example.com') return { id: 'u2', email, emailVerified: true, userRole: 'STORE_OWNER' };
        if (email === 'motoboy@example.com') return { id: 'u3', email, emailVerified: false, userRole: 'MOTOBOY' };
        return { id: 'u1', email, emailVerified: false, userRole: 'STORE_OWNER' };
      },
    };
    resendService.sendVerificationEmail = async () => { sentStore += 1; };
    resendService.sendMotoboyVerificationEmail = async () => { sentMotoboy += 1; };

    (AppDataSource as any).query = async (sql: string) => {
      if (sql.includes('count(*)::int')) return [{ count: 0 }];
      if (sql.includes('LIMIT 1')) return [];
      return [];
    };

    const r1 = await resendService.resendVerificationEmail('none@example.com', { ipAddress: '127.0.0.1' });
    assert(r1.code === 'AUTH-S002', 'resend should be generic when email is missing');

    const r2 = await resendService.resendVerificationEmail('verified@example.com', { ipAddress: '127.0.0.1' });
    assert(r2.code === 'AUTH-S002', 'verified user should keep generic resend response');

    const r3 = await resendService.resendVerificationEmail('store@example.com', { ipAddress: '127.0.0.1' });
    assert(r3.code === 'AUTH-S002', 'store resend should succeed');
    assert(sentStore === 1, 'store resend should trigger email');

    const r4 = await resendService.resendVerificationEmail('motoboy@example.com', { ipAddress: '127.0.0.1' });
    assert(r4.code === 'AUTH-S002', 'motoboy resend should succeed');
    assert(sentMotoboy === 1, 'motoboy resend should trigger email');

    // cooldown blocked
    (AppDataSource as any).query = async (sql: string) => {
      if (sql.includes('count(*)::int')) return [{ count: 0 }];
      if (sql.includes('LIMIT 1')) return [{ created_at: new Date() }];
      return [];
    };
    const r5 = await resendService.resendVerificationEmail('store@example.com', { ipAddress: '127.0.0.1' });
    assert(r5.code === 'AUTH-S002', 'cooldown block keeps generic message');
    assert(sentStore === 1, 'cooldown block should not send new email');

    // --- Verify flow ---
    const verifyService = new AuthService() as any;
    verifyService.storeRepository = { findByOwnerId: async () => null };
    let customerWelcomeSent = 0;
    verifyService.emailService = {
      sendCustomerWelcome: async () => {
        customerWelcomeSent += 1;
      },
    };

    const verification = {
      id: 'v1',
      tokenHash: crypto.createHash('sha256').update('valid-token').digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: { id: 'u1', email: 'verify@example.com', emailVerified: false },
    };

    (AppDataSource as any).getRepository = () => ({
      findOne: async ({ where }: any) => {
        if (where?.tokenHash === verification.tokenHash) return verification;
        return null;
      },
      createQueryBuilder: () => {
        const state: any = {};
        const builder: any = {
          leftJoinAndSelect: () => builder,
          where: (_q: string, params: any) => {
            state.tokenHash = params?.tokenHash;
            return builder;
          },
          andWhere: (_q: string, params: any) => {
            state.email = params?.email;
            return builder;
          },
          getOne: async () => {
            if (
              state.tokenHash === verification.tokenHash &&
              String(state.email || '').toLowerCase() === String(verification.user.email || '').toLowerCase()
            ) {
              return verification;
            }
            return null;
          },
        };
        return builder;
      },
    });
    (AppDataSource as any).transaction = async (callback: any) => callback({ save: async () => undefined });

    const ok = await verifyService.verifyEmail({ token: 'valid-token', email: 'verify@example.com' });
    assert(ok.code === 'AUTH-S004', 'verify should return success');
    assert(ok.redirectUrl === '/', 'non-customer verification without store should fallback to home');
    assert(verification.user.emailVerified === true, 'verify should activate user');
    assert(verification.usedAt !== null, 'verify should mark token as used');

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
          where: (_q: string, params: any) => {
            state.tokenHash = params?.tokenHash;
            return builder;
          },
          andWhere: (_q: string, params: any) => {
            state.email = params?.email;
            return builder;
          },
          getOne: async () => {
            if (
              state.tokenHash === customerVerification.tokenHash &&
              String(state.email || '').toLowerCase() === String(customerVerification.user.email || '').toLowerCase()
            ) {
              return customerVerification;
            }
            return null;
          },
        };
        return builder;
      },
    });

    const customerOk = await verifyService.verifyEmail({ token: 'customer-token', email: 'customer@example.com' });
    assert(customerOk.redirectUrl === '/cliente?mode=login&verified=1', 'customer verification should redirect to customer login');
    assert(customerWelcomeSent === 1, 'customer verification should send welcome email');

    await expectAppError(
      () => verifyService.verifyEmail({ token: 'valid-token', email: 'other@example.com' }),
      'AUTH-007'
    );

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
          where: (_q: string, params: any) => {
            state.tokenHash = params?.tokenHash;
            return builder;
          },
          andWhere: (_q: string, params: any) => {
            state.email = params?.email;
            return builder;
          },
          getOne: async () => {
            if (
              state.tokenHash === expired.tokenHash &&
              String(state.email || '').toLowerCase() === String(expired.user.email || '').toLowerCase()
            ) {
              return expired;
            }
            return null;
          },
        };
        return builder;
      },
    });
    await expectAppError(
      () => verifyService.verifyEmail({ token: 'expired-token', email: 'expired@example.com' }),
      'AUTH-007'
    );

    console.log('AuthService email verification tests passed');
  };

  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => {
      restore();
    });
})();
