/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CreateUserDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  storeName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
}