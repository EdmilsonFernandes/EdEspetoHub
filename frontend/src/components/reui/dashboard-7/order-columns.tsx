import { type DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { type ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/Button"

import { type OrderRecord } from "./data"
import {
  CustomerFace,
  formatCurrency,
  formatOrderDate,
  FulfillmentMeter,
  OrderStatusFace,
} from "./value-faces"

type OrderViewHandler = (order: OrderRecord, origin: HTMLElement) => void

function OrderCell({
  order,
  onView,
}: {
  order: OrderRecord
  onView: OrderViewHandler
}) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="hover:text-primary block max-w-full truncate text-left text-sm font-medium underline-offset-2 transition-colors hover:underline"
        aria-label={`View order ${order.id}`}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation()
          onView(order, event.currentTarget)
        }}
      >
        {order.id}
      </button>
      <div className="text-muted-foreground truncate text-xs">
        {formatOrderDate(order)}
      </div>
    </div>
  )
}

function ProductCell({ order }: { order: OrderRecord }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{order.product}</div>
      <div className="text-muted-foreground truncate font-mono text-xs">
        {order.sku}
      </div>
    </div>
  )
}

function AmountCell({ order }: { order: OrderRecord }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium tabular-nums">
        {formatCurrency(order.amount)}
      </div>
      <div className="text-muted-foreground text-xs tabular-nums">
        Qty {order.quantity}
      </div>
    </div>
  )
}

function ActionsCell({
  order,
  onView,
}: {
  order: OrderRecord
  onView: OrderViewHandler
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`View ${order.id}`}
      aria-haspopup="dialog"
      onClick={(event) => {
        event.stopPropagation()
        onView(order, event.currentTarget)
      }}
    >
      View
    </Button>
  )
}

export function createOrderColumns({
  onView,
}: {
  onView: OrderViewHandler
}): ColumnDef<DataGridFeatures, OrderRecord>[] {
  return [
    {
      accessorKey: "id",
      id: "id",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <OrderCell order={row.original} onView={onView} />,
      size: 144,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Order",
        cellClassName: "ps-4!",
        headerClassName: "ps-4!",
      },
    },
    {
      accessorKey: "customer",
      id: "customer",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <CustomerFace order={row.original} />,
      size: 224,
      minSize: 190,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Customer",
        autoSize: true,
      },
    },
    {
      accessorKey: "product",
      id: "product",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <ProductCell order={row.original} />,
      size: 196,
      minSize: 160,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Product",
      },
    },
    {
      accessorKey: "progress",
      id: "fulfillment",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <FulfillmentMeter order={row.original} />,
      size: 196,
      minSize: 160,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Fulfillment",
      },
    },
    {
      accessorKey: "amount",
      id: "amount",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <AmountCell order={row.original} />,
      size: 120,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Amount",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <OrderStatusFace status={row.original.status} />,
      size: 128,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Status",
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ActionsCell order={row.original} onView={onView} />,
      size: 88,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      meta: {
        cellClassName: "pe-4!",
        headerClassName: "pe-4!",
      },
    },
  ]
}