import type { ReactNode } from "react"
import type { BadgeProps } from "@/components/reui/badge"

import type { ChartConfig } from "@/components/ui/chart"
import { IconPlaceholder } from "@/components/reui/icon-placeholder"

/**
 * Retail revenue operations demo data for dashboard-7.
 * The records model a fictional commerce team with typed metrics, orders,
 * and chart series ready for consumer replacement.
 */

export type Period = "month" | "quarter"
export type OrderStatus = "Paid" | "Pending" | "Refunded" | "Review"
export type MetricTone = "success" | "info" | "warning" | "destructive"

// Types
export interface MetricCard {
  id: string
  title: string
  value: string
  detail: string
  delta: string
  tone: MetricTone
  icon: ReactNode
  sparkline: number[]
}

export interface RevenuePoint {
  label: string
  online: number
  store: number
  revenue: number
  target: number
  grossProfit: number
}

export interface ChannelPoint {
  label: string
  direct: number
  partners: number
  marketplace: number
}

export interface OrderRecord {
  id: string
  customer: string
  initials: string
  image: string
  product: string
  sku: string
  channel: string
  quantity: number
  date: string
  amount: number
  stage: string
  progress: number
  status: OrderStatus
}

// Metrics
export const METRICS: MetricCard[] = [
  {
    id: "net-revenue",
    title: "Net Revenue",
    value: "$128,420",
    detail: "8.8% above plan",
    delta: "+12.8%",
    tone: "success",
    icon: (
      <IconPlaceholder
        lucide="CircleDollarSignIcon"
        tabler="IconPremiumRights"
        hugeicons="DollarCircleIcon"
        phosphor="CurrencyCircleDollarIcon"
        remixicon="RiMoneyDollarCircleLine"
        className="size-4"
        aria-hidden="true"
      />
    ),
    sparkline: [48, 52, 50, 58, 61, 55, 65, 72],
  },
  {
    id: "units-moved",
    title: "Units Moved",
    value: "4,892",
    detail: "84% of monthly goal",
    delta: "+9.4%",
    tone: "info",
    icon: (
      <IconPlaceholder
        lucide="PackageIcon"
        tabler="IconPackage"
        hugeicons="PackageIcon"
        phosphor="PackageIcon"
        remixicon="RiBox3Line"
        className="size-4"
        aria-hidden="true"
      />
    ),
    sparkline: [31, 35, 42, 39, 44, 52, 49, 56],
  },
  {
    id: "new-buyers",
    title: "New Buyers",
    value: "642",
    detail: "188 via referral",
    delta: "+18.6%",
    tone: "success",
    icon: (
      <IconPlaceholder
        lucide="UsersIcon"
        tabler="IconUsers"
        hugeicons="UserMultiple02Icon"
        phosphor="UsersIcon"
        remixicon="RiGroupLine"
        className="size-4"
        aria-hidden="true"
      />
    ),
    sparkline: [18, 26, 24, 31, 35, 38, 44, 47],
  },
  {
    id: "cart-recovery",
    title: "Cart Recovery",
    value: "38.4%",
    detail: "risk in paid social",
    delta: "-2.1%",
    tone: "warning",
    icon: (
      <IconPlaceholder
        lucide="ShoppingCartIcon"
        tabler="IconShoppingCart"
        hugeicons="ShoppingCart01Icon"
        phosphor="ShoppingCartIcon"
        remixicon="RiShoppingCartLine"
        className="size-4"
        aria-hidden="true"
      />
    ),
    sparkline: [44, 42, 41, 39, 40, 37, 38, 36],
  },
]

// Chart Series (online + store sum to revenue, so the stacked areas total booked).
export const MONTH_REVENUE: RevenuePoint[] = [
  {
    label: "Aug 01",
    online: 17,
    store: 11,
    revenue: 28,
    target: 30,
    grossProfit: 9,
  },
  {
    label: "Aug 02",
    online: 22,
    store: 14,
    revenue: 36,
    target: 31,
    grossProfit: 11,
  },
  {
    label: "Aug 03",
    online: 19,
    store: 13,
    revenue: 32,
    target: 28,
    grossProfit: 10,
  },
  {
    label: "Aug 04",
    online: 20,
    store: 12,
    revenue: 32,
    target: 29,
    grossProfit: 11,
  },
]

// Weekly buckets labelled by week start; Jul 29 runs through Aug 04 and holds the month series.
export const QUARTER_REVENUE: RevenuePoint[] = [
  {
    label: "Jul 01",
    online: 118,
    store: 78,
    revenue: 196,
    target: 190,
    grossProfit: 61,
  },
  {
    label: "Jul 08",
    online: 131,
    store: 83,
    revenue: 214,
    target: 200,
    grossProfit: 68,
  },
  {
    label: "Jul 15",
    online: 112,
    store: 75,
    revenue: 187,
    target: 205,
    grossProfit: 58,
  },
  {
    label: "Jul 22",
    online: 142,
    store: 89,
    revenue: 231,
    target: 210,
    grossProfit: 75,
  },
  {
    label: "Jul 29",
    online: 136,
    store: 86,
    revenue: 222,
    target: 212,
    grossProfit: 71,
  },
]

export const CHANNEL_VOLUME: ChannelPoint[] = [
  { label: "Fri", direct: 12, partners: 6, marketplace: 8 },
  { label: "Sat", direct: 16, partners: 8, marketplace: 11 },
  { label: "Sun", direct: 14, partners: 7, marketplace: 9 },
  { label: "Mon", direct: 18, partners: 12, marketplace: 16 },
]

// Order queue sample, newest first; ids skip since the store books ~35 orders a day.
// `date` is an ISO day, formatted in the view.
export const ORDERS: OrderRecord[] = [
  {
    id: "RVO-8131",
    customer: "Mira Stone",
    initials: "MS",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    product: "Aero Carry Kit",
    sku: "AERO-30L",
    channel: "Direct",
    quantity: 3,
    date: "2025-08-04",
    amount: 489,
    stage: "Shipped",
    progress: 100,
    status: "Paid",
  },
  {
    id: "RVO-8117",
    customer: "Leo Grant",
    initials: "LG",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    product: "Pulse Desk Lamp",
    sku: "PULSE-LMP",
    channel: "Partner",
    quantity: 2,
    date: "2025-08-04",
    amount: 268,
    stage: "Packing",
    progress: 62,
    status: "Pending",
  },
  {
    id: "RVO-8088",
    customer: "Nora Vale",
    initials: "NV",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    product: "Orbit Weekender",
    sku: "ORBIT-WK",
    channel: "Marketplace",
    quantity: 1,
    date: "2025-08-03",
    amount: 319,
    stage: "On Hold",
    progress: 28,
    status: "Review",
  },
  {
    id: "RVO-8070",
    customer: "Theo Park",
    initials: "TP",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
    product: "Studio Cable Set",
    sku: "STUDIO-CBL",
    channel: "Direct",
    quantity: 6,
    date: "2025-08-03",
    amount: 174,
    stage: "Delivered",
    progress: 100,
    status: "Paid",
  },
  {
    id: "RVO-8054",
    customer: "Sana Qureshi",
    initials: "SQ",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
    product: "Slate Travel Dock",
    sku: "SLATE-DCK",
    channel: "Retail",
    quantity: 2,
    date: "2025-08-02",
    amount: 238,
    stage: "Returned",
    progress: 100,
    status: "Refunded",
  },
  {
    id: "RVO-8033",
    customer: "Alex Johnson",
    initials: "AJ",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    product: "Aero Carry Kit",
    sku: "AERO-30L",
    channel: "Partner",
    quantity: 4,
    date: "2025-08-02",
    amount: 652,
    stage: "Shipped",
    progress: 84,
    status: "Paid",
  },
  {
    id: "RVO-7994",
    customer: "Elena Ruiz",
    initials: "ER",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&dpr=2&q=80",
    product: "Pulse Desk Lamp",
    sku: "PULSE-LMP",
    channel: "Direct",
    quantity: 1,
    date: "2025-07-31",
    amount: 134,
    stage: "Delivered",
    progress: 100,
    status: "Paid",
  },
  {
    id: "RVO-7981",
    customer: "Marcus Reed",
    initials: "MR",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
    product: "Orbit Weekender",
    sku: "ORBIT-WK",
    channel: "Marketplace",
    quantity: 2,
    date: "2025-07-31",
    amount: 638,
    stage: "Delivered",
    progress: 100,
    status: "Paid",
  },
  {
    id: "RVO-7952",
    customer: "Hana Sato",
    initials: "HS",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&dpr=2&q=80",
    product: "Slate Travel Dock",
    sku: "SLATE-DCK",
    channel: "Retail",
    quantity: 1,
    date: "2025-07-30",
    amount: 119,
    stage: "Returned",
    progress: 100,
    status: "Refunded",
  },
  {
    id: "RVO-7918",
    customer: "Owen Brooks",
    initials: "OB",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=96&h=96&dpr=2&q=80",
    product: "Studio Cable Set",
    sku: "STUDIO-CBL",
    channel: "Partner",
    quantity: 10,
    date: "2025-07-29",
    amount: 290,
    stage: "Backordered",
    progress: 40,
    status: "Pending",
  },
  {
    id: "RVO-7664",
    customer: "Clara Diaz",
    initials: "CD",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=96&h=96&dpr=2&q=80",
    product: "Aero Carry Kit",
    sku: "AERO-30L",
    channel: "Direct",
    quantity: 2,
    date: "2025-07-22",
    amount: 326,
    stage: "Delivered",
    progress: 100,
    status: "Paid",
  },
  {
    id: "RVO-6758",
    customer: "Felix Moreau",
    initials: "FM",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&dpr=2&q=80",
    product: "Pulse Desk Lamp",
    sku: "PULSE-LMP",
    channel: "Partner",
    quantity: 3,
    date: "2025-06-26",
    amount: 402,
    stage: "Delivered",
    progress: 100,
    status: "Paid",
  },
]

// Badge Maps
export const STATUS_BADGES: Record<OrderStatus, BadgeProps["variant"]> = {
  Paid: "success-light",
  Pending: "warning-light",
  Refunded: "destructive-light",
  Review: "info-light",
}

// Status dot/bar color, shared by the avatar ring, fulfillment bar, and badge.
export const STATUS_DOT: Record<OrderStatus, string> = {
  Paid: "bg-success",
  Pending: "bg-warning",
  Refunded: "bg-destructive",
  Review: "bg-info",
}

export const TONE_BADGES: Record<MetricTone, BadgeProps["variant"]> = {
  success: "success-light",
  info: "info-light",
  warning: "warning-light",
  destructive: "destructive-light",
}

// Chart Config
export const REVENUE_CHART_CONFIG = {
  online: {
    label: "Online",
    color: "var(--color-sky-500)",
  },
  store: {
    label: "Retail",
    color: "var(--color-violet-500)",
  },
  target: {
    label: "Plan",
    color: "var(--color-slate-500)",
  },
} satisfies ChartConfig

export const CHANNEL_CHART_CONFIG = {
  direct: {
    label: "Direct",
    color: "var(--color-cyan-500)",
  },
  partners: {
    label: "Partners",
    color: "var(--color-violet-500)",
  },
  marketplace: {
    label: "Marketplace",
    color: "var(--color-amber-400)",
  },
} satisfies ChartConfig