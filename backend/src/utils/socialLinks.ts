/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: socialLinks.ts
 * @Date: 2025-12-22
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

export interface SocialLink
{
  type: string;
  value: string;
}

/**
 * Handles sanitize social links.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-22
 */
export function sanitizeSocialLinks(input: unknown): SocialLink[]
{
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (l): l is SocialLink =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as any).type === 'string' &&
        typeof (l as any).value === 'string' &&
        (l as any).value.trim() !== '',
    );
}