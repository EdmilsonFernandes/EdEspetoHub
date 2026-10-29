import { type ReactNode } from "react"

import { IconPlaceholder } from "@/components/reui/icon-placeholder"

export type WorkflowPerson = {
  name: string
  initials: string
  avatar: string
}

export type WorkflowTask = {
  id: string
  title: string
  taskKey: string
  dueLabel: string
  owner: WorkflowPerson
  assignees: WorkflowPerson[]
  valueLabel: string
  fieldLabel: string
  attachmentCount: number
  checklistCount: number
  commentCount: number
}

export type WorkflowColumn = {
  id: string
  title: string
  description: string
  icon: ReactNode
  toneClassName: string
}

export const DEFAULT_COLLAPSED_COLUMN_IDS = [
  "blocked",
  "reviewing",
  "done",
  "closed",
  "cancelled",
]

const PEOPLE = {
  nora: {
    name: "Nora Lee",
    initials: "NL",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&dpr=2&q=80",
  },
  marcus: {
    name: "Marcus Chen",
    initials: "MC",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&dpr=2&q=80",
  },
  priya: {
    name: "Priya Shah",
    initials: "PS",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&dpr=2&q=80",
  },
  omar: {
    name: "Omar Haddad",
    initials: "OH",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&dpr=2&q=80",
  },
  elena: {
    name: "Elena Torres",
    initials: "ET",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&dpr=2&q=80",
  },
  liam: {
    name: "Liam Carter",
    initials: "LC",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&dpr=2&q=80",
  },
} satisfies Record<string, WorkflowPerson>

export const BOARD_COLUMNS: WorkflowColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    description: "New ideas",
    toneClassName: "text-gray-500",
    icon: (
      <IconPlaceholder
        lucide="CircleDotIcon"
        tabler="IconCircleDot"
        hugeicons="CircleIcon"
        phosphor="CircleIcon"
        remixicon="RiRecordCircleLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "todo",
    title: "Todo",
    description: "Ready to start",
    toneClassName: "text-sky-500",
    icon: (
      <IconPlaceholder
        lucide="CircleIcon"
        tabler="IconCircle"
        hugeicons="CircleIcon"
        phosphor="CircleIcon"
        remixicon="RiCircleLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "inProgress",
    title: "In Progress",
    description: "Active work",
    toneClassName: "text-amber-500",
    icon: (
      <IconPlaceholder
        lucide="CircleDotIcon"
        tabler="IconCircleDot"
        hugeicons="CircleIcon"
        phosphor="CircleIcon"
        remixicon="RiRecordCircleLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "blocked",
    title: "Blocked",
    description: "Needs help",
    toneClassName: "text-red-500",
    icon: (
      <IconPlaceholder
        lucide="CircleXIcon"
        tabler="IconCircleX"
        hugeicons="CancelCircleIcon"
        phosphor="XCircleIcon"
        remixicon="RiCloseCircleLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "reviewing",
    title: "Reviewing",
    description: "In review",
    toneClassName: "text-violet-500",
    icon: (
      <IconPlaceholder
        lucide="ClockIcon"
        tabler="IconClock"
        hugeicons="ClockIcon"
        phosphor="ClockIcon"
        remixicon="RiTimeLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "done",
    title: "Done",
    description: "Ready",
    toneClassName: "text-green-500",
    icon: (
      <IconPlaceholder
        lucide="CircleCheckIcon"
        tabler="IconCircleCheck"
        hugeicons="CheckmarkCircle02Icon"
        phosphor="CheckCircleIcon"
        remixicon="RiCheckboxCircleLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "closed",
    title: "Closed",
    description: "Archived",
    toneClassName: "text-rose-500",
    icon: (
      <IconPlaceholder
        lucide="CircleXIcon"
        tabler="IconCircleX"
        hugeicons="CancelCircleIcon"
        phosphor="XCircleIcon"
        remixicon="RiCloseCircleLine"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "cancelled",
    title: "Cancelled",
    description: "Stopped",
    toneClassName: "text-orange-500",
    icon: (
      <IconPlaceholder
        lucide="PauseCircleIcon"
        tabler="IconPlayerPauseFilled"
        hugeicons="PauseCircleIcon"
        phosphor="PauseCircleIcon"
        remixicon="RiPauseCircleLine"
        aria-hidden="true"
      />
    ),
  },
]

export const BOARD_TASKS: Record<string, WorkflowTask[]> = {
  backlog: [
    {
      id: "task-1",
      title:
        "Draft partner intake workflow for multi-region implementation teams",
      taskKey: "OPS-1",
      dueLabel: "24d",
      owner: PEOPLE.elena,
      assignees: [PEOPLE.elena, PEOPLE.nora],
      valueLabel: "$12,800.00",
      fieldLabel: "Define approval path...",
      attachmentCount: 1,
      checklistCount: 3,
      commentCount: 2,
    },
    {
      id: "task-2",
      title: "Map renewal risk signals",
      taskKey: "REV-2",
      dueLabel: "21d",
      owner: PEOPLE.omar,
      assignees: [PEOPLE.omar, PEOPLE.priya],
      valueLabel: "$32,500.00",
      fieldLabel: "Choose data sources...",
      attachmentCount: 2,
      checklistCount: 5,
      commentCount: 4,
    },
  ],
  todo: [
    {
      id: "task-3",
      title:
        "Prepare workspace launch checklist for enterprise tenant provisioning",
      taskKey: "OPS-3",
      dueLabel: "18d",
      owner: PEOPLE.nora,
      assignees: [PEOPLE.nora, PEOPLE.priya],
      valueLabel: "$24,000.00",
      fieldLabel: "Set adoption target...",
      attachmentCount: 2,
      checklistCount: 4,
      commentCount: 3,
    },
    {
      id: "task-4",
      title: "Create account health scorecard with renewal risk weighting",
      taskKey: "CS-4",
      dueLabel: "14d",
      owner: PEOPLE.priya,
      assignees: [PEOPLE.priya, PEOPLE.liam],
      valueLabel: "$16,900.00",
      fieldLabel: "Confirm scoring weights...",
      attachmentCount: 3,
      checklistCount: 6,
      commentCount: 2,
    },
    {
      id: "task-5",
      title:
        "Review procurement handoff notes for multi-region vendor approval",
      taskKey: "FIN-5",
      dueLabel: "12d",
      owner: PEOPLE.liam,
      assignees: [PEOPLE.liam, PEOPLE.marcus],
      valueLabel: "$9,600.00",
      fieldLabel: "Attach vendor terms...",
      attachmentCount: 2,
      checklistCount: 2,
      commentCount: 1,
    },
  ],
  inProgress: [
    {
      id: "task-6",
      title: "Automate invoice approval queue",
      taskKey: "FIN-6",
      dueLabel: "8d",
      owner: PEOPLE.omar,
      assignees: [PEOPLE.omar, PEOPLE.elena],
      valueLabel: "$41,200.00",
      fieldLabel: "Connect approval rules...",
      attachmentCount: 4,
      checklistCount: 7,
      commentCount: 6,
    },
    {
      id: "task-7",
      title: "Build segment sync audit trail",
      taskKey: "DATA-7",
      dueLabel: "5d",
      owner: PEOPLE.priya,
      assignees: [PEOPLE.priya, PEOPLE.marcus],
      valueLabel: "$27,400.00",
      fieldLabel: "Log sync failures...",
      attachmentCount: 2,
      checklistCount: 5,
      commentCount: 4,
    },
  ],
  blocked: [
    {
      id: "task-8",
      title:
        "Resolve billing export permissions for restricted finance workspaces",
      taskKey: "SEC-8",
      dueLabel: "6d",
      owner: PEOPLE.marcus,
      assignees: [PEOPLE.marcus, PEOPLE.omar],
      valueLabel: "$18,400.00",
      fieldLabel: "Needs security review...",
      attachmentCount: 1,
      checklistCount: 2,
      commentCount: 5,
    },
    {
      id: "task-9",
      title: "Unblock data residency exception",
      taskKey: "SEC-9",
      dueLabel: "4d",
      owner: PEOPLE.elena,
      assignees: [PEOPLE.elena, PEOPLE.marcus],
      valueLabel: "$22,700.00",
      fieldLabel: "Waiting on legal note...",
      attachmentCount: 3,
      checklistCount: 1,
      commentCount: 7,
    },
  ],
  reviewing: [
    {
      id: "task-10",
      title:
        "Validate enterprise rollout guide across premium workspace migrations",
      taskKey: "DOC-10",
      dueLabel: "3d",
      owner: PEOPLE.nora,
      assignees: [PEOPLE.nora, PEOPLE.elena],
      valueLabel: "$13,500.00",
      fieldLabel: "Check migration steps...",
      attachmentCount: 2,
      checklistCount: 8,
      commentCount: 3,
    },
    {
      id: "task-11",
      title: "Approve usage alert thresholds",
      taskKey: "OPS-11",
      dueLabel: "2d",
      owner: PEOPLE.liam,
      assignees: [PEOPLE.liam, PEOPLE.omar],
      valueLabel: "$19,300.00",
      fieldLabel: "Review alert copy...",
      attachmentCount: 1,
      checklistCount: 4,
      commentCount: 5,
    },
    {
      id: "task-12",
      title: "QA workspace invite permissions",
      taskKey: "QA-12",
      dueLabel: "1d",
      owner: PEOPLE.marcus,
      assignees: [PEOPLE.marcus, PEOPLE.priya],
      valueLabel: "$11,200.00",
      fieldLabel: "Verify role matrix...",
      attachmentCount: 2,
      checklistCount: 6,
      commentCount: 2,
    },
  ],
  done: [
    {
      id: "task-13",
      title: "Ship saved filter presets",
      taskKey: "APP-13",
      dueLabel: "Done",
      owner: PEOPLE.priya,
      assignees: [PEOPLE.priya, PEOPLE.nora],
      valueLabel: "$15,600.00",
      fieldLabel: "Release notes ready...",
      attachmentCount: 1,
      checklistCount: 5,
      commentCount: 4,
    },
    {
      id: "task-14",
      title: "Publish onboarding checklist",
      taskKey: "DOC-14",
      dueLabel: "Done",
      owner: PEOPLE.elena,
      assignees: [PEOPLE.elena, PEOPLE.liam],
      valueLabel: "$8,400.00",
      fieldLabel: "Handoff complete...",
      attachmentCount: 2,
      checklistCount: 3,
      commentCount: 1,
    },
  ],
  closed: [],
  cancelled: [
    {
      id: "task-15",
      title: "Pause legacy import wizard after consolidated sync rollout",
      taskKey: "APP-15",
      dueLabel: "Stopped",
      owner: PEOPLE.omar,
      assignees: [PEOPLE.omar, PEOPLE.liam],
      valueLabel: "$6,200.00",
      fieldLabel: "Superseded by sync...",
      attachmentCount: 1,
      checklistCount: 2,
      commentCount: 3,
    },
    {
      id: "task-16",
      title: "Cancel region beta survey",
      taskKey: "RES-16",
      dueLabel: "Stopped",
      owner: PEOPLE.nora,
      assignees: [PEOPLE.nora, PEOPLE.marcus],
      valueLabel: "$4,900.00",
      fieldLabel: "Archive survey draft...",
      attachmentCount: 2,
      checklistCount: 1,
      commentCount: 2,
    },
  ],
}