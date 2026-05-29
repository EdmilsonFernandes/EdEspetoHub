import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CaretRight, Sparkle, Star } from '@phosphor-icons/react';
import { getStoreAvatarUrl } from '../../../utils/storeAvatar';
import { prefetchRouteByPath } from '../../../utils/clientRoutePrefetch';
import { prefetchStorefrontData } from '../../../utils/storefrontPrefetch';

export type HubFeaturedCarouselItem = {
  id: string;
  storeSlug: string;
  storeName: string;
  storeLogo?: string | null;
  imageUrl: string;
  name: string;
  price: number;
  sponsored?: boolean;
  badge?: string | null;
};

type HubFeaturedCarouselProps = {
  hasEntered: boolean;
  title: string;
  loading: boolean;
  items: HubFeaturedCarouselItem[];
  hasOverflow: boolean;
  hasSponsoredItems: boolean;
  selectedCondominiumSlug?: string | null;
  currency: Intl.NumberFormat;
  onStageProduct: (item: HubFeaturedCarouselItem) => void;
};

export const HubFeaturedCarousel = memo(function HubFeaturedCarousel({
  hasEntered,
  title,
  loading,
  items,
  hasOverflow,
  hasSponsoredItems,
  selectedCondominiumSlug,
  currency,
  onStageProduct,
}: HubFeaturedCarouselProps) {
  const subtitle = hasOverflow
    ? hasSponsoredItems
      ? 'Sugestões para pedir agora.'
      : 'Arraste e descubra opções das lojas.'
    : hasSponsoredItems
      ? 'Sugestões de lojas parceiras para pedir agora.'
      : 'Toque no prato e veja a loja que prepara.';

  return (
    <section
      className="jnc-hub-surface order-7 overflow-hidden rounded-[1.8rem] px-3 py-2.5"
      style={{
        transition: 'all .45s ease',
        transitionDelay: '200ms',
        opacity: hasEntered ? 1 : 0,
        transform: hasEntered ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[14px] font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-0.5 line-clamp-1 text-[10px] font-bold text-slate-500">{subtitle}</p>
        </div>
        {hasOverflow ? (
          <Link
            to="/hub/destaques"
            onPointerEnter={() => prefetchRouteByPath('/hub/destaques')}
            onFocus={() => prefetchRouteByPath('/hub/destaques')}
            onTouchStart={() => prefetchRouteByPath('/hub/destaques')}
            className="jnc-hub-touch jnc-hub-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-black uppercase tracking-[0.14em] text-[#336886]"
          >
            Ver mais
            <CaretRight size={11} weight="bold" />
          </Link>
        ) : null}
      </div>

      <div className="relative mt-2.5">
        {hasOverflow ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 rounded-r-[1.45rem] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.86)_62%,rgba(255,255,255,0.98)_100%)]" />
        ) : null}
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar px-1 pb-1 pr-7">
          {loading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-[112px] min-w-[268px] animate-pulse rounded-[1.45rem] bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-slate-100/80"
                />
              ))
            : items.map((item, index) => {
                const featuredStorePath = selectedCondominiumSlug
                  ? `/${item.storeSlug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}`
                  : `/${item.storeSlug}`;
                const warmupStore = () => {
                  prefetchRouteByPath(featuredStorePath);
                  prefetchStorefrontData(item.storeSlug);
                };

                return (
                  <Link
                    key={`${item.storeSlug}-${item.id}`}
                    to={featuredStorePath}
                    onPointerEnter={warmupStore}
                    onFocus={warmupStore}
                    onTouchStart={warmupStore}
                    onClick={() => onStageProduct(item)}
                    className="jnc-hub-touch jnc-hub-lift jnc-hub-card group flex min-h-[112px] min-w-[268px] snap-start gap-3 rounded-[1.45rem] p-2.5 sm:min-w-[292px]"
                  >
                    <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[1.2rem] bg-slate-100 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.36)] ring-1 ring-white/80">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading={index < 2 ? 'eager' : 'lazy'}
                        fetchPriority={index < 2 ? 'high' : 'auto'}
                        decoding="async"
                        className="h-full w-full object-cover drop-shadow-[0_10px_18px_rgba(15,23,42,0.10)] transition-transform duration-700 group-hover:scale-105"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src =
                            item.storeLogo || getStoreAvatarUrl(item.storeSlug, item.storeName);
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/22 to-transparent" />
                      <div className="absolute right-1.5 top-1.5">
                        {item.sponsored ? (
                          <span className="jnc-hub-glass-badge inline-flex items-center gap-1 rounded-[0.65rem] bg-amber-300/92 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-slate-950">
                            <Star size={9} weight="fill" /> {item.badge || 'Patrocinado'}
                          </span>
                        ) : (
                          <span className="jnc-hub-glass-badge inline-flex items-center gap-1 rounded-[0.65rem] px-1.5 py-0.5 text-[7px] font-black italic uppercase tracking-[0.16em] text-[#153A4C] ring-1 ring-black/5">
                            <Sparkle size={7} weight="fill" className="text-[#336886]" />
                            Seleção
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                      <p className="line-clamp-2 text-[13px] font-extrabold leading-[1.12rem] tracking-[-0.02em] text-slate-950">{item.name}</p>
                      <p className="mt-1 truncate text-[10.5px] font-semibold text-slate-400">por {item.storeName}</p>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <span className="text-[19px] font-black leading-none tracking-[-0.05em] text-[#153A4C]">
                          {currency.format(item.price)}
                        </span>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf5fa] text-[#336886] transition group-hover:translate-x-0.5">
                          <CaretRight size={12} weight="bold" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
});
