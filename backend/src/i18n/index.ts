/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: index.ts
 * @Date: 2026-01-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request } from 'express';
import pt from './pt.json';
import en from './en.json';

const messages = {
  pt,
  en,
};

type Lang = keyof typeof messages;
/**
 * Handles normalize lang.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-12
 */
const normalizeLang = (value?: string | string[]) => {
  if (!value) return 'pt';
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw.split(',')[0]?.trim().toLowerCase();
  if (!normalized) return 'pt';
  if (normalized.startsWith('pt')) return 'pt';
  if (normalized.startsWith('en')) return 'en';
  return 'pt';
};
/**
 * Handles resolve lang.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-12
 */
export const resolveLang = (req: Request): Lang => {
  const header = (req.headers['x-lang'] as string | undefined) || req.headers['accept-language'];
  return normalizeLang(header) as Lang;
};
/**
 * Gets message.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-12
 */
export const getMessage = (code: string, lang: Lang = 'pt') => {
  const bundle = messages[lang] || messages.pt;
  return bundle[code as keyof typeof pt] || bundle['GEN-001'];
};