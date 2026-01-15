/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: resetDatabase.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Executes reset logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
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
