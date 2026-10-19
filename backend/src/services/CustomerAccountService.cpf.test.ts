import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { CustomerAccountService } from './CustomerAccountService';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';

/**
 * CPF da conta do cliente (19/10): updateMe grava em users.document/documentType
 * (colunas já existentes — 25 users já têm documento). Finalidade: Asaas exige
 * CPF no customer p/ PIX de plataforma; sem CPF o checkout segue pelo OpenPix.
 * Vazio = limpar. Checksum validado com validateDocument (mesma régua do AuthService).
 */

const originalGetRepository = AppDataSource.getRepository.bind(AppDataSource);

afterAll(() => {
  (AppDataSource as any).getRepository = originalGetRepository;
});

describe('CustomerAccountService.updateMe — CPF', () => {
  let service: CustomerAccountService;
  let user: any;

  beforeEach(() => {
    service = new CustomerAccountService();
    user = {
      id: 'customer-1',
      fullName: 'Cliente Teste',
      email: 'cliente@x.com',
      password: 'hashed',
      phone: '11999999999',
    };
    (AppDataSource as any).getRepository = () => ({
      findOne: async ({ where }: any) => (where?.id === 'customer-1' ? user : null),
      save: async (u: any) => u,
    }) as any;
  });

  it('grava CPF válido (com máscara) como document digits + documentType CPF', async () => {
    const result: any = await service.updateMe('customer-1', { cpf: '111.444.777-35' });
    expect(user.document).toBe('11144477735');
    expect(user.documentType).toBe('CPF');
    expect(result.cpf).toBe('11144477735');
  });

  it('rejeita CPF inválido (checksum) com GEN-002', async () => {
    await expect(service.updateMe('customer-1', { cpf: '11144477736' })).rejects.toMatchObject({
      code: 'GEN-002',
    } as any);
    expect(user.document).toBeUndefined();
  });

  it('rejeita CPF repetido (11111111111)', async () => {
    await expect(service.updateMe('customer-1', { cpf: '111.111.111-11' })).rejects.toBeInstanceOf(AppError);
  });

  it('string vazia limpa o documento', async () => {
    user.document = '11144477735';
    user.documentType = 'CPF';
    const result: any = await service.updateMe('customer-1', { cpf: '' });
    expect(user.document).toBeUndefined();
    expect(user.documentType).toBeUndefined();
    expect(result.cpf).toBeNull();
  });

  it('não toca no documento quando cpf não vem no payload', async () => {
    user.document = '11144477735';
    user.documentType = 'CPF';
    await service.updateMe('customer-1', { fullName: 'Novo Nome' });
    expect(user.document).toBe('11144477735');
    expect(user.fullName).toBe('Novo Nome');
  });

  it('sanitizeUser só expõe document como cpf quando documentType=CPF', async () => {
    user.document = '12345678000199';
    user.documentType = 'CNPJ';
    const result: any = await service.updateMe('customer-1', { fullName: 'Lojista X' });
    expect(result.cpf).toBeNull();
  });
});
