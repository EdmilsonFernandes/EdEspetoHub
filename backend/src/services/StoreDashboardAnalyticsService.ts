import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
import { StoreRepository } from '../repositories/StoreRepository';
import { StoreDashboardSnapshotService } from './StoreDashboardSnapshotService';
import { logger } from '../utils/logger';

type DashboardOptions = {
  monthKey?: string | null;
  periodDays?: number | null;
};

type DashboardCustomerRow = {
  key: string;
  customerUserId: string | null;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  avgTicket: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
};

type DashboardAggregatePayload = {
  summaryRow: Record<string, unknown>;
  salesRows: Array<Record<string, unknown>>;
  topRows: Array<Record<string, unknown>>;
};

export class StoreDashboardAnalyticsService {
  private storeRepository = new StoreRepository();
  private snapshotService = new StoreDashboardSnapshotService();
  private timezone = process.env.APP_TZ || 'America/Sao_Paulo';
  private log = logger.child({ scope: 'StoreDashboardAnalyticsService' });

  private ensureStoreAccess(storeId: string, authStoreId?: string) {
    if (authStoreId && storeId !== authStoreId) {
      throw new AppError('AUTH-003', 403);
    }
  }

  private normalizeMonthKey(value?: string | null) {
    const normalized = String(value || '').trim();
    if (/^\d{4}-\d{2}$/.test(normalized)) return normalized;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());
  }

  private normalizePeriodDays(value?: number | null) {
    if (value === null || value === undefined) return null;
    if (!Number.isFinite(Number(value))) return 30;
    const parsed = Math.floor(Number(value));
    if (parsed <= 0) return null;
    return Math.min(parsed, 3660);
  }

  private resolvePeriodStart(periodDays?: number | null) {
    const normalizedDays = this.normalizePeriodDays(periodDays);
    if (!normalizedDays) return null;
    return new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000);
  }

  private formatDateInTimezone(value: Date | null) {
    if (!value) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private toNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private toInt(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
  }

  private normalizeDateKey(value: unknown) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return '';
  }

  private async queryCustomers(storeId: string, periodStart: Date | null) {
    const rows = await AppDataSource.query(
      `
        WITH customer_orders AS (
          SELECT
            CASE
              WHEN o.customer_user_id IS NOT NULL THEN 'user:' || o.customer_user_id::text
              WHEN NULLIF(regexp_replace(COALESCE(o.phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                THEN 'phone:' || regexp_replace(COALESCE(o.phone, ''), '\\D', '', 'g')
              WHEN NULLIF(lower(trim(COALESCE(o.customer_name, ''))), '') IS NOT NULL
                THEN 'name:' || lower(trim(COALESCE(o.customer_name, '')))
              ELSE 'order:' || o.id::text
            END AS customer_key,
            o.customer_user_id,
            COALESCE(NULLIF(trim(u.full_name), ''), NULLIF(trim(o.customer_name), ''), 'Cliente') AS resolved_name,
            COALESCE(NULLIF(trim(u.phone), ''), NULLIF(trim(o.phone), ''), '') AS resolved_phone,
            o.total,
            o.created_at
          FROM orders o
          LEFT JOIN users u
            ON u.id = o.customer_user_id
          WHERE o.store_id = $1
            AND ($2::timestamptz IS NULL OR o.created_at >= $2)
        )
        SELECT
          customer_key AS key,
          MIN(customer_user_id)::text AS "customerUserId",
          MAX(resolved_name) AS name,
          MAX(resolved_phone) AS phone,
          COUNT(*)::int AS "ordersCount",
          COALESCE(SUM(total), 0) AS "totalSpent",
          COALESCE(AVG(total), 0) AS "avgTicket",
          MIN(created_at) AS "firstOrderAt",
          MAX(created_at) AS "lastOrderAt"
        FROM customer_orders
        GROUP BY customer_key
        ORDER BY "totalSpent" DESC, "ordersCount" DESC, "lastOrderAt" DESC, name ASC
      `,
      [storeId, periodStart]
    );

    return (Array.isArray(rows) ? rows : []).map(
      (row): DashboardCustomerRow => ({
        key: String(row?.key || ''),
        customerUserId: row?.customerUserId ? String(row.customerUserId) : null,
        name: String(row?.name || 'Cliente'),
        phone: String(row?.phone || ''),
        ordersCount: this.toInt(row?.ordersCount),
        totalSpent: this.toNumber(row?.totalSpent),
        avgTicket: this.toNumber(row?.avgTicket),
        firstOrderAt: row?.firstOrderAt ? String(row.firstOrderAt) : null,
        lastOrderAt: row?.lastOrderAt ? String(row.lastOrderAt) : null,
      })
    );
  }

  private async getLiveAggregates(storeId: string, monthKey: string, periodStart: Date | null): Promise<DashboardAggregatePayload> {
    const [summaryRow, salesRows, topRows] = await Promise.all([
      AppDataSource.query(
        `
          SELECT
            COUNT(*)::int AS "totalOrders",
            COALESCE(SUM(o.total), 0) AS "totalRevenue",
            COALESCE(
              SUM(
                CASE
                  WHEN to_char(timezone($2, o.created_at), 'YYYY-MM') = $3 THEN o.total
                  ELSE 0
                END
              ),
              0
            ) AS "monthRevenue",
            COALESCE(
              SUM(
                CASE
                  WHEN $4::timestamptz IS NULL OR o.created_at >= $4 THEN o.total
                  ELSE 0
                END
              ),
              0
            ) AS "periodRevenue",
            MIN(o.created_at) AS "firstOrderAt"
          FROM orders o
          WHERE o.store_id = $1
        `,
        [storeId, this.timezone, monthKey, periodStart]
      ).then((rows) => (Array.isArray(rows) && rows.length ? rows[0] : {})),
      AppDataSource.query(
        `
          SELECT
            to_char(timezone($2, o.created_at), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(o.total), 0) AS total
          FROM orders o
          WHERE o.store_id = $1
            AND ($3::timestamptz IS NULL OR o.created_at >= $3)
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        [storeId, this.timezone, periodStart]
      ),
      AppDataSource.query(
        `
          SELECT
            COALESCE(NULLIF(trim(p.name), ''), 'Produto') AS name,
            COALESCE(SUM(oi.quantity), 0)::int AS qty,
            COALESCE(SUM(oi.price), 0) AS revenue
          FROM order_items oi
          INNER JOIN orders o
            ON o.id = oi.order_id
          LEFT JOIN products p
            ON p.id = oi.product_id
          WHERE o.store_id = $1
            AND ($2::timestamptz IS NULL OR o.created_at >= $2)
          GROUP BY 1
          ORDER BY qty DESC, revenue DESC, name ASC
          LIMIT 8
        `,
        [storeId, periodStart]
      ),
    ]);

    return {
      summaryRow: summaryRow || {},
      salesRows: Array.isArray(salesRows) ? salesRows : [],
      topRows: Array.isArray(topRows) ? topRows : [],
    };
  }

  private async getSnapshotAggregates(storeId: string, monthKey: string, periodStart: Date | null): Promise<DashboardAggregatePayload> {
    const periodStartDate = this.formatDateInTimezone(periodStart);

    const [summaryRow, salesRows, topRows] = await Promise.all([
      AppDataSource.query(
        `
          SELECT
            COALESCE(SUM(sdm.orders_count), 0)::int AS "totalOrders",
            COALESCE(SUM(sdm.revenue_total), 0) AS "totalRevenue",
            COALESCE(
              SUM(
                CASE
                  WHEN to_char(sdm.snapshot_date, 'YYYY-MM') = $2 THEN sdm.revenue_total
                  ELSE 0
                END
              ),
              0
            ) AS "monthRevenue",
            COALESCE(
              SUM(
                CASE
                  WHEN $3::date IS NULL OR sdm.snapshot_date >= $3::date THEN sdm.revenue_total
                  ELSE 0
                END
              ),
              0
            ) AS "periodRevenue",
            MIN(sdm.first_order_at) AS "firstOrderAt"
          FROM store_dashboard_daily_metrics sdm
          WHERE sdm.store_id = $1
        `,
        [storeId, monthKey, periodStartDate]
      ).then((rows) => (Array.isArray(rows) && rows.length ? rows[0] : {})),
      AppDataSource.query(
        `
          SELECT
            sdm.snapshot_date AS date,
            COALESCE(sdm.revenue_total, 0) AS total
          FROM store_dashboard_daily_metrics sdm
          WHERE sdm.store_id = $1
            AND ($2::date IS NULL OR sdm.snapshot_date >= $2::date)
          ORDER BY sdm.snapshot_date ASC
        `,
        [storeId, periodStartDate]
      ),
      AppDataSource.query(
        `
          SELECT
            sdp.product_name AS name,
            COALESCE(SUM(sdp.quantity), 0)::int AS qty,
            COALESCE(SUM(sdp.revenue_total), 0) AS revenue
          FROM store_dashboard_daily_products sdp
          WHERE sdp.store_id = $1
            AND ($2::date IS NULL OR sdp.snapshot_date >= $2::date)
          GROUP BY sdp.product_name
          ORDER BY qty DESC, revenue DESC, name ASC
          LIMIT 8
        `,
        [storeId, periodStartDate]
      ),
    ]);

    return {
      summaryRow: summaryRow || {},
      salesRows: Array.isArray(salesRows) ? salesRows : [],
      topRows: Array.isArray(topRows) ? topRows : [],
    };
  }

  private buildReport(params: {
    aggregates: DashboardAggregatePayload;
    customers: DashboardCustomerRow[];
    periodCustomers: DashboardCustomerRow[];
    monthKey: string;
    normalizedPeriodDays: number | null;
  }) {
    const { aggregates, customers, periodCustomers, monthKey, normalizedPeriodDays } = params;
    const summaryRow = aggregates.summaryRow || {};
    const totalOrders = this.toInt(summaryRow?.totalOrders);
    const totalRevenue = this.toNumber(summaryRow?.totalRevenue);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      summary: {
        totalOrders,
        totalRevenue,
        monthRevenue: this.toNumber(summaryRow?.monthRevenue),
        periodRevenue: this.toNumber(summaryRow?.periodRevenue),
        avgTicket,
        firstOrderAt: summaryRow?.firstOrderAt ? String(summaryRow.firstOrderAt) : null,
        monthKey,
        periodDays: normalizedPeriodDays,
        periodLabel: normalizedPeriodDays ? `${normalizedPeriodDays} dias` : 'Todo período',
        allTimeCustomerCount: customers.length,
        periodCustomerCount: periodCustomers.length,
      },
      salesByDay: (Array.isArray(aggregates.salesRows) ? aggregates.salesRows : [])
        .map((row) => ({
          date: this.normalizeDateKey(row?.date),
          total: this.toNumber(row?.total),
        }))
        .filter((row) => row.date),
      topProducts: (Array.isArray(aggregates.topRows) ? aggregates.topRows : []).map((row) => ({
        name: String(row?.name || 'Produto'),
        qty: this.toInt(row?.qty),
        revenue: this.toNumber(row?.revenue),
      })),
      customers,
      periodCustomers,
    };
  }

  async getReport(storeId: string, authStoreId?: string, options: DashboardOptions = {}) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);

    const monthKey = this.normalizeMonthKey(options.monthKey);
    const normalizedPeriodDays = this.normalizePeriodDays(options.periodDays);
    const periodStart = this.resolvePeriodStart(normalizedPeriodDays);

    const customersPromise = this.queryCustomers(store.id, null);
    const periodCustomersPromise = this.queryCustomers(store.id, periodStart);

    let aggregates: DashboardAggregatePayload;
    try {
      await this.snapshotService.ensureStoreSnapshots(store.id);
      aggregates = await this.getSnapshotAggregates(store.id, monthKey, periodStart);
    } catch (error: any) {
      this.log.warn('Dashboard snapshot unavailable, falling back to live aggregation', {
        storeId: store.id,
        error: error?.message || String(error),
      });
      aggregates = await this.getLiveAggregates(store.id, monthKey, periodStart);
    }

    const [customers, periodCustomers] = await Promise.all([customersPromise, periodCustomersPromise]);

    return this.buildReport({
      aggregates,
      customers,
      periodCustomers,
      monthKey,
      normalizedPeriodDays,
    });
  }
}
