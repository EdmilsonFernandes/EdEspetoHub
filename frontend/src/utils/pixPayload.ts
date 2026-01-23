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

const toAscii = (value: string) => {
  if (!value) return '';
  if (value.normalize) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return value;
};

const sanitizeText = (value: string, max = 25) =>
  toAscii(value)
    .replace(/[^A-Za-z0-9 \\-\\._]/g, '')
    .trim()
    .slice(0, max);

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
  const safeName = sanitizeText(name || 'CHAMA NO ESPETO', 25);
  const safeCity = sanitizeText(city || 'BRASIL', 15);
  const safeTxId = sanitizeText(txid || 'PEDIDO', 25) || 'PEDIDO';
  const amountValue = formatAmount(amount);

  const merchantAccount =
    formatField('00', 'br.gov.bcb.pix') + formatField('01', key);

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
  const checksum = crc16(`${payload}6304`);

  return `${payload}6304${checksum}`;
};
