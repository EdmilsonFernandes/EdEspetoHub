/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * @file: CouponController.ts
 * @Date: 2026-08-16
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { couponService, normalizeCouponCode } from '../services/CouponService';
import { respondWithError } from '../utils/respondWithError';
import { log } from '../utils/logger';

const resolveStoreIdBySlug = async (slug: string): Promise<string | null> => {
  const rows: { id: string }[] = await AppDataSource.query(
    `SELECT id FROM stores WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  return rows?.[0]?.id || null;
};

export class CouponController {
  /** POST /public/stores/slug/:slug/coupons/validate — preview do desconto no checkout */
  static async publicValidateBySlug(req: Request, res: Response) {
    try {
      const storeId = await resolveStoreIdBySlug(req.params.slug);
      if (!storeId) return res.status(404).json({ error: 'STORE-001' });
      const subtotal = Number(req.body?.subtotal || 0);
      const result = await couponService.validateForStore(storeId, normalizeCouponCode(req.body?.code), subtotal);
      return res.json(result);
    } catch (error: any) {
      log.warn('Coupon validate failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /** GET /public/stores/slug/:slug/coupons/count — "N cupons disponíveis" no checkout */
  static async publicCountBySlug(req: Request, res: Response) {
    try {
      const storeId = await resolveStoreIdBySlug(req.params.slug);
      if (!storeId) return res.status(404).json({ error: 'STORE-001' });
      const count = await couponService.activeCountForStore(storeId);
      return res.json({ count });
    } catch (error: any) {
      log.warn('Coupon count failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /** GET /stores/:storeId/coupons — painel do lojista */
  static async listByStore(req: Request, res: Response) {
    try {
      const coupons = await couponService.listByStore(req.params.storeId);
      return res.json(
        coupons.map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          minSubtotal: coupon.minSubtotal != null ? Number(coupon.minSubtotal) : null,
          expiresAt: coupon.expiresAt || null,
          maxUses: coupon.maxUses != null ? Number(coupon.maxUses) : null,
          usedCount: Number(coupon.usedCount || 0),
          active: coupon.active,
        }))
      );
    } catch (error: any) {
      log.warn('Coupon list failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /** POST /stores/:storeId/coupons — criar/atualizar (lojista) */
  static async upsertByStore(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const expiresAtRaw = String(body.expiresAt || '').trim();
      const coupon = await couponService.upsertForStore(req.params.storeId, {
        code: body.code,
        discountType: body.discountType === 'fixed' ? 'fixed' : 'percent',
        discountValue: Number(body.discountValue),
        minSubtotal: body.minSubtotal != null && body.minSubtotal !== '' ? Number(body.minSubtotal) : null,
        expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
        maxUses: body.maxUses != null && body.maxUses !== '' ? Number(body.maxUses) : null,
        active: body.active !== false,
      });
      return res.status(201).json({ id: coupon.id, code: coupon.code });
    } catch (error: any) {
      log.warn('Coupon upsert failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /** DELETE /stores/:storeId/coupons/:couponId — desativar */
  static async deactivateByStore(req: Request, res: Response) {
    try {
      await couponService.deactivateForStore(req.params.storeId, req.params.couponId);
      return res.json({ ok: true });
    } catch (error: any) {
      log.warn('Coupon deactivate failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
