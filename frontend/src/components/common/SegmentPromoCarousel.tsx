import { useEffect, useState } from 'react';
import { CaretRight, Printer, Storefront, Truck } from '@phosphor-icons/react';

type PromoSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  badges: string[];
};

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'termica',
    eyebrow: 'Pedidos no app + térmica',
    title: 'Receba o pedido e imprima automaticamente no balcão.',
    description: 'Venda por QR, delivery ou retirada e deixe a operação sair na impressora térmica sem ruído na cozinha.',
    image: '/marketing/promo-termica.png',
    imageAlt: 'Balcão com pedido saindo na impressora térmica',
    badges: ['Espetinhos', 'Lanches', 'Operação rápida'],
  },
  {
    id: 'adega',
    eyebrow: 'Adegas e bebidas',
    title: 'Sua adega local no app, com pedido rápido e pagamento simples.',
    description: 'Catálogo por categoria, entrega ágil e jornada pronta para bebidas, conveniência e combos sazonais.',
    image: '/marketing/promo-adega.png',
    imageAlt: 'Arte promocional para adega e bebidas',
    badges: ['Adega', 'Bebidas', 'Entrega rápida'],
  },
  {
    id: 'beleza',
    eyebrow: 'Beleza e cosméticos',
    title: 'Venda maquiagem e cosméticos com uma vitrine mobile premium.',
    description: 'Organize catálogo, receba pedidos no app e atenda beleza, perfumaria e autocuidado sem depender de catálogo manual.',
    image: '/marketing/promo-beleza.png',
    imageAlt: 'Arte promocional para beleza e cosméticos',
    badges: ['Cosméticos', 'Perfumaria', 'Loja local'],
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
  const slide = PROMO_SLIDES[activeIndex] || PROMO_SLIDES[0];
  const compact = mode === 'hub';

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PROMO_SLIDES.length);
    }, 4800);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,#071122_0%,#0f172a_45%,#061424_100%)] shadow-[0_24px_60px_-34px_rgba(15,23,42,0.55)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.12),transparent_30%)]" />
      <div className={`relative grid gap-5 ${compact ? 'p-4 sm:grid-cols-[1.05fr_0.95fr] sm:items-center' : 'p-5 sm:p-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8'}`}>
        <div className={`space-y-4 ${compact ? 'order-2 sm:order-1' : ''}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
            <Storefront size={13} weight="duotone" />
            Teste grátis para lojistas
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">{slide.eyebrow}</p>
            <h3 className={`${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-black leading-[1.08] text-white`}>
              {slide.title}
            </h3>
            <p className={`${compact ? 'text-sm' : 'text-sm sm:text-base'} max-w-xl font-medium leading-relaxed text-slate-300`}>
              {slide.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {slide.badges.map((badge) => (
              <span
                key={`${slide.id}-${badge}`}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/create?plan=trial"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_36px_-20px_rgba(255,255,255,0.28)] transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              Criar loja teste grátis
              <CaretRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300/90">
              <Printer size={14} weight="duotone" className="text-emerald-300" />
              Pedido no app + impressão térmica
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              {PROMO_SLIDES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Abrir slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-300">
              <Truck size={14} weight="duotone" className="text-sky-300" />
              Multi-segmento
            </div>
          </div>
        </div>

        <div className={`${compact ? 'order-1 sm:order-2' : ''}`}>
          <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950/30 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.75)]">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              loading="lazy"
              className={`w-full object-cover ${compact ? 'aspect-[16/10]' : 'aspect-[16/9] lg:aspect-[16/10]'}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
