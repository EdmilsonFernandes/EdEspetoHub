import { Box } from "lucide-react"

/** Stub dos demos ReUI (aceita as props de icon-set e ignora; trocar por
 *  ícone Phosphor real ao portar o bloco). */
export function IconPlaceholder({ className }: { className?: string } & Record<string, unknown>) {
  return <Box className={className} aria-hidden="true" />
}
