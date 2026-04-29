import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';

type DirtySnapshotRow = {
  storeId: string;
  snapshotDate: string;
};

export class StoreDashboardSnapshotService {
  private timezone = process.env.APP_TZ || 'America/Sao_Paulo';
  private log = logger.child({ scope: 'StoreDashboardSnapshotService' });

  private normalizeDateInput(value: unknown) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return '';
  }

  private async listDirtyDates(storeId?: string, limit = 500) {
    const rows = await AppDataSource.query(
      `
        SELECT DISTINCT
          o.store_id AS "storeId",
          timezone($1, o.created_at)::date AS "snapshotDate"
        FROM orders o
        LEFT JOIN store_dashboard_daily_metrics sdm
          ON sdm.store_id = o.store_id
         AND sdm.snapshot_date = timezone($1, o.created_at)::date
        WHERE ($2::uuid IS NULL OR o.store_id = $2)
          AND (
            sdm.store_id IS NULL
            OR sdm.source_updated_at IS NULL
            OR o.updated_at > sdm.source_updated_at
          )
        ORDER BY "storeId" ASC, "snapshotDate" ASC
        LIMIT $3
      `,
      [this.timezone, storeId || null, Math.max(1, Math.floor(Number(limit) || 500))]
    );

    return (Array.isArray(rows) ? rows : [])
      .map((row): DirtySnapshotRow | null => {
        const normalizedDate = this.normalizeDateInput(row?.snapshotDate);
        const normalizedStoreId = String(row?.storeId || '').trim();
        if (!normalizedStoreId || !normalizedDate) return null;
        return {
          storeId: normalizedStoreId,
          snapshotDate: normalizedDate,
        };
      })
      .filter((row): row is DirtySnapshotRow => Boolean(row));
  }

  private groupDatesByStore(rows: DirtySnapshotRow[]) {
    const grouped = new Map<string, string[]>();
    for (const row of rows) {
      const current = grouped.get(row.storeId) || [];
      current.push(row.snapshotDate);
      grouped.set(row.storeId, current);
    }
    return grouped;
  }

  private async refreshStoreDates(storeId: string, dates: string[]) {
    const normalizedDates = Array.from(
      new Set(
        (Array.isArray(dates) ? dates : [])
          .map((entry) => this.normalizeDateInput(entry))
          .filter(Boolean)
      )
    ).sort();

    if (!storeId || normalizedDates.length === 0) return 0;

    await AppDataSource.transaction(async (tx) => {
      await tx.query(
        `
          DELETE FROM store_dashboard_daily_products
          WHERE store_id = $1
            AND snapshot_date = ANY($2::date[])
        `,
        [storeId, normalizedDates]
      );

      await tx.query(
        `
          DELETE FROM store_dashboard_daily_metrics
          WHERE store_id = $1
            AND snapshot_date = ANY($2::date[])
        `,
        [storeId, normalizedDates]
      );

      await tx.query(
        `
          WITH target_dates AS (
            SELECT unnest($2::date[]) AS snapshot_date
          ),
          customer_orders AS (
            SELECT
              timezone($1, o.created_at)::date AS snapshot_date,
              CASE
                WHEN o.customer_user_id IS NOT NULL THEN 'user:' || o.customer_user_id::text
                WHEN NULLIF(regexp_replace(COALESCE(o.phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                  THEN 'phone:' || regexp_replace(COALESCE(o.phone, ''), '\\D', '', 'g')
                WHEN NULLIF(lower(trim(COALESCE(o.customer_name, ''))), '') IS NOT NULL
                  THEN 'name:' || lower(trim(COALESCE(o.customer_name, '')))
                ELSE 'order:' || o.id::text
              END AS customer_key
            FROM orders o
            INNER JOIN target_dates td
              ON td.snapshot_date = timezone($1, o.created_at)::date
            WHERE o.store_id = $3
          ),
          daily_orders AS (
            SELECT
              o.store_id,
              timezone($1, o.created_at)::date AS snapshot_date,
              COUNT(*)::int AS orders_count,
              COALESCE(SUM(o.total), 0)::numeric(10,2) AS revenue_total,
              MIN(o.created_at) AS first_order_at,
              MAX(o.created_at) AS last_order_at,
              MAX(o.updated_at) AS source_updated_at
            FROM orders o
            INNER JOIN target_dates td
              ON td.snapshot_date = timezone($1, o.created_at)::date
            WHERE o.store_id = $3
            GROUP BY o.store_id, timezone($1, o.created_at)::date
          ),
          daily_customers AS (
            SELECT
              snapshot_date,
              COUNT(DISTINCT customer_key)::int AS customers_count
            FROM customer_orders
            GROUP BY snapshot_date
          ),
          daily AS (
            SELECT
              dor.store_id,
              dor.snapshot_date,
              dor.orders_count,
              dor.revenue_total,
              COALESCE(dc.customers_count, 0)::int AS customers_count,
              dor.first_order_at,
              dor.last_order_at,
              dor.source_updated_at
            FROM daily_orders dor
            LEFT JOIN daily_customers dc
              ON dc.snapshot_date = dor.snapshot_date
          )
          INSERT INTO store_dashboard_daily_metrics (
            store_id,
            snapshot_date,
            orders_count,
            revenue_total,
            customers_count,
            first_order_at,
            last_order_at,
            source_updated_at,
            refreshed_at
          )
          SELECT
            store_id,
            snapshot_date,
            orders_count,
            revenue_total,
            customers_count,
            first_order_at,
            last_order_at,
            source_updated_at,
            NOW()
          FROM daily
        `,
        [this.timezone, normalizedDates, storeId]
      );

      await tx.query(
        `
          WITH target_dates AS (
            SELECT unnest($2::date[]) AS snapshot_date
          ),
          daily_products AS (
            SELECT
              o.store_id,
              timezone($1, o.created_at)::date AS snapshot_date,
              COALESCE(oi.product_id::text, 'produto-sem-id') AS product_ref,
              oi.product_id,
              COALESCE(NULLIF(trim(p.name), ''), 'Produto') AS product_name,
              COALESCE(SUM(oi.quantity), 0)::int AS quantity,
              COALESCE(SUM(oi.price), 0)::numeric(10,2) AS revenue_total,
              MAX(o.updated_at) AS source_updated_at
            FROM order_items oi
            INNER JOIN orders o
              ON o.id = oi.order_id
            INNER JOIN target_dates td
              ON td.snapshot_date = timezone($1, o.created_at)::date
            LEFT JOIN products p
              ON p.id = oi.product_id
            WHERE o.store_id = $3
            GROUP BY
              o.store_id,
              timezone($1, o.created_at)::date,
              oi.product_id,
              COALESCE(oi.product_id::text, 'produto-sem-id'),
              COALESCE(NULLIF(trim(p.name), ''), 'Produto')
          )
          INSERT INTO store_dashboard_daily_products (
            store_id,
            snapshot_date,
            product_ref,
            product_id,
            product_name,
            quantity,
            revenue_total,
            source_updated_at,
            refreshed_at
          )
          SELECT
            store_id,
            snapshot_date,
            product_ref,
            product_id,
            product_name,
            quantity,
            revenue_total,
            source_updated_at,
            NOW()
          FROM daily_products
        `,
        [this.timezone, normalizedDates, storeId]
      );
    });

    return normalizedDates.length;
  }

  async ensureStoreSnapshots(storeId: string) {
    const dirtyRows = await this.listDirtyDates(storeId, 3660);
    if (!dirtyRows.length) return 0;
    const grouped = this.groupDatesByStore(dirtyRows);
    const dates = grouped.get(storeId) || [];
    return this.refreshStoreDates(storeId, dates);
  }

  async refreshDirtySnapshots(limit = 500) {
    const dirtyRows = await this.listDirtyDates(undefined, limit);
    if (!dirtyRows.length) return 0;

    let refreshedDates = 0;
    const grouped = this.groupDatesByStore(dirtyRows);
    for (const [storeId, dates] of grouped.entries()) {
      refreshedDates += await this.refreshStoreDates(storeId, dates);
    }

    return refreshedDates;
  }

  async runScheduledRefresh(limit = 500) {
    const startedAt = Date.now();
    try {
      const refreshedDates = await this.refreshDirtySnapshots(limit);
      if (refreshedDates > 0) {
        this.log.info('Dashboard snapshots refreshed', {
          refreshedDates,
          elapsedMs: Date.now() - startedAt,
        });
      }
      return refreshedDates;
    } catch (error: any) {
      this.log.warn('Dashboard snapshot refresh failed', {
        error: error?.message || String(error),
      });
      return 0;
    }
  }
}
