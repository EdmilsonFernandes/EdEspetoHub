/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: index.ts
 * @Date: 2026-01-26
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mapsRouter from './routes/maps';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5050);
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/maps', mapsRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

app.listen(port, () => {
  console.log(`[maps] server running on port ${port}`);
});
