/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: terminology.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

const ROLE_ALIASES: Record<string, string> = {
  LOJISTA: 'OPERATOR',
  ADMIN: 'MANAGER',
};

/**
 * Normalizes role labels to internal generic terminology.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-28
 */
export function normalizeRole(role?: string | null) {
  if (!role) return null;
  const key = role.toUpperCase();
  return ROLE_ALIASES[ key ] || key;
}
