import { beforeAll, describe, expect, it } from 'vitest';
import { api } from '../helpers';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { UserIdentifier } from '../../entities/UserIdentifier';
import { userIdentityService } from '../../services/UserIdentityService';

const uid = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;

async function createUser(role = 'CUSTOMER', email = `uid-${uid()}@test.local`) {
  const repo = AppDataSource.getRepository(User);
  return repo.save(repo.create({ fullName: 'User Identity', email, password: 'x', userRole: role } as any));
}

describe('UserIdentityService (Fase A.1)', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });

  it('adiciona e resolve por email e por CPF (com máscara)', async () => {
    const user = await createUser();
    await userIdentityService.addIdentifier(user.id, 'EMAIL', user.email, true);
    await userIdentityService.addIdentifier(user.id, 'CPF', '111.222.333-44');

    const byEmail = await userIdentityService.resolveByIdentifier('EMAIL', user.email.toUpperCase());
    expect(byEmail?.user.id).toBe(user.id);
    expect(byEmail?.identifier.verified).toBe(true);

    const byCpf = await userIdentityService.resolveByIdentifier('CPF', '111.222.333-44');
    expect(byCpf?.user.id).toBe(user.id);
    expect(byCpf?.identifier.value).toBe('11122233344');

    expect(await userIdentityService.resolveByIdentifier('EMAIL', 'nope@nope.local')).toBeNull();
  });

  it('detecta o tipo do identificador pelo valor', () => {
    expect(userIdentityService.detectType('a@b.com')).toBe('EMAIL');
    expect(userIdentityService.detectType('12345678901')).toBe('CPF');
    expect(userIdentityService.detectType('12345678000199')).toBe('CNPJ');
  });

  it('resolveByAnyValue detecta e acha', async () => {
    const user = await createUser();
    await userIdentityService.addIdentifier(user.id, 'EMAIL', user.email);
    const found = await userIdentityService.resolveByAnyValue(user.email);
    expect(found?.user.id).toBe(user.id);
  });

  it('é idempotente — mesmo identificador 2x não duplica nem lança', async () => {
    const user = await createUser();
    await userIdentityService.addIdentifier(user.id, 'EMAIL', user.email);
    await userIdentityService.addIdentifier(user.id, 'EMAIL', user.email);
    const count = await AppDataSource.getRepository(UserIdentifier).count({ where: { userId: user.id, type: 'EMAIL' } });
    expect(count).toBe(1);
  });

  it('describeUser retorna nome e papéis atuais', async () => {
    const user = await createUser('STORE_OWNER');
    const desc = await userIdentityService.describeUser(user.id);
    expect(desc?.name).toBe('User Identity');
    expect(desc?.roles).toContain('STORE_OWNER');
  });

  it('dois users não podem ter o mesmo identificador (unique)', async () => {
    const a = await createUser();
    const b = await createUser();
    await userIdentityService.addIdentifier(a.id, 'CPF', '999.888.777-66');
    await userIdentityService.addIdentifier(b.id, 'CPF', '999.888.777-66'); // ignora (já é de A)
    const owner = await userIdentityService.resolveByIdentifier('CPF', '99988877766');
    expect(owner?.user.id).toBe(a.id); // continua apontando pro primeiro
  });

  it('GET /public/identity/lookup acha user por email e por CPF (com máscara)', async () => {
    const email = `lookup-${uid()}@test.local`;
    const user = await createUser('STORE_OWNER', email);
    await userIdentityService.addIdentifier(user.id, 'EMAIL', email);
    await userIdentityService.addIdentifier(user.id, 'CPF', '555.666.777-88');

    const byEmail = await api.get(`/api/public/identity/lookup?value=${encodeURIComponent(email.toUpperCase())}`);
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.exists).toBe(true);
    expect(byEmail.body.name).toBe('User Identity');
    expect(byEmail.body.roles).toContain('STORE_OWNER');

    const byCpf = await api.get(`/api/public/identity/lookup?value=${encodeURIComponent('555.666.777-88')}`);
    expect(byCpf.body.exists).toBe(true);

    const none = await api.get(`/api/public/identity/lookup?value=nope-${uid()}@test.local`);
    expect(none.body.exists).toBe(false);
  });
});
