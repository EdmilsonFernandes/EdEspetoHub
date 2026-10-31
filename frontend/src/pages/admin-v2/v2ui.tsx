// Blocos visuais compartilhados da V2: chip de variação, estados de região
// (carregando/erro/vazio) e o frame de página das seções.
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/skeleton';
import { Frame, FramePanel } from '../../components/reui/frame';

/** Chip de variação vs período anterior (ex: +12%). */
export const V2DeltaChip = ({ pct }: { pct: number | null }) => {
  if (pct === null || !Number.isFinite(pct)) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const rounded = Math.round(pct);
  const up = rounded > 0;
  const flat = rounded === 0;
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-medium tabular-nums',
        flat
          ? 'border-border text-muted-foreground'
          : up
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400'
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {up ? '+' : ''}
      {rounded}%
    </span>
  );
};

/** Estado de carregamento de uma região — skeleton no layout real. */
export const V2LoadingRegion = ({ rows = 3, className }: { rows?: number; className?: string }) => (
  <div className={cn('flex flex-col gap-2', className)} aria-busy="true">
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} className="h-12 w-full" />
    ))}
  </div>
);

/** Estado de erro de uma região, com tentar de novo. */
export const V2ErrorRegion = ({
  message = 'Não foi possível carregar.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-start gap-2 py-6" role="alert">
    <p className="text-destructive text-sm">{message}</p>
    {onRetry && (
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    )}
  </div>
);

/** Estado vazio de uma região, com 1 ação opcional. */
export const V2EmptyRegion = ({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center">
    <p className="text-sm font-medium">{title}</p>
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    {action && <div className="pt-1.5">{action}</div>}
  </div>
);

/** KPI da home: valor grande + label + delta. */
export const V2MetricTile = ({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  hint?: string;
}) => (
  <FramePanel className="flex flex-col gap-1 p-4">
    <span className="text-muted-foreground text-xs font-medium">{label}</span>
    <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
    <span className="flex items-center gap-2 text-xs">
      {delta}
      {hint && <span className="text-muted-foreground">{hint}</span>}
    </span>
  </FramePanel>
);

/** Frame de página das seções (header de seção + conteúdo). */
export const V2SectionFrame = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <Frame className={cn('min-h-0 flex-1', className)}>
    <FramePanel className="flex min-h-0 flex-1 flex-col gap-4 p-4">{children}</FramePanel>
  </Frame>
);
