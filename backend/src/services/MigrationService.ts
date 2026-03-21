import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';
import { LoggerService } from '../utils/logger';

@Provide(Tokens.Common.Service.MigrationService)
export class MigrationService {
  constructor(
    @Inject(Tokens.Common.DataLayer.DatabaseService) private readonly databaseService: DatabaseService,
    @Inject(Tokens.Utils.LoggerService) private readonly logger: LoggerService
  ) {}

  public async runMigrations(): Promise<void> {
    this.logger.info('Running database migrations...');
    const queryRunner = this.databaseService.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      
      // List of migrations to run
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]';`);
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';`);
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS order_types JSONB DEFAULT '["delivery","pickup","table"]';`);
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS description TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS pix_key TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS contact_email TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS store_settings ADD COLUMN IF NOT EXISTS promo_message TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS table_number TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS order_items ADD COLUMN IF NOT EXISTS cooking_point TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS order_items ADD COLUMN IF NOT EXISTS pass_skewer BOOLEAN DEFAULT FALSE;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);`);
      await queryRunner.query(`ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS promo_active BOOLEAN NOT NULL DEFAULT FALSE;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS plans ADD COLUMN IF NOT EXISTS display_name TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS plans ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);`);
      await queryRunner.query(`ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS qr_code_text TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS document TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS document_type TEXT;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;`);
      await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS lgpd_accepted_at TIMESTAMPTZ;`);
      
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);`);
      await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_unique ON users (document) WHERE document IS NOT NULL;`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_stores_name_unique;`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);`);
      await queryRunner.query(`ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'PIX';`);
      await queryRunner.query(`ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS reminder_stage INT DEFAULT 0;`);
      
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS platform_admins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      await queryRunner.query(`
        INSERT INTO platform_admins (username, password_hash)
        SELECT 'chamanoespetoadmin', crypt('chamanoespeto2026#!', gen_salt('bf'))
        WHERE NOT EXISTS (
          SELECT 1 FROM platform_admins WHERE username = 'chamanoespetoadmin'
        );
      `);
      
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          store_id UUID,
          role TEXT NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          status INT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_access_logs_role ON access_logs(role);`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_access_logs_store_id ON access_logs(store_id);`);

      this.logger.info('Database migrations completed successfully.');
    } catch (error: any) {
      this.logger.error('Error during database migrations:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
