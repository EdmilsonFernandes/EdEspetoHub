/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: resetDatabase.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
/**
 * Handles reset.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
const reset = async () => {
  try {
    if (process.env.ALLOW_DB_RESET !== 'true') {
      logger.error('Refusing to reset database. Set ALLOW_DB_RESET=true to proceed.');
      process.exit(1);
    }

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
