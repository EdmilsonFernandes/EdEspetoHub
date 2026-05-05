/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: imageStorage.ts
 * @Date: 2025-12-22
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import fs from 'fs/promises';
import {
  ensureLocalUploadDir,
  inferContentTypeFromFilename,
  resolveLocalUploadPath,
  resolveUploadRelativePath,
  shouldWritePublicUploadToS3,
  shouldWriteUploadToLocal,
  uploadPublicObjectToS3,
} from './objectStorage';

export const saveBase64Image = async (
  data?: string | null,
  prefix = 'logo',
  folder = 'logos'
): Promise<string | undefined> => {
  if (!data) return undefined;

  const base64Content = data.replace(/^data:[^;]+;base64,/, '');
  const mimeMatch = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const extension = mimeMatch?.[1]?.split('/')?.[1] || 'png';

  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  const buffer = Buffer.from(base64Content, 'base64');
  const relativePath = resolveUploadRelativePath(folder, filename);

  if (shouldWriteUploadToLocal(folder)) {
    await ensureLocalUploadDir(folder);
    await fs.writeFile(resolveLocalUploadPath(relativePath), buffer);
  }

  if (shouldWritePublicUploadToS3(folder)) {
    await uploadPublicObjectToS3(relativePath, buffer, inferContentTypeFromFilename(filename));
  }

  return relativePath;
};
