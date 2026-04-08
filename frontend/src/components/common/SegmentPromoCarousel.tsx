import { useEffect, useState } from 'react';
import { CaretRight, DeviceMobile, Printer, Storefront } from '@phosphor-icons/react';

type PromoSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  image: string;
  imageAlt: string;
  accent: string;
  icon: 'store' | 'printer' | 'mobile';
};

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'store',
    eyebrow: 'Sua loja no app',
    title: 'Crie sua loja e comece com um visual profissional.',
    description: 'Venda no delivery, retirada ou loja local com uma vitrine pronta para operar.',
    cta: 'Criar minha loja',
    image: '/marketing/promo-beleza.png',
    imageAlt: 'Ilustracao promocional para criacao de loja',
    accent: 'from-sky-100 to-cyan-50',
    icon: 'store',
  },
  {
    id: 'orders',
    eyebrow: 'Pedidos no celular',
    title: 'Receba pedidos e organize a operacao sem complicacao.',
    description: 'Uma experiencia leve para o cliente e pratica para quem vende.',
    cta: 'Comecar teste gratis',
    image: '/marketing/promo-termica.png',
    imageAlt: 'Ilustracao de pedidos no app',
    accent: 'from-emerald-100 to-teal-50',
    icon: 'printer',
  },
  {
    id: 'launch',
    eyebrow: 'Teste gratis',
    title: 'Publique sua loja e veja tudo funcionando em poucos minutos.',
    description: 'Ideal para restaurantes, adegas, cosmeticos e operacoes locais.',
    cta: 'Abrir meu trial',
    image: '/marketing/promo-adega.png',
    imageAlt: 'Ilustracao de loja digital pronta para vender',
    accent: 'from-violet-100 to-slate-50',
    icon: 'mobile',
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
  const slide = PROMO_SLIDES[activeIndex] || PROMO_SLIDES[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const Icon = slide.icon === 'printer'
    ? Printer
    : slide.icon === 'mobile'
      ? DeviceMobile
      : Storefront;

  if (compact) {
    return (
      <a
        href="/create?plan=trial"
        className={`group relative block overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white/95 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.18)] transition-all active:scale-[0.99] ${className}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} opacity-60`} />
        <div className="relative grid grid-cols-[1fr_94px] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
              <Icon size={11} weight="duotone" className="text-sky-600" />
              {slide.eyebrow}
            </div>
            <h3 className="mt-2 line-clamp-2 text-[15px] font-black leading-[1.12] text-slate-900">
              {slide.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
              {slide.description}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-[11px] font-black text-white transition-all group-hover:bg-slate-800">
                {slide.cta}
                <CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </span>
              <div className="flex items-center gap-1">
                {PROMO_SLIDES.map((item, index) => (
                  <span
                    key={item.id}
                    className={`rounded-full transition-all ${index === activeIndex ? 'h-1.5 w-4 bg-slate-900' : 'h-1.5 w-1.5 bg-slate-300'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.1rem] border border-white/80 bg-white/70 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.2)]">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              loading="lazy"
              className="h-[102px] w-full bg-white/80 p-1.5 object-contain object-center"
            />
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href="/create?plan=trial"
      className={`group relative block overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_45px_-34px_rgba(15,23,42,0.2)] transition-transform hover:scale-[1.003] active:scale-[0.995] ${className}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} opacity-60`} />
      <div className="relative p-5 sm:p-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            <Icon size={13} weight="duotone" className="text-sky-600" />
            {slide.eyebrow}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-2">
              <h3 className="text-2xl font-black leading-[1.08] text-slate-900 sm:text-[2rem]">
                {slide.title}
              </h3>
              <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                {slide.description}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-black text-white transition-all group-hover:bg-slate-800">
                  {slide.cta}
                  <CaretRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                </span>
                <div className="flex items-center gap-1">
                  {PROMO_SLIDES.map((item, index) => (
                    <span
                      key={item.id}
                      className={`rounded-full transition-all ${index === activeIndex ? 'h-2 w-5 bg-slate-900' : 'h-2 w-2 bg-slate-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/70 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.18)]">
              <div className="grid grid-cols-3 gap-2 bg-white/35 p-3">
                {PROMO_SLIDES.map((item, index) => (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-[1.1rem] border transition-all ${index === activeIndex ? 'border-slate-200 bg-white shadow-sm' : 'border-transparent bg-white/50'}`}
                  >
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      loading="lazy"
                      className="h-[108px] w-full bg-white/80 p-1.5 object-contain object-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Carrossel institucional para atrair novos lojistas
          </div>
        </div>
      </div>
    </a>
  );
}
