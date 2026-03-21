/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: swagger.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';
import path from 'path';

const isTs = !__dirname.includes('dist');
const extension = isTs ? 'ts' : 'js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chama no Espeto API',
      version: '1.0.0',
      description: 'API para gestão de pedidos, produtos e lojas.',
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api/v1`,
        description: 'Servidor Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Path to the API docs
  apis: [path.join(__dirname, '..', 'controllers', `*.${extension}`)],
};

export const swaggerDocument = swaggerJsdoc(options);
export const swaggerSpec = swaggerDocument;
