/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: documents.ts
 * @Date: 2026-01-08
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

/**
 * Executes only digits logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
const onlyDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Checks repeated.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
const isRepeated = (value: string) => /^(\d)\1+$/.test(value);

/**
 * Executes validate cpf logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
const validateCpf = (cpf: string) => {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || isRepeated(digits)) return false;
  const numbers = digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += numbers[i] * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== numbers[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += numbers[i] * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === numbers[10];
};

/**
 * Executes validate cnpj logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
const validateCnpj = (cnpj: string) => {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14 || isRepeated(digits)) return false;
  const numbers = digits.split('').map(Number);
  /**
   * Executes calc logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-08
   */
  const calc = (base: number[]) => {
    let sum = 0;
    let factor = 2;
    for (let i = base.length - 1; i >= 0; i -= 1) {
      sum += base[i] * factor;
      factor = factor === 9 ? 2 : factor + 1;
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const digit1 = calc(numbers.slice(0, 12));
  if (digit1 !== numbers[12]) return false;
  const digit2 = calc(numbers.slice(0, 13));
  return digit2 === numbers[13];
};

/**
 * Normalizes document.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
export const normalizeDocument = (value?: string) => (value ? onlyDigits(value) : '');

/**
 * Executes validate document logic.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-08
 */
export const validateDocument = (value: string, type: string) => {
  const normalizedType = (type || '').toUpperCase();
  if (normalizedType === 'CPF') return validateCpf(value);
  if (normalizedType === 'CNPJ') return validateCnpj(value);
  return false;
};
