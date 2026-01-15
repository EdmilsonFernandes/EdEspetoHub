/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: paymentAssets.ts
 * @Date: 2026-01-13
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */
import { resolveAssetUrl } from './resolveAssetUrl';

const normalize = (value?: string) =>
  (value || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  debito: 'Débito',
  debit: 'Débito',
  credito: 'Crédito',
  credit: 'Crédito',
  credit_card: 'Crédito',
  'credit-card': 'Crédito',
  boleto: 'Boleto',
};

const METHOD_ICONS: Record<string, string> = {
  pix: '/uploads/payment/pix.webp',
  debito: '/uploads/payment/credit-card.webp',
  debit: '/uploads/payment/credit-card.webp',
  credito: '/uploads/payment/credit-card.webp',
  credit: '/uploads/payment/credit-card.webp',
  credit_card: '/uploads/payment/credit-card.webp',
  'credit-card': '/uploads/payment/credit-card.webp',
};

const PROVIDER_LABELS: Record<string, string> = {
  mercado_pago: 'Mercado Pago',
  mercadopago: 'Mercado Pago',
};

const PROVIDER_ICONS: Record<string, string> = {
  mercado_pago: '/uploads/payment/mercado-pago.webp',
  mercadopago: '/uploads/payment/mercado-pago.webp',
};

export const getPaymentMethodMeta = (method?: string) => {
  const normalized = normalize(method);
  const label = METHOD_LABELS[normalized] || 'Não informado';
  const iconPath = METHOD_ICONS[normalized];

  return {
    label,
    icon: iconPath ? resolveAssetUrl(iconPath) : '',
  };
};

export const getPaymentProviderMeta = (provider?: string) => {
  const normalized = normalize(provider);
  const label = PROVIDER_LABELS[normalized] || provider || '-';
  const iconPath = PROVIDER_ICONS[normalized];

  return {
    label,
    icon: iconPath ? resolveAssetUrl(iconPath) : '',
  };
};
