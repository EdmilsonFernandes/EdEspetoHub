import { cn } from './classNames';

type SkeletonCardProps = {
  /** Show an avatar/icon placeholder (default: false) */
  avatar?: boolean;
  /** Number of text lines (default: 2) */
  lines?: number;
  className?: string;
};

/**
 * Pre-composed skeleton for a card layout. Uses the global dsSkeletonShimmer animation.
 */
export function SkeletonCard({ avatar = false, lines = 2, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {avatar ? (
          <div className="h-11 w-11 shrink-0 animate-[dsSkeletonShimmer_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite] rounded-2xl bg-slate-100" />
        ) : null}
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-3/4 animate-[dsSkeletonShimmer_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite] rounded-lg bg-slate-100" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 animate-[dsSkeletonShimmer_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite] rounded-lg bg-slate-100',
                i === lines - 2 ? 'w-1/2' : 'w-full',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
