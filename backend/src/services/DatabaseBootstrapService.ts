import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { LoggerService } from '../utils/logger';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

@Provide(Tokens.Common.Service.AppConfigurationService)
export class DatabaseBootstrapService {
  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly logger: LoggerService
  ) {}

  private qIdent(name: string): string {
    return `"${String(name).replace(/"/g, '""')}"`;
  }

  public async ensureDatabaseExists(): Promise<void> {
    const conn = env.database;
    const adminDb = 'postgres';
    const client = new Client({
      host: conn.host,
      port: conn.port,
      user: conn.username,
      password: conn.password,
      database: adminDb,
    });

    try {
      await client.connect();
      const dbName = conn.database;
      const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      
      if (exists.rowCount && exists.rowCount > 0) {
        return;
      }

      this.logger.warn('Database missing. Creating...', { database: dbName });
      await client.query(`CREATE DATABASE ${this.qIdent(dbName)} OWNER ${this.qIdent(conn.username)};`);
      this.logger.info('Database created', { database: dbName });
    } catch (error: any) {
      this.logger.error('Error ensuring database exists:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      await client.end().catch(() => {});
    }
  }

  public async ensureBaseSchema(dataSource: DataSource): Promise<void> {
    const result = await dataSource.query(`SELECT to_regclass('public.users') AS users_table;`);
    const exists = result?.[0]?.users_table;
    if (exists) return;

    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      this.logger.warn('schema.sql not found, skipping bootstrap', { schemaPath });
      return;
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');
    if (!sql.trim()) return;

    this.logger.warn('Base tables missing. Applying schema.sql...', { schemaPath });
    await dataSource.query(sql);
    this.logger.info('schema.sql applied');
  }
}
