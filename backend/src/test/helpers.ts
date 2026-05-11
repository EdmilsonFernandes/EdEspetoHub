import supertest from 'supertest';
import { createApp } from './createApp';
import { AppDataSource } from '../config/database';

export const app = createApp();
export const api = supertest(app);

let counter = 0;
const uid = () => `t${Date.now()}${++counter}`;

/** Generate a valid CPF with check digits */
function generateCpf(): string {
  const digits: number[] = [];
  for (let i = 0; i < 9; i++) digits.push(Math.floor(Math.random() * 9) + 1);
  // first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  digits.push(mod);
  // second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  digits.push(mod);
  return digits.join('');
}

/** Generate unique test email */
export const testEmail = (prefix = 'user') => `${prefix}-${uid()}@test.local`;

/** Register a store owner (lojista) and return token + store */
export async function registerStore(overrides: Record<string, unknown> = {}) {
  const email = testEmail('lojista');
  const password = 'Test@123456';
  const res = await api.post('/api/auth/register').send({
    fullName: 'Loja Teste',
    email,
    password,
    phone: `119${uid().slice(-8)}`,
    document: generateCpf(),
    documentType: 'CPF',
    storeName: `Loja ${uid()}`,
    termsAccepted: true,
    lgpdAccepted: true,
    planId: 'test-plan-7days',
    address: { street: 'Rua Teste', number: '100', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
    ...overrides,
  });
  return { res, email, password, body: res.body };
}

/** Login as admin (lojista) and return token + store */
export async function loginAdmin(email: string, password: string) {
  const res = await api.post('/api/auth/admin-login').send({ email, password });
  return { res, token: res.body?.token, store: res.body?.store, user: res.body?.user };
}

/** Login as motoboy using email or username */
export async function loginMotoboy(identifier: string, password: string) {
  const res = await api.post('/api/auth/login').send({ email: identifier, password });
  return { res, token: res.body?.token, motoboy: res.body?.motoboy, user: res.body?.user };
}

/** Register a motoboy and return response */
export async function registerMotoboy(overrides: Record<string, unknown> = {}) {
  const email = testEmail('motoboy');
  const password = 'Test@123456';
  const res = await api.post('/api/auth/register').send({
    fullName: 'Motoboy Teste',
    email,
    password,
    phone: `119${uid().slice(-8)}`,
    document: generateCpf(),
    documentType: 'CPF',
    accountType: 'MOTOBOY',
    termsAccepted: true,
    lgpdAccepted: true,
    ...overrides,
  });
  return { res, email, password, body: res.body };
}

/** Register a customer and return response */
export async function registerCustomer(overrides: Record<string, unknown> = {}) {
  const email = testEmail('cliente');
  const password = 'Test@123456';
  const res = await api.post('/api/customer/auth/register').send({
    name: 'Cliente Teste',
    email,
    password,
    ...overrides,
  });
  return { res, email, password, body: res.body };
}

/** Login as customer */
export async function loginCustomer(email: string, password: string) {
  const res = await api.post('/api/customer/auth/login').send({ email, password });
  return { res, token: res.body?.token, customer: res.body?.customer };
}

/** Activate a store subscription directly in DB (bypass payment) */
export async function activateSubscription(storeId: string) {
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  try {
    await qr.query(`
      UPDATE subscriptions SET status = 'ACTIVE', start_date = NOW(), end_date = NOW() + INTERVAL '30 days'
      WHERE store_id = $1
    `, [storeId]);
    await qr.query(`UPDATE stores SET open = true WHERE id = $1`, [storeId]);
  } finally {
    await qr.release();
  }
}

/** Expire a store subscription directly in DB */
export async function expireSubscription(storeId: string) {
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  try {
    await qr.query(`
      UPDATE subscriptions SET status = 'EXPIRED', end_date = NOW() - INTERVAL '1 day'
      WHERE store_id = $1
    `, [storeId]);
    await qr.query(`UPDATE stores SET open = false WHERE id = $1`, [storeId]);
  } finally {
    await qr.release();
  }
}

/** Verify email directly in DB */
export async function verifyEmailDirectly(email: string) {
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  try {
    await qr.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
  } finally {
    await qr.release();
  }
}

/** Seed globally approved KYC documents for a motoboy */
export async function seedApprovedMotoboyDocuments(motoboyId: string, docTypes: string[] = ['CNH', 'SELFIE']) {
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  try {
    for (const docType of docTypes) {
      await qr.query(
        `
        INSERT INTO motoboy_documents (id, motoboy_id, doc_type, file_key, status, uploaded_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'APPROVED', NOW())
        `,
        [motoboyId, docType, `tests/${motoboyId}/${String(docType).toLowerCase()}.jpg`]
      );
    }
  } finally {
    await qr.release();
  }
}

/** Clean specific tables between tests */
export async function cleanTables(tables: string[]) {
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  try {
    for (const t of tables) {
      await qr.query(`DELETE FROM "${t}"`);
    }
  } finally {
    await qr.release();
  }
}
