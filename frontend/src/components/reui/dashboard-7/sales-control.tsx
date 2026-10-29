import {
  ChannelChart,
  RevenueChart,
  type ChannelFocus,
} from "./analytics-charts"
import { type Period } from "./data"

export function SalesControl({
  period,
  onPeriodChange,
  channelFocus,
  onChannelFocusToggle,
  onMessage,
}: {
  period: Period
  onPeriodChange: (period: Period) => void
  channelFocus: ChannelFocus
  onChannelFocusToggle: () => void
  onMessage: (message: string) => void
}) {
  return (
    <section
      className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]"
      aria-label="Revenue analytics"
    >
      <RevenueChart period={period} onPeriodChange={onPeriodChange} />
      <ChannelChart
        focus={channelFocus}
        onFocusToggle={onChannelFocusToggle}
        onMessage={onMessage}
      />
    </section>
  )
}