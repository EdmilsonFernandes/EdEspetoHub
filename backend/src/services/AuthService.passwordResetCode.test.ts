import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { AuthService } from './AuthService';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';

const originalGetRepository = AppDataSource.getRepository.bind(AppDataSource);
const originalTransaction = AppDataSource.transaction.bind(AppDataSource);

afterAll(() => {
  (AppDataSource as any).getRepository = originalGetRepository;
  (AppDataSource as any).transaction = originalTransaction;
});

describe('AuthService — password reset by code', () => {
  let service: any;
  let sentCode: string;
  let sentLink: string;
  let savedUser: any;
  let resetRecords: any[];

  const buildResetRepo = () => {
    const createBuilder = () => {
      const state: any = {};
      const builder: any = {
        update: () => { state.mode = 'update'; return builder; },
        set: (payload: any) => { state.set = payload; return builder; },
        where: (_query: string, params: any) => {
          if (params?.userId) state.userId = params.userId;
          if (params?.tokenHash) state.tokenHash = params.tokenHash;
          return builder;
        },
        andWhere: (_query: string, params: any) => {
          if (params?.userId) state.userId = params.userId;
          if (params?.tokenHash) state.tokenHash = params.tokenHash;
          return builder;
        },
        leftJoinAndSelect: () => builder,
        orderBy: () => builder,
        addOrderBy: () => builder,
        getOne: async () => {
          const active = resetRecords.filter((row) => !row.usedAt);
          if (state.tokenHash) {
            return active.find((row) => row.tokenHash === state.tokenHash && row.user?.id === state.userId) || null;
          }
          if (state.userId) {
            return active
              .filter((row) => row.user?.id === state.userId)
              .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0] || null;
          }
          return null;
        },
        execute: async () => {
          if (state.mode === 'update' && state.userId) {
            resetRecords.forEach((row) => {
              if (row.user?.id === state.userId && !row.usedAt) {
                Object.assign(row, state.set || {});
              }
            });
          }
          return undefined;
        },
      };
      return builder;
    };

    return {
      create: (payload: any) => ({
        id: `reset-${resetRecords.length + 1}`,
        createdAt: new Date(Date.now() + resetRecords.length),
        usedAt: null,
        resendCount: 0,
        attemptsCount: 0,
        ...payload,
      }),
      save: async (payload: any) => {
        if (Array.isArray(payload)) {
          payload.forEach((row) => resetRecords.push(row));
          return payload;
        }
        const index = resetRecords.findIndex((row) => row.id === payload.id);
        if (index >= 0) resetRecords[index] = payload;
        else resetRecords.push(payload);
        return payload;
      },
      createQueryBuilder: createBuilder,
    };
  };

  beforeEach(async () => {
    service = new AuthService();
    sentCode = '';
    sentLink = '';
    resetRecords = [];
    savedUser = {
      id: 'user-1',
      fullName: 'Cliente Teste',
      email: 'cliente@example.com',
      password: await bcrypt.hash('old-password', 10),
      userRole: 'CUSTOMER',
      mustChangePassword: true,
    };

    service.userRepository = {
      findByEmail: async (email: string) => (String(email).toLowerCase() === savedUser.email ? savedUser : null),
    };
    service.emailService = {
      sendPasswordReset: async (_email: string, link: string, code: string) => {
        sentLink = link;
        sentCode = code;
      },
    };

    const resetRepo = buildResetRepo();
    (AppDataSource as any).getRepository = () => resetRepo;
    (AppDataSource as any).transaction = async (callback: any) => callback({
      save: async (entity: any) => entity,
      createQueryBuilder: () => resetRepo.createQueryBuilder(),
    });
  });

  it('sends a 6-digit code and keeps a link fallback', async () => {
    const result = await service.requestPasswordReset('cliente@example.com', { ipAddress: '127.0.0.1' });

    expect(result.code).toBe('AUTH-S001');
    expect(sentCode).toMatch(/^\d{6}$/);
    expect(sentLink).toContain('/reset-password?token=');
    expect(sentLink).toContain('perfil=cliente');
    expect(resetRecords).toHaveLength(2);
  });

  it('updates password with a valid code and invalidates active resets', async () => {
    await service.requestPasswordReset('cliente@example.com', { ipAddress: '127.0.0.1' });

    const result = await service.resetPasswordWithCode('cliente@example.com', sentCode, 'new-password');

    expect(result.code).toBe('AUTH-S003');
    await expect(bcrypt.compare('new-password', savedUser.password)).resolves.toBe(true);
    expect(savedUser.mustChangePassword).toBe(false);
    expect(resetRecords.every((row) => row.usedAt)).toBe(true);
  });

  it('increments attempts when the code is invalid', async () => {
    await service.requestPasswordReset('cliente@example.com', { ipAddress: '127.0.0.1' });

    await expect(service.resetPasswordWithCode('cliente@example.com', '000000', 'new-password')).rejects.toThrow(AppError);

    const latest = resetRecords.filter((row) => !row.usedAt).sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
    expect(latest.attemptsCount).toBe(1);
  });
});
