import { Badge } from "@/components/reui/badge"
import { Frame, FramePanel } from "@/components/reui/frame"

import { IconPlaceholder } from "@/components/reui/icon-placeholder"

import { METRICS, TONE_BADGES, type MetricCard } from "./data"
import { IconContainer } from "./icon-container"

function TrendIcon({ tone }: { tone: MetricCard["tone"] }) {
  if (tone === "warning" || tone === "destructive") {
    return (
      <IconPlaceholder
        lucide="TrendingDown"
        tabler="IconTrendingDown"
        hugeicons="TradeDownIcon"
        phosphor="TrendDownIcon"
        remixicon="RiArrowRightDownLongLine"
        className="size-3"
        aria-hidden="true"
      />
    )
  }

  return (
    <IconPlaceholder
      lucide="TrendingUp"
      tabler="IconTrendingUp"
      hugeicons="TradeUpIcon"
      phosphor="TrendUpIcon"
      remixicon="RiArrowRightUpLongLine"
      className="size-3"
      aria-hidden="true"
    />
  )
}

export function MetricGrid() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:gap-3">
      {METRICS.map((metric) => (
        <Frame key={metric.id}>
          <MetricPanel metric={metric} />
        </Frame>
      ))}
    </div>
  )
}

function MetricPanel({ metric }: { metric: MetricCard }) {
  const max = Math.max(...metric.sparkline)

  return (
    <FramePanel className="flex min-h-28 flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <IconContainer icon={metric.icon} />
          <div className="min-w-0 pt-0.5">
            <span className="block truncate text-sm font-medium">
              {metric.title}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {metric.detail}
            </span>
          </div>
        </div>
        <Badge variant={TONE_BADGES[metric.tone]}>
          <TrendIcon tone={metric.tone} />
          {metric.delta}
        </Badge>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight tabular-nums">
            {metric.value}
          </div>
        </div>
        <div className="flex h-10 items-end gap-0.5" aria-hidden="true">
          {metric.sparkline.map((point, index) => (
            <span
              key={`${metric.id}-${index}`}
              className="bg-primary/20 data-[tone=destructive]:bg-destructive/30 data-[tone=info]:bg-info/30 data-[tone=success]:bg-success/30 data-[tone=warning]:bg-warning/30 w-1 rounded-full"
              data-tone={metric.tone}
              style={{ height: `${Math.max((point / max) * 100, 16)}%` }}
            />
          ))}
        </div>
      </div>
    </FramePanel>
  )
}