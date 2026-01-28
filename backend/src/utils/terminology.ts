/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: terminology.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

const ROLE_ALIASES: Record<string, string> = {
  CHURRASQUEIRO: 'OPERATOR',
  ADMIN: 'MANAGER',
};

/**
 * Normalizes role labels to internal generic terminology.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-28
 */
export function normalizeRole(role?: string | null) {
  if (!role) return null;
  const key = role.toUpperCase();
  return ROLE_ALIASES[ key ] || key;
}
