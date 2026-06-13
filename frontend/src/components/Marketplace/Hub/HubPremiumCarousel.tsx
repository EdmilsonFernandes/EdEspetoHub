import { Children, type ReactNode, useCallback, useEffect, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import useEmblaCarousel from 'embla-carousel-react';

type HubPremiumCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  containerClassName?: string;
  showProgress?: boolean;
};

export function HubPremiumCarousel({
  children,
  ariaLabel,
  className = '',
  containerClassName = '',
  showProgress = true,
}: HubPremiumCarouselProps) {
  const itemCount = Children.count(children);
  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const syncCarouselState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setSnapCount(emblaApi.scrollSnapList().length);
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    syncCarouselState();
    emblaApi.on('select', syncCarouselState);
    emblaApi.on('reInit', syncCarouselState);
    return () => {
      emblaApi.off('select', syncCarouselState);
      emblaApi.off('reInit', syncCarouselState);
    };
  }, [emblaApi, syncCarouselState]);

  if (!itemCount) return null;

  const progress = snapCount > 0 ? ((selectedIndex + 1) / snapCount) * 100 : 100;

  return (
    <div
      className={`relative ${className}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label={ariaLabel}
    >
      <div ref={viewportRef} className="overflow-hidden">
        <div className={`flex touch-pan-y ${containerClassName}`}>{children}</div>
      </div>

      {snapCount > 1 ? (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label="Ver item anterior"
            className="absolute left-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/75 bg-white/88 text-[#336886] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.52)] backdrop-blur-xl transition active:scale-95 disabled:pointer-events-none disabled:opacity-0 md:grid"
          >
            <CaretLeft size={15} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            aria-label="Ver próximo item"
            className="absolute right-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/75 bg-white/88 text-[#336886] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.52)] backdrop-blur-xl transition active:scale-95 disabled:pointer-events-none disabled:opacity-0 md:grid"
          >
            <CaretRight size={15} weight="bold" />
          </button>

          {showProgress ? (
            <div className="mt-2 flex items-center gap-2 px-1" aria-hidden="true">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#d7e7ef]/70">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#336886,#5FD35A)] transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="min-w-8 text-right text-[9px] font-black tabular-nums tracking-[0.08em] text-slate-400">
                {selectedIndex + 1}/{snapCount}
              </span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
