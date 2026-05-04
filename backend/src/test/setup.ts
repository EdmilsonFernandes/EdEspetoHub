// MUST run before any other import to ensure .env.test is loaded first
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import 'reflect-metadata';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const DB_NAME = process.env.PGDATABASE || 'espetinho_test';

async function ensureTestDb() {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres',
  });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
  if (!exists.rowCount) {
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
  }
  await client.end();
}

async function applySchema(ds: any) {
  const schemaPath = path.join(__dirname, '../../schema.sql');
  if (!fs.existsSync(schemaPath)) return;
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const qr = ds.createQueryRunner();
  await qr.connect();
  try { await qr.query(sql); } catch { /* already applied */ }
  finally { await qr.release(); }
}

let dataSource: any;

export async function setup() {
  await ensureTestDb();
  // Import AFTER env is loaded
  const { AppDataSource } = await import('../config/database');
  const { runMigrations } = await import('../utils/runMigrations');
  dataSource = AppDataSource;
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await applySchema(AppDataSource);
  await runMigrations();
}

export async function teardown() {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
}

beforeAll(async () => { await setup(); }, 60_000);
afterAll(async () => { await teardown(); });
