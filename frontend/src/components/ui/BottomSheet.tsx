import { useEffect, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from './classNames';
import { IconButton } from './IconButton';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  labelledById?: string;
  /** Centraliza também no mobile (momentos de atenção total, ex.: pagamento). */
  mobileCentered?: boolean;
};

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  labelledById = 'jnc-bottom-sheet-title',
  mobileCentered = false,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[10000] flex justify-center bg-slate-950/45 px-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[3px] sm:items-center sm:p-4 ${mobileCentered ? 'items-center p-3' : 'items-end pb-0'}`} role="dialog" aria-modal="true" aria-labelledby={labelledById}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className={cn('jnc-ds-surface relative z-10 flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-lg flex-col overflow-hidden rounded-b-none rounded-t-[2rem] shadow-[var(--jnc-shadow-sheet)] sm:max-h-[min(44rem,calc(100dvh-2rem))] sm:rounded-[2rem]', className)}>
        <div className="shrink-0 border-b border-slate-200/70 px-5 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300/80 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={labelledById} className="text-lg font-black tracking-[-0.03em] text-slate-950">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{description}</p> : null}
            </div>
            <IconButton icon={<X size={18} weight="bold" />} label="Fechar" variant="plain" onClick={onClose} />
          </div>
        </div>
        <div className={cn('jnc-ds-scroll-y flex-1 px-5 py-4', contentClassName)}>{children}</div>
        {footer ? <div className="shrink-0 border-t border-slate-200/70 bg-white/88 px-5 py-3 jnc-ds-bottom-safe backdrop-blur-xl">{footer}</div> : null}
      </section>
    </div>
  );
}
