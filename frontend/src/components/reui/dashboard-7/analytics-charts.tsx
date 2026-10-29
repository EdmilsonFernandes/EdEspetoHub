import { CSSProperties } from "react"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  XAxis,
} from "recharts"

import { Button } from "@/components/ui/Button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

import {
  CHANNEL_CHART_CONFIG,
  CHANNEL_VOLUME,
  MONTH_REVENUE,
  QUARTER_REVENUE,
  REVENUE_CHART_CONFIG,
  type Period,
} from "./data"

type LegendTone =
  "online" | "store" | "target" | "direct" | "partners" | "marketplace"
export type ChannelFocus = "all" | "direct"
type ChannelKey = "direct" | "partners" | "marketplace"

const CHANNEL_KEYS: ChannelKey[] = ["direct", "partners", "marketplace"]

const PERIOD_OPTIONS: { value: Period; label: string; description: string }[] =
  [
    {
      value: "month",
      label: "Month",
      description: "Daily revenue, month to date",
    },
    {
      value: "quarter",
      label: "Quarter",
      description: "Weekly revenue, quarter to date",
    },
  ]

const REVENUE_LEGEND: { label: string; tone: LegendTone }[] = [
  { label: "Online", tone: "online" },
  { label: "Retail", tone: "store" },
  { label: "Plan", tone: "target" },
]

const CHANNEL_LEGEND: { label: string; tone: LegendTone }[] = [
  { label: "Direct", tone: "direct" },
  { label: "Partners", tone: "partners" },
  { label: "Marketplace", tone: "marketplace" },
]

// Uniform header: stacked on mobile, row + vertically centered from sm up.
const FRAME_HEADER =
  "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"

function LegendSwatch({ tone }: { tone: LegendTone }) {
  if (tone === "online" || tone === "store" || tone === "target") {
    return (
      <span
        className="size-2 rounded-full"
        style={{
          backgroundColor: REVENUE_CHART_CONFIG[tone].color,
        }}
        aria-hidden
      />
    )
  }

  if (tone === "direct") {
    return <span className="size-2 rounded-full bg-cyan-500" aria-hidden />
  }

  if (tone === "partners") {
    return <span className="size-2 rounded-full bg-violet-500" aria-hidden />
  }

  return <span className="size-2 rounded-full bg-amber-400" aria-hidden />
}

function ChartLegend({
  items,
  className = "",
}: {
  items: { label: string; tone: LegendTone }[]
  className?: string
}) {
  return (
    <div
      className={`text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <LegendSwatch tone={item.tone} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

// Series values are in thousands of dollars; a quarter total crosses $1M.
function formatThousands(value: number) {
  return value >= 1000 ? `$${(value / 1000).toFixed(2)}M` : `$${value}K`
}

function getPlanGap(value: number) {
  return value >= 0
    ? `+${formatThousands(value)}`
    : `-${formatThousands(Math.abs(value))}`
}

function getRevenueTotals(data: typeof MONTH_REVENUE) {
  return data.reduce(
    (totals, point) => ({
      revenue: totals.revenue + point.revenue,
      target: totals.target + point.target,
      grossProfit: totals.grossProfit + point.grossProfit,
    }),
    { revenue: 0, target: 0, grossProfit: 0 }
  )
}

function isChannelKey(value: string): value is ChannelKey {
  return CHANNEL_KEYS.includes(value as ChannelKey)
}

function CrosshatchPattern({
  config,
  idPrefix,
}: {
  config: typeof REVENUE_CHART_CONFIG
  idPrefix: string
}) {
  const entries = Object.entries(config).filter(([, value]) => value.color)

  return (
    <>
      {entries.map(([key, { color }]) => (
        <pattern
          key={key}
          id={`${idPrefix}-${key}`}
          x="0"
          y="0"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0,8 L8,0"
            stroke={color}
            strokeOpacity={0.42}
            strokeWidth={0.9}
          />
          <path
            d="M0,0 L8,8"
            stroke={color}
            strokeOpacity={0.22}
            strokeWidth={0.9}
          />
        </pattern>
      ))}
    </>
  )
}

export function RevenueChart({
  period,
  onPeriodChange,
}: {
  period: Period
  onPeriodChange: (period: Period) => void
}) {
  const data = period === "month" ? MONTH_REVENUE : QUARTER_REVENUE
  const periodOption =
    PERIOD_OPTIONS.find((option) => option.value === period) ??
    PERIOD_OPTIONS[0]
  const totals = getRevenueTotals(data)
  const planGap = totals.revenue - totals.target
  const profitRate = Math.round((totals.grossProfit / totals.revenue) * 100)

  return (
    <Frame className="flex h-full min-w-0 flex-col">
      <FrameHeader className={FRAME_HEADER}>
        <div className="flex flex-col gap-px">
          <FrameTitle>Revenue Pace</FrameTitle>
          <FrameDescription>{periodOption.description}</FrameDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <ChartLegend items={REVENUE_LEGEND} className="sm:justify-end" />
          {/* Re-clicking the pressed item sends an empty array; the guard keeps
              a period selected. */}
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(value) => {
              const next = PERIOD_OPTIONS.find(
                (option) => option.value === value
              )
              if (next) onPeriodChange(next.value)
            }}
            variant="outline"
            size="sm"
            aria-label="Revenue period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </FrameHeader>
      <FramePanel className="flex min-h-[360px] flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs">Booked</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatThousands(totals.revenue)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs">Plan Gap</div>
            <div className="text-lg font-semibold tabular-nums">
              {getPlanGap(planGap)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs">Gross Profit</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums">
                {formatThousands(totals.grossProfit)}
              </span>
              <span className="text-success text-xs font-medium">
                {profitRate}%
              </span>
            </div>
          </div>
        </div>
        <ChartContainer
          config={REVENUE_CHART_CONFIG}
          className="mt-auto h-64 w-full min-w-0"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <CrosshatchPattern
                config={REVENUE_CHART_CONFIG}
                idPrefix="dashboard-7-revenue"
              />
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="min-w-44 gap-2.5"
                  labelFormatter={(value) => (
                    <div className="border-border/50 mb-0.5 border-b pb-2">
                      <span className="text-xs font-medium">
                        {period === "quarter" ? "Week of " : ""}
                        {String(value)}, 2025
                      </span>
                    </div>
                  )}
                  formatter={(value, name) => {
                    const key = String(name)
                    const label =
                      key in REVENUE_CHART_CONFIG
                        ? REVENUE_CHART_CONFIG[
                            key as keyof typeof REVENUE_CHART_CONFIG
                          ].label
                        : key

                    return (
                      <div className="flex w-full items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-full bg-(--swatch)"
                            style={
                              {
                                "--swatch": `var(--color-${key})`,
                              } as CSSProperties
                            }
                          />
                          <span className="text-muted-foreground">{label}</span>
                        </div>
                        <span className="text-foreground font-semibold tabular-nums">
                          {formatThousands(Number(value))}
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Area
              dataKey="online"
              type="natural"
              stackId="revenue"
              fill="url(#dashboard-7-revenue-online)"
              fillOpacity={0.65}
              stroke="var(--color-online)"
              strokeWidth={2}
            />
            <Area
              dataKey="store"
              type="natural"
              stackId="revenue"
              fill="url(#dashboard-7-revenue-store)"
              fillOpacity={0.65}
              stroke="var(--color-store)"
              strokeWidth={2}
            />
            <Line
              dataKey="target"
              type="natural"
              stroke="var(--color-target)"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </FramePanel>
    </Frame>
  )
}

function getChannelShareData() {
  return CHANNEL_VOLUME.map((point) => {
    const total = point.direct + point.partners + point.marketplace

    return {
      label: point.label,
      direct: Math.round((point.direct / total) * 100),
      partners: Math.round((point.partners / total) * 100),
      marketplace: Math.max(
        100 -
          Math.round((point.direct / total) * 100) -
          Math.round((point.partners / total) * 100),
        0
      ),
      directOrders: point.direct,
      partnersOrders: point.partners,
      marketplaceOrders: point.marketplace,
      total,
    }
  })
}

// Module scope keeps the bar data identity stable; a per-render copy makes
// the hover tooltip flicker.
const CHANNEL_SHARE_DATA = getChannelShareData()

export function ChannelChart({
  focus,
  onFocusToggle,
  onMessage,
}: {
  focus: ChannelFocus
  onFocusToggle: () => void
  onMessage: (message: string) => void
}) {
  const directFocused = focus === "direct"
  const latest = CHANNEL_SHARE_DATA[CHANNEL_SHARE_DATA.length - 1]

  return (
    <Frame className="flex h-full min-w-0 flex-col">
      <FrameHeader className={FRAME_HEADER}>
        <div className="flex flex-col gap-px">
          <FrameTitle>Channel Mix</FrameTitle>
          <FrameDescription>Daily order share</FrameDescription>
        </div>
        <Button
          type="button"
          variant={directFocused ? "secondary" : "outline"}
          size="sm"
          aria-label={
            directFocused ? "Show all channels" : "Focus direct channel"
          }
          aria-pressed={directFocused}
          onClick={() => {
            onFocusToggle()
            onMessage(
              directFocused
                ? "Showing all channels."
                : "Direct channel focused."
            )
          }}
        >
          Direct
        </Button>
      </FrameHeader>
      <FramePanel className="flex min-h-[360px] flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs">Latest Orders</div>
            <div className="text-lg font-semibold tabular-nums">
              {latest.total}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs">Direct Share</div>
            <div className="text-lg font-semibold tabular-nums">
              {latest.direct}%
            </div>
          </div>
        </div>
        <ChartLegend items={CHANNEL_LEGEND} />
        <ChartContainer
          config={CHANNEL_CHART_CONFIG}
          className="mt-auto h-64 w-full min-w-0"
        >
          <BarChart
            accessibilityLayer
            data={CHANNEL_SHARE_DATA}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <pattern
                id="dashboard-7-channel-direct"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="var(--color-direct)" />
                <path
                  d="M-1 8L8 -1M3 9L9 3"
                  stroke="var(--color-background)"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              </pattern>
              <pattern
                id="dashboard-7-channel-partners"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="var(--color-partners)" />
                <circle
                  cx="2"
                  cy="2"
                  r="0.9"
                  fill="var(--color-background)"
                  fillOpacity={0.22}
                />
                <circle
                  cx="6"
                  cy="6"
                  r="0.9"
                  fill="var(--color-background)"
                  fillOpacity={0.22}
                />
              </pattern>
              <pattern
                id="dashboard-7-channel-marketplace"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="var(--color-marketplace)" />
                <path
                  d="M2 0V8M6 0V8"
                  stroke="var(--color-background)"
                  strokeOpacity={0.18}
                  strokeWidth={1}
                />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name, item) => {
                    const key = String(name)
                    const label = isChannelKey(key)
                      ? CHANNEL_CHART_CONFIG[key].label
                      : key
                    const orders = item.payload?.[`${key}Orders`]
                    const orderCount = typeof orders === "number" ? orders : 0
                    const share =
                      typeof value === "number" ? value : Number(value)

                    return (
                      <div className="flex flex-1 items-center justify-between gap-6">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {orderCount} orders, {share}%
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Bar
              dataKey="direct"
              stackId="orders"
              fill="url(#dashboard-7-channel-direct)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="partners"
              stackId="orders"
              fill="url(#dashboard-7-channel-partners)"
              opacity={directFocused ? 0.32 : 1}
            />
            <Bar
              dataKey="marketplace"
              stackId="orders"
              fill="url(#dashboard-7-channel-marketplace)"
              opacity={directFocused ? 0.32 : 1}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </FramePanel>
    </Frame>
  )
}