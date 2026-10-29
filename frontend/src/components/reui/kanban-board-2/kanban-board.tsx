"use client"

import { useState, type ComponentProps, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/Button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Item, ItemMedia } from "@/components/ui/item"
import { IconPlaceholder } from "@/components/reui/icon-placeholder"

import {
  BOARD_COLUMNS,
  BOARD_TASKS,
  DEFAULT_COLLAPSED_COLUMN_IDS,
  type WorkflowColumn,
  type WorkflowPerson,
  type WorkflowTask,
} from "./data"

const BOARD_COLUMN_BY_ID = new Map(
  BOARD_COLUMNS.map((column) => [column.id, column])
)

function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className="relative flex h-full min-h-0 w-full min-w-0 flex-1 pb-3"
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 h-full w-full rounded-lg transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          className="flex h-full min-w-full"
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        data-orientation="horizontal"
        orientation="horizontal"
        className="flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="bg-foreground/15 relative flex-1 rounded-full"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ColumnIcon({ column }: { column: WorkflowColumn }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center [&>svg]:size-4",
        column.toneClassName
      )}
      aria-hidden="true"
    >
      {column.icon}
    </span>
  )
}

function AddCardButton({ column }: { column: WorkflowColumn }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="bg-background/85 text-muted-foreground hover:text-foreground pointer-events-none h-7 w-full opacity-0 transition-opacity group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
      aria-label={`Add card to ${column.title}`}
    >
      <IconPlaceholder
        lucide="PlusIcon"
        tabler="IconPlus"
        hugeicons="PlusSignIcon"
        phosphor="PlusIcon"
        remixicon="RiAddLine"
        aria-hidden="true"
      />
    </Button>
  )
}

function EmptyColumnMessage() {
  return (
    <div className="text-muted-foreground flex min-h-24 items-center justify-center rounded-md border border-dashed px-3 text-center text-sm">
      No cards yet
    </div>
  )
}

function BoardToolbar() {
  return (
    <header className="px-1 py-1" aria-label="Workflow board toolbar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">Workflow Board</h2>
        </div>

        <div
          className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end"
          role="group"
          aria-label="Board actions"
        >
          <Button type="button" variant="outline">
            <IconPlaceholder
              lucide="FilterIcon"
              tabler="IconFilter"
              hugeicons="FilterIcon"
              phosphor="FunnelIcon"
              remixicon="RiFilterLine"
              data-icon="inline-start"
              aria-hidden="true"
            />
            Filters
          </Button>

          <Button type="button" variant="outline">
            <IconPlaceholder
              lucide="Columns3Icon"
              tabler="IconColumns3"
              hugeicons="Layout07Icon"
              phosphor="ColumnsIcon"
              remixicon="RiLayoutColumnLine"
              data-icon="inline-start"
              aria-hidden="true"
            />
            Columns
          </Button>

          <Button type="button">
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="PlusSignIcon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
              data-icon="inline-start"
              aria-hidden="true"
            />
            New card
          </Button>
        </div>
      </div>
    </header>
  )
}

function AssigneeAvatars({ assignees }: { assignees: WorkflowPerson[] }) {
  return (
    <div className="flex" aria-label="Assignees">
      {assignees.map((assignee) => (
        <Avatar
          key={assignee.name}
          size="sm"
          className="ring-background -ml-1.5 size-5 ring-2 first:ml-0"
        >
          <AvatarImage src={assignee.avatar} alt={assignee.name} />
          <AvatarFallback className="text-[0.625rem]">
            {assignee.initials}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

function findWorkflowTask(
  columns: Record<string, WorkflowTask[]>,
  taskId: string
) {
  for (const tasks of Object.values(columns)) {
    const task = tasks.find((item) => item.id === taskId)

    if (task) {
      return task
    }
  }

  return null
}

function TaskDetailRow({
  icon,
  children,
  muted,
}: {
  icon: ReactNode
  children: ReactNode
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        "grid min-h-5 min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 text-sm",
        muted && "text-muted-foreground"
      )}
    >
      <Item
        render={<span />}
        className="text-muted-foreground flex size-4 items-center justify-center border-0 p-0"
      >
        <ItemMedia variant="icon" className="size-auto">
          {icon}
        </ItemMedia>
      </Item>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

interface TaskCardProps extends Omit<
  ComponentProps<typeof KanbanItem>,
  "value" | "children"
> {
  task: WorkflowTask
  isOverlay?: boolean
}

function TaskCard({ task, isOverlay, ...props }: TaskCardProps) {
  const card = (
    <Card size="sm" className={cn("gap-0 p-0", isOverlay && "shadow-lg")}>
      <CardHeader className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 px-3 pt-3 pb-0">
        <Item
          render={<span />}
          className="text-muted-foreground flex size-4 shrink-0 items-center justify-center border-0 p-0"
          aria-hidden="true"
        >
          <ItemMedia variant="icon" className="size-auto">
            <IconPlaceholder
              lucide="Pin"
              tabler="IconPin"
              hugeicons="Pin02Icon"
              phosphor="PushPinIcon"
              remixicon="RiPushpinLine"
              className="size-3.5"
              aria-hidden="true"
            />
          </ItemMedia>
        </Item>
        <CardTitle
          className="min-w-0 truncate text-sm leading-5"
          title={task.title}
        >
          {task.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-[8.75rem] flex-col gap-3 px-3 pt-3 pb-3">
        <div className="flex flex-col gap-2">
          <TaskDetailRow
            icon={
              <IconPlaceholder
                lucide="UserRoundIcon"
                tabler="IconUser"
                hugeicons="UserIcon"
                phosphor="UserIcon"
                remixicon="RiUserLine"
                className="size-3.5"
                aria-hidden="true"
              />
            }
          >
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm" className="size-5">
                <AvatarImage src={task.owner.avatar} alt={task.owner.name} />
                <AvatarFallback className="text-[0.625rem]">
                  {task.owner.initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate" title={task.owner.name}>
                {task.owner.name}
              </span>
            </div>
          </TaskDetailRow>

          <TaskDetailRow
            icon={
              <IconPlaceholder
                lucide="CircleDollarSignIcon"
                tabler="IconPremiumRights"
                hugeicons="DollarCircleIcon"
                phosphor="CurrencyCircleDollarIcon"
                remixicon="RiMoneyDollarCircleLine"
                className="size-3.5"
                aria-hidden="true"
              />
            }
          >
            <span
              className="truncate font-medium tabular-nums"
              title={task.valueLabel}
            >
              {task.valueLabel}
            </span>
          </TaskDetailRow>

          <TaskDetailRow
            muted
            icon={
              <IconPlaceholder
                lucide="SquareCheckIcon"
                tabler="IconSquareCheck"
                hugeicons="CheckmarkSquare02Icon"
                phosphor="CheckSquareIcon"
                remixicon="RiCheckboxLine"
                className="size-3.5"
                aria-hidden="true"
              />
            }
          >
            <span className="truncate" title={task.fieldLabel}>
              {task.fieldLabel}
            </span>
          </TaskDetailRow>
        </div>

        <div className="text-muted-foreground mt-auto flex min-w-0 items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex items-center gap-1 tabular-nums">
              <IconPlaceholder
                lucide="FileIcon"
                tabler="IconFile"
                hugeicons="FileEmpty02Icon"
                phosphor="FileIcon"
                remixicon="RiFileLine"
                className="size-3.5"
                aria-hidden="true"
              />
              <span className="tabular-nums">{task.attachmentCount}</span>
            </span>

            <span className="flex items-center gap-1 tabular-nums">
              <IconPlaceholder
                lucide="SquareCheckIcon"
                tabler="IconSquareCheck"
                hugeicons="CheckmarkSquare02Icon"
                phosphor="CheckSquareIcon"
                remixicon="RiCheckboxLine"
                className="size-3.5"
                aria-hidden="true"
              />
              <span className="tabular-nums">{task.checklistCount}</span>
            </span>

            <span className="flex items-center gap-1 tabular-nums">
              <IconPlaceholder
                lucide="MessageSquareIcon"
                tabler="IconMessageDots"
                hugeicons="Message02Icon"
                phosphor="ChatIcon"
                remixicon="RiChat4Line"
                className="size-3.5"
                aria-hidden="true"
              />
              <span className="tabular-nums">{task.commentCount}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AssigneeAvatars assignees={task.assignees} />
            <span className="flex items-center gap-1 tabular-nums">
              <IconPlaceholder
                lucide="ClockIcon"
                tabler="IconClock"
                hugeicons="ClockIcon"
                phosphor="ClockIcon"
                remixicon="RiTimeLine"
                className="size-3.5"
                aria-hidden="true"
              />
              {task.dueLabel}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {isOverlay ? (
        card
      ) : (
        <KanbanItemHandle className="block">{card}</KanbanItemHandle>
      )}
    </KanbanItem>
  )
}

function ExpandedColumn({
  column,
  tasks,
  onCollapse,
  isOverlay,
}: {
  column: WorkflowColumn
  tasks: WorkflowTask[]
  onCollapse: () => void
  isOverlay?: boolean
}) {
  return (
    <KanbanColumn
      value={column.id}
      className="h-full min-h-full w-[calc(100vw-5.5rem)] max-w-[21.5rem] shrink-0 self-stretch sm:w-[21.5rem]"
    >
      <Card
        size="sm"
        className={cn(
          "group/column h-full min-h-full w-full gap-0 p-0",
          isOverlay && "shadow-lg"
        )}
        aria-label={`${column.title}: ${column.description}`}
      >
        <CardHeader className="flex min-h-10 flex-row items-center gap-2 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ColumnIcon column={column} />
            <CardTitle className="truncate text-sm" title={column.title}>
              {column.title}
            </CardTitle>
            <Badge variant="outline" className="bg-background">
              {tasks.length}
            </Badge>
          </div>

          <CardAction
            className={cn(
              "ml-auto flex items-center gap-1 self-center",
              isOverlay
                ? "hidden"
                : "pointer-events-none opacity-0 transition-opacity group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Collapse ${column.title}`}
              onClick={onCollapse}
            >
              <IconPlaceholder
                lucide="ChevronLeftIcon"
                tabler="IconChevronLeft"
                hugeicons="ArrowLeft01Icon"
                phosphor="CaretLeftIcon"
                remixicon="RiArrowLeftSLine"
                aria-hidden="true"
              />
            </Button>
            <KanbanColumnHandle
              className="opacity-100!"
              render={({ className, ...handleProps }) => (
                <Button
                  {...handleProps}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${column.title} column`}
                  className={cn(
                    "text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing",
                    className
                  )}
                >
                  <IconPlaceholder
                    lucide="GripVerticalIcon"
                    tabler="IconGripVertical"
                    hugeicons="DragDropVerticalIcon"
                    phosphor="DotsSixVerticalIcon"
                    remixicon="RiDraggable"
                    aria-hidden="true"
                  />
                </Button>
              )}
            />
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col p-2 pt-0">
          <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
            <KanbanColumnContent value={column.id} className="min-h-full gap-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasks.length === 0 && <EmptyColumnMessage />}
              <AddCardButton column={column} />
            </KanbanColumnContent>
          </div>
        </CardContent>
      </Card>
    </KanbanColumn>
  )
}

function CollapsedColumn({
  column,
  tasks,
  onExpand,
}: {
  column: WorkflowColumn
  tasks: WorkflowTask[]
  onExpand: () => void
}) {
  return (
    <KanbanColumn
      value={column.id}
      className="h-full min-h-full shrink-0 self-stretch"
    >
      <Card size="sm" className="bg-muted h-full min-h-full w-10 gap-0 p-0">
        <Button
          type="button"
          variant="ghost"
          aria-label={`Expand ${column.title}: ${column.description}`}
          aria-expanded={false}
          onClick={onExpand}
          className="h-full w-full cursor-pointer flex-col justify-start gap-2 rounded-lg px-0 py-2.5"
        >
          <ColumnIcon column={column} />
          <span className="flex min-h-0 items-start justify-center pt-1">
            <span className="text-foreground rotate-180 truncate text-xs font-medium [writing-mode:vertical-rl]">
              {column.title}
            </span>
          </span>
          <span className="text-foreground text-xs tabular-nums">
            {tasks.length}
          </span>
        </Button>
      </Card>
    </KanbanColumn>
  )
}

export function KanbanBoard() {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_COLLAPSED_COLUMN_IDS)
  )
  const [tasksByColumn, setTasksByColumn] = useState(BOARD_TASKS)
  const columnEntries = Object.entries(tasksByColumn)
  const columnIds = columnEntries.map(([columnId]) => columnId)

  function toggleColumn(columnId: string) {
    setCollapsedColumns((current) => {
      const next = new Set(current)

      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }

      return next
    })
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-col gap-4">
      <BoardToolbar />

      <Kanban
        value={tasksByColumn}
        onValueChange={setTasksByColumn}
        getItemValue={(item) => item.id}
        className="min-h-0 flex-1"
      >
        <BoardScrollArea>
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            <div
              data-slot="kanban-board"
              className="flex h-full min-h-full min-w-full items-stretch gap-3 p-1"
            >
              {columnEntries.map(([columnId, tasks]) => {
                const column = BOARD_COLUMN_BY_ID.get(columnId)

                if (!column) {
                  return null
                }

                const isCollapsed = collapsedColumns.has(columnId)

                return isCollapsed ? (
                  <CollapsedColumn
                    key={columnId}
                    column={column}
                    tasks={tasks}
                    onExpand={() => toggleColumn(columnId)}
                  />
                ) : (
                  <ExpandedColumn
                    key={columnId}
                    column={column}
                    tasks={tasks}
                    onCollapse={() => toggleColumn(columnId)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </BoardScrollArea>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const column = BOARD_COLUMN_BY_ID.get(String(value))

              if (!column) {
                return null
              }

              return (
                <ExpandedColumn
                  column={column}
                  tasks={tasksByColumn[String(value)] ?? []}
                  onCollapse={() => undefined}
                  isOverlay
                />
              )
            }

            const task = findWorkflowTask(tasksByColumn, String(value))

            return task ? <TaskCard task={task} isOverlay /> : null
          }}
        </KanbanOverlay>
      </Kanban>
    </section>
  )
}