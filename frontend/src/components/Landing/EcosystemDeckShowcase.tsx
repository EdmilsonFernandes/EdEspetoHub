import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react';
import useEmblaCarousel from 'embla-carousel-react';

/** Slide images exported from The_Zero_Commission_Sales_Ecosystem.pptx
 *  (re-export with scripts/pptx-to-images.ps1 whenever the deck changes). */
const SLIDES = Array.from(
  { length: 11 },
  (_, i) => `/deck/slide-${String(i + 1).padStart(2, '0')}.jpg`,
);
const TOTAL = SLIDES.length;
const AUTOPLAY_MS = 5500;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduce;
}

export function EcosystemDeckShowcase() {
  const navigate = useNavigate();
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const timerRef = useRef<number | null>(null);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay: paused on hover/focus/touch and disabled under reduced-motion.
  useEffect(() => {
    if (!emblaApi || reduceMotion || paused) return undefined;
    timerRef.current = window.setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [emblaApi, reduceMotion, paused]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
    if (e.key === 'ArrowRight') emblaApi?.scrollNext();
  };

  const progress = ((selected + 1) / TOTAL) * 100;

  return (
    <section id="ecossistema" className="relative bg-[#030712] py-20 sm:py-28 overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">
            Ecossistema sem comissão
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Veja como a plataforma vende por você
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-400">
            Um tour rápido pelo modelo que coloca seu negócio online — sem comissão por pedido,
            sem taxa de adesão, com 3 meses VIP grátis.
          </p>
        </div>

        <div
          className="relative mx-auto mt-10 max-w-4xl outline-none"
          role="region"
          aria-roledescription="carrossel"
          aria-label="Apresentação do ecossistema de vendas sem comissão"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
        >
          <div
            ref={viewportRef}
            className="overflow-hidden rounded-2xl bg-black shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
          >
            <div className="flex">
              {SLIDES.map((src, i) => (
                <div className="min-w-0 flex-[0_0_100%]" key={src}>
                  <img
                    src={src}
                    alt={`Slide ${i + 1} da apresentação`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    className="block aspect-video w-full bg-black object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* prev / next */}
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Ver slide anterior"
            className="absolute left-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:left-3"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Ver próximo slide"
            className="absolute right-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:right-3"
          >
            <CaretRight size={18} weight="bold" />
          </button>

          {/* dots */}
          <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === selected ? 'w-6 bg-[#5FD35A]' : 'w-1.5 bg-white/25 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* progress + counter */}
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-2 px-1" aria-hidden="true">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#336886,#5FD35A)] transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="min-w-9 text-right text-[10px] font-black tabular-nums tracking-[0.08em] text-slate-400">
              {selected + 1}/{TOTAL}
            </span>
          </div>
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => navigate('/create?plan=trial')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Quero vender sem comissão
            <ArrowRight size={15} weight="bold" />
          </button>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            Sem cartão no cadastro · 3 meses VIP grátis
          </p>
        </div>
      </div>
    </section>
  );
}
