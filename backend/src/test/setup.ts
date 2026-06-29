// MUST run before any other import to ensure .env.test is loaded first
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

const testEmailDomains = new Set([
  ...(process.env.ALLOWLISTED_EMAIL_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean),
  'test.local',
  'example.com',
]);
process.env.ALLOWLISTED_EMAIL_DOMAINS = Array.from(testEmailDomains).join(',');

import 'reflect-metadata';

let dataSource: any;

export async function setup() {
  const { AppDataSource } = await import('../config/database');
  const { runMigrations } = await import('../utils/runMigrations');
  dataSource = AppDataSource;
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try { await runMigrations(); } catch { /* migrations already applied */ }
}

export async function teardown() {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
}

beforeAll(async () => { await setup(); }, 60_000);
afterAll(async () => { await teardown(); });
