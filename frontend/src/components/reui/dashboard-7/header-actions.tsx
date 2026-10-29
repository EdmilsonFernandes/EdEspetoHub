import { Button } from "@/components/ui/Button"
import { IconPlaceholder } from "@/components/reui/icon-placeholder"

import { DateRangePicker, type ReportDateRange } from "./date-range-picker"

export function HeaderActions({
  range,
  exportDisabled,
  onRangeApply,
  onExport,
}: {
  range: ReportDateRange
  /** True when the current view leaves no orders to export. */
  exportDisabled: boolean
  onRangeApply: (range: ReportDateRange) => void
  onExport: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <DateRangePicker value={range} onApply={onRangeApply} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Export orders"
        disabled={exportDisabled}
        onClick={onExport}
      >
        <IconPlaceholder
          lucide="DownloadIcon"
          tabler="IconDownload"
          hugeicons="Download01Icon"
          phosphor="DownloadSimpleIcon"
          remixicon="RiDownload2Line"
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Export</span>
      </Button>
    </div>
  )
}