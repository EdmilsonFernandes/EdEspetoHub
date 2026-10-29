import { useState } from "react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

import { Button } from "@/components/ui/Button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconPlaceholder } from "@/components/reui/icon-placeholder"

export type ReportDateRange = {
  from: Date
  to: Date
}

type DateRangePreset = {
  id: string
  label: string
  range: ReportDateRange
}

// Demo dates are fixed to the Aug 04, 2025 reference day, not the runtime clock.
const reportRange = (
  fromMonth: number,
  fromDay: number,
  toMonth: number,
  toDay: number,
  year = 2025
): ReportDateRange => ({
  from: new Date(year, fromMonth, fromDay),
  to: new Date(year, toMonth, toDay),
})

const MONTH_TO_DATE = reportRange(7, 1, 7, 4)

export const DEFAULT_REPORT_RANGE = MONTH_TO_DATE

const REPORT_RANGE_PRESETS: DateRangePreset[] = [
  { id: "today", label: "Today", range: reportRange(7, 4, 7, 4) },
  { id: "yesterday", label: "Yesterday", range: reportRange(7, 3, 7, 3) },
  { id: "last7", label: "Last 7 days", range: reportRange(6, 29, 7, 4) },
  { id: "last30", label: "Last 30 days", range: reportRange(6, 6, 7, 4) },
  { id: "monthToDate", label: "Month to date", range: MONTH_TO_DATE },
  { id: "lastMonth", label: "Last month", range: reportRange(6, 1, 6, 31) },
  { id: "yearToDate", label: "Year to date", range: reportRange(0, 1, 7, 4) },
  {
    id: "lastYear",
    label: "Last year",
    range: reportRange(0, 1, 11, 31, 2024),
  },
]

const MAX_REPORT_DATE = MONTH_TO_DATE.to

function isSameRange(first: ReportDateRange, second: DateRange) {
  const secondFrom = second.from
  const secondTo = second.to ?? second.from

  return (
    Boolean(secondFrom && secondTo) &&
    first.from.getTime() === secondFrom?.getTime() &&
    first.to.getTime() === secondTo?.getTime()
  )
}

function normalizeRange(
  range: DateRange | undefined,
  fallback: ReportDateRange
): ReportDateRange {
  if (!range?.from) return fallback

  const from = range.from
  const to = range.to ?? range.from

  return from.getTime() <= to.getTime() ? { from, to } : { from: to, to: from }
}

export function formatReportRange(range: ReportDateRange) {
  return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`
}

function getMatchingPreset(range: DateRange | undefined) {
  if (!range?.from || !range.to) return undefined
  const normalizedRange = normalizeRange(range, MONTH_TO_DATE)

  return REPORT_RANGE_PRESETS.find((preset) =>
    isSameRange(preset.range, normalizedRange)
  )
}

// The dashboard owns the applied range; the draft stays local until Apply.
export function DateRangePicker({
  value: committedRange,
  onApply,
}: {
  value: ReportDateRange
  onApply: (range: ReportDateRange) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    committedRange
  )

  const selectedPresetId = getMatchingPreset(draftRange ?? committedRange)?.id

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftRange(committedRange)
    }

    setOpen(nextOpen)
  }

  function handleApply() {
    onApply(normalizeRange(draftRange, committedRange))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="group/pick-date w-60 max-w-full justify-between leading-none font-normal tabular-nums"
        >
          <span className="truncate">
            {formatReportRange(committedRange)}
          </span>
          <IconPlaceholder
            lucide="CalendarIcon"
            tabler="IconCalendarEvent"
            hugeicons="Calendar04Icon"
            phosphor="CalendarBlankIcon"
            remixicon="RiCalendarLine"
            className="text-muted-foreground/80 group-hover/pick-date:text-foreground shrink-0 transition-colors"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col">
          <div className="flex flex-col sm:grid sm:grid-cols-[10rem_1fr]">
            <div className="border-border flex flex-wrap gap-1 border-b p-2 sm:flex-col sm:border-r sm:border-b-0">
              {REPORT_RANGE_PRESETS.map((preset) => {
                const selected = selectedPresetId === preset.id

                return (
                  <Button
                    key={preset.id}
                    type="button"
                    size="sm"
                    variant={selected ? "secondary" : "ghost"}
                    className={
                      selected
                        ? "justify-start"
                        : "text-muted-foreground justify-start"
                    }
                    onClick={() => setDraftRange(preset.range)}
                  >
                    {preset.label}
                  </Button>
                )
              })}
            </div>
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={setDraftRange}
              numberOfMonths={2}
              defaultMonth={draftRange?.from ?? committedRange.from}
              disabled={{
                after: MAX_REPORT_DATE,
              }}
            />
          </div>
          <div className="border-border flex items-center justify-between gap-2 border-t px-3 py-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraftRange(MONTH_TO_DATE)}
            >
              Reset
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraftRange(committedRange)
                  setOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}