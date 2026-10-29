import { type ReactNode } from "react"

import { Item, ItemMedia } from "@/components/ui/item"

// Raised icon tile for the KPI metric panels.
const ICON_CONTAINER_CLASS_NAME =
  "border-background bg-muted [&_svg]:text-accent-foreground flex size-9 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4"

export function IconContainer({ icon }: { icon: ReactNode }) {
  return (
    <Item className={ICON_CONTAINER_CLASS_NAME}>
      <ItemMedia variant="icon" className="size-auto">
        {icon}
      </ItemMedia>
    </Item>
  )
}