import { useEffect, useState } from 'react';

type PromoSlide = {
  id: string;
  image: string;
  imageAlt: string;
  fit?: 'contain' | 'cover';
};

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'beleza',
    image: '/marketing/promo-beleza.png',
    imageAlt: 'Banner institucional do Ja no Caminho para o segmento de beleza',
    fit: 'contain',
  },
  {
    id: 'termica',
    image: '/marketing/promo-termica.png',
    imageAlt: 'Banner institucional do Ja no Caminho com operacao e impressao termica',
    fit: 'cover',
  },
  {
    id: 'adega',
    image: '/marketing/promo-adega.png',
    imageAlt: 'Banner institucional do Ja no Caminho para o segmento de adega',
    fit: 'contain',
  },
];

type SegmentPromoCarouselProps = {
  mode?: 'landing' | 'hub';
  className?: string;
};

export function SegmentPromoCarousel({
  mode = 'landing',
  className = '',
}: SegmentPromoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const compact = mode === 'hub';

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <a
      href="/create?plan=trial"
      aria-label="Criar loja no Ja no Caminho"
      className={`group relative block overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)] active:scale-[0.995] ${className}`}
    >
      <div className={`relative ${compact ? 'aspect-[16/7.8]' : 'aspect-[16/6.8] sm:aspect-[16/6.6]'}`}>
        {PROMO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 flex items-center justify-center bg-slate-950/6 transition-all duration-700 ${
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {slide.fit !== 'cover' && (
              <>
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-28 blur-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-slate-950/10" />
              </>
            )}
            <img
              src={slide.image}
              alt={slide.imageAlt}
              loading="lazy"
              className={`relative z-[1] h-full w-full object-center ${slide.fit === 'cover' ? 'object-cover' : 'object-contain'}`}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1.5 sm:pb-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-slate-950/18 px-2 py-0.5 backdrop-blur-md">
          {PROMO_SLIDES.map((slide, index) => (
            <span
              key={slide.id}
              className={`rounded-full transition-all ${
                index === activeIndex ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/65'
              }`}
            />
          ))}
        </div>
      </div>
    </a>
  );
}
