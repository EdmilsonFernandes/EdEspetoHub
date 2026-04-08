import { CaretRight, Storefront } from '@phosphor-icons/react';

type PromoItem = {
  id: string;
  title: string;
  store: string;
  price: string;
  image: string;
  imageAlt: string;
};

const PROMO_ITEMS: PromoItem[] = [
  {
    id: 'pet',
    title: 'Racao Premium para Gato',
    store: 'Brecho da Brisa',
    price: 'R$ 27,00',
    image: '/marketing/promo-beleza.png',
    imageAlt: 'Produto premium da regiao',
  },
  {
    id: 'drink',
    title: 'Caipirinha de Limao 1L',
    store: 'Adega do Thi',
    price: 'R$ 27,00',
    image: '/marketing/promo-adega.png',
    imageAlt: 'Bebida em destaque na regiao',
  },
  {
    id: 'burger',
    title: 'X-Bacon Salada',
    store: 'Espetinho da Cris',
    price: 'R$ 38,90',
    image: '/marketing/promo-termica.png',
    imageAlt: 'Lanche em destaque na regiao',
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
  const compact = mode === 'hub';

  if (compact) {
    return (
      <a
        href="/create?plan=trial"
        className={`group relative block overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(135deg,#081121_0%,#0f172a_58%,#111827_100%)] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] transition-transform active:scale-[0.99] ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Ofertas perto de voce</p>
              <h3 className="mt-1 text-[18px] font-black leading-[1.05] text-white">Achados da sua regiao</h3>
              <p className="mt-1 text-[11px] font-medium text-slate-300">Comida, bebidas e conveniencia em poucos toques.</p>
            </div>
            <span className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-black text-slate-950 shadow-[0_14px_28px_-20px_rgba(255,255,255,0.35)] transition-all group-hover:scale-[1.01]">
              Ver ofertas
              <CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {PROMO_ITEMS.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/5 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.8)]"
              >
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    loading="lazy"
                    className="h-[86px] w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-2">
                    <span className="inline-flex rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200 backdrop-blur-md">
                      Destaque
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-[10px] font-black leading-tight text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-1 text-[9px] font-semibold text-slate-400">{item.store}</p>
                  <p className="mt-1 text-[10px] font-black text-emerald-300">{item.price}</p>
                </div>
              </div>
            ))}
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
      <div className="relative p-5 sm:p-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
            <Storefront size={13} weight="duotone" />
            ofertas perto de voce
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-black leading-[1.08] text-white sm:text-[2rem]">
                Achados da sua regiao
              </h3>
              <p className="max-w-lg text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
                Comida, bebidas e conveniencia com cara de app premium e compra rapida.
              </p>
            </div>
            <span className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-[0_18px_36px_-20px_rgba(255,255,255,0.28)] transition-all group-hover:scale-[1.01]">
              Ver ofertas
              <CaretRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {PROMO_ITEMS.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/5 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.8)]"
              >
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    loading="lazy"
                    className="h-[150px] w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3">
                    <span className="inline-flex rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200 backdrop-blur-md">
                      Sugestao
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-black leading-tight text-white">{item.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-[11px] font-semibold text-slate-400">{item.store}</p>
                    <p className="shrink-0 text-sm font-black text-emerald-300">{item.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Toque no banner para abrir seu trial
          </div>
        </div>
      </div>
    </a>
  );
}
