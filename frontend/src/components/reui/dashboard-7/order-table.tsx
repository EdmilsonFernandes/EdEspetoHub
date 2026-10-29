import { useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/Button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { IconPlaceholder } from "@/components/reui/icon-placeholder"

import { type OrderRecord } from "./data"
import { createOrderColumns } from "./order-columns"

export function OrderTable({
  orders,
  summary,
  query,
  exceptionsOnly,
  onQueryChange,
  onExceptionsToggle,
  onOrderView,
}: {
  orders: OrderRecord[]
  /** Count and date range of the current view, shown under the title. */
  summary: string
  query: string
  exceptionsOnly: boolean
  onQueryChange: (query: string) => void
  onExceptionsToggle: () => void
  onOrderView: (order: OrderRecord, origin: HTMLElement) => void
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "amount", desc: true },
  ])

  const columns = useMemo(
    () => createOrderColumns({ onView: onOrderView }),
    [onOrderView]
  )

  const resetPagination = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const handleSearchChange = (value: string) => {
    onQueryChange(value)
    resetPagination()
  }

  const handleExceptionsToggle = () => {
    onExceptionsToggle()
    resetPagination()
  }

  // A narrower date range can leave the current page past the end; clamp it.
  const pageCount = Math.max(Math.ceil(orders.length / pagination.pageSize), 1)
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1)

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useTable({
    features: dataGridFeatures,
    data: orders,
    columns,
    pageCount,
    state: { pagination: { ...pagination, pageIndex }, sorting },
    getRowId: (row) => row.id,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  return (
    <DataGrid
      table={table}
      recordCount={orders.length}
      emptyMessage="No orders match the current view."
      tableLayout={{
        dense: true,
        rowBorder: true,
        headerSticky: false,
        columnsVisibility: false,
        columnsResizable: true,
        columnsMovable: false,
        width: "fixed",
      }}
      tableClassNames={{
        bodyRow: "[&>td]:h-16",
      }}
    >
      <Frame className="min-w-0">
        <FrameHeader className="flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-px">
            <FrameTitle>Order Queue</FrameTitle>
            <FrameDescription>{summary}</FrameDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <InputGroup className="w-full sm:min-w-56 lg:w-64">
              <InputGroupAddon>
                <IconPlaceholder
                  lucide="SearchIcon"
                  tabler="IconSearch"
                  hugeicons="Search01Icon"
                  phosphor="MagnifyingGlassIcon"
                  remixicon="RiSearchLine"
                  aria-hidden="true"
                />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search orders"
                aria-label="Search orders"
              />
              {query.length > 0 ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => handleSearchChange("")}
                  >
                    <IconPlaceholder
                      lucide="XIcon"
                      tabler="IconX"
                      hugeicons="Cancel01Icon"
                      phosphor="XIcon"
                      remixicon="RiCloseLine"
                      aria-hidden="true"
                    />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <Button
              type="button"
              variant={exceptionsOnly ? "secondary" : "outline"}
              size="sm"
              aria-pressed={exceptionsOnly}
              onClick={handleExceptionsToggle}
            >
              <IconPlaceholder
                lucide="FilterIcon"
                tabler="IconFilter"
                hugeicons="FilterIcon"
                phosphor="FunnelIcon"
                remixicon="RiFilterLine"
                aria-hidden="true"
              />
              Exceptions
              {exceptionsOnly ? (
                <Badge variant="info-outline">{orders.length}</Badge>
              ) : null}
            </Button>
          </div>
        </FrameHeader>
        <FramePanel className="p-0!">
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </FramePanel>
        <FrameFooter>
          <DataGridPagination
            sizes={[5, 10]}
            info="{from} - {to} of {count} orders"
            className="py-0"
          />
        </FrameFooter>
      </Frame>
    </DataGrid>
  )
}