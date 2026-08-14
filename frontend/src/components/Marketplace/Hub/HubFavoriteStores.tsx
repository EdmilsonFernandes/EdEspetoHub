import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from '@phosphor-icons/react';
import { getStoreAvatarUrl } from '../../../utils/storeAvatar';
import { Image } from '../../common/Image';

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
          className="jnc-hub-touch jnc-hub-pill inline-flex items-center justify-center rounded-full px-3 py-2 text-2xs font-black uppercase tracking-[0.14em] text-[#336886]"
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
              state={{ storefrontMode: 'customer' }}
              className="jnc-hub-touch jnc-hub-lift jnc-hub-card group min-w-[168px] rounded-[1.45rem] p-2 sm:min-w-[186px]"
            >
              <Image
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
