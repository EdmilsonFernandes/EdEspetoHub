import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Tokens } from '../ioc/injectiontokens';
import { Provide } from '../ioc/ioc';

@Provide(Tokens.Common.DataLayer.DatabaseService)
export class DatabaseService {
  private _dataSource: DataSource;

  constructor() {
    this._dataSource = AppDataSource;
  }

  public async initialize(): Promise<void> {
    if (!this._dataSource.isInitialized) {
      try {
        await this._dataSource.initialize();
        console.log('📦 Database connection initialized');
      } catch (error) {
        console.error('❌ Error during Database initialization:', error);
        throw error;
      }
    }
  }

  public get dataSource(): DataSource {
    return this._dataSource;
  }
}
