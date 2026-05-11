import bcrypt from 'bcryptjs';
import { describe, it, expect } from 'vitest';
import { AuthService } from './AuthService';

describe('AuthService — login aliases and password change', () => {
  it('accepts username as login identifier and returns mustChangePassword', async () => {
    const service: any = new AuthService();
    let receivedIdentifier = '';

    const passwordHash = await bcrypt.hash('Temp@123', 10);
    service.userRepository = {
      findByLoginIdentifier: async (identifier: string) => {
        receivedIdentifier = identifier;
        return {
          id: 'user-1',
          fullName: 'Motoboy da Loja',
          email: 'motoboy@example.com',
          username: 'moto.loja',
          phone: '11999998888',
          address: null,
          userRole: 'MOTOBOY',
          emailVerified: true,
          mustChangePassword: true,
          password: passwordHash,
          stores: [],
        };
      },
      save: async (user: any) => user,
    };

    const result = await service.login('  Moto.Loja  ', 'Temp@123');

    expect(receivedIdentifier).toBe('moto.loja');
    expect(result.token).toBeTruthy();
    expect(result.mustChangePassword).toBe(true);
    expect(result.user).toMatchObject({
      id: 'user-1',
      email: 'motoboy@example.com',
      username: 'moto.loja',
      role: 'MOTOBOY',
      mustChangePassword: true,
    });
    expect(result.store).toBeUndefined();
  });

  it('clears mustChangePassword when password is changed successfully', async () => {
    const service: any = new AuthService();
    const user = {
      id: 'user-2',
      password: await bcrypt.hash('Temp@123', 10),
      mustChangePassword: true,
    };
    let savedUser: any = null;

    service.userRepository = {
      findById: async (id: string) => (id === 'user-2' ? user : null),
      save: async (candidate: any) => {
        savedUser = { ...candidate };
        return candidate;
      },
    };

    const result = await service.changePassword('user-2', 'Temp@123', 'Nova@123');

    expect(result.code).toBe('AUTH-S005');
    expect(savedUser).not.toBeNull();
    expect(savedUser.mustChangePassword).toBe(false);
    expect(savedUser.password).not.toBe('Nova@123');
    expect(await bcrypt.compare('Nova@123', savedUser.password)).toBe(true);
  });
});
