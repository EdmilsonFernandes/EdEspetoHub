import { CaretRight, Printer, Storefront } from '@phosphor-icons/react';

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
  const slide = PROMO_SLIDES[0];
  const compact = mode === 'hub';

  if (compact) {
    return (
      <a
        href="/create?plan=trial"
        className={`group relative block overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#111827_52%,#172033_100%)] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] transition-transform active:scale-[0.99] ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.12),transparent_28%)]" />
        <div className="relative grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 p-3.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4 sm:p-4">
          <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-slate-950/40 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.8)]">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              loading="lazy"
              className="h-[92px] w-full object-cover sm:h-[112px]"
            />
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <Printer size={11} weight="duotone" />
              teste gratis para lojistas
            </div>

            <h3 className="mt-2 line-clamp-2 text-[15px] font-black leading-[1.15] text-white sm:text-base">
              Pedido no app, impressao termica e operacao pronta para vender.
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-300 sm:text-xs">
              {slide.eyebrow} para restaurantes, adegas, cosmeticos e lojas locais.
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 text-[11px] font-black text-slate-950 shadow-[0_14px_28px_-20px_rgba(255,255,255,0.35)] transition-all group-hover:scale-[1.01]">
                Criar loja
                <CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
                toque para conhecer
              </span>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href="/create?plan=trial"
      className={`group relative block overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,#071122_0%,#0f172a_45%,#061424_100%)] shadow-[0_24px_60px_-34px_rgba(15,23,42,0.55)] transition-transform hover:scale-[1.005] active:scale-[0.995] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.12),transparent_30%)]" />
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
            <Storefront size={13} weight="duotone" />
            Teste grátis para lojistas
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Pedidos no app + termica</p>
            <h3 className="text-2xl font-black leading-[1.08] text-white sm:text-[2rem]">
              Receba pedidos no celular e imprima direto na operacao.
            </h3>
            <p className="max-w-lg text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Monte sua loja, teste gratis e atenda restaurante, adega, cosmeticos ou qualquer operacao local em poucos minutos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Termica', 'Delivery', 'Retirada', 'Loja local'].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_36px_-20px_rgba(255,255,255,0.28)] transition-all group-hover:scale-[1.01]">
              Criar loja teste grátis
              <CaretRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300/90">
              <Printer size={14} weight="duotone" className="text-emerald-300" />
              Pedido no app + impressão térmica
            </div>
          </div>

          <div className="inline-flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Toque no banner para abrir seu trial
          </div>
        </div>

        <div>
          <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950/30 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.75)]">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              loading="lazy"
              className="w-full object-contain bg-slate-950/30 aspect-[16/11] sm:aspect-[16/10]"
            />
          </div>
        </div>
      </div>
    </a>
  );
}
