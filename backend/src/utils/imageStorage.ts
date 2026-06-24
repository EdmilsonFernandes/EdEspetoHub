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
import sharp from 'sharp';

const OPTIMIZE_MAX_WIDTH_BY_FOLDER: Record<string, number> = {
  logos: 512,
  motoboys: 512,
  customers: 512,
  payment: 768,
  products: 800,
  condominiums: 1024,
  destinations: 1280,
};
const OPTIMIZE_DEFAULT_MAX_WIDTH = 1024;
const OPTIMIZE_QUALITY = 80;
const OPTIMIZABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

/**
 * Otimiza a imagem (resize por pasta + compressão), mantendo o formato/ extensão.
 * Reduz bastante o payload (foto de celular 3000x4000 -> ~800px q80, ~10x menor).
 * Se NÃO for imagem otimizável (svg/gif/pdf…) ou se o sharp falhar, retorna o
 * buffer original (fallback gracioso — nunca quebra o upload).
 */
export const optimizeImageBuffer = async (
  buffer: Buffer,
  folder: string,
  extension: string
): Promise<Buffer> => {
  const rawExt = String(extension || '').toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  if (!OPTIMIZABLE_EXTENSIONS.has(ext)) return buffer;
  try {
    const maxWidth = OPTIMIZE_MAX_WIDTH_BY_FOLDER[folder] ?? OPTIMIZE_DEFAULT_MAX_WIDTH;
    const pipeline = sharp(buffer, { failOn: 'none' }).resize({
      width: maxWidth,
      height: maxWidth,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (ext === 'png') {
      return await pipeline.png({ quality: OPTIMIZE_QUALITY, compressionLevel: 9, palette: true }).toBuffer();
    }
    if (ext === 'webp') {
      return await pipeline.webp({ quality: OPTIMIZE_QUALITY }).toBuffer();
    }
    return await pipeline.jpeg({ quality: OPTIMIZE_QUALITY, progressive: true }).toBuffer();
  } catch {
    return buffer;
  }
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

  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  const buffer = Buffer.from(base64Content, 'base64');
  const optimized = await optimizeImageBuffer(buffer, folder, extension);
  const relativePath = resolveUploadRelativePath(folder, filename);

  if (shouldWriteUploadToLocal(folder)) {
    await ensureLocalUploadDir(folder);
    await fs.writeFile(resolveLocalUploadPath(relativePath), optimized);
  }

  if (shouldWritePublicUploadToS3(folder)) {
    await uploadPublicObjectToS3(relativePath, optimized, inferContentTypeFromFilename(filename));
  }

  return relativePath;
};
