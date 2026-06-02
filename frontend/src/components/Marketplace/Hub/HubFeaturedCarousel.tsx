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
      ? 'Escolhas rápidas das lojas parceiras.'
      : 'Pratos e produtos para descobrir agora.'
    : hasSponsoredItems
      ? 'Uma escolha parceira para pedir agora.'
      : 'Toque e veja a loja que prepara.';

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
          <p className="mb-0.5 inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-[0.2em] text-[#336886]">
            <Sparkle size={9} weight="fill" />
            Vitrine do app
          </p>
          <h2 className="text-[15px] font-black tracking-[-0.035em] text-slate-950">{title}</h2>
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
            Ver todos
            <CaretRight size={11} weight="bold" />
          </Link>
        ) : null}
      </div>

      <div className="relative mt-2.5">
        {hasOverflow ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 rounded-r-[1.45rem] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(250,252,253,0.84)_62%,rgba(250,252,253,0.98)_100%)]" />
        ) : null}
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar px-1 pb-1 pr-7">
          {loading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden h-[112px] min-w-[268px] rounded-[1.45rem] bg-white p-2.5 shadow-[0_20px_46px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-100/80 flex gap-3 sm:min-w-[292px]"
                >
                  <div className="relative h-[92px] w-[92px] shrink-0 rounded-[1.2rem] bg-slate-100 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </div>
                  <div className="flex-1 flex flex-col py-1.5 space-y-2">
                    <div className="relative h-4 w-3/4 rounded bg-slate-100 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </div>
                    <div className="relative h-3 w-1/2 rounded bg-slate-100 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </div>
                    <div className="relative mt-auto h-5 w-1/3 rounded bg-slate-100 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </div>
                  </div>
                </div>
              ))
            : items.map((item, index) => {
                const isLead = index === 0;
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
                    className={`jnc-hub-touch jnc-hub-lift jnc-hub-card group flex snap-start border transition-all duration-300 ${
                      isLead
                        ? 'min-h-[134px] min-w-[312px] gap-3.5 rounded-[1.65rem] p-3 sm:min-w-[338px]'
                        : 'min-h-[112px] min-w-[268px] gap-3 rounded-[1.45rem] p-2.5 sm:min-w-[292px]'
                    } ${
                      item.sponsored
                        ? 'border-amber-200/60 bg-[linear-gradient(135deg,rgba(254,243,199,0.24)_0%,#ffffff_58%,#ffffff_100%)] shadow-[0_24px_56px_-44px_rgba(245,158,11,0.28)]'
                        : isLead
                          ? 'border-[#d7e7ef]/80 bg-[radial-gradient(circle_at_96%_4%,rgba(95,211,90,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbfc_56%,rgba(237,245,250,0.90)_100%)] shadow-[0_26px_62px_-48px_rgba(21,58,76,0.34)]'
                          : 'border-slate-100/80 bg-white shadow-[0_18px_42px_-36px_rgba(15,23,42,0.16)]'
                    }`}
                  >
                    <div className={`relative shrink-0 overflow-hidden bg-slate-100 shadow-[0_20px_38px_-32px_rgba(15,23,42,0.30)] ring-1 ring-white/80 ${
                      isLead ? 'h-[110px] w-[110px] rounded-[1.35rem]' : 'h-[92px] w-[92px] rounded-[1.2rem]'
                    }`}>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading={index < 2 ? 'eager' : 'lazy'}
                        fetchPriority={index < 2 ? 'high' : 'auto'}
                        decoding="async"
                        className="h-full w-full object-cover drop-shadow-[0_12px_20px_rgba(15,23,42,0.09)] transition-transform duration-700 group-hover:scale-105"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src =
                            item.storeLogo || getStoreAvatarUrl(item.storeSlug, item.storeName);
                        }}
                      />
                      
                      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                      
                      <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/24 to-transparent" />
                      
                      <div className="absolute right-1.5 top-1.5 z-20">
                        {item.sponsored ? (
                          <span className="jnc-hub-glass-badge inline-flex items-center gap-1 rounded-[0.65rem] bg-amber-300/92 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-slate-950 shadow-sm">
                            <Star size={9} weight="fill" /> {item.badge || 'Patrocinado'}
                          </span>
                        ) : (
                          <span className="jnc-hub-glass-badge inline-flex items-center gap-1 rounded-[0.65rem] px-1.5 py-0.5 text-[7px] font-black italic uppercase tracking-[0.16em] text-[#153A4C] ring-1 ring-black/5 shadow-sm">
                            <Sparkle size={7} weight="fill" className="text-[#336886]" />
                            Seleção
                          </span>
                        )}
                      </div>

                      <div className={`absolute bottom-1 right-1 z-20 overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_8px_16px_-10px_rgba(15,23,42,0.36)] ${
                        isLead ? 'h-7 w-7' : 'h-6 w-6'
                      }`}>
                        <img
                          src={item.storeLogo || getStoreAvatarUrl(item.storeSlug, item.storeName)}
                          alt={item.storeName}
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = getStoreAvatarUrl(item.storeSlug, item.storeName);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                      {isLead ? (
                        <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full border border-[#d7e7ef]/80 bg-white/72 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_10px_20px_-18px_rgba(51,104,134,0.45)]">
                          <Sparkle size={8} weight="fill" />
                          Escolha de hoje
                        </span>
                      ) : null}
                      <p className={`line-clamp-2 font-extrabold tracking-[-0.02em] text-slate-950 transition-colors group-hover:text-[#336886] ${
                        isLead ? 'text-[15px] leading-[1.22rem]' : 'text-[13px] leading-[1.12rem]'
                      }`}>{item.name}</p>
                      <p className="mt-1 truncate text-[10.5px] font-semibold text-slate-400">por {item.storeName}</p>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <span className={`${isLead ? 'text-[22px]' : 'text-[19px]'} font-black leading-none tracking-[-0.05em] text-[#153A4C]`}>
                          {currency.format(item.price)}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] transition-all duration-300 group-hover:bg-[#336886] group-hover:text-white group-hover:shadow-[0_12px_22px_-16px_rgba(51,104,134,0.42)] ${
                          isLead ? 'h-8 bg-[#153A4C] px-3 text-white shadow-[0_14px_26px_-18px_rgba(21,58,76,0.48)]' : 'h-7 bg-[#edf5fa]/82 px-2 text-[#336886] group-hover:px-3'
                        }`}>
                          <span className={`${isLead ? 'max-w-none scale-100 opacity-100' : 'max-w-0 scale-0 opacity-0 group-hover:max-w-[40px] group-hover:scale-100 group-hover:opacity-100'} text-[9px] font-black uppercase tracking-wider transition-all duration-300`}>Pedir</span>
                          <CaretRight size={11} weight="bold" />
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
