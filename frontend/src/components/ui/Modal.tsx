import { useCallback, useEffect, type ReactNode } from 'react';
import { cn } from './classNames';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Clicking the backdrop calls onClose (default: true) */
  backdropClose?: boolean;
  className?: string;
};

/**
 * Centered modal overlay. For bottom-positioned sheets, use `<BottomSheet>`.
 * Handles Escape key and body scroll lock.
 */
export function Modal({ open, onClose, children, backdropClose = true, className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={backdropClose ? onClose : undefined}
      />

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-[420px] rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_32px_64px_-32px_rgba(15,23,42,0.55)]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
