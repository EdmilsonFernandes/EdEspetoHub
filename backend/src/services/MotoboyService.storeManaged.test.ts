import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyStore } from '../entities/MotoboyStore';
import { User } from '../entities/User';
import { MotoboyService } from './MotoboyService';

const originalTransaction = AppDataSource.transaction.bind(AppDataSource);

afterAll(() => {
  (AppDataSource as any).transaction = originalTransaction;
});

describe('MotoboyService — store managed courier flow', () => {
  let service: any;

  beforeEach(() => {
    service = new MotoboyService();
    service.logAudit = async () => undefined;
    service.notifyMotoboyByEmail = async () => undefined;
    service.notifyMotoboyByWhatsapp = async () => undefined;
  });

  it('creates user, motoboy profile and active store link for store-managed couriers', async () => {
    const created: Record<string, any> = {};
    const sentCredentials: any[] = [];

    service.storeRepository = {
      findByIdWithOwner: async () => ({
        id: 'store-1',
        name: 'Loja Teste',
        owner: { id: 'owner-1' },
      }),
    };
    service.emailService = {
      sendMotoboyStoreAccessCredentials: async (payload: any) => {
        sentCredentials.push(payload);
      },
    };

    (AppDataSource as any).transaction = async (callback: any) => {
      const userRepository = {
        findOne: async () => null,
        create: (data: any) => data,
        save: async (user: any) => {
          const saved = { id: 'user-1', ...user };
          created.user = saved;
          return saved;
        },
      };
      const motoboyRepository = {
        create: (data: any) => data,
        save: async (motoboy: any) => {
          const saved = { id: 'motoboy-1', ...motoboy };
          created.motoboy = saved;
          return saved;
        },
        findOne: async () => ({
          ...created.motoboy,
          user: created.user,
        }),
      };
      const linkRepository = {
        create: (data: any) => data,
        save: async (link: any) => {
          const saved = { id: 'link-1', ...link };
          created.link = saved;
          return saved;
        },
      };

      return callback({
        query: async () => [],
        getRepository: (entity: any) => {
          if (entity === User) return userRepository;
          if (entity === Motoboy) return motoboyRepository;
          if (entity === MotoboyStore) return linkRepository;
          throw new Error(`Unexpected repository request: ${String(entity?.name || entity)}`);
        },
      });
    };

    const result = await service.createProfile('store-1', 'owner-1', {
      fullName: 'Motoboy da Loja',
      email: 'MOTOBOY@EXAMPLE.COM',
      phone: '(11) 99888-7766',
      username: 'Moto.Loja',
      password: 'Temp@123',
    });

    expect(created.user).toMatchObject({
      fullName: 'Motoboy da Loja',
      email: 'motoboy@example.com',
      username: 'moto.loja',
      phone: '(11) 99888-7766',
      userRole: 'MOTOBOY',
      emailVerified: true,
      mustChangePassword: true,
    });
    expect(result).toMatchObject({
      createdAccount: true,
      credentialsEmailSent: true,
      temporaryPassword: 'Temp@123',
      user: {
        id: 'user-1',
        email: 'motoboy@example.com',
        username: 'moto.loja',
        mustChangePassword: true,
      },
      motoboy: {
        id: 'motoboy-1',
        status: 'ACTIVE',
        approvedByUserId: 'owner-1',
      },
      link: {
        id: 'link-1',
        storeId: 'store-1',
        motoboyId: 'motoboy-1',
        active: true,
      },
    });
    expect(sentCredentials).toHaveLength(1);
    expect(sentCredentials[0]).toMatchObject({
      email: 'motoboy@example.com',
      username: 'moto.loja',
      temporaryPassword: 'Temp@123',
      storeName: 'Loja Teste',
    });
  });

  it('creates store-managed courier without exposing a technical e-mail when e-mail is omitted', async () => {
    const created: Record<string, any> = {};
    const sentCredentials: any[] = [];

    service.storeRepository = {
      findByIdWithOwner: async () => ({
        id: 'store-1',
        name: 'Loja Teste',
        owner: { id: 'owner-1' },
      }),
    };
    service.emailService = {
      sendMotoboyStoreAccessCredentials: async (payload: any) => {
        sentCredentials.push(payload);
      },
    };

    (AppDataSource as any).transaction = async (callback: any) => {
      const userRepository = {
        findOne: async () => null,
        create: (data: any) => data,
        save: async (user: any) => {
          const saved = { id: 'user-1', ...user };
          created.user = saved;
          return saved;
        },
      };
      const motoboyRepository = {
        create: (data: any) => data,
        save: async (motoboy: any) => {
          const saved = { id: 'motoboy-1', ...motoboy };
          created.motoboy = saved;
          return saved;
        },
        findOne: async () => ({
          ...created.motoboy,
          user: created.user,
        }),
      };
      const linkRepository = {
        create: (data: any) => data,
        save: async (link: any) => {
          const saved = { id: 'link-1', ...link };
          created.link = saved;
          return saved;
        },
      };

      return callback({
        query: async () => [],
        getRepository: (entity: any) => {
          if (entity === User) return userRepository;
          if (entity === Motoboy) return motoboyRepository;
          if (entity === MotoboyStore) return linkRepository;
          throw new Error(`Unexpected repository request: ${String(entity?.name || entity)}`);
        },
      });
    };

    const result = await service.createProfile('store-1', 'owner-1', {
      fullName: 'Motoboy Sem Email',
      phone: '(11) 99888-7766',
      username: 'Moto.Sem.Email',
      password: 'Temp@123',
    });

    expect(created.user.email).toContain('@store-managed.janocaminho.local');
    expect(result).toMatchObject({
      createdAccount: true,
      credentialsEmailSent: false,
      user: {
        id: 'user-1',
        email: null,
        username: 'moto.sem.email',
        managedWithoutEmail: true,
        mustChangePassword: true,
      },
    });
    expect(sentCredentials).toHaveLength(0);
  });

  it('resets store-managed courier password and forces password change', async () => {
    const savedUsers: any[] = [];
    const sentCredentials: any[] = [];
    service.storeRepository = {
      findByIdWithOwner: async () => ({
        id: 'store-1',
        name: 'Loja Teste',
        owner: { id: 'owner-1' },
      }),
    };
    service.motoboyStoreRepository = {
      findActiveLink: async () => ({
        id: 'link-1',
        storeId: 'store-1',
        motoboyId: 'motoboy-1',
        active: true,
      }),
    };
    service.motoboyRepository = {
      findById: async () => ({
        id: 'motoboy-1',
        createdByUserId: 'owner-1',
        user: {
          id: 'user-1',
          fullName: 'Motoboy da Loja',
          email: 'motoboy@example.com',
          username: 'moto.loja',
          password: 'old',
          mustChangePassword: false,
        },
      }),
    };
    service.userRepository = {
      save: async (user: any) => {
        savedUsers.push(user);
        return user;
      },
    };
    service.emailService = {
      sendMotoboyStoreAccessCredentials: async (payload: any) => {
        sentCredentials.push(payload);
      },
    };

    const result = await service.resetStoreManagedPassword('store-1', 'motoboy-1', 'owner-1', 'Nova@123');

    expect(savedUsers).toHaveLength(1);
    expect(savedUsers[0].mustChangePassword).toBe(true);
    expect(savedUsers[0].password).not.toBe('old');
    expect(result).toMatchObject({
      temporaryPassword: 'Nova@123',
      credentialsEmailSent: true,
      user: {
        id: 'user-1',
        username: 'moto.loja',
        mustChangePassword: true,
      },
    });
    expect(sentCredentials[0]).toMatchObject({
      email: 'motoboy@example.com',
      username: 'moto.loja',
      temporaryPassword: 'Nova@123',
      storeName: 'Loja Teste',
    });
  });

  it('blocks store approval when KYC is not approved', async () => {
    service.storeRepository = {
      findByIdWithOwner: async () => ({
        id: 'store-1',
        owner: { id: 'owner-1' },
      }),
    };
    service.motoboyRepository = {
      findById: async () => ({
        id: 'motoboy-1',
        status: 'PENDING_VERIFICATION',
      }),
      save: async () => {
        throw new Error('save should not be called when KYC is pending');
      },
    };
    service.motoboyStoreRepository = {
      findActiveLink: async () => ({
        id: 'link-1',
        storeId: 'store-1',
        motoboyId: 'motoboy-1',
        active: true,
      }),
    };
    service.ensureMotoboyKycApproved = async () => {
      throw new AppError('MOTO-031', 409);
    };

    await expect(service.approveMotoboy('store-1', 'motoboy-1', 'owner-1')).rejects.toMatchObject({
      code: 'MOTO-031',
      status: 409,
    });
  });
});
