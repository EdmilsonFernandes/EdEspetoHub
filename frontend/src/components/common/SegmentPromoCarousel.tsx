import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const touchStartXRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const compact = mode === 'hub';
  const interactive = mode !== 'hub';
  const activeSlides = slides && slides.length ? slides : PROMO_SLIDES;
  const currentSlide = activeSlides[activeIndex] || activeSlides[0];
  const useDefaultAction = !slides || !slides.length;
  const hasConfiguredAction = useDefaultAction || Boolean(String(currentSlide?.actionUrl || '').trim());
  const currentTarget = useMemo(
    () =>
      hasConfiguredAction
        ? resolveActionTarget(useDefaultAction ? currentSlide?.actionUrl || defaultActionUrl : currentSlide?.actionUrl)
        : null,
    [currentSlide?.actionUrl, defaultActionUrl, hasConfiguredAction, useDefaultAction]
  );
  const currentActionLabel = useMemo(
    () =>
      hasConfiguredAction
        ? resolveActionLabel(
            currentSlide?.actionLabel,
            useDefaultAction ? currentSlide?.actionUrl || defaultActionUrl : currentSlide?.actionUrl,
            defaultActionUrl
          )
        : '',
    [currentSlide?.actionLabel, currentSlide?.actionUrl, defaultActionUrl, hasConfiguredAction, useDefaultAction]
  );

  useEffect(() => {
    if (activeSlides.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % activeSlides.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [activeSlides.length]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(activeSlides.length - 1, 0)));
  }, [activeSlides.length]);

  const goToSlide = (index: number) => {
    const total = activeSlides.length;
    if (!total) return;
    setActiveIndex(((index % total) + total) % total);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLAnchorElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    suppressClickRef.current = false;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLAnchorElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 36) return;
    suppressClickRef.current = true;
    if (delta < 0) {
      goToSlide(activeIndex + 1);
    } else {
      goToSlide(activeIndex - 1);
    }
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 220);
  };

  if (!activeSlides.length || !currentSlide) {
    return null;
  }

  const content = (
    <>
      <div className={`relative ${compact ? 'aspect-[16/6.4]' : 'aspect-[16/6.8] sm:aspect-[16/6.6]'}`}>
        {activeSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 flex items-center justify-center bg-slate-950/5 transition-all duration-700 ${
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {(() => {
              const preserveArtwork = compact && slide.fit === 'cover';
              const showBackdrop = preserveArtwork || slide.fit !== 'cover';
              const imageFitClass = preserveArtwork || slide.fit !== 'cover' ? 'object-contain' : 'object-cover';
              const imagePaddingClass = slide.fit === 'contain' ? 'p-2 sm:p-3' : '';

              return (
                <>
                  {showBackdrop && (
                    <>
                      <img
                        src={slide.image}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-30 blur-xl"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-white/5 to-slate-950/10" />
                    </>
                  )}
                  <img
                    src={slide.image}
                    alt={slide.imageAlt}
                    loading="lazy"
                    className={`relative z-[1] h-full w-full object-center ${imageFitClass} ${imagePaddingClass}`}
                  />
                </>
              );
            })()}
            {slide.id !== 'mercado-pago' && (
              <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-slate-950/28 via-transparent to-transparent" />
            )}
          </div>
        ))}
      </div>

      {hasConfiguredAction && currentActionLabel ? (
        <div className="pointer-events-none absolute bottom-2 right-2 z-[3] inline-flex max-w-[72%] rounded-full border border-white/70 bg-white/92 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_10px_22px_-14px_rgba(15,23,42,0.5)] backdrop-blur-md sm:bottom-3 sm:right-3 sm:max-w-[58%] sm:px-3 sm:py-1.5 sm:text-[10px]">
          <span className="truncate">{currentActionLabel} →</span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1.5 sm:pb-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-slate-950/20 px-2 py-0.5 backdrop-blur-md">
          {activeSlides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              aria-label={`Ir para banner ${index + 1}`}
              onClick={(event) => {
                event.preventDefault();
                goToSlide(index);
              }}
              className={`rounded-full transition-all ${
                index === activeIndex ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/65'
              }`}
            ></button>
          ))}
        </div>
      </div>
    </>
  );

  if (!interactive) {
    return (
      <a
        href={currentTarget?.href || '#'}
        target={currentTarget?.external ? '_blank' : undefined}
        rel={currentTarget?.external ? 'noopener noreferrer' : undefined}
        aria-label={currentSlide.imageAlt || 'Abrir banner do Já no Caminho'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            return;
          }
          if (!currentTarget) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          void openActionTarget(currentTarget, navigate);
        }}
        className={`group relative block overflow-hidden rounded-[1.65rem] border border-white bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out active:scale-[0.985] ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <a
      href={currentTarget?.href || '#'}
      target={currentTarget?.external ? '_blank' : undefined}
      rel={currentTarget?.external ? 'noopener noreferrer' : undefined}
      aria-label={currentSlide.imageAlt || 'Abrir banner do Já no Caminho'}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          return;
        }
        if (!currentTarget) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        void openActionTarget(currentTarget, navigate);
      }}
      className={`group relative block overflow-hidden rounded-[1.65rem] border border-white bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out active:scale-[0.985] ${className}`}
    >
      {content}
    </a>
  );
}
