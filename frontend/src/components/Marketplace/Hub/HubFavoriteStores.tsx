import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from '@phosphor-icons/react';
import { getStoreAvatarUrl } from '../../../utils/storeAvatar';

export type HubFavoriteStore = {
  id: string | number;
  slug: string;
  name: string;
  banner?: string | null;
  logo?: string | null;
  distanceKm?: number | null;
  etaMin?: number;
  etaMax?: number;
};

type HubFavoriteStoresProps = {
  hasEntered: boolean;
  stores: HubFavoriteStore[];
  distanceLoading: boolean;
  activeLocation: unknown;
  distanceByStore: Record<string, number | null | undefined>;
  formatDistance: (km: number | null | undefined) => string;
  onShowAll: () => void;
};

export const HubFavoriteStores = memo(function HubFavoriteStores({
  hasEntered,
  stores,
  distanceLoading,
  activeLocation,
  distanceByStore,
  formatDistance,
  onShowAll,
}: HubFavoriteStoresProps) {
  if (stores.length === 0) return null;

  return (
    <section
      className="order-5 space-y-3"
      style={{
        transition: 'all .45s ease',
        transitionDelay: '300ms',
        opacity: hasEntered ? 1 : 0,
        transform: hasEntered ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 sm:text-lg">Minhas favoritas</h2>
        <button
          type="button"
          onClick={onShowAll}
          className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 hover:text-slate-700"
        >
          Ver todas
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar scrollbar-hide pb-1">
        {stores.map((store) => {
          const distanceLabel = distanceLoading && activeLocation && distanceByStore[String(store.id)] == null
            ? '...'
            : formatDistance(distanceByStore[String(store.id)] ?? store.distanceKm);

          return (
            <Link
              key={`favorite-${store.id}`}
              to={`/${store.slug}`}
              className="group min-w-[168px] rounded-[1.45rem] border border-white/90 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition-all duration-200 ease-out active:scale-[0.97] md:hover:-translate-y-0.5 md:hover:shadow-[0_14px_30px_rgba(15,23,42,0.085)] sm:min-w-[186px]"
            >
              <img
                src={store.banner || store.logo || getStoreAvatarUrl(store.slug, store.name)}
                alt={store.name}
                loading="lazy"
                className="h-20 w-full rounded-[1rem] border border-slate-100 object-cover"
                onError={(event) => {
                  (event.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name);
                }}
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-black text-slate-900">{store.name}</p>
                <Heart size={14} weight="fill" className="shrink-0 text-rose-500" />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-600">
                {distanceLabel} • {store.etaMin}-{store.etaMax} min
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
});
