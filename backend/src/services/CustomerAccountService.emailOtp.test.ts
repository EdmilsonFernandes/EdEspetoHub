import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { CustomerAccountService } from './CustomerAccountService';
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

describe('CustomerAccountService — email OTP', () => {
  let service: any;
  let sentCode: string;
  let welcomeSent: number;
  let userExists: boolean;
  let savedUser: any;
  let otpRecords: any[];

  beforeEach(() => {
    service = new CustomerAccountService();
    sentCode = '';
    welcomeSent = 0;
    userExists = false;
    otpRecords = [];

    savedUser = {
      id: 'customer-1',
      fullName: 'Cliente OTP',
      email: 'cliente@example.com',
      password: 'hashed-password',
      userRole: 'CUSTOMER',
      emailVerified: false,
      createdAt: new Date(),
    };

    service.emailService = {
      sendCustomerVerificationCode: async (_email: string, _name: string, code: string) => { sentCode = code; },
      sendCustomerWelcome: async () => { welcomeSent += 1; },
    };

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
      save: async (payload: any) => { Object.assign(savedUser, payload); userExists = true; return savedUser; },
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
        if (index >= 0) otpRecords[index] = payload;
        else otpRecords.unshift(payload);
        return payload;
      },
      findOne: async () => otpRecords[0] || null,
      createQueryBuilder: () => {
        const builder: any = {
          update: () => builder, set: () => builder, where: () => builder,
          andWhere: () => builder, leftJoinAndSelect: () => builder, orderBy: () => builder,
          getOne: async () => otpRecords[0] || null, execute: async () => undefined,
        };
        return builder;
      },
    };

    (AppDataSource as any).getRepository = (entity: any) => {
      if (entity?.name === 'User') return userRepo;
      return otpRepo;
    };
    (AppDataSource as any).transaction = async (callback: any) => callback({ save: async () => undefined });
  });

  it('register requests OTP verification and sends 4-digit code', async () => {
    const result = await service.register({
      fullName: 'Cliente OTP', email: 'cliente@example.com', password: '123456',
      termsAccepted: true, lgpdAccepted: true,
    }, { ipAddress: '127.0.0.1' });

    expect(result.next).toBe('VERIFY_EMAIL_CODE');
    expect(sentCode).toHaveLength(4);
  });

  it('invalid code increments attempts and throws', async () => {
    await service.register({
      fullName: 'Cliente OTP', email: 'cliente@example.com', password: '123456',
      termsAccepted: true, lgpdAccepted: true,
    }, { ipAddress: '127.0.0.1' });

    await expect(service.verifyEmailCode({ email: 'cliente@example.com', code: '0000' })).rejects.toThrow(AppError);
    expect(Number(otpRecords[0]?.attemptsCount || 0)).toBe(1);
  });

  it('valid code authenticates customer and sends welcome', async () => {
    await service.register({
      fullName: 'Cliente OTP', email: 'cliente@example.com', password: '123456',
      termsAccepted: true, lgpdAccepted: true,
    }, { ipAddress: '127.0.0.1' });

    const result = await service.verifyEmailCode({ email: 'cliente@example.com', code: sentCode });
    expect(result.token).toBeTruthy();
    expect(savedUser.emailVerified).toBe(true);
    expect(welcomeSent).toBe(1);
  });
});
