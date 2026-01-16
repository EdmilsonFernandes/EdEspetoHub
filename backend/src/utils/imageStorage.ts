/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: imageStorage.ts
 * @Date: 2025-12-22
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
/**
 * Handles resolve target dir.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-22
 */
const resolveTargetDir = (folder: string) => path.join(UPLOADS_DIR, folder);
/**
 * Ensures dir.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-22
 */
const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const saveBase64Image = async (
  data?: string | null,
  prefix = 'logo',
  folder = 'logos'
): Promise<string | undefined> => {
  if (!data) return undefined;

  const base64Content = data.replace(/^data:[^;]+;base64,/, '');
  const mimeMatch = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const extension = mimeMatch?.[1]?.split('/')?.[1] || 'png';

  const targetDir = resolveTargetDir(folder);
  await ensureDir(targetDir);

  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  const filePath = path.join(targetDir, filename);

  const buffer = Buffer.from(base64Content, 'base64');
  await fs.writeFile(filePath, buffer);

  return `/uploads/${folder}/${filename}`;
};