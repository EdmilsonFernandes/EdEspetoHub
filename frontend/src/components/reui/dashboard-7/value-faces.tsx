import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import { STATUS_BADGES, STATUS_DOT, type OrderRecord } from "./data"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

// parseISO reads a date-only string as local midnight, matching the range picker.
export function getOrderDay(order: OrderRecord) {
  return parseISO(order.date)
}

export function formatOrderDate(order: OrderRecord) {
  return format(getOrderDay(order), "MMM dd, yyyy")
}

export function CustomerFace({ order }: { order: OrderRecord }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={order.image} alt={order.customer} />
          <AvatarFallback>{order.initials}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden="true"
          className={cn(
            "ring-background absolute right-0 bottom-0.5 size-2 rounded-full ring-2",
            STATUS_DOT[order.status]
          )}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{order.customer}</div>
        <div className="text-muted-foreground truncate text-xs">
          {order.channel}
        </div>
      </div>
    </div>
  )
}

export function OrderStatusFace({ status }: { status: OrderRecord["status"] }) {
  return (
    <Badge variant={STATUS_BADGES[status]} className="gap-1.5">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", STATUS_DOT[status])}
      />
      {status}
    </Badge>
  )
}

export function FulfillmentMeter({ order }: { order: OrderRecord }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-sm font-medium">{order.stage}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="bg-muted block h-1.5 min-w-12 flex-1 overflow-hidden rounded-full">
          <span
            className={cn(
              "block h-full rounded-full",
              STATUS_DOT[order.status]
            )}
            style={{ width: `${order.progress}%` }}
          />
        </span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {order.progress}%
        </span>
      </div>
    </div>
  )
}