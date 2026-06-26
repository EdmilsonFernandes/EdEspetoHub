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

  it('user_documents: adiciona, resolve e é idempotente (Fase B)', async () => {
    const user = await createUser();
    await userIdentityService.addDocument(user.id, 'CPF', '123.456.789-00');
    await userIdentityService.addDocument(user.id, 'CPF', '123.456.789-00', null, true); // idempotente

    const docs = await userIdentityService.getDocuments(user.id);
    expect(docs.length).toBe(1);
    expect(docs[0].value).toBe('12345678900');

    const resolved = await userIdentityService.resolveByDocument('CPF', '12345678900');
    expect(resolved?.user.id).toBe(user.id);

    const byMasked = await userIdentityService.resolveByDocument('CPF', '123.456.789-00');
    expect(byMasked?.user.id).toBe(user.id);

    expect(await userIdentityService.resolveByDocument('CPF', '99999999999')).toBeNull();
  });

  it('user_documents: CPF e CNPJ convivem no mesmo user (Fase B)', async () => {
    const user = await createUser();
    await userIdentityService.addDocument(user.id, 'CPF', '11122233344');
    await userIdentityService.addDocument(user.id, 'CNPJ', '11222333000144');
    const docs = await userIdentityService.getDocuments(user.id);
    expect(docs.map((d) => d.type).sort()).toEqual(['CNPJ', 'CPF']);
  });

  it('whitelabel: user pode ter vários papéis (listRolesForUser, addRole, hasRole) — Fase C', async () => {
    const user = await createUser('CUSTOMER');
    // adiciona o papel CUSTOMER (no fluxo real o write-hook do register faria isso)
    // + mais dois papéis pra validar multi-papel.
    await userIdentityService.addRole(user.id, 'CUSTOMER');
    await userIdentityService.addRole(user.id, 'PARTNER', { type: 'DESTINATION_PARTNER_ACCOUNT', id: '11111111-1111-1111-1111-111111111111' });
    await userIdentityService.addRole(user.id, 'MOTOBOY');
    await userIdentityService.addRole(user.id, 'PARTNER', { type: 'DESTINATION_PARTNER_ACCOUNT', id: '11111111-1111-1111-1111-111111111111' }); // idempotente

    const roles = await userIdentityService.listRolesForUser(user.id);
    expect(roles.sort()).toEqual(['CUSTOMER', 'MOTOBOY', 'PARTNER']);
    expect(await userIdentityService.hasRole(user.id, 'PARTNER')).toBe(true);
    expect(await userIdentityService.hasRole(user.id, 'SUPER_ADMIN')).toBe(false);

    const desc = await userIdentityService.describeUser(user.id);
    expect(desc?.roles.sort()).toEqual(['CUSTOMER', 'MOTOBOY', 'PARTNER']);
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
