/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: dbBootstrap.ts
 * @Date: 2026-02-09
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import type { DataSource } from 'typeorm';
import { env } from '../config/env';
import { logger } from './logger';

const log = logger.child({ scope: 'DbBootstrap' });

type PgConn = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

const qIdent = (name: string) => `"${String(name).replace(/"/g, '""')}"`;

/**
 * Ensures the target database exists. If it doesn't, creates it.
 * Uses an admin connection to the 'postgres' database.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-02-09
 */
export async function ensureDatabaseExists(conn: PgConn) {
  const adminDb = 'postgres';
  const client = new Client({
    host: conn.host,
    port: conn.port,
    user: conn.username,
    password: conn.password,
    database: adminDb,
  });

  await client.connect();
  try {
    const dbName = conn.database;
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount && exists.rowCount > 0) {
      return;
    }

    // CREATE DATABASE cannot run inside a transaction.
    log.warn('Database missing. Creating...', { database: dbName });
    await client.query(`CREATE DATABASE ${qIdent(dbName)} OWNER ${qIdent(conn.username)};`);
    log.info('Database created', { database: dbName });
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Applies schema.sql if base tables are missing. This is intentionally a "gambiarra"
 * to keep the stack booting even if the database is dropped.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-02-09
 */
export async function ensureBaseSchema(dataSource: DataSource) {
  // If users table exists, we consider the DB bootstrapped.
  const result = await dataSource.query(`SELECT to_regclass('public.users') AS users_table;`);
  const exists = result?.[0]?.users_table;
  if (exists) return;

  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    log.warn('schema.sql not found, skipping bootstrap', { schemaPath });
    return;
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  if (!sql.trim()) return;

  log.warn('Base tables missing. Applying schema.sql...', { schemaPath });
  await dataSource.query(sql);
  log.info('schema.sql applied');
}

export function getEnvDbConn(): PgConn {
  return {
    host: env.database.host,
    port: env.database.port,
    username: env.database.username,
    password: env.database.password,
    database: env.database.database,
  };
}

