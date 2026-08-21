import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
import { StoreRepository } from '../repositories/StoreRepository';
import { StoreDashboardSnapshotService } from './StoreDashboardSnapshotService';
import { logger } from '../utils/logger';

type DashboardOptions = {
  monthKey?: string | null;
  periodDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
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

  private normalizeDateInput(value?: string | null) {
    const normalized = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    return null;
  }

  private resolveCustomRange(startDate?: string | null, endDate?: string | null) {
    const normalizedStart = this.normalizeDateInput(startDate);
    const normalizedEnd = this.normalizeDateInput(endDate);
    if (!normalizedStart || !normalizedEnd) return null;
    return normalizedStart <= normalizedEnd
      ? { startDate: normalizedStart, endDate: normalizedEnd }
      : { startDate: normalizedEnd, endDate: normalizedStart };
  }

  private resolvePeriodStart(periodDays?: number | null) {
    const normalizedDays = this.normalizePeriodDays(periodDays);
    if (!normalizedDays) return null;
    return new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000);
  }

  private formatDateKeyLabel(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map((value) => Number(value));
    if (!year || !month || !day) return dateKey;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: this.timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  }

  private formatRangeLabel(startDate: string, endDate: string) {
    return `${this.formatDateKeyLabel(startDate)} a ${this.formatDateKeyLabel(endDate)}`;
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

  private async queryCustomers(
    storeId: string,
    filters: {
      periodStart?: Date | null;
      startDate?: string | null;
      endDate?: string | null;
    } = {}
  ) {
    const periodStart = filters.periodStart || null;
    const startDate = this.normalizeDateInput(filters.startDate);
    const endDate = this.normalizeDateInput(filters.endDate);
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
            AND (
              ($2::date IS NOT NULL AND $3::date IS NOT NULL AND timezone($4, o.created_at)::date BETWEEN $2::date AND $3::date)
              OR
              ($2::date IS NULL AND $3::date IS NULL AND ($5::timestamptz IS NULL OR o.created_at >= $5))
            )
        )
        SELECT
          customer_key AS key,
          MAX(customer_user_id::text) AS "customerUserId",
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
      [storeId, startDate, endDate, this.timezone, periodStart]
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

  private async getLiveAggregates(
    storeId: string,
    monthKey: string,
    periodStart: Date | null,
    customRange?: { startDate: string; endDate: string } | null
  ): Promise<DashboardAggregatePayload> {
    const summaryPromise = customRange
      ? AppDataSource.query(
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
                    WHEN timezone($2, o.created_at)::date BETWEEN $4::date AND $5::date THEN o.total
                    ELSE 0
                  END
                ),
                0
              ) AS "periodRevenue",
              MIN(o.created_at) AS "firstOrderAt"
            FROM orders o
            WHERE o.store_id = $1
          `,
          [storeId, this.timezone, monthKey, customRange.startDate, customRange.endDate]
        )
      : AppDataSource.query(
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
        );

    const salesPromise = customRange
      ? AppDataSource.query(
          `
            SELECT
              to_char(timezone($2, o.created_at), 'YYYY-MM-DD') AS date,
              COALESCE(SUM(o.total), 0) AS total
            FROM orders o
            WHERE o.store_id = $1
              AND timezone($2, o.created_at)::date BETWEEN $3::date AND $4::date
            GROUP BY 1
            ORDER BY 1 ASC
          `,
          [storeId, this.timezone, customRange.startDate, customRange.endDate]
        )
      : AppDataSource.query(
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
        );

    const topPromise = customRange
      ? AppDataSource.query(
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
              AND timezone($2, o.created_at)::date BETWEEN $3::date AND $4::date
            GROUP BY 1
            ORDER BY qty DESC, revenue DESC, name ASC
            LIMIT 8
          `,
          [storeId, this.timezone, customRange.startDate, customRange.endDate]
        )
      : AppDataSource.query(
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
        );

    const [summaryRows, salesRows, topRows] = await Promise.all([summaryPromise, salesPromise, topPromise]);
    const summaryRow = Array.isArray(summaryRows) && summaryRows.length ? summaryRows[0] : {};

    return {
      summaryRow: summaryRow || {},
      salesRows: Array.isArray(salesRows) ? salesRows : [],
      topRows: Array.isArray(topRows) ? topRows : [],
    };
  }

  private async getSnapshotAggregates(
    storeId: string,
    monthKey: string,
    periodStart: Date | null,
    customRange?: { startDate: string; endDate: string } | null
  ): Promise<DashboardAggregatePayload> {
    const periodStartDate = this.formatDateInTimezone(periodStart);

    const summaryPromise = customRange
      ? AppDataSource.query(
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
                    WHEN sdm.snapshot_date BETWEEN $3::date AND $4::date THEN sdm.revenue_total
                    ELSE 0
                  END
                ),
                0
              ) AS "periodRevenue",
              MIN(sdm.first_order_at) AS "firstOrderAt"
            FROM store_dashboard_daily_metrics sdm
            WHERE sdm.store_id = $1
          `,
          [storeId, monthKey, customRange.startDate, customRange.endDate]
        )
      : AppDataSource.query(
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
        );

    const salesPromise = customRange
      ? AppDataSource.query(
          `
            SELECT
              sdm.snapshot_date AS date,
              COALESCE(sdm.revenue_total, 0) AS total
            FROM store_dashboard_daily_metrics sdm
            WHERE sdm.store_id = $1
              AND sdm.snapshot_date BETWEEN $2::date AND $3::date
            ORDER BY sdm.snapshot_date ASC
          `,
          [storeId, customRange.startDate, customRange.endDate]
        )
      : AppDataSource.query(
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
        );

    const topPromise = customRange
      ? AppDataSource.query(
          `
            SELECT
              sdp.product_name AS name,
              COALESCE(SUM(sdp.quantity), 0)::int AS qty,
              COALESCE(SUM(sdp.revenue_total), 0) AS revenue
            FROM store_dashboard_daily_products sdp
            WHERE sdp.store_id = $1
              AND sdp.snapshot_date BETWEEN $2::date AND $3::date
            GROUP BY sdp.product_name
            ORDER BY qty DESC, revenue DESC, name ASC
            LIMIT 8
          `,
          [storeId, customRange.startDate, customRange.endDate]
        )
      : AppDataSource.query(
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
        );

    const [summaryRows, salesRows, topRows] = await Promise.all([summaryPromise, salesPromise, topPromise]);
    const summaryRow = Array.isArray(summaryRows) && summaryRows.length ? summaryRows[0] : {};

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
    periodLabel: string;
  }) {
    const { aggregates, customers, periodCustomers, monthKey, normalizedPeriodDays, periodLabel } = params;
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
        periodLabel,
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
    const customRange = this.resolveCustomRange(options.startDate, options.endDate);
    const normalizedPeriodDays = this.normalizePeriodDays(options.periodDays);
    const periodStart = this.resolvePeriodStart(normalizedPeriodDays);
    const periodLabel = customRange
      ? this.formatRangeLabel(customRange.startDate, customRange.endDate)
      : normalizedPeriodDays
        ? `${normalizedPeriodDays} dias`
        : 'Todo período';

    let aggregates: DashboardAggregatePayload;
    try {
      await this.snapshotService.ensureStoreSnapshots(store.id);
      aggregates = await this.getSnapshotAggregates(store.id, monthKey, periodStart, customRange);
    } catch (error: any) {
      this.log.warn('Dashboard snapshot unavailable, falling back to live aggregation', {
        storeId: store.id,
        error: error?.message || String(error),
      });
      aggregates = await this.getLiveAggregates(store.id, monthKey, periodStart, customRange);
    }

    const [customers, periodCustomers] = await Promise.all([
      this.queryCustomers(store.id),
      this.queryCustomers(store.id, customRange
        ? { startDate: customRange.startDate, endDate: customRange.endDate }
        : { periodStart }),
    ]);

    return this.buildReport({
      aggregates,
      customers,
      periodCustomers,
      monthKey,
      normalizedPeriodDays,
      periodLabel,
    });
  }

  /* =====================================================================
   * RELATÓRIO DE MOVIMENTO (21/08) — pedidos × produtos × tempo, SEM preço.
   * Pergunta que responde: "que dia e que hora o povo costuma chegar?"
   * Contagem viva direto do banco (snapshots são orientados a receita);
   * exclui cancelled e awaiting_payment (pedido não pago não é demanda).
   * ===================================================================== */
  async getMovementReport(storeId: string, authStoreId?: string, options: DashboardOptions = {}) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    this.ensureStoreAccess(store.id, authStoreId);

    const customRange = this.resolveCustomRange(options.startDate, options.endDate);
    const normalizedPeriodDays = this.normalizePeriodDays(options.periodDays);
    const periodStart = this.resolvePeriodStart(normalizedPeriodDays);
    const periodLabel = customRange
      ? this.formatRangeLabel(customRange.startDate, customRange.endDate)
      : normalizedPeriodDays
        ? `${normalizedPeriodDays} dias`
        : 'Todo período';

    // TZ como literal inline (config de servidor, não input) — parâmetro $2
    // órfão na branch periodDays causava 42P18 na query de itens (21/08).
    const tz = this.timezone;
    // Params contíguos por branch: $1=storeId (+$2/$3 quando há período).
    const periodClause = customRange
      ? { text: `timezone('${tz}', o.created_at)::date BETWEEN $2::date AND $3::date`, params: [storeId, customRange.startDate, customRange.endDate] }
      : periodStart
        ? { text: `o.created_at >= $2::timestamptz`, params: [storeId, periodStart] }
        : { text: null, params: [storeId] };
    const where = `o.store_id = $1 AND o.status NOT IN ('cancelled', 'awaiting_payment')${periodClause.text ? ` AND ${periodClause.text}` : ''}`;
    const periodParams = periodClause.params;

    const [itemRows, weekdayRows, hourRows, topDayRows, summaryRows] = await Promise.all([
      AppDataSource.query(
        `
          SELECT p.name AS "name", SUM(oi.quantity)::int AS "qty"
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          WHERE ${where}
          GROUP BY p.name
          ORDER BY "qty" DESC, "name" ASC
        `,
        periodParams
      ),
      AppDataSource.query(
        `
          SELECT EXTRACT(ISODOW FROM timezone('${tz}', o.created_at))::int AS "dow", COUNT(*)::int AS "orders"
          FROM orders o
          WHERE ${where}
          GROUP BY 1
          ORDER BY 1
        `,
        periodParams
      ),
      AppDataSource.query(
        `
          SELECT EXTRACT(HOUR FROM timezone('${tz}', o.created_at))::int AS "hour", COUNT(*)::int AS "orders"
          FROM orders o
          WHERE ${where}
          GROUP BY 1
          ORDER BY 1
        `,
        periodParams
      ),
      AppDataSource.query(
        `
          SELECT to_char(timezone('${tz}', o.created_at), 'YYYY-MM-DD') AS "date", COUNT(*)::int AS "orders"
          FROM orders o
          WHERE ${where}
          GROUP BY 1
          ORDER BY "orders" DESC, 1 DESC
          LIMIT 10
        `,
        periodParams
      ),
      AppDataSource.query(
        `
          SELECT COUNT(*)::int AS "orders",
                 COUNT(DISTINCT timezone('${tz}', o.created_at)::date)::int AS "daysWithOrders"
          FROM orders o
          WHERE ${where}
        `,
        periodParams
      ),
    ]);

    const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const byWeekday = WEEKDAYS.map((label, index) => ({
      label,
      dow: index + 1,
      orders: Number((weekdayRows as any[]).find((row: any) => Number(row?.dow) === index + 1)?.orders || 0),
    }));
    const byHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}h`,
      orders: Number((hourRows as any[]).find((row: any) => Number(row?.hour) === hour)?.orders || 0),
    }));
    const items = (Array.isArray(itemRows) ? itemRows : []).map((row) => ({
      name: String(row?.name || 'Produto'),
      qty: this.toInt(row?.qty),
    }));
    const totalOrders = this.toInt(summaryRows?.[0]?.orders);
    const daysWithOrders = this.toInt(summaryRows?.[0]?.daysWithOrders);
    const bestWeekday = [...byWeekday].sort((a, b) => b.orders - a.orders)[0] || null;
    const bestHour = [...byHour].sort((a, b) => b.orders - a.orders)[0] || null;

    return {
      summary: {
        totalOrders,
        daysWithOrders,
        avgOrdersPerDay: daysWithOrders > 0 ? Math.round((totalOrders / daysWithOrders) * 10) / 10 : 0,
        totalItemsSold: items.reduce((acc, item) => acc + item.qty, 0),
        distinctProducts: items.length,
        bestWeekdayLabel: bestWeekday && bestWeekday.orders > 0 ? bestWeekday.label : null,
        bestHourLabel: bestHour && bestHour.orders > 0 ? bestHour.label : null,
        periodLabel,
      },
      items,
      byWeekday,
      byHour: byHour.filter((slot) => slot.orders > 0),
      topDays: (Array.isArray(topDayRows) ? topDayRows : []).map((row) => ({
        date: String(row?.date || ''),
        orders: this.toInt(row?.orders),
      })),
    };
  }
}
