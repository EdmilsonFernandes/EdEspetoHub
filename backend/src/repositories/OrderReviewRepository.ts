/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderReviewRepository.ts
 * @Date: 2026-02-13
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { OrderReview } from '../entities/OrderReview';

export class OrderReviewRepository {
  private repository: Repository<OrderReview>;

  constructor() {
    this.repository = AppDataSource.getRepository(OrderReview);
  }

    /**
   * Retrieves data for find by order id.
   *
   * @author Edmilson Lopes
   */
findByOrderId(orderId: string) {
    return this.repository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

    /**
   * Retrieves data for find by id.
   *
   * @author Edmilson Lopes
   */
findById(id: string) {
    if (!id) return Promise.resolve(null);
    return this.repository.findOne({ where: { id } });
  }

    /**
   * Executes save review business logic.
   *
   * @author Edmilson Lopes
   */
async saveReview(input: Partial<OrderReview>) {
    const existing = input.orderId ? await this.findByOrderId(input.orderId) : null;
    if (existing) {
      Object.assign(existing, input);
      return this.repository.save(existing);
    }
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

    /**
   * Lists records for list by store id.
   *
   * @author Edmilson Lopes
   */
async listByStoreId(storeId: string, limit = 100) {
    return this.repository
      .createQueryBuilder('r')
      .leftJoin('motoboys', 'm', 'm.id = r.motoboy_id')
      .leftJoin('users', 'u', 'u.id = m.user_id')
      .select([
        'r.id as id',
        'r.order_id as "orderId"',
        'r.store_rating as "storeRating"',
        'r.delivery_rating as "deliveryRating"',
        'r.comment as comment',
        'r.store_tags as "storeTags"',
        'r.delivery_tags as "deliveryTags"',
        'r.tip_amount as "tipAmount"',
        'r.tip_status as "tipStatus"',
        'r.tip_paid_at as "tipPaidAt"',
        'r.tip_payout_status as "tipPayoutStatus"',
        'r.tip_payout_at as "tipPayoutAt"',
        'r.tip_payout_proof_url as "tipPayoutProofUrl"',
        'r.tip_payout_notes as "tipPayoutNotes"',
        'r.tip_payout_by_user_id as "tipPayoutByUserId"',
        'r.created_at as "createdAt"',
        'r.customer_name as "customerName"',
        'u.full_name as "motoboyName"',
        'u.profile_image_url as "motoboyProfileImageUrl"',
      ])
      .where('r.store_id = :storeId', { storeId })
      .orderBy('r.created_at', 'DESC')
      .limit(Math.max(1, Math.min(300, Number(limit) || 100)))
      .getRawMany();
  }

    /**
   * Retrieves data for get store summary.
   *
   * @author Edmilson Lopes
   */
async getStoreSummary(storeId: string) {
    const [summary] = await AppDataSource.query(
      `
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(store_rating)::numeric, 2), 0)::numeric AS store_avg_rating,
        COUNT(delivery_rating)::int AS total_delivery_reviews,
        COALESCE(ROUND(AVG(delivery_rating)::numeric, 2), 0)::numeric AS delivery_avg_rating,
        COALESCE(SUM(tip_amount), 0)::numeric AS total_tips
      FROM order_reviews
      WHERE store_id = $1
      `,
      [storeId]
    );

    const distribution = await AppDataSource.query(
      `
      SELECT store_rating::int AS rating, COUNT(*)::int AS total
      FROM order_reviews
      WHERE store_id = $1
      GROUP BY store_rating
      ORDER BY store_rating DESC
      `,
      [storeId]
    );

    const motoboy = await AppDataSource.query(
      `
      SELECT
        r.motoboy_id AS "motoboyId",
        u.full_name AS "motoboyName",
        u.profile_image_url AS "profileImageUrl",
        COUNT(*)::int AS "totalReviews",
        COALESCE(ROUND(AVG(r.delivery_rating)::numeric, 2), 0)::numeric AS "avgDeliveryRating",
        COALESCE(SUM(r.tip_amount), 0)::numeric AS "totalTips"
      FROM order_reviews r
      JOIN motoboys m ON m.id = r.motoboy_id
      JOIN users u ON u.id = m.user_id
      WHERE r.store_id = $1
        AND r.motoboy_id IS NOT NULL
        AND r.delivery_rating IS NOT NULL
      GROUP BY r.motoboy_id, u.full_name, u.profile_image_url
      ORDER BY "avgDeliveryRating" DESC, "totalReviews" DESC
      `,
      [storeId]
    );

    return { summary: summary || {}, distribution: distribution || [], motoboy: motoboy || [] };
  }

  async getPublicSummariesByStoreIds(storeIds: string[]) {
    if (!storeIds.length) return new Map<string, any>();
    const rows = await AppDataSource.query(
      `
      SELECT
        store_id AS "storeId",
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(store_rating)::numeric, 2), 0)::numeric AS store_avg_rating,
        COUNT(delivery_rating)::int AS total_delivery_reviews,
        COALESCE(ROUND(AVG(delivery_rating)::numeric, 2), 0)::numeric AS delivery_avg_rating
      FROM order_reviews
      WHERE store_id = ANY($1::uuid[])
      GROUP BY store_id
      `,
      [storeIds]
    );

    return rows.reduce((acc: Map<string, any>, row: any) => {
      acc.set(String(row.storeId || ''), row);
      return acc;
    }, new Map<string, any>());
  }

    /**
   * Lists records for list tip payouts by store id.
   *
   * @author Edmilson Lopes
   */
async listTipPayoutsByStoreId(storeId: string, limit = 300) {
    return AppDataSource.query(
      `
      SELECT
        r.id AS id,
        r.order_id AS "orderId",
        r.store_id AS "storeId",
        r.motoboy_id AS "motoboyId",
        r.customer_name AS "customerName",
        r.tip_amount AS "tipAmount",
        r.tip_status AS "tipStatus",
        r.tip_paid_at AS "tipPaidAt",
        r.tip_payout_status AS "tipPayoutStatus",
        r.tip_payout_at AS "tipPayoutAt",
        r.tip_payout_proof_url AS "tipPayoutProofUrl",
        r.tip_payout_notes AS "tipPayoutNotes",
        r.tip_payout_by_user_id AS "tipPayoutByUserId",
        r.created_at AS "createdAt",
        u.full_name AS "motoboyName",
        u.profile_image_url AS "motoboyProfileImageUrl",
        m.pix_key AS "motoboyPixKey"
      FROM order_reviews r
      LEFT JOIN motoboys m ON m.id = r.motoboy_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE r.store_id = $1
        AND COALESCE(r.tip_amount, 0) > 0
        AND UPPER(COALESCE(r.tip_status, '')) = 'PAID'
      ORDER BY COALESCE(r.tip_payout_at, r.tip_paid_at, r.created_at) DESC
      LIMIT $2
      `,
      [ storeId, Math.max(1, Math.min(500, Number(limit) || 300)) ]
    );
  }

    /**
   * Lists records for list tip payouts by motoboy id.
   *
   * @author Edmilson Lopes
   */
async listTipPayoutsByMotoboyId(motoboyId: string, limit = 300) {
    return AppDataSource.query(
      `
      SELECT
        r.id AS id,
        r.order_id AS "orderId",
        r.store_id AS "storeId",
        r.motoboy_id AS "motoboyId",
        r.customer_name AS "customerName",
        r.tip_amount AS "tipAmount",
        r.tip_status AS "tipStatus",
        r.tip_paid_at AS "tipPaidAt",
        r.tip_payout_status AS "tipPayoutStatus",
        r.tip_payout_at AS "tipPayoutAt",
        r.tip_payout_proof_url AS "tipPayoutProofUrl",
        r.tip_payout_notes AS "tipPayoutNotes",
        r.tip_payout_by_user_id AS "tipPayoutByUserId",
        r.created_at AS "createdAt",
        s.name AS "storeName",
        s.slug AS "storeSlug",
        ss.logo_url AS "storeLogoUrl"
      FROM order_reviews r
      JOIN stores s ON s.id = r.store_id
      LEFT JOIN store_settings ss ON ss.store_id = s.id
      WHERE r.motoboy_id = $1
        AND COALESCE(r.tip_amount, 0) > 0
        AND UPPER(COALESCE(r.tip_status, '')) = 'PAID'
      ORDER BY COALESCE(r.tip_payout_at, r.tip_paid_at, r.created_at) DESC
      LIMIT $2
      `,
      [ motoboyId, Math.max(1, Math.min(500, Number(limit) || 300)) ]
    );
  }
}
