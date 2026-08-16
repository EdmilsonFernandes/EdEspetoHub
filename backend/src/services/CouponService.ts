/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * @file: CouponService.ts
 * @Date: 2026-08-16
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { AppDataSource } from '../config/database';
import { Coupon } from '../entities/Coupon';
import { AppError } from '../errors/AppError';
import type { EntityManager } from 'typeorm';

export type CouponValidation = {
  valid: true;
  couponId: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discount: number;
  label: string;
};

export type CouponValidationResult = CouponValidation | { valid: false; reason: string };

export const normalizeCouponCode = (raw: unknown): string =>
  String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 40);

export const computeCouponDiscount = (coupon: Coupon, subtotal: number): number => {
  const base = Math.max(0, Number(subtotal || 0));
  const value = Math.max(0, Number(coupon.discountValue || 0));
  if (coupon.discountType === 'percent') {
    return Math.round(base * Math.min(100, value) * 0.01 * 100) / 100;
  }
  return Math.round(Math.min(base, value) * 100) / 100;
};

export const couponLabel = (coupon: Pick<Coupon, 'discountType' | 'discountValue'>): string =>
  coupon.discountType === 'percent'
    ? `${Number(coupon.discountValue).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% OFF`
    : `R$ ${Number(coupon.discountValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} OFF`;

/**
 * Valida e aplica cupons de desconto por loja (benchmark iFood §12).
 * A fonte da verdade é SEMPRE o servidor: o front exibe o preview,
 * mas o desconto cobrado é reaplicado no createOrder.
 *
 * @author Edmilson Lopes
 * @date 2026-08-16
 */
export class CouponService {
  /**
   * Valida um código para uma loja + subtotal. Não consome uso.
   */
  async validateForStore(storeId: string, rawCode: string, subtotal: number): Promise<CouponValidationResult> {
    const code = normalizeCouponCode(rawCode);
    if (!code) return { valid: false, reason: 'Informe um código de cupom.' };

    const coupon = await AppDataSource.getRepository(Coupon).findOne({
      where: { storeId, code },
    });
    if (!coupon || coupon.active === false) {
      return { valid: false, reason: 'Cupom não encontrado para esta loja.' };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
      return { valid: false, reason: 'Este cupom expirou.' };
    }
    if (coupon.maxUses != null && Number(coupon.usedCount || 0) >= Number(coupon.maxUses)) {
      return { valid: false, reason: 'Este cupom esgotou.' };
    }
    const minSubtotal = coupon.minSubtotal != null ? Number(coupon.minSubtotal) : null;
    if (minSubtotal != null && Number(subtotal || 0) < minSubtotal) {
      return {
        valid: false,
        reason: `Válido em pedidos a partir de R$ ${minSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      };
    }

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discount: computeCouponDiscount(coupon, Number(subtotal || 0)),
      label: couponLabel(coupon),
    };
  }

  /**
   * Aplica o cupom dentro da transação do pedido: revalida, incrementa uso e
   * devolve o desconto (a ser subtraído do total ANTES do charge).
   */
  async applyForOrderTx(
    manager: EntityManager,
    storeId: string,
    rawCode: string,
    subtotal: number
  ): Promise<{ code: string; discount: number } | null> {
    const code = normalizeCouponCode(rawCode);
    if (!code) return null;

    const validation = await this.validateForStore(storeId, code, subtotal);
    if (!validation.valid) {
      // Cupom informado mas inválido no fechamento: falha explícita — nunca
      // cobra a mais silenciosamente nem aceita desconto não confirmado.
      throw new AppError('COUPON-001', 400, { message: `Cupom inválido: ${validation.reason}` });
    }

    await manager
      .createQueryBuilder()
      .update(Coupon)
      .set({ usedCount: () => `COALESCE(used_count, 0) + 1` })
      .where('id = :id', { id: validation.couponId })
      .execute();

    return { code: validation.code, discount: validation.discount };
  }

  /**
   * Quantos cupons ativos a loja tem agora (para o "N cupons disponíveis").
   */
  async activeCountForStore(storeId: string): Promise<number> {
    const rows: { count: string }[] = await AppDataSource.query(
      `SELECT COUNT(*)::text AS count FROM coupons
       WHERE store_id = $1 AND active = TRUE
         AND (expires_at IS NULL OR expires_at > now())
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [storeId]
    );
    return Number(rows?.[0]?.count || 0);
  }

  /**
   * Lista cupons da loja (painel do lojista).
   */
  async listByStore(storeId: string): Promise<Coupon[]> {
    return AppDataSource.getRepository(Coupon).find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cria/atualiza cupom da loja (upsert por código).
   */
  async upsertForStore(
    storeId: string,
    input: {
      code: string;
      discountType: 'percent' | 'fixed';
      discountValue: number;
      minSubtotal?: number | null;
      expiresAt?: Date | null;
      maxUses?: number | null;
      active?: boolean;
    }
  ): Promise<Coupon> {
    const code = normalizeCouponCode(input.code);
    if (!code || code.length < 3) {
      throw new AppError('COUPON-002', 400, { message: 'Código do cupom precisa ter pelo menos 3 caracteres.' });
    }
    if (input.discountType === 'percent' && (Number(input.discountValue) <= 0 || Number(input.discountValue) > 100)) {
      throw new AppError('COUPON-003', 400, { message: 'Percentual de desconto deve estar entre 1 e 100.' });
    }
    if (input.discountType === 'fixed' && Number(input.discountValue) <= 0) {
      throw new AppError('COUPON-003', 400, { message: 'Valor do desconto deve ser maior que zero.' });
    }

    const repo = AppDataSource.getRepository(Coupon);
    const existing = await repo.findOne({ where: { storeId, code } });
    const payload = {
      storeId,
      code,
      discountType: input.discountType,
      discountValue: Number(input.discountValue),
      minSubtotal: input.minSubtotal != null ? Number(input.minSubtotal) : null,
      expiresAt: input.expiresAt ?? null,
      maxUses: input.maxUses != null ? Number(input.maxUses) : null,
      active: input.active !== false,
    };

    if (existing) {
      repo.merge(existing, payload);
      return repo.save(existing);
    }
    return repo.save(repo.create(payload));
  }

  async deactivateForStore(storeId: string, couponId: string): Promise<void> {
    await AppDataSource.getRepository(Coupon).update({ id: couponId, storeId }, { active: false });
  }
}

export const couponService = new CouponService();
