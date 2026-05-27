import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';

type SmartDrawerScrollAreaTone = 'client' | 'store' | 'motoboy' | 'neutral';

type SmartDrawerScrollAreaProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  hint?: string;
  tone?: SmartDrawerScrollAreaTone;
};

type ScrollState = {
  canScrollUp: boolean;
  canScrollDown: boolean;
  hasOverflow: boolean;
};

const SCROLL_EDGE_TOLERANCE = 6;

const toneClasses: Record<SmartDrawerScrollAreaTone, { hint: string; icon: string; bottomGlow: string }> = {
  client: {
    hint: 'border-[#d8e5ee] bg-white/92 text-[#336886] shadow-[0_18px_34px_-24px_rgba(51,104,134,0.5)]',
    icon: 'bg-[#edf5fa] text-[#336886]',
    bottomGlow: 'bg-[#336886]/18',
  },
  store: {
    hint: 'border-violet-100 bg-white/92 text-violet-700 shadow-[0_18px_34px_-24px_rgba(124,58,237,0.45)]',
    icon: 'bg-violet-50 text-violet-700',
    bottomGlow: 'bg-violet-400/16',
  },
  motoboy: {
    hint: 'border-amber-100 bg-white/92 text-amber-700 shadow-[0_18px_34px_-24px_rgba(245,158,11,0.45)]',
    icon: 'bg-amber-50 text-amber-700',
    bottomGlow: 'bg-amber-400/16',
  },
  neutral: {
    hint: 'border-slate-200 bg-white/92 text-slate-700 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.35)]',
    icon: 'bg-slate-100 text-slate-700',
    bottomGlow: 'bg-slate-400/14',
  },
};

export function SmartDrawerScrollArea({
  children,
  className = '',
  contentClassName = '',
  hint = 'Mais opções abaixo',
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

  const scrollToMoreOptions = () => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      top: Math.max(180, Math.round(element.clientHeight * 0.58)),
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
          <button
            type="button"
            onClick={scrollToMoreOptions}
            className={`absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur-xl transition-all duration-200 active:scale-95 ${
              classes.hint
            } ${scrollState.canScrollDown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
            aria-label="Mostrar mais opções do menu"
          >
            <span className={`grid h-5 w-5 place-items-center rounded-full ${classes.icon}`}>
              <CaretDown size={12} weight="bold" />
            </span>
            {hint}
          </button>
        </>
      )}
    </div>
  );
}
