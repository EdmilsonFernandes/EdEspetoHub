import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';

const reset = async () => {
  try {
    logger.info('Initializing data source');
    const dataSource = await AppDataSource.initialize();

    logger.info('Dropping existing schema');
    await dataSource.dropDatabase();

    logger.info('Synchronizing entities');
    await dataSource.synchronize();

    logger.info('Database reset completed');
    await dataSource.destroy();
  } catch (error) {
    logger.error('Failed to reset database schema', { error });
    process.exit(1);
  }
};

reset();
