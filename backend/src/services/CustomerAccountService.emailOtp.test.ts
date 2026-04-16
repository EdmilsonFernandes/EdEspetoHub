import crypto from 'crypto';
import { CustomerAccountService } from './CustomerAccountService';
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
    return error;
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
    const service = new CustomerAccountService() as any;
    let sentCode = '';
    let welcomeSent = 0;

    service.emailService = {
      sendCustomerVerificationCode: async (_email: string, _name: string, code: string) => {
        sentCode = code;
      },
      sendCustomerWelcome: async () => {
        welcomeSent += 1;
      },
    };

    let userExists = false;
    const savedUser: any = {
      id: 'customer-1',
      fullName: 'Cliente OTP',
      email: 'cliente@example.com',
      password: 'hashed-password',
      userRole: 'CUSTOMER',
      emailVerified: false,
      createdAt: new Date(),
    };

    const otpRecords: any[] = [];

    (AppDataSource as any).query = async (sql: string) => {
      if (sql.includes('MAX(resend_count)')) return [{ max_count: otpRecords.length ? otpRecords.length : 0 }];
      if (sql.includes('count(*)::int')) return [{ count: 0 }];
      if (sql.includes('LIMIT 1')) return [];
      if (sql.includes('FROM customer_email_otps')) return [];
      return [];
    };

    const userRepo = {
      findOne: async ({ where }: any) => {
        if (where?.email === 'cliente@example.com') return userExists ? savedUser : null;
        return null;
      },
      create: (payload: any) => ({ ...payload }),
      save: async (payload: any) => {
        Object.assign(savedUser, payload);
        userExists = true;
        return savedUser;
      },
    };

    const otpRepo = {
      create: (payload: any) => ({ id: `otp-${otpRecords.length + 1}`, createdAt: new Date(), ...payload }),
      save: async (payload: any) => {
        if (!payload.id) {
          const created = { id: `otp-${otpRecords.length + 1}`, createdAt: new Date(), ...payload };
          otpRecords.unshift(created);
          return created;
        }
        const index = otpRecords.findIndex((row) => row.id === payload.id);
        if (index >= 0) {
          otpRecords[index] = payload;
        } else {
          otpRecords.unshift(payload);
        }
        return payload;
      },
      findOne: async () => otpRecords[0] || null,
      createQueryBuilder: () => {
        const builder: any = {
          update: () => builder,
          set: () => builder,
          where: () => builder,
          andWhere: () => builder,
          leftJoinAndSelect: () => builder,
          orderBy: () => builder,
          getOne: async () => otpRecords[0] || null,
          execute: async () => undefined,
        };
        return builder;
      },
    };

    (AppDataSource as any).getRepository = (entity: any) => {
      if (entity?.name === 'User') return userRepo;
      return otpRepo;
    };
    (AppDataSource as any).transaction = async (callback: any) => callback({ save: async () => undefined });

    const registerResult = await service.register({
      fullName: 'Cliente OTP',
      email: 'cliente@example.com',
      password: '123456',
      termsAccepted: true,
      lgpdAccepted: true,
    }, { ipAddress: '127.0.0.1' });

    assert(registerResult.next === 'VERIFY_EMAIL_CODE', 'register should request otp verification');
    assert(sentCode.length === 4, 'register should send a 4-digit code');

    await expectAppError(
      () => service.verifyEmailCode({ email: 'cliente@example.com', code: '0000' }),
      'GEN-002'
    );
    assert(Number(otpRecords[0]?.attemptsCount || 0) === 1, 'invalid code should increment attempts');

    const verifyResult = await service.verifyEmailCode({ email: 'cliente@example.com', code: sentCode });
    assert(verifyResult?.token, 'verify should authenticate customer after otp');
    assert(savedUser.emailVerified === true, 'verify should activate customer email');
    assert(welcomeSent === 1, 'verify should send welcome email');

    console.log('CustomerAccountService email otp tests passed');
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
