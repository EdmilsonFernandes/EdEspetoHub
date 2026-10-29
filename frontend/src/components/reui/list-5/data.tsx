// ── Types ──

export type TransactionTone = "credit" | "debit"

export interface CryptoTransaction {
  title: string
  date: string
  amount: string
  tone: TransactionTone
}

// ── Data ──

export const cryptoTransactions: CryptoTransaction[] = [
  {
    title: "Ethereum Gain",
    date: "12th May, 2026",
    amount: "+ $1,980",
    tone: "credit",
  },
  {
    title: "Bitcoin Sold",
    date: "11th May, 2026",
    amount: "- $2,450",
    tone: "debit",
  },
  {
    title: "USDT Deposit",
    date: "9th May, 2026",
    amount: "+ $3,200",
    tone: "credit",
  },
  {
    title: "Staking Reward",
    date: "8th May, 2026",
    amount: "+ $126",
    tone: "credit",
  },
  {
    title: "Solana Purchase",
    date: "6th May, 2026",
    amount: "- $750",
    tone: "debit",
  },
]