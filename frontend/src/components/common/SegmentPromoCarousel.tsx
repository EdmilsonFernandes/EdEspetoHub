import { useEffect, useState } from 'react';

type PromoSlide = {
  id: string;
  image: string;
  imageAlt: string;
};

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'beleza',
    image: '/marketing/promo-beleza.png',
    imageAlt: 'Banner institucional do Ja no Caminho para o segmento de beleza',
  },
  {
    id: 'termica',
    image: '/marketing/promo-termica.png',
    imageAlt: 'Banner institucional do Ja no Caminho com operacao e impressao termica',
  },
  {
    id: 'adega',
    image: '/marketing/promo-adega.png',
    imageAlt: 'Banner institucional do Ja no Caminho para o segmento de adega',
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
      <div className={`relative ${compact ? 'aspect-[16/8.6]' : 'aspect-[16/7.6] sm:aspect-[16/7.4]'}`}>
        {PROMO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 flex items-center justify-center bg-slate-950/4 transition-all duration-700 ${
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.imageAlt}
              loading="lazy"
              className="h-full w-full object-contain object-center"
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2.5 sm:pb-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-slate-950/18 px-2.5 py-1 backdrop-blur-md">
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
