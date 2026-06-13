import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { openActionTarget, resolveActionLabel, resolveActionTarget } from '../../utils/actionLink';

export type PromoSlide = {
  id: string;
  image: string;
  imageAlt: string;
  actionUrl?: string;
  actionLabel?: string;
  fit?: 'contain' | 'cover';
};

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'mercado-pago',
    image: '/marketing/mp01.png',
    imageAlt: 'Banner Mercado Pago do Ja no Caminho para ativar loja online',
    fit: 'cover',
  },
  {
    id: 'termica',
    image: '/marketing/promo-termica-lite.jpg',
    imageAlt: 'Banner institucional do Ja no Caminho com operacao e impressao termica',
    fit: 'cover',
  },
  {
    id: 'adega',
    image: '/marketing/promo-adega-lite.jpg',
    imageAlt: 'Banner institucional do Ja no Caminho para o segmento de adega',
    fit: 'contain',
  },
  {
    id: 'marketing',
    image: '/marketing/promo-marketing-lite.jpg',
    imageAlt: 'Banner institucional do Ja no Caminho com divulgacao multissetorial',
    fit: 'contain',
  },
];

type SegmentPromoCarouselProps = {
  mode?: 'landing' | 'hub';
  className?: string;
  slides?: PromoSlide[];
  defaultActionUrl?: string;
};

export function SegmentPromoCarousel({
  mode = 'landing',
  className = '',
  slides,
  defaultActionUrl = '/create?plan=trial',
}: SegmentPromoCarouselProps) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const compact = mode === 'hub';
  const activeSlides = slides && slides.length ? slides : PROMO_SLIDES;
  const useDefaultAction = !slides || !slides.length;
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 8000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    []
  );
  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: activeSlides.length > 1,
      duration: 28,
    },
    activeSlides.length > 1 && !prefersReducedMotion ? [autoplay] : []
  );
  const resolvedSlides = useMemo(
    () =>
      activeSlides.map((slide) => {
        const hasConfiguredAction = useDefaultAction || Boolean(String(slide.actionUrl || '').trim());
        const actionUrl = useDefaultAction ? slide.actionUrl || defaultActionUrl : slide.actionUrl;
        return {
          ...slide,
          target: hasConfiguredAction ? resolveActionTarget(actionUrl) : null,
          actionLabel: hasConfiguredAction
            ? resolveActionLabel(slide.actionLabel, actionUrl, defaultActionUrl)
            : '',
        };
      }),
    [activeSlides, defaultActionUrl, useDefaultAction]
  );

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(activeSlides.length - 1, 0)));
  }, [activeSlides.length]);

  const syncSelectedIndex = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    syncSelectedIndex();
    emblaApi.on('select', syncSelectedIndex);
    emblaApi.on('reInit', syncSelectedIndex);
    return () => {
      emblaApi.off('select', syncSelectedIndex);
      emblaApi.off('reInit', syncSelectedIndex);
    };
  }, [emblaApi, syncSelectedIndex]);

  if (!resolvedSlides.length) return null;

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.65rem] border border-white/88 bg-white shadow-[0_24px_54px_-40px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/35 ${className}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques do Já no Caminho"
    >
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {resolvedSlides.map((slide, index) => (
            <a
              key={slide.id}
              href={slide.target?.href || '#'}
              target={slide.target?.external ? '_blank' : undefined}
              rel={slide.target?.external ? 'noopener noreferrer' : undefined}
              aria-label={slide.imageAlt || 'Abrir banner do Já no Caminho'}
              onClick={(event) => {
                if (event.defaultPrevented) return;
                if (!slide.target) {
                  event.preventDefault();
                  return;
                }
                event.preventDefault();
                void openActionTarget(slide.target, navigate);
              }}
              className={`jnc-hub-touch relative min-w-0 flex-[0_0_100%] overflow-hidden bg-slate-950/5 ${
                compact ? 'aspect-[16/6.4]' : 'aspect-[16/6.8] sm:aspect-[16/6.6]'
              }`}
            >
              {slide.fit !== 'cover' ? (
                <>
                  <img
                    src={slide.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-30 blur-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/12 via-transparent to-slate-950/12" />
                </>
              ) : null}
              <img
                src={slide.image}
                alt={slide.imageAlt}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                className={`jnc-promo-carousel-image relative z-[1] h-full w-full object-center ${
                  index === activeIndex ? 'jnc-promo-carousel-image--active' : ''
                } ${slide.fit === 'cover' ? 'object-cover' : 'object-contain'}`}
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,transparent_44%,rgba(15,23,42,0.38)_100%)]" />
              <div className="pointer-events-none absolute inset-x-8 top-0 z-[3] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              {slide.actionLabel ? (
                <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-[4] inline-flex max-w-[72%] items-center rounded-full border border-white/72 bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_12px_26px_-16px_rgba(15,23,42,0.58)] backdrop-blur-xl sm:bottom-3 sm:right-3 sm:max-w-[58%] sm:px-3 sm:py-1.5 sm:text-[10px]">
                  <span className="truncate">{slide.actionLabel} →</span>
                </div>
              ) : null}
            </a>
          ))}
        </div>
      </div>

      {resolvedSlides.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex gap-1 p-1.5">
            {resolvedSlides.map((slide, index) => (
              <span key={slide.id} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/32">
                <span
                  key={`${slide.id}-${activeIndex}`}
                  className={`block h-full origin-left rounded-full bg-white ${
                    index === activeIndex ? 'jnc-promo-carousel-progress' : index < activeIndex ? 'w-full' : 'w-0'
                  }`}
                />
              </span>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 z-[5] flex justify-center pb-1.5 sm:pb-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-slate-950/24 px-2 py-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.72)] backdrop-blur-xl">
              {resolvedSlides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.id}
                  aria-label={`Ir para banner ${index + 1}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className={`rounded-full transition-all duration-300 ${
                    index === activeIndex ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/58'
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
