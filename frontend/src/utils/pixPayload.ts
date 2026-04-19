/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: pixPayload.ts
 * @Date: 2026-01-16
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */
const pad2 = (value: number) => value.toString().padStart(2, '0');

const isCPF = (cpf: string) => {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

const normalizePixKey = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, '');
  const digits = compact.replace(/\D/g, '');

  if (compact.includes('@')) return compact.toLowerCase();
  if (/^[0-9a-fA-F-]{32,36}$/.test(compact)) return compact.toLowerCase();
  
  if (digits.length === 14) return digits;
  if (digits.length === 11 && isCPF(digits)) return digits;

  if (digits.length >= 10 && digits.length <= 13) return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;

  return compact;
};

export const normalizePixCode = (value: string) =>
  String(value || '')
    .replace(/\s+/g, '')
    .trim();

const toAscii = (value: string) => {
  const str = String(value || '');
  const normalized = str.normalize
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : str
        .replace(/[àáâãä]/gi, 'a')
        .replace(/[èéêë]/gi, 'e')
        .replace(/[ìíîï]/gi, 'i')
        .replace(/[òóôõö]/gi, 'o')
        .replace(/[ùúûü]/gi, 'u')
        .replace(/[ýÿ]/gi, 'y')
        .replace(/[ñ]/gi, 'n')
        .replace(/[ç]/gi, 'c');
  return normalized.replace(/[^\x00-\x7F]/g, '');
};

const sanitizeText = (value: string, max = 25) => {
  const ascii = toAscii(value)
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  // Stop at the last complete word that fits — never cut mid-word
  const words = ascii.split(/\s+/).filter(Boolean);
  let result = '';
  for (const word of words) {
    if ((result + word).length <= max) result += word;
    else break;
  }
  return result || ascii.replace(/\s+/g, '').slice(0, max);
};

const formatField = (id: string, value: string) => `${id}${pad2(value.length)}${value}`;

const formatAmount = (amount?: number) => {
  if (!amount || Number.isNaN(amount)) return '';
  return amount.toFixed(2);
};

const crc16 = (payload: string) => {
  let result = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    result ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if ((result & 0x8000) !== 0) {
        result = ((result << 1) ^ 0x1021) & 0xffff;
      } else {
        result = (result << 1) & 0xffff;
      }
    }
  }
  return result.toString(16).toUpperCase().padStart(4, '0');
};

export const buildPixPayload = ({
  key,
  name,
  city,
  amount,
  txid,
}: {
  key: string;
  name?: string;
  city?: string;
  amount?: number;
  txid?: string;
}) => {
  const normalizedKey = normalizePixKey(key);
  const safeName = sanitizeText(name || 'CHAMA NO ESPETO', 25);
  const safeCity = sanitizeText(city || 'BRASIL', 25);
  const rawTxId = toAscii(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  const safeTxId = rawTxId || '***';
  const amountValue = formatAmount(amount);

  if (!normalizedKey) return '';

  const merchantAccount =
    formatField('00', 'br.gov.bcb.pix') + formatField('01', normalizedKey);

  const payloadParts = [
    formatField('00', '01'),
    formatField('26', merchantAccount),
    formatField('52', '0000'),
    formatField('53', '986'),
    amountValue ? formatField('54', amountValue) : '',
    formatField('58', 'BR'),
    formatField('59', safeName),
    formatField('60', safeCity),
    formatField('62', formatField('05', safeTxId)),
  ].filter(Boolean);

  const payload = payloadParts.join('');
  const payloadForCrc = `${payload}6304`;
  const checksum = crc16(payloadForCrc);

  return `${payloadForCrc}${checksum}`;
};
