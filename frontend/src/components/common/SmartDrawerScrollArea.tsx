import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

type SmartDrawerScrollAreaTone = 'client' | 'store' | 'motoboy' | 'neutral';

type SmartDrawerScrollAreaProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: SmartDrawerScrollAreaTone;
};

type ScrollState = {
  canScrollUp: boolean;
  canScrollDown: boolean;
  hasOverflow: boolean;
};

const SCROLL_EDGE_TOLERANCE = 6;

const toneClasses: Record<SmartDrawerScrollAreaTone, { rail: string; activeButton: string; inactiveButton: string; bottomGlow: string }> = {
  client: {
    rail: 'border-[#d8e5ee] bg-white/82 shadow-[0_18px_34px_-24px_rgba(51,104,134,0.5)]',
    activeButton: 'bg-[#edf5fa] text-[#336886] ring-[#d8e5ee]',
    inactiveButton: 'bg-white/60 text-slate-300 ring-slate-100',
    bottomGlow: 'bg-[#336886]/18',
  },
  store: {
    rail: 'border-violet-100 bg-white/82 shadow-[0_18px_34px_-24px_rgba(124,58,237,0.45)]',
    activeButton: 'bg-violet-50 text-violet-700 ring-violet-100',
    inactiveButton: 'bg-white/60 text-slate-300 ring-slate-100',
    bottomGlow: 'bg-violet-400/16',
  },
  motoboy: {
    rail: 'border-amber-100 bg-white/82 shadow-[0_18px_34px_-24px_rgba(245,158,11,0.45)]',
    activeButton: 'bg-amber-50 text-amber-700 ring-amber-100',
    inactiveButton: 'bg-white/60 text-slate-300 ring-slate-100',
    bottomGlow: 'bg-amber-400/16',
  },
  neutral: {
    rail: 'border-slate-200 bg-white/82 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.35)]',
    activeButton: 'bg-slate-100 text-slate-700 ring-slate-200',
    inactiveButton: 'bg-white/60 text-slate-300 ring-slate-100',
    bottomGlow: 'bg-slate-400/14',
  },
};

export function SmartDrawerScrollArea({
  children,
  className = '',
  contentClassName = '',
  tone = 'neutral',
}: SmartDrawerScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollUp: false,
    canScrollDown: false,
    hasOverflow: false,
  });

  const measureScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
    const nextState = {
      canScrollUp: element.scrollTop > SCROLL_EDGE_TOLERANCE,
      canScrollDown: element.scrollTop < maxScrollTop - SCROLL_EDGE_TOLERANCE,
      hasOverflow: maxScrollTop > SCROLL_EDGE_TOLERANCE,
    };

    setScrollState((current) => {
      if (
        current.canScrollUp === nextState.canScrollUp &&
        current.canScrollDown === nextState.canScrollDown &&
        current.hasOverflow === nextState.hasOverflow
      ) {
        return current;
      }
      return nextState;
    });
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    measureScroll();
    const animationFrame = window.requestAnimationFrame(measureScroll);
    element.addEventListener('scroll', measureScroll, { passive: true });
    window.addEventListener('resize', measureScroll);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            window.requestAnimationFrame(measureScroll);
          })
        : null;

    resizeObserver?.observe(element);
    if (element.firstElementChild) {
      resizeObserver?.observe(element.firstElementChild);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      element.removeEventListener('scroll', measureScroll);
      window.removeEventListener('resize', measureScroll);
      resizeObserver?.disconnect();
    };
  }, [measureScroll]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(measureScroll);
    return () => window.cancelAnimationFrame(animationFrame);
  });

  const scrollByPage = (direction: 'up' | 'down') => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      top: (direction === 'down' ? 1 : -1) * Math.max(180, Math.round(element.clientHeight * 0.58)),
      behavior: 'smooth',
    });
  };

  const classes = toneClasses[tone];

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={scrollRef}
        data-testid="smart-drawer-scroll"
        className="h-full overflow-y-auto overscroll-contain scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(51,104,134,0.35)_transparent]"
      >
        <div className={contentClassName}>{children}</div>
      </div>

      {scrollState.hasOverflow && (
        <>
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/96 via-white/74 to-transparent transition-opacity duration-200 ${
              scrollState.canScrollUp ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/98 via-white/78 to-transparent transition-opacity duration-200 ${
              scrollState.canScrollDown ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none absolute inset-x-8 bottom-0 h-8 rounded-full blur-2xl transition-opacity duration-200 ${classes.bottomGlow} ${
              scrollState.canScrollDown ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />

          <div
            className={`absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border p-1 backdrop-blur-xl transition-opacity duration-200 ${classes.rail}`}
            aria-label="Controle de rolagem do menu"
            role="group"
          >
            <button
              type="button"
              onClick={() => scrollByPage('up')}
              disabled={!scrollState.canScrollUp}
              className={`grid h-7 w-7 place-items-center rounded-full ring-1 transition-all active:scale-95 ${
                scrollState.canScrollUp ? classes.activeButton : classes.inactiveButton
              }`}
              aria-label="Rolar menu para cima"
            >
              <CaretUp size={13} weight="bold" />
            </button>
            <span className="h-4 w-px rounded-full bg-slate-200/80" aria-hidden="true" />
            <button
              type="button"
              onClick={() => scrollByPage('down')}
              disabled={!scrollState.canScrollDown}
              className={`grid h-7 w-7 place-items-center rounded-full ring-1 transition-all active:scale-95 ${
                scrollState.canScrollDown ? classes.activeButton : classes.inactiveButton
              }`}
              aria-label="Rolar menu para baixo"
            >
              <CaretDown size={13} weight="bold" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
