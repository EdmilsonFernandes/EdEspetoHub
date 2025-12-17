import 'reflect-metadata';
import { AppDataSource } from '../config/database';

const reset = async () => {
  try {
    console.log('Initializing data source...');
    const dataSource = await AppDataSource.initialize();

    console.log('Dropping existing schema...');
    await dataSource.dropDatabase();

    console.log('Synchronizing entities...');
    await dataSource.synchronize();

    console.log('Database reset completed.');
    await dataSource.destroy();
  } catch (error) {
    console.error('Failed to reset database schema:', error);
    process.exit(1);
  }
};

reset();
