import { type ReactNode, type RefObject } from "react"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { type OrderRecord } from "./data"
import {
  CustomerFace,
  formatCurrency,
  formatOrderDate,
  FulfillmentMeter,
  OrderStatusFace,
} from "./value-faces"

type Fact = { label: string; value: ReactNode }

function SheetSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Frame dense spacing="sm" className="min-w-0">
      <FrameHeader>
        <FrameTitle role="heading" aria-level={3}>
          {title}
        </FrameTitle>
      </FrameHeader>
      <FramePanel>{children}</FramePanel>
    </Frame>
  )
}

function FactList({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
      {facts.map((fact) => (
        <div key={fact.label} className="contents">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="min-w-0 truncate tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function getLineItemFacts(order: OrderRecord): Fact[] {
  return [
    { label: "Product", value: order.product },
    {
      label: "SKU",
      value: <span className="font-mono text-xs">{order.sku}</span>,
    },
    { label: "Quantity", value: order.quantity },
    {
      label: "Unit Price",
      value: formatCurrency(order.amount / order.quantity),
    },
    {
      label: "Total",
      value: (
        <span className="font-medium">{formatCurrency(order.amount)}</span>
      ),
    },
  ]
}

export function OrderSheet({
  order,
  open,
  onOpenChange,
  returnFocusRef,
}: {
  order: OrderRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // Rows open the sheet without a trigger, so focus returns to the clicked control.
        onCloseAutoFocus={(event) => {
          const el = returnFocusRef.current
          if (el instanceof HTMLElement) {
            event.preventDefault()
            el.focus()
          }
        }}
      >
        {order ? (
          <>
            <SheetHeader>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <SheetTitle className="tabular-nums">{order.id}</SheetTitle>
                <OrderStatusFace status={order.status} />
              </div>
              <SheetDescription>
                Placed {formatOrderDate(order)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
              <SheetSection title="Customer">
                <CustomerFace order={order} />
              </SheetSection>
              <SheetSection title="Line Item">
                <FactList facts={getLineItemFacts(order)} />
              </SheetSection>
              <SheetSection title="Fulfillment">
                <FulfillmentMeter order={order} />
              </SheetSection>
            </div>
          </>
        ) : (
          <SheetTitle className="sr-only">Order</SheetTitle>
        )}
      </SheetContent>
    </Sheet>
  )
}