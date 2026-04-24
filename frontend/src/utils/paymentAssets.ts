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
import mercadoPagoLogo from '../assets/mercado-pago-logo.svg';
import mercadoPagoHorizontal from '../assets/mercado-pago-horizontal.svg';

export { mercadoPagoHorizontal };

const normalize = (value?: string) =>
  (value || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  pix_loja: 'Pix da loja',
  'pix-loja': 'Pix da loja',
  pix_presencial: 'Pix',
  debito: 'Débito',
  debit: 'Débito',
  debito_presencial: 'Débito',
  credito: 'Crédito',
  credit: 'Crédito',
  credito_presencial: 'Crédito',
  credit_card: 'Crédito',
  'credit-card': 'Crédito',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  cash: 'Dinheiro',
};

const METHOD_ICONS: Record<string, string> = {
  pix: '/uploads/payment/pix.webp',
  pix_loja: '/uploads/payment/pix.webp',
  'pix-loja': '/uploads/payment/pix.webp',
  pix_presencial: '/uploads/payment/pix.webp',
  debito: '/uploads/payment/credit-card.webp',
  debit: '/uploads/payment/credit-card.webp',
  debito_presencial: '/uploads/payment/credit-card.webp',
  credito: '/uploads/payment/credit-card.webp',
  credit: '/uploads/payment/credit-card.webp',
  credito_presencial: '/uploads/payment/credit-card.webp',
  credit_card: '/uploads/payment/credit-card.webp',
  'credit-card': '/uploads/payment/credit-card.webp',
  dinheiro: '/uploads/payment/cash.svg',
  cash: '/uploads/payment/cash.svg',
};

const PROVIDER_LABELS: Record<string, string> = {
  mercado_pago: 'Mercado Pago',
  mercadopago: 'Mercado Pago',
};

const PROVIDER_ICONS: Record<string, string> = {
  mercado_pago: mercadoPagoLogo,
  mercadopago: mercadoPagoLogo,
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
