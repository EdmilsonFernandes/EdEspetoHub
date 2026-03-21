import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Tokens } from '../ioc/injectiontokens';
import { Provide, Inject } from '../ioc/ioc';
import { MigrationService } from '../services/MigrationService';
import { DatabaseBootstrapService } from '../services/DatabaseBootstrapService';

@Provide(Tokens.Common.DataLayer.DatabaseService)
export class DatabaseService {
  private _dataSource: DataSource;

  constructor(
    @Inject(Tokens.Common.Service.MigrationService) private readonly migrationService: MigrationService,
    @Inject(Tokens.Common.Service.AppConfigurationService) private readonly bootstrapService: DatabaseBootstrapService
  ) {
    this._dataSource = AppDataSource;
  }

  public async initialize(): Promise<void> {
    try {
      // 1. Ensure DB exists (using pg Client)
      await this.bootstrapService.ensureDatabaseExists();

      // 2. Initialize TypeORM DataSource
      if (!this._dataSource.isInitialized) {
        await this._dataSource.initialize();
        console.log('📦 Database connection initialized');
      }

      // 3. Ensure base schema (schema.sql)
      await this.bootstrapService.ensureBaseSchema(this._dataSource);

      // 4. Run migrations
      await this.migrationService.runMigrations();

    } catch (error) {
      console.error('❌ Error during Database initialization:', error);
      throw error;
    }
  }

  public get dataSource(): DataSource {
    return this._dataSource;
  }
}
