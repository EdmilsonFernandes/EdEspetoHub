import { Frame, FramePanel } from "@/components/reui/frame"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { cryptoTransactions } from "./data"
import { TransactionRow } from "./transaction-row"

export function CryptoTransactions() {
  return (
    <Frame className="@container w-full max-w-[26rem]">
      <FramePanel className="p-0!">
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="sr-only" aria-label="Crypto transaction views">
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-0">
            {/* Content */}
            <ul className="flex flex-col">
              {cryptoTransactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.title}
                  transaction={transaction}
                  showSeparator={index < cryptoTransactions.length - 1}
                />
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </FramePanel>
    </Frame>
  )
}