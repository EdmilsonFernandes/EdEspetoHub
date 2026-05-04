import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const DB_NAME = process.env.PGDATABASE || 'espetinho_test';

export async function setup() {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres',
  });
  await client.connect();

  // Kill connections and recreate DB
  await client.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid()
  `);
  await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
  await client.query(`CREATE DATABASE "${DB_NAME}"`);
  await client.end();

  // Apply schema to fresh DB
  const schemaClient = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: DB_NAME,
  });
  await schemaClient.connect();
  await schemaClient.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await schemaClient.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    await schemaClient.query(sql);
  }
  await schemaClient.end();
}
