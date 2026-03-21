import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Tokens } from '../ioc/injectiontokens';
import { Provide, container } from '../ioc/ioc';
import { MigrationService } from '../services/MigrationService';
import { DatabaseBootstrapService } from '../services/DatabaseBootstrapService';

@Provide(Tokens.Common.DataLayer.DatabaseService)
export class DatabaseService {
  private _dataSource: DataSource;

  constructor() {
    this._dataSource = AppDataSource;
  }

  public async initialize(): Promise<void> {
    try {
      // Lazy resolve to avoid circular dependencies
      const bootstrapService = container.get<DatabaseBootstrapService>(Tokens.Common.Service.AppConfigurationService);
      const migrationService = container.get<MigrationService>(Tokens.Common.Service.MigrationService);

      // 1. Ensure DB exists (using pg Client)
      await bootstrapService.ensureDatabaseExists();

      // 2. Initialize TypeORM DataSource
      if (!this._dataSource.isInitialized) {
        await this._dataSource.initialize();
        console.log('📦 Database connection initialized');
      }

      // 3. Ensure base schema (schema.sql)
      await bootstrapService.ensureBaseSchema(this._dataSource);

      // 4. Run migrations
      await migrationService.runMigrations();

    } catch (error) {
      console.error('❌ Error during Database initialization:', error);
      throw error;
    }
  }

  public get dataSource(): DataSource {
    return this._dataSource;
  }
}
