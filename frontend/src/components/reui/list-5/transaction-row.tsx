import { cn } from "@/lib/utils"

import { Item, ItemMedia } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { IconPlaceholder } from "@/components/reui/icon-placeholder"

import { type CryptoTransaction, type TransactionTone } from "./data"

function TransactionIcon({ tone }: { tone: TransactionTone }) {
  const isCredit = tone === "credit"
  return (
    <Item
      className={cn(
        "border-background flex size-9.5 shrink-0 items-center justify-center border-3 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-5",
        isCredit
          ? "text-success bg-success/15"
          : "text-destructive bg-destructive/15"
      )}
    >
      <ItemMedia variant="icon" className="size-auto">
        {isCredit ? (
          <IconPlaceholder
            lucide="ArrowUpRightIcon"
            tabler="IconArrowUpRight"
            hugeicons="ArrowUpRight01Icon"
            phosphor="ArrowUpRightIcon"
            remixicon="RiArrowRightUpLine"
            aria-hidden="true"
          />
        ) : (
          <IconPlaceholder
            lucide="ArrowUpRightIcon"
            tabler="IconArrowUpRight"
            hugeicons="ArrowUpRight01Icon"
            phosphor="ArrowUpRightIcon"
            remixicon="RiArrowRightUpLine"
            aria-hidden="true"
            className="rotate-90"
          />
        )}
      </ItemMedia>
    </Item>
  )
}

export function TransactionRow({
  transaction,
  showSeparator,
}: {
  transaction: CryptoTransaction
  showSeparator: boolean
}) {
  return (
    <li>
      <div className="flex items-center gap-2 px-4 py-3.5">
        <TransactionIcon tone={transaction.tone} />

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-foreground text-sm leading-none font-medium">
            {transaction.title}
          </p>
          <p className="text-muted-foreground text-xs leading-4">
            {transaction.date}
          </p>
        </div>

        <p
          className={cn(
            "shrink-0 text-right text-lg leading-none font-medium",
            transaction.tone === "credit" ? "text-success" : "text-destructive"
          )}
        >
          {transaction.amount}
        </p>
      </div>
      {showSeparator ? <Separator /> : null}
    </li>
  )
}