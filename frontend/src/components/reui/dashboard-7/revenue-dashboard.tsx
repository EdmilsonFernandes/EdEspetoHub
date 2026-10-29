"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import type { ChannelFocus } from "./analytics-charts"
import { ORDERS, type OrderRecord, type Period } from "./data"
import {
  DEFAULT_REPORT_RANGE,
  formatReportRange,
  type ReportDateRange,
} from "./date-range-picker"
import { HeaderActions } from "./header-actions"
import { TOAST_SUCCESS_ICON } from "./icons"
import { MetricGrid } from "./metric-panel"
import { OrderSheet } from "./order-sheet"
import { OrderTable } from "./order-table"
import { SalesControl } from "./sales-control"
import { formatOrderDate, getOrderDay } from "./value-faces"

/**
 * Retail revenue dashboard: KPI panels, shadcn charts and an order queue
 * scoped by the header range; start customization in data.tsx.
 */

function getOrderSearchBlob(order: OrderRecord) {
  return [
    order.id,
    order.customer,
    order.product,
    order.channel,
    order.status,
    formatOrderDate(order),
  ]
    .join(" ")
    .toLowerCase()
}

function isInRange(order: OrderRecord, range: ReportDateRange) {
  const day = getOrderDay(order).getTime()

  return day >= range.from.getTime() && day <= range.to.getTime()
}

function countOrders(count: number) {
  return `${count} ${count === 1 ? "order" : "orders"}`
}

export function RevenueDashboard() {
  const [period, setPeriod] = useState<Period>("month")
  const [channelFocus, setChannelFocus] = useState<ChannelFocus>("all")
  const [range, setRange] = useState<ReportDateRange>(DEFAULT_REPORT_RANGE)
  const [query, setQuery] = useState("")
  const [exceptionsOnly, setExceptionsOnly] = useState(false)
  const [viewOrderId, setViewOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [message, setMessage] = useState("Synced at 09:20.")
  const viewOriginRef = useRef<HTMLElement | null>(null)

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return ORDERS.filter((order) => {
      const matchesRange = isInRange(order, range)
      const matchesSearch =
        !normalizedQuery || getOrderSearchBlob(order).includes(normalizedQuery)
      const matchesFilter = !exceptionsOnly || order.status !== "Paid"

      return matchesRange && matchesSearch && matchesFilter
    })
  }, [exceptionsOnly, query, range])

  // The id outlives the open flag, so the sheet keeps its record while it closes.
  const viewOrder = ORDERS.find((order) => order.id === viewOrderId) ?? null
  const viewSummary = `${countOrders(filteredOrders.length)} from ${formatReportRange(range)}`

  function handleRangeApply(nextRange: ReportDateRange) {
    setRange(nextRange)
    setMessage(`Queue range set to ${formatReportRange(nextRange)}.`)
  }

  function handleExport() {
    toast.success("Order queue exported", {
      icon: TOAST_SUCCESS_ICON,
      description: viewSummary,
    })
  }

  function handleChannelFocusToggle() {
    setChannelFocus((current) => (current === "direct" ? "all" : "direct"))
  }

  function handleExceptionsToggle() {
    const nextState = !exceptionsOnly

    setExceptionsOnly(nextState)
    setMessage(
      nextState
        ? "Showing orders that need action."
        : "Showing all recent orders."
    )
  }

  // Stable so the grid keeps its cells mounted and the saved control can take focus back.
  const handleOrderView = useCallback(
    (order: OrderRecord, origin: HTMLElement) => {
      viewOriginRef.current = origin
      setViewOrderId(order.id)
      setSheetOpen(true)
    },
    []
  )

  return (
    <div className="bg-background text-foreground min-h-svh w-full">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        {/* Header */}
        <header
          className="flex min-h-9 w-full shrink-0 flex-col justify-between gap-2 pb-1 sm:flex-row sm:items-center"
          aria-label="Retail pulse header"
        >
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <h1
              id="page-heading"
              className="truncate text-sm font-semibold tracking-tight"
            >
              Retail Pulse
            </h1>
            <span
              aria-hidden
              className="bg-muted-foreground/40 hidden size-1 shrink-0 rounded-full sm:block"
            />
            <p className="text-muted-foreground truncate text-xs">
              Monday, Aug 04, 2025
            </p>
            <span
              aria-hidden
              className="bg-muted-foreground/40 hidden size-1 shrink-0 rounded-full md:block"
            />
            <p
              className="text-muted-foreground truncate text-xs"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </div>
          <HeaderActions
            range={range}
            exportDisabled={filteredOrders.length === 0}
            onRangeApply={handleRangeApply}
            onExport={handleExport}
          />
        </header>

        {/* Metrics */}
        <MetricGrid />

        {/* Analytics */}
        <SalesControl
          period={period}
          onPeriodChange={setPeriod}
          channelFocus={channelFocus}
          onChannelFocusToggle={handleChannelFocusToggle}
          onMessage={setMessage}
        />

        {/* Orders */}
        <OrderTable
          orders={filteredOrders}
          summary={viewSummary}
          query={query}
          exceptionsOnly={exceptionsOnly}
          onQueryChange={setQuery}
          onExceptionsToggle={handleExceptionsToggle}
          onOrderView={handleOrderView}
        />
        <OrderSheet
          order={viewOrder}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          returnFocusRef={viewOriginRef}
        />
      </div>
    </div>
  )
}